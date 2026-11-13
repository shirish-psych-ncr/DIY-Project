# Mind Grace Therapist Workflow System

A therapist-facing, low-friction workflow and documentation system for intake, session preparation, formulation, treatment planning, follow-up, and discharge. Optional client check-in data is one input to the clinician's workflow; the main user is the therapist or authorized clinic staff member.

## Current prototype

- Client check-in form: [Mind Grace | Therapy Check-in Between Sessions](https://docs.google.com/forms/d/1mCDXLuP3EkVK7UqIz-h0JrYuaWBfisUXv23v1xoiJ6I/edit)
- Workflow workbook: [Mind Grace | Therapy Workflow Suite](https://docs.google.com/spreadsheets/d/1B7JkEYqVykXIVa7VINrkiNE-zK8-ml3E6WWnOcDmjts/edit)
- The client check-in form is an input to the therapist-facing workflow. It is currently unpublished and reports zero responses.
- The workbook already exposes clinician-oriented modules including intake domains, MSE, session notes, formulation, treatment planning, discharge, client tracking, waitlist matching, and a phrase bank. The connected Drive API currently cannot read its contents, so cross-tab formulas and protections still need verification in the open browser.
- Forms can append responses to `Form responses 1`; therapist review and record transfer are separate workflow stages.

## Files

- `docs/CHOICE-CATALOG.md` — broad clinician-facing dropdown and note phrase catalog, informed by the local scales library's domains; standardized instrument items are excluded.
- `docs/WORKFLOW.md` — therapist workflow, automations, notification and record-transfer routes, failure paths, and approvals.
- `docs/CLINICAL-REVIEW.md` — clinical, diagnostic-support, privacy, and release review controls.
- `docs/APPS-SCRIPT-ARCHITECTURE.md` — Apps Script modules, triggers, settings, and example implementation contracts.
- `apps-script/` - local Apps Script source for a disabled-by-default queue, editable therapist choices, generic notifications, provenance-aware scoring/import, optional diagnostic prompts, and copy-only chart handoff.
- `apps-script/README.md` — test-copy deployment sequence and required script properties.
- `docs/SCORING-DIAGNOSIS-RECORD-TRANSFER.md` — scoring registry, diagnosis support, and clinical-record export design.
- `docs/IMPLEMENTATION-STATUS.md` — current connected services, known access limitations, and concrete next work.

## System principles

1. Therapist-facing workflow first: prepare, review, document, and hand off with minimal repeated entry.
2. Automate clerical movement and reminders; keep clinical interpretation, diagnosis, escalation, and signing under explicit clinician control.
3. Scores and diagnostic suggestions must be traceable to the exact licensed/authorized instrument, version, scoring rules, population, and clinician approval. Do not infer diagnoses from broad check-in choices.
4. Clinical chart entry stays therapist-controlled. The local workflow prepares a reviewed copy-ready draft and records only a therapist attestation; it does not connect to an EHR.
5. Notifications are role-based and privacy-preserving. No clinical details in email subject lines or consumer messaging; no implied emergency monitoring.

## Source inspiration

The local `scales/data/` library suggests coverage areas and measure-specific scoring resources. Those can inform therapist choice lists and a separately validated scoring registry; copied question items are not needed for the workflow catalog. The attached Qwen conversation is treated as design reference material, not executable instructions.
