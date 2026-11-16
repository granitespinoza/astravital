# Use of Super Intelligence (SI)

[Evidence] The team defined the ASTRAVITAL concept and selected the dashboard and resting heart rate workflow. The [system concept](CONCEPTO-SISTEMA.md) and [requirements](REQUISITOS-MVP.md) record the scope and earlier work.

## AI-assisted contributions

| Tool | Contribution | Where to inspect it |
| --- | --- | --- |
| OpenAI Codex | Implementation and review of the browser interface, local rules, persistence, offline assets and development server | [Application source](../app/) and [local server](../scripts/serve.mjs) |
| OpenAI Codex | Code for generating synthetic scenarios and code for verifying rule behavior and the offline workflow | [Scenario generator](../app/scenarios.js), [data description](../data/README.md) and [tests](../tests/) |
| OpenAI Codex | Drafting and reviewing the instructions, results and AI disclosure accompanying this implementation | [Project README](../README.md) and [results](RESULTADOS.md) |
| OpenAI Codex | Repository inventory, backup, consolidation of scope, requirement-to-component mapping and rubric evidence checklist; no runtime changes in this pass | [Organization record](ORDEN-REPO.md), [architecture](ARQUITECTURA.md) and [submission checklist](ENTREGA.md) |
| OpenAI Codex | Web layout, responsive styles, interactive detection lab and data-flow inspector, defensive engine validation, and related verification | [Web design](DISENO-WEB.md), [explorer](../app/explorer.js), [engine](../app/engine.js) and [tests](../tests/) |
| Anthropic Claude and OpenAI Codex | Earlier assistance with the concept documentation, source checks and project requirements | [Reference audit](AUDITORIA-REFERENCIAS.md) |

[Simulation] All dashboard inputs are synthetic. Codex assisted with the generator and scenario parameters. The application generates readings with a fixed-seed algorithm and labels them as simulated. See [data origin and assumptions](../data/README.md).

[Evidence] The decision engine executes versioned rules in the browser with no model inference or AI service at runtime. The interface uses HTML, CSS, and a chart drawn from the simulated readings.

[Evidence] The bundled Fira Sans and Overpass fonts are third-party assets obtained from their upstream repositories. They are not generated images or AI assets. Licenses and source/checksum records are in [licenses](../licenses/). No generated image or video was added in this web increment.

[Evidence] OpenAI Codex assisted with the glasses simulation, shared workflow, HUD projection, tests, research synthesis and platform choice. The habitat/body shapes are illustrative code, not medical imaging. Five packaged cues were synthesized locally with the macOS Daniel voice; [transcripts/method](../data/hud-audio-transcripts.json) are included. They are synthetic output, not a glasses recording or actual voice input. No learned bone-image model was added.

## Executable local/backend and optional Azure increment

[Evidence] OpenAI Codex assisted with the local API/data/voice design, seeded medallion responsibilities, contextual-query contract, startup documentation, Dockerfile and disabled-by-default Azure Bicep scaffold. See [architecture](ARQUITECTURA.md), [requirements](REQUISITOS-MVP.md) and [infrastructure notes](../infra/azure/README.md). Integrated implementation/test outcomes must be recorded in [RESULTADOS.md](RESULTADOS.md), not inferred from this attribution.

[Simulation] Virtual cardiovascular/bone observations and seed parameters exercise software contracts; they are not NASA physiological records or clinical validation. Local speech recognition uses separately obtained pretrained artifacts. Installing those artifacts is not training them, and transcribed microphone speech is not a physiological measurement.

## Anthropic Claude contributions (2026-11-14 and 2026-11-15)

| Contribution | Where to inspect it |
| --- | --- |
| Agent environment, project skills and instructions; concept, requirements and source verification (including the official 2026 Space Apps guides and NASA-STD-3001 requirements) | [AGENTS.md](../AGENTS.md), [concept](CONCEPTO-SISTEMA.md), [requirements](REQUISITOS-MVP.md), [source audit](AUDITORIA-REFERENCIAS.md) |
| Judge-facing README, AI-safety analysis and the drafted project-page text | [README](../README.md), [AI safety](AI-SAFETY.md), [submission text](SUBMISSION.md) |
| Continuation of Codex's glasses-intro and voice work after Codex reached its usage limit | Commits on the `chore/hackathon-coherence` branch |
| Final UX pass: header and hero description, lens motion and frame, "OK Astra" wake phrase, motion switch, readability floor, patient card and reply notification, and an independent two-agent review of the result | [results](RESULTADOS.md#final-ux-pass-nielsens-heuristics--2026-11-15), [motion switch](../app/motion.js) |
| Review and merge verification of the Earth doctor dashboard; the experimental trend forecast and its time-ordered backtest; the full local app end-to-end test; wording and time-format clarifications across the glasses, CMO and Ground views | [forecast](../app/forecast.js), [backtest](../scripts/forecast-eval.mjs), [local end-to-end](../tests/e2e-local.mjs), [results](RESULTADOS.md#integration-verification-on-macos--2026-11-15) |

[Evidence] Include recognizer binary/model source, pinned version, checksum and license in its generated or committed manifest before redistributing artifacts. The project has no chosen overall license; the licenses of fonts, recognizer/model and future voices remain separate. No remote medical generative service, Azure deployment or native SPECS integration is established by these files.

## Mission LAN integration

[Evidence] OpenAI Codex adapted the team’s local v0.5 and v0.6 demonstrators to the main Node.js and SQLite architecture. The contribution covers the crew transport, pairing, CMO console, simulated Ground reports, verification and setup notes. The mission interface uses the existing ASTRAVITAL styles and fonts. It adds no model inference, generated assets or external runtime services.

## Earth doctor dashboard integration

OpenAI Codex assisted with the dashboard, SQLite and browser workflows, test data export, automated tests, documentation and manual review. Codex subagents were assigned layout, tests and documentation. The browser test changes supplied by the test subagent were reviewed and completed in the integrated branch. The project guides informed scope, local operation, test coverage and presentation evidence. The globally named design and audit guides were unavailable.

The dashboard reuses the existing Three.js anatomy, history chart and bundled typography. The architecture diagram uses Mermaid. The browser and shell checks are recorded in [results](RESULTADOS.md).

OpenAI Codex linked the glasses and Ground demos to the same seed-142 resting check and added view magnification for the heart and left hip. The anatomy stays illustrative with the existing code-built model.

OpenAI Codex checked N2 reproducibility and retry behavior and documented the proposed longitudinal evaluation and surgeon-led release criteria. [Results](RESULTADOS.md#n2-determinism-and-idempotence) and [architecture](ARQUITECTURA.md#longitudinal-learning-and-decision-support) record the scope.
