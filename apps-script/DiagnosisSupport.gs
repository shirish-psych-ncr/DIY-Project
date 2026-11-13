const MG_DIAGNOSIS_HEADERS = [
  'diagnosis_id','internal_record_id','code_system','code_system_version','clinician_entered_code',
  'clinician_entered_label','status','supporting_evidence','contrary_or_alternative_evidence',
  'missing_information','clinician_rationale','entered_by','entered_at','reviewed_by','reviewed_at'
];
const MG_PROMPT_HEADERS = [
  'suggestion_id','source_export_id','internal_record_id','candidate_key','candidate_label',
  'triggering_sources_json','classification_references_json','tier_reference','rationale','status',
  'disposition','reviewed_by','reviewed_at','review_note'
];
const MG_IMPORT_HEADERS = [
  'import_id','source_export_id','internal_record_id','source_app','app_version','data_version',
  'locale','generated_at','score_count','prompt_count','import_status','imported_by','imported_at'
];

/** Opens the structured file-import workflow. */
function mgShowAssessmentImport() {
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutputFromFile('AssessmentImport').setWidth(680).setHeight(680),
    'Import therapist-reviewed assessment summary');
}

function mgGetAssessmentImportSettings(clinicianEmail) {
  mgRequireClinician_(clinicianEmail);
  return {scaleImportEnabled:mgFlag_('ENABLE_SCALE_IMPORT'),diagnosticPromptsEnabled:mgFlag_('ENABLE_DIAGNOSTIC_PROMPTS')};
}

/** Imports only summary scores and, when enabled, deterministic differential prompts. */
function mgImportScaleExport(payload, clientId, reviewConfirmed, clinicianEmail) {
  if (!mgFlag_('ENABLE_SCALE_IMPORT')) return {status:'disabled'};
  if (!reviewConfirmed) throw new Error('clinician_review_confirmation_required');
  const clinician = mgRequireClinician_(clinicianEmail);
  if (!clientId || !String(clientId).trim()) throw new Error('client_id_required');
  const matches = mgFindClientMatches_(String(clientId).trim());
  if (matches.length !== 1) throw new Error(matches.length ? 'client_id_not_unique' : 'client_id_not_found');
  mgValidateScaleExport_(payload);
  const sourceExportId = payload.exportId;
  const promptsEnabled = mgFlag_('ENABLE_DIAGNOSTIC_PROMPTS');
  const prompts = promptsEnabled ? payload.differentialPrompts : [];
  const scores = payload.scoreResults;
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const imports = mgSheet_(MG.importsSheet);
    mgEnsureHeaders_(imports, MG_IMPORT_HEADERS);
    const imported = imports.getDataRange().getValues();
    const im = mgHeaderMap_(imported[0] || []);
    if (imported.slice(1).some(r => r[im.source_export_id] === sourceExportId)) {
      throw new Error('assessment_export_already_imported');
    }
    const importId = Utilities.getUuid();
    imports.appendRow(MG_IMPORT_HEADERS.map(h => ({
      import_id:importId,source_export_id:sourceExportId,internal_record_id:String(clientId).trim(),
      source_app:payload.sourceApp,app_version:payload.appVersion,data_version:payload.dataVersion,
      locale:payload.locale,generated_at:new Date(payload.generatedAt),score_count:scores.length,
      prompt_count:prompts.length,import_status:'importing',imported_by:clinician,imported_at:new Date()
    })[h]));
    try {
      const scoreSheet = mgSheet_(MG.scoresSheet);
      mgEnsureHeaders_(scoreSheet, MG_SCORE_HEADERS);
      const now = new Date();
      const rows = scores.map((score,i) => {
        const resultId = Utilities.getUuid();
        const ref = `${sourceExportId}:${score.measureId}`;
        return MG_SCORE_HEADERS.map(h => ({
          result_id:resultId,source_submission_id:`assessment:${sourceExportId}`,
          measure_id:score.measureId,version:payload.dataVersion,locale:payload.locale,
          score_payload:JSON.stringify({measureLabel:score.measureLabel,outputs:score.outputs}),
          algorithm_version:`EPCSS data ${payload.dataVersion}`,completion_status:MG.states.verified,
          source_system:'EPCSS browser export',source_result_ref:ref,
          administered_at:new Date(payload.generatedAt),calculated_at:now,
          calculated_by:'EPCSS browser scorer',verified_by:clinician,verified_at:now
        })[h]);
      });
      if (rows.length) scoreSheet.getRange(scoreSheet.getLastRow()+1,1,rows.length,MG_SCORE_HEADERS.length).setValues(rows);
      if (prompts.length) {
        const promptSheet = mgSheet_(MG.promptsSheet);
        mgEnsureHeaders_(promptSheet, MG_PROMPT_HEADERS);
        const promptRows = prompts.map((prompt,i) => MG_PROMPT_HEADERS.map(h => ({
          suggestion_id:`${sourceExportId}:${i+1}`,source_export_id:sourceExportId,
          internal_record_id:String(clientId).trim(),candidate_key:prompt.key,
          candidate_label:prompt.label,triggering_sources_json:JSON.stringify(prompt.sources),
          classification_references_json:JSON.stringify(prompt.references || {}),
          tier_reference:prompt.tier,rationale:prompt.rationale,status:'pending_clinician_review',disposition:'',
          reviewed_by:'',reviewed_at:'',review_note:''
        })[h]));
        promptSheet.getRange(promptSheet.getLastRow()+1,1,promptRows.length,MG_PROMPT_HEADERS.length).setValues(promptRows);
      }
      const importRow = imports.getLastRow();
      imports.getRange(importRow,im.import_status+1).setValue('imported_reviewed_summary');
      mgAudit_({actionId:`scale-import:${importId}`,operation:'import_scale_summary',
        sourceId:sourceExportId,recordRefHash:mgRecordHash_(clientId),outcome:'imported_reviewed_summary'});
      return {status:'imported_reviewed_summary',importId,scoreCount:scores.length,promptCount:prompts.length};
    } catch (err) {
      const importRow = imports.getLastRow();
      imports.getRange(importRow,im.import_status+1).setValue('import_failed_reconcile');
      mgAudit_({actionId:`scale-import-error:${importId}`,operation:'import_scale_summary',
        sourceId:sourceExportId,recordRefHash:mgRecordHash_(clientId),outcome:'import_failed_reconcile',errorCode:'partial_import'});
      throw err;
    }
  } finally {
    lock.releaseLock();
  }
}

function mgValidateScaleExport_(payload) {
  if (!payload || payload.format !== 'mind-grace-epcss-clinician-handoff' || payload.exportVersion !== 1 ||
      !payload.exportId || !payload.sourceApp || !payload.appVersion || !payload.dataVersion ||
      payload.resultStatus !== 'requires_clinician_verification' ||
      !['en','hi'].includes(payload.locale) || !Number.isFinite(new Date(payload.generatedAt).getTime()) ||
      !Array.isArray(payload.scoreResults) || !Array.isArray(payload.differentialPrompts)) {
    throw new Error('assessment_export_schema_invalid');
  }
  if (!payload.scoreResults.length || payload.scoreResults.length > 250 || payload.differentialPrompts.length > 100) {
    throw new Error('assessment_export_size_invalid');
  }
  payload.scoreResults.forEach(row => {
    if (!row || !/^[a-z0-9_:-]{1,100}$/i.test(String(row.measureId || '')) ||
        !Array.isArray(row.outputs) || !row.outputs.length || row.outputs.length > 50) {
      throw new Error('assessment_export_score_invalid');
    }
    row.outputs.forEach(output => {
      if (!output || !String(output.name || '').trim() || String(output.name).length > 240 ||
          String(output.score || '').length > 500 || String(output.severity || '').length > 1000 ||
          String(output.sourceNote || '').length > 3000) throw new Error('assessment_export_output_invalid');
    });
  });
  payload.differentialPrompts.forEach(prompt => {
    if (!prompt || !/^[a-z0-9_:-]{1,100}$/i.test(String(prompt.key || '')) ||
        !String(prompt.label || '').trim() || String(prompt.label).length > 240 ||
        !String(prompt.rationale || '').trim() || String(prompt.rationale).length > 1000 ||
        !Array.isArray(prompt.sources) || !prompt.sources.length || prompt.sources.length > 40 ||
        !Number.isInteger(prompt.tier) || prompt.tier < 0 || prompt.tier > 100 ||
        !prompt.references || typeof prompt.references !== 'object') throw new Error('assessment_export_prompt_invalid');
  });
}

function mgReviewDiagnosticPrompt(suggestionId, disposition, reviewNote, clinicianEmail) {
  if (!mgFlag_('ENABLE_DIAGNOSTIC_PROMPTS')) return {status:'disabled'};
  const clinician = mgRequireClinician_(clinicianEmail);
  const allowed = ['considered','not_relevant','needs_follow_up','deferred'];
  if (!allowed.includes(disposition)) throw new Error('diagnostic_prompt_disposition_invalid');
  const sheet = mgSheet_(MG.promptsSheet);
  const rows = sheet.getDataRange().getValues();
  const map = mgHeaderMap_(rows[0] || []);
  const idx = rows.findIndex((r,i) => i > 0 && r[map.suggestion_id] === suggestionId);
  if (idx < 1) throw new Error('diagnostic_prompt_not_found');
  sheet.getRange(idx+1,map.status+1).setValue('reviewed');
  sheet.getRange(idx+1,map.disposition+1).setValue(disposition);
  sheet.getRange(idx+1,map.reviewed_by+1).setValue(clinician);
  sheet.getRange(idx+1,map.reviewed_at+1).setValue(new Date());
  sheet.getRange(idx+1,map.review_note+1).setValue(String(reviewNote || '').slice(0,2000));
  mgAudit_({actionId:`review-prompt:${suggestionId}`,operation:'review_diagnostic_prompt',
    outcome:disposition});
  return {suggestionId,status:'reviewed',disposition};
}

function mgGetDiagnosticPromptRows(clinicianEmail) {
  mgRequireClinician_(clinicianEmail);
  if (!mgFlag_('ENABLE_DIAGNOSTIC_PROMPTS')) return {enabled:false,items:[]};
  const sheet = mgSheet_(MG.promptsSheet);
  const values = sheet.getDataRange().getValues();
  const map = mgHeaderMap_(values[0] || []);
  return {enabled:true,items:values.slice(1).filter(r => r[map.suggestion_id])
    .map(r => ({suggestionId:r[map.suggestion_id],clientId:r[map.internal_record_id],
      label:r[map.candidate_label],sources:JSON.parse(r[map.triggering_sources_json] || '[]'),
      rationale:r[map.rationale] || '',references:JSON.parse(r[map.classification_references_json] || '{}'),
      tier:r[map.tier_reference],status:r[map.status],disposition:r[map.disposition]}))};
}

/** Adds a clinician-authored candidate only. No diagnosis inference or auto-commit. */
function mgSaveClinicianDiagnosis(input) {
  if (!mgFlag_('ENABLE_DIAGNOSIS_SUPPORT')) return {status:'disabled'};
  const allowed = ['working_hypothesis','deferred','ruled_out','clinician_confirmed','not_applicable'];
  if (!input || !input.internalRecordId || !input.codeSystem || !input.clinicianEnteredCode || !input.clinicianEnteredLabel) {
    throw new Error('diagnosis_required_fields_missing');
  }
  const clinician = mgRequireClinician_(input.clinicianEmail);
  if (!allowed.includes(input.status)) throw new Error('diagnosis_status_invalid');
  if (!input.clinicianRationale || String(input.clinicianRationale).trim().length < 10) {
    throw new Error('clinician_rationale_required');
  }
  const sheet = mgSheet_('Diagnosis Support');
  mgEnsureHeaders_(sheet, MG_DIAGNOSIS_HEADERS);
  const id = Utilities.getUuid();
  const now = new Date();
  const values = {
    diagnosis_id:id, internal_record_id:input.internalRecordId,
    code_system:input.codeSystem, code_system_version:input.codeSystemVersion || '',
    clinician_entered_code:input.clinicianEnteredCode,
    clinician_entered_label:input.clinicianEnteredLabel, status:input.status,
    supporting_evidence:input.supportingEvidence || '',
    contrary_or_alternative_evidence:input.alternativeEvidence || '',
    missing_information:input.missingInformation || '',
    clinician_rationale:input.clinicianRationale, entered_by:clinician, entered_at:now,
    reviewed_by:'', reviewed_at:''
  };
  sheet.appendRow(MG_DIAGNOSIS_HEADERS.map(h => values[h]));
  mgAudit_({actionId:`diagnosis:${id}`,operation:'save_clinician_diagnosis',
    recordRefHash:mgRecordHash_(input.internalRecordId),outcome:'clinician_entered'});
  return {diagnosisId:id,status:input.status};
}

function mgReviewDiagnosis(diagnosisId, clinicianEmail) {
  clinicianEmail = mgRequireClinician_(clinicianEmail);
  const sheet = mgSheet_('Diagnosis Support');
  const values = sheet.getDataRange().getValues();
  const map = mgHeaderMap_(values[0] || []);
  const idx = values.findIndex((r, i) => i > 0 && r[map.diagnosis_id] === diagnosisId);
  if (idx < 1) throw new Error('diagnosis_record_not_found');
  sheet.getRange(idx + 1, map.reviewed_by + 1).setValue(clinicianEmail);
  sheet.getRange(idx + 1, map.reviewed_at + 1).setValue(new Date());
  mgAudit_({actionId:`review-diagnosis:${diagnosisId}`,operation:'review_diagnosis',outcome:'reviewed'});
}
