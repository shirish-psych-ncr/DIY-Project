function onOpen() {
  SpreadsheetApp.getUi().createMenu('Mind Grace Workflow')
    .addItem('Prepare workflow tabs', 'mgSetupWorkflowSheets')
    .addItem('Seed therapist choice catalogs', 'mgSeedTherapistCatalog')
    .addItem('Propose verified template dropdowns (inactive)', 'mgSeedVerifiedTemplateBindings')
    .addItem('Apply configured therapist dropdowns', 'mgApplyConfiguredCatalogDropdowns')
    .addItem('Check automation health', 'mgAutomationHealth')
    .addItem('Review incoming items', 'mgShowReviewQueue')
    .addItem('Import clinician-reviewed scale summary', 'mgShowAssessmentImport')
    .addItem('Review differential prompts', 'mgShowDiagnosticPromptReview')
    .addItem('Prepare session note draft', 'mgShowSessionDraftBuilder')
    .addItem('Review selected chart draft', 'mgShowDraftHandoff')
    .addSeparator()
    .addItem('Create form-submit trigger', 'mgInstallFormSubmitTrigger')
    .addItem('Create queue reminder trigger', 'mgInstallQueueReminderTrigger')
    .addToUi();
}

/** Creates only missing workflow tabs; never edits the raw response tab. */
function mgSetupWorkflowSheets() {
  const book = mgSpreadsheet_();
  if (!book.getSheetByName(MG.sourceSheet)) throw new Error('source_form_response_sheet_missing');
  const schemas = [
    [MG.queueSheet, MG_QUEUE_HEADERS], [MG.auditSheet, MG_AUDIT_HEADERS],
    [MG.scoresSheet, MG_SCORE_HEADERS], [MG.draftsSheet, MG_DRAFT_HEADERS],
    [MG.diagnosisSheet, MG_DIAGNOSIS_HEADERS],
    [MG.promptsSheet, MG_PROMPT_HEADERS], [MG.importsSheet, MG_IMPORT_HEADERS],
    [MG.measureRegistrySheet, ['measure_id','version','locale','algorithm','algorithm_version','rights_status','enabled','spec_reference','item_spec_json','output_keys_json','review_owner','reviewed_at']],
    [MG.configSheet, ['setting','value','owner','reviewed_at']],
    [MG.bindingsSheet, MG_CATALOG_BINDING_HEADERS]
  ];
  schemas.forEach(([name, headers]) => {
    const sheet = book.getSheetByName(name) || book.insertSheet(name);
    mgEnsureHeaders_(sheet, headers);
    sheet.setFrozenRows(1);
  });
  mgSeedTherapistCatalog();
  return {createdOrVerified:schemas.map(x => x[0]).concat(['Therapist Catalog','System Choice Lists']), rawResponseTabChanged:false};
}

/** Admin runs after setting WORKBOOK_ID. Disabled automation flags remain off. */
function mgInstallFormSubmitTrigger() {
  if (!mgProperties_().getProperty('WORKBOOK_ID')) throw new Error('set_WORKBOOK_ID_first');
  const book = mgSpreadsheet_();
  const exists = ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'mgOnFormSubmit' && t.getTriggerSourceId() === book.getId());
  if (!exists) ScriptApp.newTrigger('mgOnFormSubmit').forSpreadsheet(book).onFormSubmit().create();
  return {trigger:'mgOnFormSubmit',installed:!exists};
}

function mgInstallQueueReminderTrigger() {
  const exists = ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'mgNotifyPendingQueue');
  if (!exists) ScriptApp.newTrigger('mgNotifyPendingQueue').timeBased().everyHours(4).create();
  return {trigger:'mgNotifyPendingQueue',installed:!exists};
}

function mgAutomationHealth() {
  const triggers = ScriptApp.getProjectTriggers().map(t => ({
    handler:t.getHandlerFunction(), eventType:String(t.getEventType()), source:String(t.getTriggerSource())
  }));
  const required = ['mgOnFormSubmit','mgNotifyPendingQueue'];
  const missing = required.filter(name => !triggers.some(t => t.handler === name));
  const flags = Object.fromEntries(Object.keys(MG.flags).map(key => [key, mgFlag_(key)]));
  const queueSheet = mgSpreadsheet_().getSheetByName(MG.queueSheet);
  const queue = queueSheet ? queueSheet.getDataRange().getValues() : [];
  const queueMap = mgHeaderMap_(queue[0] || []);
  const pending = queue.slice(1).filter(r => !['reviewed','reviewed_no_chart_entry','closed'].includes(String(r[queueMap.review_status] || ''))).length;
  const unresolved = queue.slice(1).filter(r => ['unmatched','needs_staff_review'].includes(String(r[queueMap.review_status] || ''))).length;
  return {checkedAt:new Date().toISOString(), flags, triggers, missing,
    queueRows:Math.max(0,queue.length-1), pending, unresolved,
    note:'Trigger presence does not prove recent successful execution or clinical follow-up.'};
}

function mgShowDraftHandoff() {
  const sheet = SpreadsheetApp.getActiveSheet();
  if (sheet.getName() !== MG.draftsSheet || sheet.getActiveRange().getRow() < 2) {
    throw new Error('select_a_draft_row_first');
  }
  const map = mgHeaderMap_(sheet.getRange(1,1,1,sheet.getLastColumn()).getDisplayValues()[0]);
  const draftId = sheet.getRange(sheet.getActiveRange().getRow(),map.draft_id+1).getDisplayValue();
  if (!draftId) throw new Error('selected_row_has_no_draft_id');
  mgShowDraftHandoffById_(draftId);
}

function mgShowDraftHandoffById_(draftId) {
  const view = HtmlService.createTemplateFromFile('DraftHandoff');
  view.draftId = draftId;
  SpreadsheetApp.getUi().showModalDialog(view.evaluate().setWidth(760).setHeight(760),'Review copy-ready chart note');
}

function mgShowSessionDraftBuilder() {
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutputFromFile('SessionDraftBuilder')
    .setWidth(720).setHeight(760),'Prepare session note draft');
}

function mgGetDraftBuilderSettings(clinicianEmail) {
  mgRequireClinician_(clinicianEmail);
  return {draftBuilderEnabled:mgFlag_('ENABLE_DRAFT_BUILDER'),chartHandoffEnabled:mgFlag_('ENABLE_MANUAL_CHART_HANDOFF')};
}

function mgShowDiagnosticPromptReview() {
  SpreadsheetApp.getUi().showSidebar(HtmlService.createHtmlOutputFromFile('DiagnosticPrompts')
    .setTitle('Review differential prompts').setWidth(440));
}

function mgOpenDraftForReview(draftId, clinicianEmail) {
  mgRequireClinician_(clinicianEmail);
  mgDraftRow_(draftId);
  mgShowDraftHandoffById_(draftId);
  return {status:'opened'};
}
