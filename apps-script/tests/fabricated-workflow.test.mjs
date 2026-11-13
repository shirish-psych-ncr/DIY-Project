import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

class FakeRange {
  constructor(sheet,row,col,numRows=1,numCols=1){Object.assign(this,{sheet,row,col,numRows,numCols});}
  getValues(){return Array.from({length:this.numRows},(_,r)=>Array.from({length:this.numCols},(_,c)=>this.sheet.cell(this.row+r,this.col+c)));}
  getDisplayValues(){return this.getValues().map(row=>row.map(v=>v instanceof Date?v.toISOString():String(v??'')));}
  setValues(values){values.forEach((row,r)=>row.forEach((v,c)=>this.sheet.put(this.row+r,this.col+c,v)));return this;}
  setValue(value){this.sheet.put(this.row,this.col,value);return this;}
}
class FakeSheet {
  constructor(name,id,rows=[]){this.name=name;this.id=id;this.rows=rows.map(r=>r.slice());this.reads=[];}
  getName(){return this.name;} getSheetId(){return this.id;}
  getLastRow(){return this.rows.length;}
  getLastColumn(){return Math.max(1,...this.rows.map(r=>r.length));}
  cell(r,c){return this.rows[r-1]?.[c-1]??'';}
  put(r,c,v){while(this.rows.length<r)this.rows.push([]);while(this.rows[r-1].length<c)this.rows[r-1].push('');this.rows[r-1][c-1]=v;}
  getRange(r,c,nr=1,nc=1){
    if(this.name==='Client Tracker'&&r>=2&&c!==1)throw new Error('test guard: matcher read tracker field outside Client ID');
    this.reads.push({r,c,nr,nc});return new FakeRange(this,r,c,nr,nc);
  }
  getDataRange(){return this.getRange(1,1,Math.max(1,this.getLastRow()),this.getLastColumn());}
  appendRow(row){this.rows.push(row.slice());}
}
class FakeBook {
  constructor(sheets){this.sheets=new Map(sheets.map(s=>[s.name,s]));}
  getSheetByName(name){return this.sheets.get(name)||null;}
}
const tracker=new FakeSheet('Client Tracker',20,[
  ['Client ID','Client Name','Date Added','Status','Next Step','Next Step Date','Format Preference','Priority','Assigned Clinician','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday','Session Type','Session Date'],
  ['C-1001','Fabricated Person A'],['C-DUP','Fabricated Person B'],['C-DUP','Fabricated Person C']
]);
const formHeaders=['Timestamp','Clinic-assigned client code (no name, please)','Fabricated response'];
const source=new FakeSheet('Form responses 1',30,[formHeaders,
  [new Date('2026-01-01T00:00:00Z'),'C-1001','fake'],
  [new Date('2026-01-01T00:01:00Z'),'','fake'],
  [new Date('2026-01-01T00:02:00Z'),'C-DUP','fake'],
  [new Date('2026-01-01T00:03:00Z'),'C-MISS','fake']
]);
const queue=new FakeSheet('Review Queue',31,[]),audit=new FakeSheet('Automation Audit',32,[]);
const scoreResults=new FakeSheet('Score Results',33,[]);
const imports=new FakeSheet('Clinical Assessment Imports',34,[]);
const prompts=new FakeSheet('Diagnostic Prompts',35,[]);
const diagnoses=new FakeSheet('Diagnosis Support',36,[]);
const drafts=new FakeSheet('Draft Records',37,[]);
const bindings=new FakeSheet('Catalog Bindings',38,[['sheet_name','target_range','category','active','last_applied','apply_status'],
  ['MSE Builder','B11','MSE_ENGAGEMENT',true,'','clinic-reviewed-existing']]);
const book=new FakeBook([tracker,source,queue,audit,scoreResults,imports,prompts,diagnoses,drafts,bindings]);
let uuid=0;
const properties={WORKBOOK_ID:'FABRICATED-COPY',AUTHORIZED_CLINICIANS:'therapist@example.test',ENABLE_INTAKE_QUEUE:'true',ENABLE_INTERNAL_NOTIFICATIONS:'false'};
const context={
  PropertiesService:{getScriptProperties:()=>({getProperty:key=>properties[key]||null})},
  SpreadsheetApp:{openById:id=>{assert.equal(id,'FABRICATED-COPY');return book;}},
  Session:{getActiveUser:()=>({getEmail:()=> 'therapist@example.test'})},
  LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
  Utilities:{getUuid:()=>`fake-uuid-${++uuid}`,DigestAlgorithm:{SHA_256:'SHA_256'},computeDigest:(algorithm,value)=>createHash('sha256').update(String(value)).digest(),base64EncodeWebSafe:bytes=>Buffer.from(bytes).toString('base64url')},
  MailApp:{sendEmail:message=>sentMessages.push(message)},
  CacheService:{getScriptCache:()=>({put:(k,v)=>cache.set(k,v),get:k=>cache.get(k)||null,remove:k=>cache.delete(k)})},
  console,Date,JSON,Object,Set,Map,Array,String,Number,Boolean,Math,Error
};
const sentMessages=[];
const cache=new Map();
vm.createContext(context);
const root=path.dirname(fileURLToPath(import.meta.url));
for(const name of ['Audit.gs','Code.gs','Config.gs','DiagnosisSupport.gs','DraftBuilder.gs','DraftRecords.gs','IntakeRouter.gs','Notifications.gs','RecordTransfer.gs','Scoring.gs','TherapistCatalog.gs']){
  new vm.Script(await readFile(path.join(root,'..',name),'utf8'),{filename:name});
}
for(const name of ['AssessmentImport.html','DiagnosticPrompts.html','DraftHandoff.html','ReviewQueue.html','SessionDraftBuilder.html']){
  const html=await readFile(path.join(root,'..',name),'utf8');
  const script=html.match(/<script>([\s\S]*?)<\/script>/i)?.[1]?.replace(/<\?=\s*draftId\s*\?>/g,'FABRICATED-DRAFT');
  assert.ok(script,`${name} has inline script`);
  new vm.Script(script,{filename:name});
}
for(const file of ['Config.gs','Audit.gs','IntakeRouter.gs','Notifications.gs','Scoring.gs','DiagnosisSupport.gs','DraftBuilder.gs','DraftRecords.gs','RecordTransfer.gs']){
  const sourceText=await readFile(path.join(root,'..',file),'utf8');
  vm.runInContext(sourceText,context,{filename:file});
}
vm.runInContext(await readFile(path.join(root,'..','TherapistCatalog.gs'),'utf8'),context,{filename:'TherapistCatalog.gs'});
const seedResult=context.mgSeedVerifiedTemplateBindings();
assert.equal(seedResult.added,12);
assert.equal(seedResult.active,false);
assert.equal(bindings.rows[1][3],true); // existing active configuration is preserved
assert.equal(bindings.rows[1][5],'clinic-reviewed-existing');
assert.equal(bindings.rows.slice(2).every(r=>r[3]===false),true);
assert.equal(bindings.rows.slice(2).some(r=>r[0]==='Session Note Builder'&&r[1]==='B9'&&r[2]==='NOTE_FORMAT'),true);
assert.equal(context.mgSeedVerifiedTemplateBindings().added,0);
const event=(row)=>({range:{getSheet:()=>source,getRow:()=>row},namedValues:{[formHeaders[1]]:[source.cell(row,2)]}});
assert.equal(context.mgOnFormSubmit(event(2)).status,'queued');
assert.equal(context.mgOnFormSubmit(event(3)).status,'unmatched');
assert.equal(context.mgOnFormSubmit(event(4)).status,'unmatched');
assert.equal(context.mgOnFormSubmit(event(5)).status,'unmatched');
assert.equal(context.mgOnFormSubmit(event(2)).status,'duplicate_ignored');
const queued=queue.rows[1], unmatched=queue.rows[2], duplicate=queue.rows[3];
assert.equal(queued[5],'C-1001'); assert.equal(queued[6],2); assert.equal(queued[7],1);
assert.equal(unmatched[12],'client_id_missing');
assert.equal(duplicate[12],'client_id_not_unique');
assert.equal(queue.rows[4][12],'client_id_not_found');
assert.equal(context.mgResolveQueueIdentity(unmatched[0],'C-1001').status,'queued');
assert.throws(()=>context.mgResolveQueueIdentity(duplicate[0],'C-DUP'),/client_id_not_unique/);
assert.throws(()=>context.mgSetQueueReviewStatus(duplicate[0],'closed'),/resolve_identity_before_closing/);
assert.equal(context.mgSetQueueReviewStatus(unmatched[0],'reviewed').status,'reviewed');
assert.ok(tracker.reads.some(r=>r.r>=2&&r.c===1&&r.nc===1));
properties.ENABLE_INTERNAL_NOTIFICATIONS='true';
properties.INTERNAL_REVIEW_RECIPIENTS='workflow@example.test';
assert.equal(context.mgNotifyQueue_('fake-queue').status,'sent');
assert.equal(context.mgNotifyQueue_('fake-queue').status,'already_sent');
assert.equal(sentMessages.length,1);
assert.doesNotMatch(`${sentMessages[0].subject}\n${sentMessages[0].body}`,/Fabricated Person|C-1001|C-DUP|fake response/i);
const handoff={format:'mind-grace-epcss-clinician-handoff',exportVersion:1,exportId:'fabricated-export-1',
  sourceApp:'EPCSS',appVersion:'1.0.0',dataVersion:'fabricated-v1',locale:'en',generatedAt:'2026-01-02T03:04:05.000Z',
  resultStatus:'requires_clinician_verification',scoreResults:[{measureId:'measure_a',measureLabel:'Fabricated measure',
    outputs:[{name:'Total',score:'3/3',severity:'Example',sourceNote:'fabricated attribution'}]}],
  differentialPrompts:[{key:'candidate_a',label:'Candidate A',tier:2,sources:['Fabricated measure / rule 1'],
    rationale:'Triggered by fabricated rule source; clinician review only.',references:{dsm5:'ref-a',icd11:'ref-b'}}]};
assert.equal(context.mgValidateScaleExport_(handoff),undefined);
assert.throws(()=>context.mgValidateScaleExport_({...handoff,resultStatus:'final_diagnosis'}),/assessment_export_schema_invalid/);
properties.ENABLE_SCALE_IMPORT='true'; properties.ENABLE_DIAGNOSTIC_PROMPTS='false';
assert.deepEqual(JSON.parse(JSON.stringify(context.mgImportScaleExport(handoff,'C-1001',true))),
  {status:'imported_reviewed_summary',importId:'fake-uuid-5',scoreCount:1,promptCount:0});
assert.equal(scoreResults.rows[1][8],'EPCSS browser export');
assert.equal(scoreResults.rows[1][9],'fabricated-export-1:measure_a');
assert.equal(scoreResults.rows[1][13],'therapist@example.test');
assert.equal(prompts.getLastRow(),0);
assert.equal(context.mgReviewDiagnosticPrompt('not-created','considered').status,'disabled');
assert.throws(()=>context.mgImportScaleExport(handoff,'C-1001',true),/assessment_export_already_imported/);
const prompted={...handoff,exportId:'fabricated-export-2'};
properties.ENABLE_DIAGNOSTIC_PROMPTS='true';
const promptImport=context.mgImportScaleExport(prompted,'C-1001',true);
assert.equal(promptImport.promptCount,1);
assert.equal(prompts.rows[1][4],'Candidate A');
assert.equal(prompts.rows[1][8],'Triggered by fabricated rule source; clinician review only.');
assert.equal(prompts.rows[1][9],'pending_clinician_review');
const promptView=JSON.parse(JSON.stringify(context.mgGetDiagnosticPromptRows()));
assert.equal(promptView.items[0].sources[0],'Fabricated measure / rule 1');
assert.match(promptView.items[0].rationale,/clinician review only/);
properties.ENABLE_DIAGNOSTIC_PROMPTS='false';
assert.equal(context.mgReviewDiagnosticPrompt(prompts.rows[1][0],'considered').status,'disabled');
properties.ENABLE_DIAGNOSTIC_PROMPTS='true';
assert.equal(context.mgReviewDiagnosticPrompt(prompts.rows[1][0],'considered','Fabricated review').status,'reviewed');
assert.equal(diagnoses.getLastRow(),0);
assert.equal(drafts.getLastRow(),0);
const draftInput={requestId:'fabricated-draft-request-0001',internalRecordId:'C-1001',encounterRef:'FABRICATED-ENCOUNTER-1',templateVersion:'session-note-v1',
  clientReport:['Fabricated report line'],clinicianObservation:['Fabricated observation'],
  interventions:['Fabricated intervention'],progress:['Fabricated goal progress'],plan:['Fabricated next step'],
  sourceRefs:['Fabricated source A']};
assert.equal(context.mgBuildSessionDraft(draftInput).status,'disabled');
properties.ENABLE_DRAFT_BUILDER='true';
const draftCreated=context.mgBuildSessionDraft(draftInput);
assert.equal(draftCreated.status,'draft_requires_review');
assert.equal(context.mgBuildSessionDraft(draftInput).duplicate,true);
const draftRow=drafts.rows[1],draftMap=Object.fromEntries(drafts.rows[0].map((h,i)=>[h,i]));
const draftPayload=JSON.parse(draftRow[draftMap.draft_payload_json]);
assert.match(draftPayload.text,/Client report\n• Fabricated report line/);
assert.equal(draftPayload.diagnosis,null);assert.equal(draftPayload.safetyAssessment,null);
assert.equal(draftRow[draftMap.draft_state],'draft_requires_review');
const draftPreview=context.mgGetDraftPreview(draftCreated.draftId);
assert.equal(draftPreview.reviewChecklist.length,5);
assert.throws(()=>context.mgMarkDraftReviewed(draftCreated.draftId,undefined,draftPreview.previewToken,[true,false,true,true,true]),/draft_review_checklist_incomplete/);
assert.equal(context.mgMarkDraftReviewed(draftCreated.draftId,undefined,draftPreview.previewToken,[true,true,true,true,true]).status,'reviewed');
properties.ENABLE_MANUAL_CHART_HANDOFF='true';
const approval=context.mgApproveDraftForManualHandoff(draftCreated.draftId,undefined,`COPY TO CHART ${draftCreated.draftId}`);
assert.equal(approval.status,'awaiting_manual_handoff');
draftRow[draftMap.draft_payload_json]=JSON.stringify({...draftPayload,text:'changed after approval'});
assert.throws(()=>context.mgRecordManualChartHandoff(draftCreated.draftId,undefined,approval.confirmationToken,`RECORDED IN CHART ${draftCreated.draftId}`),/approved_draft_changed_or_state_invalid/);
const refreshed=context.mgGetDraftPreview(draftCreated.draftId);
context.mgMarkDraftReviewed(draftCreated.draftId,undefined,refreshed.previewToken,[true,true,true,true,true]);
const finalApproval=context.mgApproveDraftForManualHandoff(draftCreated.draftId,undefined,`COPY TO CHART ${draftCreated.draftId}`);
const handoffResult=context.mgRecordManualChartHandoff(draftCreated.draftId,undefined,finalApproval.confirmationToken,`RECORDED IN CHART ${draftCreated.draftId}`);
assert.equal(handoffResult.ehrReceipt,false);
assert.equal(draftRow[draftMap.transfer_status],'therapist_attested_chart_entry');
assert.equal(draftRow[draftMap.draft_state],'chart_handoff_reported');
assert.throws(()=>context.mgGetDraftPreview(draftCreated.draftId),/draft_not_reviewable/);
console.log('Apps Script fabricated identity, recovery, notification, provenance, prompt and manual-handoff checks passed');
