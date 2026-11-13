/** Build a draft only from therapist-reviewed, explicitly supplied fields. */
function mgBuildSessionDraft(input) {
  if (!mgFlag_('ENABLE_DRAFT_BUILDER')) return {status:'disabled'};
  if (!input || !input.internalRecordId || !input.encounterRef || !input.requestId) throw new Error('draft_context_required');
  const clinician = mgRequireClinician_(input.clinicianEmail);
  const clientReport = mgCleanDraftLines_(input.clientReport, 'Client reported');
  const clinicianObservation = mgCleanDraftLines_(input.clinicianObservation, 'Clinician observed');
  const interventions = mgCleanDraftLines_(input.interventions, 'Intervention delivered');
  const progress = mgCleanDraftLines_(input.progress, 'Progress evidence');
  const plan = mgCleanDraftLines_(input.plan, 'Agreed next step');
  const sections = [];
  if (clientReport.length) sections.push({heading:'Client report',lines:clientReport});
  if (clinicianObservation.length) sections.push({heading:'Clinician observation',lines:clinicianObservation});
  if (interventions.length) sections.push({heading:'Session work',lines:interventions});
  if (progress.length) sections.push({heading:'Goal progress',lines:progress});
  if (plan.length) sections.push({heading:'Plan',lines:plan});
  if (!sections.length) throw new Error('empty_draft_not_created');
  const text = sections.map(s => `${s.heading}\n${s.lines.map(x => `• ${x}`).join('\n')}`).join('\n\n');
  return mgCreateDraftRecord({
    requestId:input.requestId,internalRecordId:input.internalRecordId, encounterRef:input.encounterRef,
    templateVersion:'session-note-v1', sourceRefs:input.sourceRefs || [], clinicianEmail:clinician,
    payload:{documentType:'session_note',workflowState:'therapist_reviewed_draft',
      finalization:'requires_clinician_signing_in_EHR',sections,text,
      diagnosis:null,safetyAssessment:null}
  });
}

function mgCleanDraftLines_(values, label) {
  if (!Array.isArray(values)) return [];
  return values.map(x => String(x || '').trim()).filter(Boolean).map(x => {
    if (x.length > 4000) throw new Error(`draft_field_too_long_${label.toLowerCase().replace(/\s+/g,'_')}`);
    return x;
  });
}
