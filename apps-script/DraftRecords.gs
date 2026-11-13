const MG_DRAFT_HEADERS = [
  'draft_id','request_id','internal_record_id','encounter_ref','template_version','source_refs',
  'draft_payload_json','draft_state','created_by','created_at','approved_by','approved_at',
  'approved_content_hash','reviewed_by','reviewed_at','transfer_status','transfer_receipt','transfer_updated_at'
];

/** Persists only a therapist-authored, source-labelled draft after exact-ID validation. */
function mgCreateDraftRecord(input) {
  if (!input || !input.internalRecordId || !input.encounterRef || !input.templateVersion || !input.payload) {
    throw new Error('draft_required_fields_missing');
  }
  const clinician = mgRequireClinician_(input.clinicianEmail);
  const clientId = String(input.internalRecordId).trim();
  if (!clientId || clientId.length > 100) throw new Error('draft_client_id_invalid');
  const matches = mgFindClientMatches_(clientId);
  if (matches.length !== 1) throw new Error(matches.length ? 'draft_client_id_not_unique' : 'draft_client_id_not_found');
  const encounter = String(input.encounterRef).trim();
  const template = String(input.templateVersion).trim();
  if (encounter.length > 240 || template.length > 120) throw new Error('draft_reference_too_long');
  const sourceRefs = Array.isArray(input.sourceRefs) ? input.sourceRefs.map(x => String(x || '').trim()).filter(Boolean) : [];
  if (sourceRefs.length > 50 || sourceRefs.some(x => x.length > 300)) throw new Error('draft_source_reference_invalid');
  const payloadJson = JSON.stringify(input.payload);
  if (!payloadJson || payloadJson.length > 60000) throw new Error('draft_payload_too_large');
  const sheet = mgSheet_(MG.draftsSheet);
  mgEnsureHeaders_(sheet, MG_DRAFT_HEADERS);
  const requestId = String(input.requestId || '').trim();
  if (!/^[a-z0-9-]{16,80}$/i.test(requestId)) throw new Error('draft_request_id_invalid');
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const existing = sheet.getDataRange().getValues();
    const existingMap = mgHeaderMap_(existing[0] || []);
    const prior = existing.slice(1).find(r => r[existingMap.request_id] === requestId);
    if (prior) {
      if (prior[existingMap.created_by] !== clinician) throw new Error('draft_request_id_identity_mismatch');
      return {draftId:prior[existingMap.draft_id],status:prior[existingMap.draft_state],duplicate:true};
    }
  const draftId = Utilities.getUuid();
  const now = new Date();
  const row = {
    draft_id:draftId,request_id:requestId,internal_record_id:clientId,encounter_ref:encounter,
    template_version:template,source_refs:JSON.stringify(sourceRefs),draft_payload_json:payloadJson,
    draft_state:'draft_requires_review',created_by:clinician,created_at:now,
    approved_by:'',approved_at:'',approved_content_hash:'',reviewed_by:'',reviewed_at:'',
    transfer_status:'not_requested',transfer_receipt:'',transfer_updated_at:''
  };
  sheet.appendRow(MG_DRAFT_HEADERS.map(h => row[h]));
  mgAudit_({actionId:`draft:${draftId}`,operation:'create_session_draft',
    recordRefHash:mgRecordHash_(clientId),outcome:'draft_requires_review'});
  return {draftId,status:'draft_requires_review'};
  } finally {
    lock.releaseLock();
  }
}
