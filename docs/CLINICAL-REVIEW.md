# Therapist-Facing Clinical, Privacy, and Release Review

This workflow supports professional documentation; it does not replace the clinician's judgment, scope, or the clinic's approved clinical record. The workflow owner should complete this review before enabling scoring, notifications, diagnostic support, or record transfer.

## Clinician-facing safety

- Keep client report, clinician observation, interpretation, and action in separate fields.
- Label generated text as a draft and preserve sources. Do not imply an interview, risk assessment, consent, intervention, or follow-up occurred unless a clinician explicitly records it.
- Use “not assessed,” “not applicable,” “unknown,” and “deferred” instead of forcing a completion or deriving a value.
- Use broad client check-in choices to focus a conversation only. They are not standardized symptoms, diagnosis evidence by themselves, or emergency alerts.
- For standardized measures, show name, version, language, informant, timeframe, completion, score provenance, and clinician verification state.
- Keep clinician MSE, formulation, diagnosis, and safety assessment therapist-entered; do not infer observations from client survey data.

## Scoring and diagnostic support

- Only enable an instrument after confirming the source scoring rules, version, locale, population, rights, missing-item behavior, and intended use.
- Preserve raw responses and pure versioned scoring functions; no hidden imputation or reuse of cutoffs across scales.
- Display clinical reference material for the clinician. The system may organize evidence and differential considerations, but must not decide, auto-select, or commit a diagnosis.
- The final diagnosis and rationale are clinician-authored and confirmed according to the clinician's scope, clinic process, and jurisdiction.
- Never turn a score or keyword into a treatment, medication, risk level, or crisis action.

## Record transfer and notifications

- Confirm patient identity and encounter before chart entry. The local route requires preview, checklist, exact-content approval, therapist copy/paste, EHR signing steps, and optional therapist attestation.
- No EHR API or external record transfer is implemented. Attestation is not an EHR receipt, saved-state confirmation, or signature record.
- Notifications go to the assigned, authorized role and contain a secure link plus generic task metadata only.
- Do not put patient names, codes, symptoms, notes, diagnoses, score values, or crisis content in ordinary email or consumer notification text.
- A notification failure or unreviewed response is not evidence of clinical contact. The workflow cannot promise continuous monitoring.
- Client reminders require separate consent and a defined pause/stop route.

## Privacy and access controls

- Maintain one approved identity source; use a stable clinic identifier in workflow tables only if required. Restrict any identifier-to-name mapping to the approved clinical system.
- Apply least-privilege access to Forms, Sheets, Apps Script, Drive folders, logs, and EHR integration identities. Review ownership/continuity when staff roles change.
- Keep secrets out of source files, workbook cells, logs, email, and URLs. Store API credentials only in approved script properties or managed secrets.
- Set and document purpose, retention, deletion, correction, backup, and incident response for raw submissions, score outputs, drafts, exports, and audit metadata.
- Audit Apps Script trigger owners, scopes, executions, quotas, failures, retries, and time-driven jobs.
- Review vendor, storage location, and local privacy/legal requirements with the clinic owner; do not infer compliance from using Google Workspace.

## Validation scenarios before go-live

- Correct, duplicate, missing, and ambiguous clinic identifiers.
- New and edited form responses; no response; malformed field; unsupported language/version.
- Complete, incomplete, reverse-coded, invalid, and boundary scoring cases with clinician-approved fixtures.
- Unverified score remains visibly unverified; scores never set diagnosis or risk state.
- Empty source sections stay empty in draft output; source labels remain accurate.
- Wrong-ID mapping and stale-draft approval are blocked; the therapist must confirm the destination chart before copying.
- Notification goes only to the configured role mailbox and contains no clinical detail.
- Trigger failure, authorization loss and quota limit are surfaced with a manual queue fallback.
- Role-based access, shared folder access, script ownership, audit retention, and deletion path are confirmed.

## Release decision record

Complete this before enabling each feature independently:

- Feature: intake queue / notification / scoring or import / diagnostic prompts / manual chart handoff
- Business and clinical owner:
- Authorized users and access scope:
- Approved data categories and identifier policy:
- Instrument/spec/vendor source and rights (if applicable):
- Trigger owner, schedule, quotas, health alert, manual fallback:
- Notification recipients/content and service hours:
- Manual chart destination confirmation and attestation limits:
- Consent, retention, correction, and deletion process:
- Validation evidence and reviewer:
- Enablement date and next review:

Current Google Forms prototype is still a draft; it should not be treated as a deployed or staffed clinical service.
