/**
 * Mind Grace therapist workflow starter. Copy into an Apps Script project bound
 * to a TEST COPY first. Live feature flags remain disabled by default.
 */
const MG = Object.freeze({
  sourceSheet: 'Form responses 1',
  trackerSheet: 'Client Tracker',
  trackerClientIdHeader: 'Client ID',
  clientIdQuestionHeader: 'Clinic-assigned client code (no name, please)',
  queueSheet: 'Review Queue',
  auditSheet: 'Automation Audit',
  scoresSheet: 'Score Results',
  draftsSheet: 'Draft Records',
  configSheet: 'Admin Config',
  diagnosisSheet: 'Diagnosis Support',
  promptsSheet: 'Diagnostic Prompts',
  importsSheet: 'Clinical Assessment Imports',
  bindingsSheet: 'Catalog Bindings',
  measureRegistrySheet: 'Measure Registry',
  headerRow: 1,
  firstDataRow: 2,
  states: Object.freeze({
    received: 'received', unmatched: 'unmatched', queued: 'queued',
    inReview: 'in_review', reviewed: 'reviewed', exception: 'exception',
    scored: 'scored_unverified', verified: 'verified', draft: 'draft',
    awaitingApproval: 'awaiting_manual_handoff', transferred: 'chart_handoff_reported',
    failed: 'failed', unknown: 'unknown_reconcile'
  }),
  flags: Object.freeze({
    ENABLE_INTAKE_QUEUE: false,
    ENABLE_INTERNAL_NOTIFICATIONS: false,
    ENABLE_SCORING: false,
    ENABLE_DIAGNOSIS_SUPPORT: false,
    ENABLE_DIAGNOSTIC_PROMPTS: false,
    ENABLE_SCALE_IMPORT: false,
    ENABLE_DRAFT_BUILDER: false,
    ENABLE_MANUAL_CHART_HANDOFF: false
  })
});

function mgProperties_() { return PropertiesService.getScriptProperties(); }
function mgFlag_(name) { return mgProperties_().getProperty(name) === 'true'; }
function mgSpreadsheet_() {
  const id = mgProperties_().getProperty('WORKBOOK_ID');
  if (!id) throw new Error('config_missing_WORKBOOK_ID');
  return SpreadsheetApp.openById(id);
}
function mgSheet_(name) {
  const sheet = mgSpreadsheet_().getSheetByName(name);
  if (!sheet) throw new Error(`sheet_missing_${name}`);
  return sheet;
}
