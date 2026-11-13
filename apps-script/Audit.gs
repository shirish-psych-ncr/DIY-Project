const MG_AUDIT_HEADERS = [
  'action_id','operation','source_id','record_ref_hash','actor','started_at',
  'completed_at','outcome','error_code','attempt'
];

function mgAudit_(event) {
  const sheet = mgSheet_(MG.auditSheet);
  mgEnsureHeaders_(sheet, MG_AUDIT_HEADERS);
  const now = new Date();
  sheet.appendRow([
    event.actionId || Utilities.getUuid(), event.operation || '', event.sourceId || '',
    event.recordRefHash || '', event.actor || mgActor_(), event.startedAt || now,
    event.completedAt || now, event.outcome || '', mgSafeError_(event.errorCode || ''),
    Number(event.attempt || 1)
  ]);
}

function mgHasAudit_(actionId, outcomes) {
  const sheet = mgSheet_(MG.auditSheet);
  mgEnsureHeaders_(sheet, MG_AUDIT_HEADERS);
  const values = sheet.getDataRange().getValues();
  const idx = mgHeaderMap_(values[0] || []).action_id;
  const outcomeIdx = mgHeaderMap_(values[0] || []).outcome;
  return values.slice(1).some(r => r[idx] === actionId && outcomes.includes(r[outcomeIdx]));
}

function mgActor_() {
  return Session.getActiveUser().getEmail() || 'trigger_owner_unavailable';
}

function mgRequireClinician_(requestedEmail) {
  const active = Session.getActiveUser().getEmail();
  if (!active || (requestedEmail && String(requestedEmail).toLowerCase() !== active.toLowerCase())) {
    throw new Error('active_clinician_identity_unavailable_or_mismatched');
  }
  const allowed = (mgProperties_().getProperty('AUTHORIZED_CLINICIANS') || '')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  if (!allowed.includes(active.toLowerCase())) throw new Error('clinician_not_authorized');
  return active;
}

function mgRecordHash_(recordId) {
  if (!recordId) return '';
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(recordId));
  return Utilities.base64EncodeWebSafe(bytes).slice(0, 16);
}

function mgSafeError_(value) {
  return String(value || '').replace(/[\r\n\t]/g, ' ').slice(0, 120);
}

function mgEnsureHeaders_(sheet, headers) {
  const lastCol = Math.max(sheet.getLastColumn(), headers.length);
  const existing = sheet.getLastRow() ? sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0] : [];
  if (!existing.length || existing.every(v => !v)) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return;
  }
  const missing = headers.filter(h => !existing.includes(h));
  if (missing.length) throw new Error(`header_schema_mismatch_${sheet.getName()}`);
}

function mgHeaderMap_(headers) {
  const map = {};
  headers.forEach((h, i) => { if (h) map[String(h).trim()] = i; });
  return map;
}
