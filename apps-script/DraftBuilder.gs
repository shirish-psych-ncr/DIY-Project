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
  const requestedFormat = String(input.noteFormat || 'Source-labelled').trim();
  const noteFormat = (MG_CATALOG.NOTE_FORMAT || []).includes(requestedFormat) ? requestedFormat : 'Source-labelled';
  const hasClinicalContent = clientReport.some(line => !/^(Visit type|Modality|Participants|Information source):/.test(line)) ||
    clinicianObservation.length > 0 || interventions.length > 0 || progress.length > 0 ||
    plan.some(line => !/^Safety documentation workflow status:/.test(line));
  if (!hasClinicalContent) throw new Error('draft_clinical_content_required');
  const sections = [];
  const add = (heading, lines) => { if (lines.length) sections.push({heading,lines}); };
  if (noteFormat === 'DAP') {
    add('Data',clientReport.concat(clinicianObservation,interventions));
    add('Assessment (therapist-entered)',progress);
    add('Plan',plan);
  } else if (noteFormat === 'SOAP' || noteFormat === 'SOAP-DAP hybrid') {
    add('Subjective',clientReport);
    add('Objective',clinicianObservation.concat(interventions));
    add('Assessment (therapist-entered)',progress);
    add('Plan',plan);
  } else if (noteFormat === 'BIRP') {
    add('Behavior / client report',clientReport.concat(clinicianObservation));
    add('Intervention',interventions);
    add('Response / progress evidence',progress);
    add('Plan',plan);
  } else if (noteFormat === 'GIRP') {
    add('Goal / progress',clientReport.concat(progress));
    add('Intervention',interventions);
    add('Response / observations',clinicianObservation);
    add('Plan',plan);
  } else {
    add('Client report',clientReport);
    add('Clinician observation',clinicianObservation);
    add('Session work',interventions);
    add('Goal progress',progress);
    add('Plan',plan);
  }
  if (!sections.length) throw new Error('empty_draft_not_created');
  const text = [`Note format: ${noteFormat}`,sections.map(s => `${s.heading}\n${s.lines.map(x => `• ${x}`).join('\n')}`).join('\n\n')].join('\n\n');
  return mgCreateDraftRecord({
    requestId:input.requestId,internalRecordId:input.internalRecordId, encounterRef:input.encounterRef,
    templateVersion:`one-screen-${noteFormat.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-v1`, sourceRefs:input.sourceRefs || [], clinicianEmail:clinician,
    payload:{documentType:'session_note',workflowState:'therapist_reviewed_draft',
      finalization:'requires_clinician_signing_in_EHR',noteFormat,sections,text,
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
