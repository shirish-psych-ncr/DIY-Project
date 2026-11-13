/** Copy-ready chart handoff only. This module makes no network requests. */
function mgGetDraftPreview(draftId, clinicianEmail) {
  clinicianEmail = mgRequireClinician_(clinicianEmail);
  const {row,map} = mgDraftRow_(draftId);
  if (['chart_handoff_reported','cancelled'].includes(row[map.draft_state])) throw new Error('draft_not_reviewable');
  const fingerprint = mgDraftFingerprint_(row,map);
  const previewToken = Utilities.getUuid();
  CacheService.getScriptCache().put(`draft-preview:${draftId}`, JSON.stringify({
    previewToken,clinicianEmail,fingerprint,createdAt:Date.now()
  }),600);
  const draft = JSON.parse(row[map.draft_payload_json] || '{}');
  return {
    draftId,patientReference:row[map.internal_record_id],encounterReference:row[map.encounter_ref],
    templateVersion:row[map.template_version],sourceReferences:JSON.parse(row[map.source_refs] || '[]'),
    draft,state:row[map.draft_state],previewToken,expiresInSeconds:600,
    reviewChecklist:[
      'I verified the Client ID and encounter against the clinical record.',
      'I checked that client report and clinician observation are labeled correctly.',
      'I checked that no unsupported diagnosis, risk assessment, or intervention was added.',
      'I reviewed sources and removed any content that does not belong in the chart.',
      'I reviewed the plan and will sign the final note in the clinical system.'
    ]
  };
}

function mgMarkDraftReviewed(draftId, clinicianEmail, previewToken, checklist) {
  clinicianEmail = mgRequireClinician_(clinicianEmail);
  const cache = CacheService.getScriptCache();
  const previewRaw = cache.get(`draft-preview:${draftId}`);
  if (!previewRaw) throw new Error('draft_preview_missing_or_expired');
  const preview = JSON.parse(previewRaw);
  if (preview.clinicianEmail !== clinicianEmail || preview.previewToken !== previewToken) throw new Error('draft_preview_identity_mismatch');
  if (!Array.isArray(checklist) || checklist.length !== 5 || checklist.some(v => v !== true)) {
    throw new Error('draft_review_checklist_incomplete');
  }
  const {sheet,row,map} = mgDraftRow_(draftId);
  if (preview.fingerprint !== mgDraftFingerprint_(row,map)) throw new Error('draft_changed_after_preview');
  sheet.getRange(map.rowNumber,map.draft_state+1).setValue('reviewed');
  sheet.getRange(map.rowNumber,map.reviewed_by+1).setValue(clinicianEmail);
  sheet.getRange(map.rowNumber,map.reviewed_at+1).setValue(new Date());
  mgAudit_({actionId:`review-draft:${draftId}`,operation:'review_draft',outcome:'reviewed'});
  cache.remove(`draft-preview:${draftId}`);
  return {status:'reviewed'};
}

/** Clinician explicitly approves copying the reviewed draft into the chart. */
function mgApproveDraftForManualHandoff(draftId, clinicianEmail, confirmation) {
  if (!mgFlag_('ENABLE_MANUAL_CHART_HANDOFF')) return {status:'disabled'};
  if (confirmation !== `COPY TO CHART ${draftId}`) throw new Error('explicit_chart_handoff_confirmation_required');
  clinicianEmail = mgRequireClinician_(clinicianEmail);
  const {sheet,row,map} = mgDraftRow_(draftId);
  const reissue = row[map.draft_state] === 'approved_for_manual_handoff' && row[map.approved_by] === clinicianEmail;
  if ((!reissue && row[map.draft_state] !== 'reviewed') ||
      (reissue && row[map.approved_content_hash] !== mgDraftFingerprint_(row,map)) ||
      row[map.reviewed_by] !== clinicianEmail) {
    throw new Error('draft_must_be_reviewed_by_approving_clinician');
  }
  const approvedHash = mgDraftFingerprint_(row,map);
  const token = Utilities.getUuid();
  CacheService.getScriptCache().put(`manual-handoff:${draftId}`,JSON.stringify({token,clinicianEmail,approvedHash}),600);
  sheet.getRange(map.rowNumber,map.approved_by+1).setValue(clinicianEmail);
  sheet.getRange(map.rowNumber,map.approved_at+1).setValue(new Date());
  sheet.getRange(map.rowNumber,map.approved_content_hash+1).setValue(approvedHash);
  sheet.getRange(map.rowNumber,map.draft_state+1).setValue('approved_for_manual_handoff');
  sheet.getRange(map.rowNumber,map.transfer_status+1).setValue('awaiting_manual_handoff');
  sheet.getRange(map.rowNumber,map.transfer_updated_at+1).setValue(new Date());
  mgAudit_({actionId:`approve-copy:${draftId}`,operation:'approve_manual_chart_handoff',outcome:'approved'});
  return {status:'awaiting_manual_handoff',confirmationToken:token,expiresInSeconds:600};
}

/** Records the clinician's attestation after manual chart entry; it is not a receipt from the EHR. */
function mgRecordManualChartHandoff(draftId, clinicianEmail, confirmationToken, attestation) {
  if (!mgFlag_('ENABLE_MANUAL_CHART_HANDOFF')) return {status:'disabled'};
  clinicianEmail = mgRequireClinician_(clinicianEmail);
  if (attestation !== `RECORDED IN CHART ${draftId}`) throw new Error('chart_entry_attestation_required');
  const raw = CacheService.getScriptCache().get(`manual-handoff:${draftId}`);
  if (!raw) throw new Error('chart_handoff_approval_missing_or_expired');
  const token = JSON.parse(raw);
  if (token.clinicianEmail !== clinicianEmail || token.token !== confirmationToken) throw new Error('chart_handoff_identity_mismatch');
  const {sheet,row,map} = mgDraftRow_(draftId);
  if (row[map.draft_state] !== 'approved_for_manual_handoff' || row[map.approved_by] !== clinicianEmail ||
      row[map.approved_content_hash] !== token.approvedHash || token.approvedHash !== mgDraftFingerprint_(row,map)) {
    throw new Error('approved_draft_changed_or_state_invalid');
  }
  sheet.getRange(map.rowNumber,map.transfer_status+1).setValue('therapist_attested_chart_entry');
  sheet.getRange(map.rowNumber,map.draft_state+1).setValue('chart_handoff_reported');
  sheet.getRange(map.rowNumber,map.transfer_receipt+1).setValue('Therapist attestation; no EHR receipt');
  sheet.getRange(map.rowNumber,map.transfer_updated_at+1).setValue(new Date());
  mgAudit_({actionId:`chart-handoff:${draftId}`,operation:'manual_chart_handoff_attested',
    recordRefHash:mgRecordHash_(row[map.internal_record_id]),outcome:'therapist_attested_chart_entry'});
  CacheService.getScriptCache().remove(`manual-handoff:${draftId}`);
  return {status:'therapist_attested_chart_entry',ehrReceipt:false};
}

function mgDraftRow_(draftId) {
  const sheet = mgSheet_(MG.draftsSheet);
  const data = sheet.getDataRange().getValues();
  const map = mgHeaderMap_(data[0] || []);
  const idx = data.findIndex((r,i) => i > 0 && r[map.draft_id] === draftId);
  if (idx < 1) throw new Error('draft_not_found');
  map.rowNumber = idx+1;
  return {sheet,row:data[idx],map};
}

function mgDraftFingerprint_(row,map) {
  const canonical = JSON.stringify({
    draftId:row[map.draft_id],patient:row[map.internal_record_id],encounter:row[map.encounter_ref],
    template:row[map.template_version],sourceRefs:row[map.source_refs],payload:row[map.draft_payload_json]
  });
  return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,canonical));
}
