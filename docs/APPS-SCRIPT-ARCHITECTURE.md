# Apps Script Architecture

This describes the local starter source. It is not connected to the live workbook. Test in a restricted copy with fabricated records and keep all feature flags off until the clinic approves each route.

## Modules

| File | Purpose |
| --- | --- |
| `Code.gs`, `Config.gs` | Menu, workflow tabs, health summary, fixed headers, disabled feature flags |
| `IntakeRouter.gs` | Append-only source row reference, idempotent queue, exact unique Client ID matching and manual recovery |
| `Notifications.gs`, `Audit.gs` | Generic staff-only message and safe operational event log |
| `TherapistCatalog.gs` | Editable choice catalog, named ranges and explicit `Catalog Bindings` dropdown setup |
| `Scoring.gs` | Disabled registry-based simple scoring and provenance-checked imported result route |
| `DiagnosisSupport.gs` | Therapist-confirmed scale-summary import, optional sourced prompts and clinician-entered diagnosis workspace |
| `DraftBuilder.gs`, `DraftRecords.gs`, `RecordTransfer.gs` | Source-labelled draft creation/storage, review checklist, explicit copy approval and manual chart-entry attestation |

## Workbook contract

`Form responses 1` remains the append-only source. The matcher reads only `Client Tracker`'s `Client ID` column. It requires one exact ID value; missing or duplicate matches remain in `Review Queue` without selecting a person. The current response form's ID question is `Clinic-assigned client code (no name, please)`. The selected tracker headers include `Client ID`; other tracker formulas and protections still need review in a fabricated workbook copy.

`mgSetupWorkflowSheets()` creates missing workflow tabs and checks existing headers before use. The main tables are `Review Queue`, `Automation Audit`, `Score Results`, `Measure Registry`, `Clinical Assessment Imports`, `Diagnostic Prompts`, `Diagnosis Support`, `Draft Records`, `Therapist Catalog`, `System Choice Lists`, and `Catalog Bindings`. Setup does not modify the response tab. Do not run it against the live workbook before its protections and formulas have been reviewed.

Dropdown bindings are explicit admin-entered rows: sheet name, target range, catalog category and active state. The workbook was inspected read-only to verify the Session Note Builder's session type (B8), note format (B9), and interventions (B16), plus MSE Builder's behavior/speech/mood/affect/thought/perception/cognition/insight/safety fields (B11:B20). `mgSeedVerifiedTemplateBindings()` proposes these exact mappings as **inactive** rows. Inspect formula/protection status and labels in the fabricated copy, then activate approved rows manually; existing bindings are never overwritten. Free text remains allowed. Narrative areas, including the 5Ps and treatment/discharge plans, are intentionally left unconstrained.

## Identity, queue, and notifications

The queue stores source sheet/row, stable event reference, timestamp, exact-ID match count, tracker row for a unique match, status and safe error code. No client name or answer appears in queue UI or email. A duplicate event is ignored by source sheet ID plus row. Recovery requires an allowlisted clinician to re-enter an exact unique Client ID. Queue status can be closed only after identity is resolved.

Generic notifications go only to Script Properties `INTERNAL_REVIEW_RECIPIENTS`. The email contains a queue reference and workbook link, never a client identifier or clinical content. Notification trigger installation is a separate admin action. Feature flags are read from Script Properties and all are false unless explicitly set to `true`.

## Scoring and assessment import

The generic scorer runs only for a measure registered with exact version, locale, rights review, algorithm version and output keys. `item_sum_v1` supports complete simple sums and optional reverse coding only; it does not impute, prorate or interpret. Score rows preserve source submission/result, measure/version/locale, algorithm, calculation and verification provenance.

The scales app export reuses its existing scorer and differential flags. It contains score summaries, measure IDs, data version, locale and rule-triggered source labels. It excludes item answers, client ID and context/free-text rows. A therapist chooses the file, confirms the exact unique Client ID and confirms review before importing. A ledger prevents duplicate imports; partial failures are marked for reconciliation before retry.

Diagnostic prompts use deterministic differential flags already produced by the scales app. Each prompt shows its triggering source, fixed rationale and reference identifiers. Tier is an organizational label, not probability or confidence. The feature is disabled pending clinical/intended-use review. It does not inspect free text, confirm diagnosis or enter a diagnosis into the chart. Diagnosis status and rationale remain clinician-authored and separately gated.

## Draft and chart handoff

Drafts use only therapist-supplied fields and preserve labels such as client report, clinician observation, session work, progress and plan. A clinician checks the exact draft, source references, client ID and encounter; approves a fingerprinted version; copies it manually; enters it in the verified chart; completes the clinical system's signing process; and can record an attestation. The system makes no network call and receives no EHR receipt or signature confirmation. It never claims the chart was saved based only on the attestation.

## Health and administration

`mgAutomationHealth()` shows installed triggers, flags, and pending/unresolved queue counts. Trigger presence is not proof of successful execution or clinical follow-up. Apps Script can fail because of permissions, ownership changes, quotas or runtime limits; the manual queue remains the recovery path. Review authorization scopes and active Google identity in a test account before any production decision.
