# Apps Script setup and review

This folder is local starter source. It is not bound to the live workbook, and no trigger, notification, score import, diagnostic prompt, or chart handoff is active. Use a restricted workbook copy with fabricated records for all setup and review.

## Prepare a controlled copy

1. Make a copy of the workflow workbook in a clinic-controlled restricted Drive folder. Keep the live check-in form and append-only response tab untouched.
2. In the copy, create a container-bound Apps Script project. Add each `.gs` and `.html` file and enable the manifest in Project Settings.
3. Set Script Properties `WORKBOOK_ID` to the copy's ID and `AUTHORIZED_CLINICIANS` to the approved test account(s). Do not add client identities to the choice catalog or notification settings.
4. Run `mgSetupWorkflowSheets()` manually. It creates missing workflow tabs and stops on header conflicts. It never edits the response tab.
5. Keep every `ENABLE_*` property absent or `false`. Run `mgAutomationHealth()` and confirm the flags are off.
6. Review and adapt the therapist choice catalog. `mgSeedVerifiedTemplateBindings()` can add proposed mappings for template fields already checked in the supplied workbook; every row is inactive. Confirm each exact label, cell and formula/protection status in the fabricated copy before setting `active` to TRUE. Existing bindings are never overwritten. Run “Apply configured therapist dropdowns”; validation allows free text so a clinician can express a better fit. Do not bind narrative, diagnosis, safety conclusions or client-authored fields solely to reduce typing.
7. In the fabricated copy, exercise exact-ID matching, missing and duplicate IDs, duplicate events, queue recovery, and the generic notification route. Keep notifications disabled unless test recipients are clinic-controlled.
8. Register a measure only after checking redistribution rights, exact version/locale, item keys, answer bounds, scoring method, and reviewer-approved fixtures. The built-in `item_sum_v1` only supports a complete simple sum with optional reverse coding; it does not prorate or interpret.
9. Review scale JSON imports against the displayed source result before enabling `ENABLE_SCALE_IMPORT`. Imported scores carry measure IDs, source export reference, data version, locale, scoring source, and clinician verifier. Diagnostic prompts remain disabled separately by default.
10. The chart route is copy-only. A clinician reviews the exact draft, confirms the correct chart, copies, pastes, completes the clinical system's signing steps, and records a manual attestation. The script cannot confirm a save, signature, or receipt.
11. Document the clinic's review of privacy, intended use, clinical role, named users, retention, correction handling, and escalation before any live flag is changed. Each route requires a separate approval.

## Script properties

| Property | Used for |
| --- | --- |
| `WORKBOOK_ID` | Restricted test-copy workbook only during testing |
| `AUTHORIZED_CLINICIANS` | Comma-separated allowlist for therapist actions |
| `ENABLE_INTAKE_QUEUE` | Exact-ID intake queue |
| `ENABLE_INTERNAL_NOTIFICATIONS` | Generic email to admin-configured recipients |
| `INTERNAL_REVIEW_RECIPIENTS` | Clinic-owned recipients; never response-derived |
| `ENABLE_SCORING` | Explicitly registered simple scoring only |
| `ENABLE_SCALE_IMPORT` | Therapist-confirmed import of scales-app summary JSON |
| `ENABLE_DIAGNOSTIC_PROMPTS` | Separate deterministic, source-labelled review prompts |
| `ENABLE_DRAFT_BUILDER` | Therapist-authored, source-labelled session draft creation |
| `ENABLE_DIAGNOSIS_SUPPORT` | Clinician-entered diagnosis support table only |
| `ENABLE_MANUAL_CHART_HANDOFF` | Copy-ready draft review and therapist attestation |

All feature switches default to off in `Config.gs`. The Apps Script manifest has no external-request scope; the chart workflow makes no network calls.

## Local fabricated-data checks

Run `node apps-script/tests/fabricated-workflow.test.mjs` from the DIY Project folder. It uses an in-memory workbook containing fabricated IDs and responses to check exact/duplicate/unmatched routing, recovery, generic notification content, score-row provenance, import idempotency, diagnostic prompt gating, no automatic diagnosis/note write, note review, stale-draft rejection and manual chart attestation.

## Limits

- This is workflow scaffolding, not a validated clinical product or diagnostic service.
- Diagnostic suggestions are off pending clinical and intended-use review. When enabled, they preserve the scales app's existing differential flags and cite their source; they never read free text, confirm a diagnosis, or write one to a chart.
- The scale import accepts a defined summary format. It is not an API connection, and the clinician must match the exact clinic ID and inspect the source result.
- Chart-entry attestation is a therapist statement only, not proof of EHR receipt or signature.
- Apps Script runs as its trigger owner and remains subject to Google authorization, quotas, and access changes. Health indicators and a manual queue remain necessary.
