const MG_SCORE_HEADERS = [
  'result_id','source_submission_id','measure_id','version','locale','score_payload',
  'algorithm_version','completion_status','source_system','source_result_ref','administered_at',
  'calculated_at','calculated_by','verified_by','verified_at'
];

/**
 * Generic, registry-driven scoring dispatch. No measures are enabled by default.
 * Populate Measure Registry only from an authoritative, approved spec.
 */
function mgScoreMeasure(sourceSubmissionId, measureId, version, locale, answers) {
  if (!mgFlag_('ENABLE_SCORING')) return {status:'disabled'};
  if (!sourceSubmissionId || !measureId || !version || !locale) throw new Error('score_provenance_required');
  const registry = mgLoadMeasureRegistry_();
  const entry = registry.find(x => x.measureId === measureId && x.version === version && x.locale === locale);
  if (!entry || entry.enabled !== true) return {status:'unsupported_version'};
  if (entry.rightsStatus !== 'approved' || !entry.algorithmVersion) return {status:'rights_review_required'};
  const result = mgRunRegisteredAlgorithm_(entry, answers || {});
  const row = {
    resultId: Utilities.getUuid(), sourceSubmissionId, measureId, version, locale,
    scorePayload: JSON.stringify(result.scores || {}), algorithmVersion: entry.algorithmVersion,
    completionStatus: result.status, calculatedAt: new Date(), calculatedBy: mgActor_(),
    sourceSystem:'Apps Script registered scorer', sourceResultRef:String(sourceSubmissionId),
    administeredAt:new Date(), verifiedBy: '', verifiedAt: ''
  };
  const sheet = mgSheet_(MG.scoresSheet);
  mgEnsureHeaders_(sheet, MG_SCORE_HEADERS);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const existing = sheet.getDataRange().getValues();
    const map = mgHeaderMap_(existing[0] || []);
    if (existing.slice(1).some(r => r[map.source_submission_id] === sourceSubmissionId &&
      r[map.measure_id] === measureId && r[map.version] === version && r[map.locale] === locale)) {
      throw new Error('score_result_already_exists');
    }
    sheet.appendRow(MG_SCORE_HEADERS.map(h => ({
    result_id:row.resultId, source_submission_id:row.sourceSubmissionId,
    measure_id:row.measureId, version:row.version, locale:row.locale,
    score_payload:row.scorePayload, algorithm_version:row.algorithmVersion,
    completion_status:row.completionStatus, source_system:row.sourceSystem,
    source_result_ref:row.sourceResultRef, administered_at:row.administeredAt,
    calculated_at:row.calculatedAt,
    calculated_by:row.calculatedBy, verified_by:row.verifiedBy, verified_at:row.verifiedAt
    })[h]));
  } finally {
    lock.releaseLock();
  }
  mgAudit_({actionId:`score:${row.resultId}`, operation:'score_measure', sourceId:sourceSubmissionId,
    outcome:row.completionStatus});
  return {status:row.completionStatus, resultId:row.resultId, scores:result.scores || {}};
}

function mgLoadMeasureRegistry_() {
  const sheet = mgSheet_(MG.measureRegistrySheet);
  const rows = sheet.getDataRange().getValues();
  if (!rows.length) return [];
  const map = mgHeaderMap_(rows[0]);
  return rows.slice(1).filter(r => r[map.measure_id]).map(r => ({
    measureId:String(r[map.measure_id]), version:String(r[map.version]), locale:String(r[map.locale]),
    algorithm:String(r[map.algorithm]), algorithmVersion:String(r[map.algorithm_version]),
    rightsStatus:String(r[map.rights_status]), enabled:String(r[map.enabled]).toUpperCase() === 'TRUE',
    items:JSON.parse(String(r[map.item_spec_json] || '[]')),
    outputKeys:JSON.parse(String(r[map.output_keys_json] || '[]'))
  }));
}

/** Import a result from a registered measure engine after a clinician verifies it. */
function mgImportVerifiedMeasureResult(input) {
  if (!mgFlag_('ENABLE_SCORING')) return {status:'disabled'};
  if (!input || !input.sourceSubmissionId || !input.sourceResultRef || !input.sourceSystem || !input.administeredAt) {
    throw new Error('measure_provenance_required');
  }
  const clinician = mgRequireClinician_(input.clinicianEmail);
  const entry = mgLoadMeasureRegistry_().find(x => x.measureId === input.measureId && x.version === input.version && x.locale === input.locale);
  if (!entry || !entry.enabled) throw new Error('measure_version_not_registered_or_enabled');
  if (entry.rightsStatus !== 'approved' || input.algorithmVersion !== entry.algorithmVersion) {
    throw new Error('measure_rights_or_algorithm_version_mismatch');
  }
  if (input.completionStatus !== 'complete' || input.verified !== true) throw new Error('measure_must_be_complete_and_clinician_verified');
  if (!Number.isFinite(new Date(input.administeredAt).getTime())) throw new Error('measure_administered_at_invalid');
  const scores = input.scores || {};
  const scoreKeys = Object.keys(scores);
  if (!scoreKeys.length || scoreKeys.some(k => !entry.outputKeys.includes(k) || !Number.isFinite(Number(scores[k])))) {
    throw new Error('measure_output_invalid');
  }
  const normalizedScores = Object.fromEntries(scoreKeys.map(k => [k, Number(scores[k])]));
  const resultId = Utilities.getUuid();
  const sheet = mgSheet_(MG.scoresSheet);
  mgEnsureHeaders_(sheet, MG_SCORE_HEADERS);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
  const prior = sheet.getDataRange().getValues();
  const scoreMap = mgHeaderMap_(prior[0] || []);
  if (prior.slice(1).some(r => r[scoreMap.measure_id] === input.measureId && r[scoreMap.source_system] === input.sourceSystem && r[scoreMap.source_result_ref] === input.sourceResultRef)) {
    throw new Error('measure_result_already_imported_use_new_source_revision_for_correction');
  }
  const values = {
    result_id:resultId, source_submission_id:input.sourceSubmissionId,
    measure_id:input.measureId, version:input.version, locale:input.locale,
    score_payload:JSON.stringify(normalizedScores), algorithm_version:input.algorithmVersion,
    completion_status:MG.states.verified, source_system:input.sourceSystem,
    source_result_ref:input.sourceResultRef, administered_at:new Date(input.administeredAt),
    calculated_at:new Date(), calculated_by:input.calculatedBy || 'external_registered_engine',
    verified_by:clinician, verified_at:new Date()
  };
  sheet.appendRow(MG_SCORE_HEADERS.map(h => values[h]));
  } finally {
    lock.releaseLock();
  }
  mgAudit_({actionId:`measure-import:${resultId}`,operation:'import_verified_measure_result',
    sourceId:input.sourceSubmissionId,outcome:'verified'});
  return {resultId,status:'verified'};
}

function mgRunRegisteredAlgorithm_(entry, answers) {
  if (entry.algorithm !== 'item_sum_v1') return {status:'unsupported_algorithm'};
  if (!Array.isArray(entry.items) || !entry.items.length) return {status:'invalid_registry'};
  let total = 0;
  const missing = [];
  for (const item of entry.items) {
    if (!item || !item.key || !Number.isFinite(Number(item.min)) || !Number.isFinite(Number(item.max)) || Number(item.min) > Number(item.max)) {
      return {status:'invalid_registry'};
    }
    const raw = answers[item.key];
    if (raw === undefined || raw === '' || raw === null) { missing.push(item.key); continue; }
    const numeric = Number(raw);
    if (!Number.isFinite(numeric) || numeric < item.min || numeric > item.max) return {status:'invalid'};
    const value = item.reverse === true ? item.min + item.max - numeric : numeric;
    total += value;
  }
  const maxMissing = Number(entry.maxMissingItems || 0);
  if (missing.length > maxMissing) return {status:'incomplete', missingItems:missing};
  // Missing-item prorating/imputation is intentionally not implemented generically.
  if (missing.length) return {status:'incomplete', missingItems:missing, reason:'measure_specific_missing_rule_required'};
  return {status:'complete', scores:{total}};
}

function mgVerifyScore(resultId, clinicianEmail) {
  clinicianEmail = mgRequireClinician_(clinicianEmail);
  const sheet = mgSheet_(MG.scoresSheet);
  const values = sheet.getDataRange().getValues();
  const map = mgHeaderMap_(values[0] || []);
  const rowIndex = values.findIndex((r, i) => i > 0 && r[map.result_id] === resultId);
  if (rowIndex < 1) throw new Error('score_result_not_found');
  sheet.getRange(rowIndex + 1, map.verified_by + 1).setValue(clinicianEmail);
  sheet.getRange(rowIndex + 1, map.verified_at + 1).setValue(new Date());
  sheet.getRange(rowIndex + 1, map.completion_status + 1).setValue(MG.states.verified);
  mgAudit_({actionId:`verify-score:${resultId}`,operation:'verify_score',outcome:'verified'});
}
