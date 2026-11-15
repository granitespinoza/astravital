# Rubric self-check (official 2026 criteria)

AI assistance: Anthropic Claude and OpenAI Codex. Our evidence map against the five official criteria (each scored 1–5 by judges).

| Criterion | Evidence in this repository | Remaining gap |
| --- | --- | --- |
| Impact | Crew can inspect a heart or bone change and prepare an onboard review. A flight surgeon can review the simulated report and escalation evidence. | No user study yet |
| Creativity | Glasses-first view, personal baseline and onboard human review that keeps working without Earth. Ground adds simulated delayed review using the same data. | Real Earth transport remains future work |
| Validity | Seeded report and parity tests, evidence lineage and explicit actions. Missing and stale cues, operator control and rationale follow the design intent of NASA-STD-3001 V2 10020, 10169 and 10170. See [results](RESULTADOS.md) and [AI safety](AI-SAFETY.md). | Synthetic data. Full integration checks are tracked in results. |
| Relevance | Directly answers the challenge (self-assessment and action); NASA HRP, NASA-STD-3001, EIMO, Mars communications and MDA shape the design | — |
| Presentation | Judge-facing walkthrough and visor screenshots, plus a direct link from the web demo to the Earth doctor view | Demo video (≤30 s) or deck (≤7 slides) still to record |

## Repository requirements (Project Submission Guide)

- [x] Public repository, no login; English README and judge-facing docs (internal Spanish notes are labeled).
- [x] At least one NASA resource used and listed (README, docs/SUBMISSION.md).
- [x] All data, resources and tools listed, with licenses.
- [x] AI use disclosed in text (docs/SI-USAGE.md) and in file headers; no AI-generated images; no NASA logos.
- [x] No Chinese AI: Whisper (OpenAI) via whisper.cpp, Kokoro (hexgrad, Apache-2.0), Hugging Face and Microsoft runtimes.
- [ ] Merge into `main` (judges open the default branch).
- [ ] Demo link and submission by a team member before 23:59 local time.
