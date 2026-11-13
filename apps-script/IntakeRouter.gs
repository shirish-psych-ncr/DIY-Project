const MG_QUEUE_HEADERS = [
  'queue_id','source_sheet','source_row','source_timestamp','source_id',
  'internal_record_id','matched_tracker_row','identity_match_count','assigned_therapist',
  'review_status','created_at','last_action_id','error_code','resolved_by','resolved_at'
];

/** Installable spreadsheet form-submit trigger entry point. */
function mgOnFormSubmit(e) {
  if (!mgFlag_('ENABLE_INTAKE_QUEUE')) return {status:'disabled'};
  if (!e || !e.range || !e.namedValues) throw new Error('invalid_form_submit_event');
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  const started = new Date();
  let actionId = '';
  let sourceId = '';
  try {
    const source = e.range.getSheet();
    if (source.getName() !== MG.sourceSheet) return {status:'ignored_source_sheet'};
    const rowNumber = e.range.getRow();
    sourceId = `${source.getSheetId()}:${rowNumber}`;
    actionId = `intake:${sourceId}`;
    if (mgQueueHasSource_(sourceId)) return {status:'duplicate_ignored'};

    const headers = source.getRange(MG.headerRow, 1, 1, source.getLastColumn()).getDisplayValues()[0];
    const values = source.getRange(rowNumber, 1, 1, source.getLastColumn()).getValues()[0];
    const response = Object.fromEntries(headers.map((h, i) => [String(h).trim(), values[i]]));
    const clientId = mgGetClientCode_(response, e.namedValues);
    const structure = mgValidateSubmission_(response);
    const matches = clientId ? mgFindClientMatches_(clientId) : [];
    const status = !structure.ok ? 'needs_staff_review' : matches.length === 1 ? 'queued' : 'unmatched';
    const errorCode = !structure.ok ? structure.errorCode
      : !clientId ? 'client_id_missing'
        : matches.length === 0 ? 'client_id_not_found'
          : matches.length > 1 ? 'client_id_not_unique' : '';
    const queueId = Utilities.getUuid();
    const queue = mgSheet_(MG.queueSheet);
    mgEnsureHeaders_(queue, MG_QUEUE_HEADERS);
    queue.appendRow([
      queueId, source.getName(), rowNumber, response.Timestamp || new Date(), sourceId,
      matches.length === 1 ? clientId : '', matches.length === 1 ? matches[0].row : '',
      matches.length, '', status, new Date(), actionId, errorCode, '', ''
    ]);
    mgAudit_({actionId, operation:'intake_enqueue', sourceId, outcome:status,
      errorCode, startedAt:started});
    if (mgFlag_('ENABLE_INTERNAL_NOTIFICATIONS')) mgNotifyQueue_(queueId);
    return {status, queueId, identityMatchCount:matches.length};
  } catch (err) {
    mgAudit_({actionId:actionId || `intake-error:${sourceId || Utilities.getUuid()}`,
      operation:'intake_enqueue',sourceId,outcome:'failed',errorCode:'intake_processing_error',startedAt:started});
    throw err;
  } finally {
    lock.releaseLock();
  }
}

function mgValidateSubmission_(row) {
  if (!row.Timestamp) return {ok:false,errorCode:'timestamp_missing'};
  if (!Object.keys(row).some(k => k === MG.clientIdQuestionHeader)) {
    return {ok:false,errorCode:'client_id_question_header_missing'};
  }
  return {ok:true};
}

function mgGetClientCode_(row, namedValues) {
  const direct = row && row[MG.clientIdQuestionHeader];
  const eventValue = namedValues && namedValues[MG.clientIdQuestionHeader];
  const value = direct !== undefined ? direct : Array.isArray(eventValue) ? eventValue[0] : eventValue;
  return String(value || '').trim();
}

/** Exact ID match only. Returns tracker row numbers; names and other columns are never read. */
function mgFindClientMatches_(clientId) {
  const tracker = mgSheet_(MG.trackerSheet);
  const headers = tracker.getRange(1,1,1,tracker.getLastColumn()).getDisplayValues()[0];
  const idColumn = headers.findIndex(h => String(h).trim() === MG.trackerClientIdHeader) + 1;
  if (!idColumn) throw new Error('tracker_client_id_header_missing');
  const lastRow = tracker.getLastRow();
  if (lastRow < 2) return [];
  const wanted = String(clientId).trim();
  return tracker.getRange(2,idColumn,lastRow-1,1).getDisplayValues().flatMap((v,i) =>
    String(v[0] || '').trim() === wanted ? [{row:i+2}] : []);
}

function mgQueueHasSource_(sourceId) {
  const sheet = mgSheet_(MG.queueSheet);
  mgEnsureHeaders_(sheet, MG_QUEUE_HEADERS);
  const data = sheet.getDataRange().getValues();
  const map = mgHeaderMap_(data[0] || []);
  return data.slice(1).some(r => r[map.source_id] === sourceId);
}

function mgResolveQueueIdentity(queueId, clientId, clinicianEmail) {
  const clinician = mgRequireClinician_(clinicianEmail);
  if (!clientId || !String(clientId).trim()) throw new Error('client_id_required');
  const matches = mgFindClientMatches_(String(clientId).trim());
  if (matches.length !== 1) throw new Error(matches.length ? 'client_id_not_unique' : 'client_id_not_found');
  const sheet = mgSheet_(MG.queueSheet);
  const data = sheet.getDataRange().getValues();
  const map = mgHeaderMap_(data[0] || []);
  const idx = data.findIndex((r,i) => i > 0 && r[map.queue_id] === queueId);
  if (idx < 1) throw new Error('queue_item_not_found');
  const current = data[idx];
  if (['reviewed','closed'].includes(current[map.review_status])) throw new Error('queue_item_already_closed');
  sheet.getRange(idx+1,map.internal_record_id+1).setValue(String(clientId).trim());
  sheet.getRange(idx+1,map.matched_tracker_row+1).setValue(matches[0].row);
  sheet.getRange(idx+1,map.identity_match_count+1).setValue(1);
  sheet.getRange(idx+1,map.review_status+1).setValue('queued');
  sheet.getRange(idx+1,map.error_code+1).setValue('');
  sheet.getRange(idx+1,map.resolved_by+1).setValue(clinician);
  sheet.getRange(idx+1,map.resolved_at+1).setValue(new Date());
  mgAudit_({actionId:`resolve:${queueId}`,operation:'resolve_queue_identity',
    sourceId:current[map.source_id],recordRefHash:mgRecordHash_(clientId),outcome:'resolved'});
  return {queueId,status:'queued'};
}

function mgSetQueueReviewStatus(queueId, status, clinicianEmail) {
  const clinician = mgRequireClinician_(clinicianEmail);
  const allowed = ['in_review','reviewed','reviewed_no_chart_entry','needs_clarification','closed'];
  if (!allowed.includes(status)) throw new Error('queue_review_status_invalid');
  const sheet = mgSheet_(MG.queueSheet);
  const data = sheet.getDataRange().getValues();
  const map = mgHeaderMap_(data[0] || []);
  const idx = data.findIndex((r,i) => i > 0 && r[map.queue_id] === queueId);
  if (idx < 1) throw new Error('queue_item_not_found');
  if (!data[idx][map.internal_record_id] && ['reviewed','reviewed_no_chart_entry','closed'].includes(status)) {
    throw new Error('resolve_identity_before_closing_queue_item');
  }
  sheet.getRange(idx+1,map.review_status+1).setValue(status);
  sheet.getRange(idx+1,map.resolved_by+1).setValue(clinician);
  sheet.getRange(idx+1,map.resolved_at+1).setValue(new Date());
  mgAudit_({actionId:`queue-status:${queueId}`,operation:'update_queue_status',
    sourceId:data[idx][map.source_id],recordRefHash:mgRecordHash_(data[idx][map.internal_record_id]),outcome:status});
  return {queueId,status};
}

function mgGetReviewQueueItems(clinicianEmail) {
  mgRequireClinician_(clinicianEmail);
  const sheet = mgSheet_(MG.queueSheet);
  const data = sheet.getDataRange().getValues();
  const map = mgHeaderMap_(data[0] || []);
  return data.slice(1).filter(r => !['reviewed','reviewed_no_chart_entry','closed'].includes(String(r[map.review_status] || '')))
    .map(r => ({queueId:r[map.queue_id],timestamp:r[map.source_timestamp],status:r[map.review_status],
      errorCode:r[map.error_code],identityMatchCount:r[map.identity_match_count],
      hasRecordMatch:Boolean(r[map.internal_record_id]),sourceRow:r[map.source_row],
      sourceUrl:`https://docs.google.com/spreadsheets/d/${encodeURIComponent(mgProperties_().getProperty('WORKBOOK_ID'))}/edit#gid=${mgSheet_(MG.sourceSheet).getSheetId()}&range=A${Number(r[map.source_row])}`}));
}

function mgShowReviewQueue() {
  SpreadsheetApp.getUi().showSidebar(HtmlService.createHtmlOutputFromFile('ReviewQueue')
    .setTitle('Review incoming items').setWidth(380));
}
