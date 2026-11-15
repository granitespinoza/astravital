# Hackathon evidence and submission checklist

AI assistance: OpenAI Codex. Reviewed 2026-11-15; executable increment in progress. This is an evidence map, not an invented score or a guarantee of eligibility.

## Use the rubric through evidence

| Working criterion | Show the judges | Evidence in this repository | Remaining gap |
| --- | --- | --- | --- |
| Impact | A crew member understands a deviation when Earth is unavailable | [Problem and actors](CONCEPTO-SISTEMA.md), one workflow | No measured user benefit or comprehension study |
| Creativity | Personal context, explanation and chosen human review in an offline scenario | [Architecture](ARQUITECTURA.md), dashboard | Explain relation to existing work without claiming unique medical autonomy |
| Validity | Reproducible behavior, quality states and explicit limits | [Results](RESULTADOS.md), [data method](../data/README.md), tests | Synthetic inputs do not establish clinical performance |
| Relevance | Visual self-assessment and action; NASA resources affect design | [Sources](AUDITORIA-REFERENCIAS.md), quality labels and onboard workflow | Confirm final project answers the selected official challenge |
| Presentation | One end-to-end demonstration a judge can follow | [README walkthrough](../README.md#try-the-offline-workflow) | Final public demo URL and video/deck not recorded |

The five names appear on [2026 local-event pages](https://www.spaceappschallenge.org/2026/local-events/ajmer/) supplied by Local Leads. The central guide remains the authority for scale, descriptors and eligibility. Do not claim a verified 1–5 score or weighting from this table.

## Official rules: verification status

- [2026 event page](https://www.spaceappschallenge.org/2026/): the official indexed text lists submission through **15 November 2026, 23:59 local time** and teams up to six. Confirm the team's Local Event and timezone.
- [Official challenge](https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/): its indexed summary supports gathering health indicators for astronaut self-assessment and action.
- [Submission guide](https://www.spaceappschallenge.org/resources/project-submission-guide/) and [Judging & Awards guide](https://www.spaceappschallenge.org/resources/judging-awards-guide/): returned 502 during a later Codex review, but Claude read both directly on 2026-11-14 (version dated 13 November 2026). Confirmed: five criteria, each scored 1–5 at every judging stage, with no published weights; the eligibility requirements, form fields and AI-disclosure rules summarized in [SUBMISSION.md](SUBMISSION.md).
- Keep the current working constraints: English, a video no longer than 30 seconds or a deck no longer than seven slides, public accessible links, references and AI disclosure. NASA Space Apps [forum 1947](https://github.com/nasa/spaceapps/discussions/1947) and [forum 1973](https://github.com/nasa/spaceapps/discussions/1973) corroborate several constraints; responder authority was not verified. Confirm exact conditions in the central guide before submission.
- [2026 terms](https://www.spaceappschallenge.org/legal/) indexed text requires attribution and appropriate license documentation, including free/open-source material. This repository has no LICENSE file; the team must choose terms rather than assume an open-source license.

## Team-owned checks before submission

- [ ] Confirm Local Event, member eligibility/count and timezone; complete required project fields and terms.
- [ ] Confirm live guide requirements, including NASA-resource use and AI/media declarations. Earlier local skill details remain provisional until reconfirmed.
- [ ] Record a public final-project URL; test it without login in a private browser session.
- [ ] Record the demo link; time the video or count every slide, including cover and ending.
- [ ] Demonstrate an actual browser network disconnection after **Offline ready**, then repeat, request review and reload.
- [ ] Label synthetic data and distinguish a local review request from CMO/Earth delivery.
- [ ] Cite primary design resources from [the source register](AUDITORIA-REFERENCIAS.md); do not describe synthetic data as NASA measurements.
- [ ] Verify [AI disclosure](SI-USAGE.md), third-party credits and license decisions. Confirm whether generated media need visible attribution under the current guide.
- [ ] Have a human team member inspect and submit the final project.

## Executable increment evidence boundary

The current work targets reproducible startup, seeded medallion processing, cardiovascular/bone evidence queries, real local microphone transcription and persisted confirmed actions. [Requirements](REQUISITOS-MVP.md) define acceptance; [results](RESULTADOS.md) separate completed historical runs from new checks still pending.

The official [challenge](https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/) indexed summary asks for indicators supporting self-assessment and action. NASA [HRP](https://www.nasa.gov/hrp/hazards/) identifies **five hazards**, not five missions: radiation, isolation/confinement, distance from Earth, gravity fields and hostile/closed environments. Only cardiovascular and bone are in this increment; other systems must not appear as measured or normal.

For a reviewable code delivery: verify startup commands and health; inspect seed provenance, layer transitions, quality and domain evidence; test final confirmation/failure/retry; separate microphone WAV recognition from typed input; test local operation with WAN removed and localhost available. A cache-only browser test does not establish availability of the local API/recognizer.

The optional [Azure template](../infra/azure/README.md) is not a deployed evaluation link or durable cloud profile. PostgreSQL, ADLS archive/Speech adapters and actual cloud reception remain separately unimplemented/unverified. No resources, billing commitment, authentication changes, publication or judging submission were performed by the documentation/IaC pass. Video production, narration and staffing assignments are outside this code delivery.
