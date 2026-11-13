# Therapist Workflow

## Audience and operating model

This is a therapist-facing adjunct to ongoing care, for therapists and authorized clinic staff. Optional client check-ins are source material. Clinical interpretation, diagnosis, safety assessment, signing, and chart entry stay with the treating clinician.

## Workflow

1. **Receive.** A form response is appended to the response tab. The script references the source row and does not edit it.
2. **Match.** A unique exact Clinic ID is matched to `Client Tracker`. Missing IDs, duplicate IDs and malformed events go to a manual review queue. No fuzzy name search is used.
3. **Review.** The therapist checks the source response in the restricted workbook, confirms identity, and records the review status. The queue view does not display response answers.
4. **Score or import.** Scores are available only from a reviewed measure implementation or therapist-confirmed summary import. Provenance stays with each result. Unregistered or incomplete measures remain unscored.
5. **Consider prompts.** If separately enabled after clinical and intended-use review, deterministic differential flags from the scales app appear as sourced prompts for clinician review. They are not diagnoses or probabilities and do not enter a chart.
6. **Prepare a note.** Therapist-entered fields become a source-labelled draft with a review checklist. Empty source sections remain empty.
7. **Enter chart manually.** The therapist verifies Client ID and encounter, reviews and approves the exact draft, copies it into the correct chart, completes the EHR's signing steps, then may record a manual attestation. The tool does not send the note or verify the EHR accepted or signed it.

## Low-friction choices

The editable therapist catalog covers encounter type, modality, participation, source/certainty, session focus, MSE observation domains, formulation status, goal area/status, progress source, intervention, barrier/access, safety-documentation status, next step, follow-up, review state and note/handoff status. “Not assessed,” “unable to assess,” “deferred,” “other,” and free text are available where appropriate. `Catalog Bindings` connects a catalog to a specific cell range only after the clinic checks that target in the workbook copy.

Choices are shorthand prompts, not findings or recommendations. Narrative context and source labels remain necessary. There is no automatic risk tier, treatment recommendation, or diagnosis from a checkbox.

## Generic internal notifications

The optional notice says an item is ready for therapist review and links to the secure workspace. Recipients are administrator-configured. The notice includes no names, clinic IDs, symptom content, scores, diagnosis, note text, or emergency interpretation. Notification failure is visible in operations/audit status and does not close the queue.

## Failure and recovery

- **Missing/duplicate/malformed identity:** keep the row unresolved until staff confirm the exact tracker ID; never guess.
- **Duplicate event:** ignore a second event for the same source sheet and row.
- **Unknown, incomplete or unsupported score:** preserve the source result and send to manual review without substituting a calculation.
- **Partial scale import:** reconcile the `Clinical Assessment Imports` ledger and score/prompt rows before retrying.
- **Notification or trigger failure:** retain the review task and use the manual queue. Trigger presence does not prove it ran.
- **Draft changed after approval or token expired:** rebuild/review and approve the exact current draft again.
- **Chart-entry uncertainty:** therapist checks the destination record before retrying. Attestation is not an EHR receipt.

## Release sequence

1. Review permissions, headers, formulas and protections in a restricted workbook copy.
2. Use fabricated data to check identity matching, duplicates, unmatched recovery, queue status and generic notifications.
3. Review catalog lists and explicitly bind safe dropdown ranges in the copy.
4. Validate each measure/version/locale and its source rights and scoring before enabling a route.
5. Review the diagnostic prompt feature's clinical role, intended users, limitations and local requirements; keep its flag off until approved.
6. Review manual note workflow, copy/paste steps, access, retention and attestation language.
7. A clinic owner separately approves each feature before any live configuration. This local implementation has not been deployed.
