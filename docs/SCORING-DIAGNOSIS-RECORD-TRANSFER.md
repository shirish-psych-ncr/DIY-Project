# Scoring, Differential Prompts, and Chart Handoff

This local implementation connects existing assessment results to a therapist workflow. It is not a validated clinical device or diagnostic service. Feature flags remain off until the clinic completes clinical, intended-use, privacy and operational review.

## Scoring source and provenance

Each measure must be bound to its exact authorized instrument version, locale, form/informant, source scoring rules and rights status. The registry records measure ID, version, locale, algorithm/version, source reference, rights review, enabled state, output keys and reviewer. The built-in `item_sum_v1` only computes complete simple sums with optional reverse coding; it does not prorate missing items or interpret cutoffs.

Score rows retain source submission/result reference, measure, version, locale, score output, algorithm version, completion state, date, calculation source and clinician verification. Imported verified results are rejected if the exact measure/version/locale/source is not registered, if provenance is missing, if output keys are not approved, or if the source result was already imported. The separate EPCSS JSON import takes an explicit therapist confirmation and exact unique Clinic ID; it reuses the scale app's own scoring results instead of rebuilding those algorithms.

## Existing differential flags

The scales app's current deterministic differential flags can be exported as prompts with the triggering source measure/rule, rationale, references and tier label. The tier is only organizational and does not represent likelihood or confidence. The prompt must be assessed with the full clinical context; it does not independently support a diagnosis.

The diagnostic prompt import flag is off. Before enabling it, the clinic must review intended clinical role, intended users, decision impact, source fidelity, known limitations, local software/regulatory requirements and oversight. The app and Apps Script do not infer from free text, confirm a diagnosis, set diagnosis status, or automatically write diagnostic content to a record. Clinician-entered diagnosis support is a separate, disabled table and requires clinician-authored rationale/status.

## Therapist note and manual chart route

The draft builder accepts explicit therapist-supplied fields and labels their sources. It does not fill unsupported diagnosis or safety findings. Before copying, the therapist must verify the exact Clinic ID and encounter, source labels, supporting references, note content and signing plan. A short-lived preview token and content fingerprint tie approval to the reviewed draft version.

After approval, the clinician manually copies the note to the verified chart, completes the clinical system's signing steps and can record an attestation. No API, external request, Drive transfer, or EHR connector is implemented. The attestation means only that the therapist reports entering the note; it is not evidence of EHR receipt, saved status or signature. No external clinical-record transfer route is included because an approved free API/sandbox was not identified.

## Audit and correction

Queue, import, review, prompt and handoff actions carry operation IDs, timestamps, actor or source references, outcomes and safe error codes. Do not place response answers, note text, client names or tokens in the operational log. A partial import remains in a reconciliation state and must be reconciled before retry. The chart workflow prevents re-opening an attested draft; corrections should create a new reviewed draft and follow clinic chart correction/addendum policy.

## Fabricated-data review before activation

- Exact unique ID, missing ID, duplicate tracker IDs, wrong IDs and duplicate source events.
- Manual identity recovery and restrictions on closing unresolved items.
- Generic notice recipients/content and duplicate-notice behavior.
- Scoring/import provenance, unsupported versions, duplicate imports and partial failure status.
- Prompt trigger/source/rationale display, with no automatic diagnosis-state or note write.
- Draft source labels, exact-content approval, stale-content rejection and manual handoff/attestation language.
- Dropdown target ranges, free-text allowance and editable choice updates.

Run these in a restricted workbook copy with fabricated records. Do not enable live routes until the clinic owner reviews the evidence and explicitly approves each feature independently.
