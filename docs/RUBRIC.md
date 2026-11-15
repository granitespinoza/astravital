# Rubric self-check (official 2026 criteria)

AI assistance: Anthropic Claude. Our evidence map against the five official criteria (each scored 1–5 by judges). Not a predicted score.

| Criterion | Evidence in this repository | Remaining gap |
| --- | --- | --- |
| Impact | Non-physician astronaut understands a heart or bone change and gets a safe next step during an Earth blackout (README, demo) | No user study yet |
| Creativity | Glasses-first view, personal baseline, data-quality states, onboard human review that keeps working without Earth; builds on NASA MDA and CSA Space Health without claiming them | — |
| Validity | 62 automated tests (CI green), web-demo parity test, real local voice tests, NASA-STD-3001 V2 10020/10169/10170, AI safety analysis (docs/AI-SAFETY.md) | Synthetic data; no clinical validation |
| Relevance | Directly answers the challenge (self-assessment and action); NASA HRP, NASA-STD-3001, EIMO, Mars communications and MDA shape the design | — |
| Presentation | Judge-facing README with screenshots, one-minute walkthrough, web demo link | Demo video (≤30 s) or deck (≤7 slides) still to record |

## Repository requirements (Project Submission Guide)

- [x] Public repository, no login; English README and judge-facing docs (internal Spanish notes are labeled).
- [x] At least one NASA resource used and listed (README, docs/SUBMISSION.md).
- [x] All data, resources and tools listed, with licenses.
- [x] AI use disclosed in text (docs/SI-USAGE.md) and in file headers; no AI-generated images; no NASA logos.
- [x] No Chinese AI: Whisper (OpenAI) via whisper.cpp, Kokoro (hexgrad, Apache-2.0), Hugging Face and Microsoft runtimes.
- [ ] Merge into `main` (judges open the default branch).
- [ ] Demo link and submission by a team member before 23:59 local time.
