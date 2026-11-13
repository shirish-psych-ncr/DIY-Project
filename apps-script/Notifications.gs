function mgNotifyQueue_(queueId) {
  if (!mgFlag_('ENABLE_INTERNAL_NOTIFICATIONS')) return {status:'disabled'};
  const recipients = (mgProperties_().getProperty('INTERNAL_REVIEW_RECIPIENTS') || '')
    .split(',').map(s => s.trim()).filter(Boolean);
  if (!recipients.length || recipients.some(x => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x))) {
    throw new Error('notification_recipients_invalid');
  }
  const workbookId = mgProperties_().getProperty('WORKBOOK_ID');
  if (!workbookId) throw new Error('workbook_id_missing');
  const secureUrl = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(workbookId)}/edit`;
  const id = `notify:${queueId}`;
  if (mgHasAudit_(id, ['sent'])) return {status:'already_sent'};
  const subject = `Therapist review item ready — ${queueId}`;
  const body = `A workflow item is ready for review. Open the secure clinic workspace: ${secureUrl}\n\nThis message contains no client details and is not an emergency alert.`;
  const started = new Date();
  try {
    MailApp.sendEmail({to:recipients.join(','),subject,body,name:'Mind Grace Workflow'});
    mgAudit_({actionId:id,operation:'internal_notification',sourceId:queueId,outcome:'sent',startedAt:started});
    return {status:'sent'};
  } catch (err) {
    mgAudit_({actionId:id,operation:'internal_notification',sourceId:queueId,outcome:'failed',errorCode:err.message,startedAt:started});
    throw err;
  }
}

function mgNotifyPendingQueue() {
  if (!mgFlag_('ENABLE_INTERNAL_NOTIFICATIONS')) return;
  const sheet = mgSheet_(MG.queueSheet);
  const data = sheet.getDataRange().getValues();
  const map = mgHeaderMap_(data[0] || []);
  for (const row of data.slice(1)) {
    if (['queued','unmatched','needs_staff_review'].includes(row[map.review_status])) {
      mgNotifyQueue_(String(row[map.queue_id]));
    }
  }
}
