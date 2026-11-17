const MG_CATALOG_HEADERS = ['category','choice','guidance','active'];
const MG_CATALOG_BINDING_HEADERS = ['sheet_name','target_range','category','active','last_applied','apply_status'];
const MG_CATALOG = Object.freeze({
  ENCOUNTER_TYPE: ['Initial intake','Individual','Individual therapy','Couple/family session','Couple / family','Child/family session','Child / family','Caregiver consultation','Assessment feedback','Treatment-plan review','Brief follow-up','Discharge/transition','Other'],
  NOTE_FORMAT: ['DAP','SOAP','BIRP','GIRP','SOAP-DAP hybrid','Clinic-specific format','Other'],
  MODALITY: ['In person','Video','Telephone','Hybrid','Collateral contact','Administrative only','Other'],
  PARTICIPATION: ['Client only','Client and support person','Couple/partners','Family group','Caregiver only','Interpreter/communication support present','Other'],
  CONTACT_MODE: ['In person','Video','Telephone','Secure clinic messaging','Authorized collateral contact','No contact attempted','Other'],
  SOURCE_CERTAINTY: ['Client report','Informant report','Existing record reviewed','Clinician observed','Clinician hypothesis','Conflicting accounts','Not independently verified','Not assessed','Client declined/deferred','Not applicable'],
  APPEARANCE_SELF_CARE: ['Appropriate to setting','Casual attire','Formal attire','Self-care appeared maintained','Self-care appeared reduced (describe context)','Distinctive attire (describe neutrally)','Not assessed','Unable to assess','Other'],
  SESSION_FOCUS: ['Review recent events','Explore client-selected concern','Understand a pattern or trigger','Review goals','Practice/adapt a skill','Plan a manageable next step','Relationship/communication','Therapy pace or fit','Barriers/access needs','Care coordination','Supportive conversation','Assessment/feedback','Other/client-led'],
  INTAKE_DOMAIN: ['Presenting concern and client-stated goal','Timeline, context, course and change','Prior support and current care team','Physical health and relevant treatment context','Sleep, energy, appetite and routines','Mood, worry, attention, coping and daily functioning','Relationships, family, peers and social supports','Work, study, housing and practical needs','Culture, language, identity, spirituality or community (client-defined)','Developmental, learning or neurodiversity context (when relevant)','Strengths, interests, values and meaning','Preferences, accommodations, privacy and communication needs','Safety/support discussion (clinician assessment and follow-up as indicated)','Other/client-led'],
  MSE_ENGAGEMENT: ['Engaged','Cooperative','Guarded','Reserved','Restless','Slowed','Tearful','Irritable','Distractible','Varied by topic/context','Not assessed','Unable to assess','Other'],
  MSE_SPEECH: ['Typical rate','Faster than expected for context','Slower than expected for context','Quiet','Loud','Brief responses','Increased amount','Pauses/latency','Not assessed','Unable to assess','Other'],
  MOOD_REPORTED: ['Neutral/okay','Low/sad','Anxious/worried','Irritable/frustrated','Calm/settled','Hopeful/positive','Mixed/variable','Client wording to be entered','Not assessed','Other'],
  AFFECT_OBSERVED: ['Broad range','Constricted','Limited range','Tearful','Anxious appearance','Irritable appearance','Bright/animated','Congruent with discussed content','Other/describe','Not assessed','Unable to assess'],
  THOUGHT_PROCESS: ['Coherent and goal-directed','Circumstantial detail','Tangential at times','Pauses or loses train of thought','Difficult to follow (describe concretely)','Varied by topic/context','Not assessed','Unable to assess','Other'],
  THOUGHT_CONTENT_STATUS: ['No concern reported in this discussion','Concern described; follow-up documented in approved record','Not assessed','Unable to assess','Client declined/deferred','Other (describe neutrally)'],
  PERCEPTION_STATUS: ['No concern reported in this discussion','Experience described; follow-up documented in approved record','Not assessed','Unable to assess','Client declined/deferred','Other (describe neutrally)'],
  COGNITION_STATUS: ['No observation recorded','Attention varied by task/context','Memory concern described (source specified)','Orientation/cognition assessed in approved record','Not assessed','Unable to assess','Other (describe observation)'],
  INSIGHT_DECISION_CONTEXT: ['Discussed with client; context documented','Decision-making relevant to this encounter; context documented','Not assessed','Unable to assess','Other'],
  SAFETY_DOCUMENTATION: ['Not assessed this encounter','Direct discussion; assessment documented in approved clinical record','Further direct assessment planned (owner/date)','Consult/escalation completed under clinic protocol','Deferred/unable to assess (reason and plan)','Not applicable to this note'],
  FORMULATION_STATUS: ['Client perspective recorded','Working hypothesis (therapist-authored)','Alternative explanation considered','Missing information identified','Client correction incorporated','Deferred','Not assessed','Not applicable'],
  GOAL_STATUS: ['Not started','Exploring with client','Active','Progressing','Some progress/variable','No change reported/observed','Goal revised by agreement','Paused by agreement','Completed by agreement','Deferred','Discontinued by agreement','Not assessed'],
  PROGRESS_SOURCE: ['Client report','Clinician observation','Goal-specific behavior/data','Authorized measure (record name/version/date)','Informant report','Mixed/unclear','Not assessed'],
  NEXT_STEP: ['Practice a skill discussed in session','Observe/record a pattern','Try a small valued action','Communication/boundary practice','Routine/self-care adjustment','Seek support/coordinate care','Review information next session','No between-session task planned','Other/client declined'],
  FOLLOWUP_STATUS: ['No follow-up task','Client requested contact','Therapist follow-up task created','Appointment coordination requested','Awaiting client response','Scheduled in approved calendar','Completed','Cancelled/unable to reach (document per policy)','Deferred'],
  GOAL_AREA: ['Client-defined priority','Mood and emotional wellbeing','Worry/stress management','Daily functioning/routines','Relationships/communication','Sleep/rest','Coping and emotion regulation','Meaning/values/quality of life','Work/study participation','Health behavior/support access','Family/caregiver support','Other/client-defined'],
  INTERVENTION: ['Supportive listening/validation','Collaborative agenda setting','Psychoeducation (specify topic)','Emotion identification/regulation practice','Grounding/present-moment practice','Cognitive exploration/reappraisal','Behavioral activation/activity planning','Exposure-related planning/review (describe)','Problem-solving','Communication/interpersonal practice','Values clarification/committed action','Mindfulness practice','Motivational exploration','Strengths/resource mapping','Family/caregiver collaboration','Care coordination','Other/describe','No specific intervention'],
  BARRIER_ACCESS: ['Scheduling/time','Cost/financial access','Transport/distance/mobility','Privacy/safe space','Device/connectivity','Language/interpreter','Reading/writing/communication access','Hearing/vision/sensory access','Health/pain/fatigue/energy','Memory/planning/task initiation','Caregiving/work/study demands','Cultural/family/community context','Treatment pace/fit','Task not relevant or too large','No current barrier identified','Not assessed','Client declined','Other'],
  REVIEW_STATUS: ['Received','Duplicate check pending','Unmatched identity','Assigned','In review','Reviewed—no chart entry needed','Reviewed—summary prepared','Needs correction/clarification','Closed','Exception/automation failed'],
  NOTE_STATUS: ['Not started','Draft generated','Clinician review required','Approved for signature in clinical system','Signed in clinical system (therapist attested)','Correction/addendum required'],
  TRANSFER_STATUS: ['Not requested','Preview ready','Awaiting therapist copy confirmation','Therapist attested chart entry (not EHR receipt)','Failed/manual follow-up required','Unknown/reconcile before retry','Cancelled'],
  DIAGNOSIS_STATUS: ['Working hypothesis','Deferred','Ruled out','Clinician confirmed','Not applicable'],
  CERTAINTY: ['Confirmed source','Client-reported','Informant-reported','Clinician observation','Working hypothesis','Unclear/needs follow-up','Not assessed','Not applicable']
});

/** Returns active neutral choices for the clinician one-screen flow. */
function mgGetOneScreenWorkflowChoices_() {
  const book = mgSpreadsheet_();
  const sheet = book.getSheetByName('Therapist Catalog');
  const choices = Object.fromEntries(Object.keys(MG_CATALOG).map(key => [key, []]));
  if (!sheet || sheet.getLastRow() < 2) {
    Object.keys(MG_CATALOG).forEach(key => { choices[key] = MG_CATALOG[key].slice(); });
    return choices;
  }
  const rows = sheet.getRange(2,1,sheet.getLastRow()-1,MG_CATALOG_HEADERS.length).getValues();
  rows.forEach(row => {
    const category = String(row[0] || '').trim();
    const choice = String(row[1] || '').trim();
    const active = row[3] === true || String(row[3]).toUpperCase() === 'TRUE';
    if (active && choices[category] && choice && !choices[category].includes(choice)) choices[category].push(choice);
  });
  Object.keys(MG_CATALOG).forEach(key => {
    if (!choices[key].length) choices[key] = MG_CATALOG[key].slice();
  });
  return choices;
}

function mgSeedTherapistCatalog() {
  const book = mgSpreadsheet_();
  const dataSheet = book.getSheetByName('Therapist Catalog') || book.insertSheet('Therapist Catalog');
  mgEnsureHeaders_(dataSheet, MG_CATALOG_HEADERS);
  const existing = dataSheet.getLastRow() > 1
    ? dataSheet.getRange(2, 1, dataSheet.getLastRow() - 1, 2).getDisplayValues()
    : [];
  const keys = new Set(existing.map(r => `${r[0]}\u0000${r[1]}`));
  const append = [];
  Object.entries(MG_CATALOG).forEach(([category, choices]) => choices.forEach(choice => {
    const key = `${category}\u0000${choice}`;
    if (!keys.has(key)) append.push([category,choice,'Neutral workflow choice; add context in the adjacent narrative field.',true]);
  }));
  if (append.length) dataSheet.getRange(dataSheet.getLastRow() + 1, 1, append.length, MG_CATALOG_HEADERS.length).setValues(append);
  dataSheet.setFrozenRows(1);

  const categoryKeys = Object.keys(MG_CATALOG);
  const catalogRows = dataSheet.getLastRow() > 1
    ? dataSheet.getRange(2,1,dataSheet.getLastRow()-1,MG_CATALOG_HEADERS.length).getValues()
    : [];
  const choicesByCategory = Object.fromEntries(categoryKeys.map(k => [k, []]));
  catalogRows.forEach(r => {
    const category = String(r[0] || '');
    const choice = String(r[1] || '').trim();
    const active = r[3] === true || String(r[3]).toUpperCase() === 'TRUE';
    if (choicesByCategory[category] && choice && active) choicesByCategory[category].push(choice);
  });
  const listSheet = book.getSheetByName('System Choice Lists') || book.insertSheet('System Choice Lists');
  const currentHeaders = listSheet.getLastRow() ? listSheet.getRange(1,1,1,Math.max(1,listSheet.getLastColumn())).getDisplayValues()[0] : [];
  if (listSheet.getLastRow() > 1 && currentHeaders.some(Boolean) && currentHeaders.some((h,i) => h && h !== categoryKeys[i])) {
    throw new Error('choice_lists_schema_conflict; existing tab left unchanged');
  }
  const matrix = [categoryKeys];
  const max = Math.max(...categoryKeys.map(k => choicesByCategory[k].length));
  for (let i=0;i<max;i++) matrix.push(categoryKeys.map(k => choicesByCategory[k][i] || ''));
  // This tab is generated and owned by this script; never clear the editable Therapist Catalog tab.
  listSheet.clearContents();
  listSheet.getRange(1,1,matrix.length,matrix[0].length).setValues(matrix);
  listSheet.setFrozenRows(1);
  categoryKeys.forEach((key,i) => {
    const name = `MG_${key}`;
    const prior = book.getNamedRanges().find(n => n.getName() === name);
    if (prior) prior.remove();
    if (choicesByCategory[key].length) {
      const target = listSheet.getRange(2,i+1,choicesByCategory[key].length,1);
      book.setNamedRange(name,target);
    }
  });
  return {catalogRowsAdded:append.length,categories:categoryKeys.length,choiceLists:'refreshed'};
}

/** Wire a therapist dropdown to a named catalog list. Allows free text values. */
function mgApplyCatalogDropdown(sheetName, targetA1, categoryKey) {
  if (!Object.prototype.hasOwnProperty.call(MG_CATALOG, categoryKey)) throw new Error('catalog_category_unknown');
  const sheet = mgSpreadsheet_().getSheetByName(sheetName);
  if (!sheet) throw new Error(`target_sheet_missing_${sheetName}`);
  const list = mgSpreadsheet_().getRangeByName(`MG_${categoryKey}`);
  if (!list) throw new Error(`catalog_named_range_missing_${categoryKey}`);
  const rule = SpreadsheetApp.newDataValidation().requireValueInRange(list,true).setAllowInvalid(true).build();
  sheet.getRange(targetA1).setDataValidation(rule);
  return {sheet:sheetName,range:targetA1,catalog:categoryKey,freeTextAllowed:true};
}

/** Applies only explicit admin-entered bindings. Invalid rows remain visible. */
function mgApplyConfiguredCatalogDropdowns() {
  const book = mgSpreadsheet_();
  const sheet = book.getSheetByName(MG.bindingsSheet);
  if (!sheet) throw new Error('catalog_bindings_sheet_missing_run_setup_first');
  mgEnsureHeaders_(sheet, MG_CATALOG_BINDING_HEADERS);
  const values = sheet.getDataRange().getValues();
  const map = mgHeaderMap_(values[0] || []);
  const results = [];
  values.slice(1).forEach((row, i) => {
    const rowNumber = i + 2;
    const active = row[map.active] === true || String(row[map.active]).toUpperCase() === 'TRUE';
    if (!active) return;
    try {
      const result = mgApplyCatalogDropdown(String(row[map.sheet_name] || '').trim(),
        String(row[map.target_range] || '').trim(), String(row[map.category] || '').trim());
      sheet.getRange(rowNumber, map.last_applied + 1).setValue(new Date());
      sheet.getRange(rowNumber, map.apply_status + 1).setValue('applied_free_text_allowed');
      results.push({row:rowNumber,status:'applied',...result});
    } catch (err) {
      const code = String(err && err.message || 'catalog_binding_failed').slice(0,120);
      sheet.getRange(rowNumber, map.apply_status + 1).setValue(`error:${code}`);
      results.push({row:rowNumber,status:'error',error:code});
    }
  });
  return {processed:results.length,results};
}

/**
 * Seeds only verified structured input cells from the supplied workbook template.
 * The new rows are inactive so a reviewer can inspect them before application.
 * Existing bindings and their active states are never overwritten.
 */
function mgSeedVerifiedTemplateBindings() {
  const book = mgSpreadsheet_();
  const sheet = book.getSheetByName(MG.bindingsSheet);
  if (!sheet) throw new Error('catalog_bindings_sheet_missing_run_setup_first');
  mgEnsureHeaders_(sheet, MG_CATALOG_BINDING_HEADERS);
  const seeds = [
    ['Session Note Builder','B8','ENCOUNTER_TYPE','Session type'],
    ['Session Note Builder','B9','NOTE_FORMAT','Note format'],
    ['Session Note Builder','B16','INTERVENTION','Interventions used'],
    ['MSE Builder','B11','MSE_ENGAGEMENT','Behavior'],
    ['MSE Builder','B12','MSE_SPEECH','Speech'],
    ['MSE Builder','B13','MOOD_REPORTED','Mood (reported)'],
    ['MSE Builder','B14','AFFECT_OBSERVED','Affect (observed)'],
    ['MSE Builder','B15','THOUGHT_PROCESS','Thought process'],
    ['MSE Builder','B16','THOUGHT_CONTENT_STATUS','Thought content'],
    ['MSE Builder','B17','PERCEPTION_STATUS','Perception'],
    ['MSE Builder','B18','COGNITION_STATUS','Cognition'],
    ['MSE Builder','B19','INSIGHT_DECISION_CONTEXT','Insight and judgment'],
    ['MSE Builder','B20','SAFETY_DOCUMENTATION','Safety/risk review']
  ];
  const existing = sheet.getLastRow() > 1
    ? sheet.getRange(2,1,sheet.getLastRow()-1,MG_CATALOG_BINDING_HEADERS.length).getValues()
    : [];
  const keys = new Set(existing.map(r => `${String(r[0]).trim()}\u0000${String(r[1]).trim()}`));
  const append = seeds.filter(r => !keys.has(`${r[0]}\u0000${r[1]}`))
    .map(([tab,range,category,label]) => [tab,range,category,false,'',`proposed_inactive:${label}`]);
  if (append.length) sheet.getRange(sheet.getLastRow()+1,1,append.length,MG_CATALOG_BINDING_HEADERS.length).setValues(append);
  return {added:append.length,alreadyPresent:seeds.length-append.length,active:false,
    note:'Review each target and exact label in the test copy; activate manually after review.'};
}
