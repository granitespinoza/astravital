# Space Apps 2026 project page: ready-to-paste text

Fields from the official [Project Submission Guide](https://www.spaceappschallenge.org/resources/project-submission-guide/) (read on 2026-11-14). Everything on the project page and in linked materials must be in **English**. A team member reviews, edits and submits; AI tools do not submit.

## Before submitting (team checklist)

- [x] **Merge the final work into `main`**: judges open the repository's default branch. The live web demo is published from `main`.
- [ ] Demo: a video of **30 seconds or less** (English or English subtitles) **or** a deck of **7 slides or fewer**, including title and intro slides. Over the limit means no Global Judging.
- [ ] Every link is public, with no login or permission request. Test each one in a private browser window.
- [ ] No images, video or audio of people under 18.
- [ ] Tick the **Terms and Conditions** and **Confirm All Work is Original** boxes; every external resource is listed under References.
- [ ] Submit before **Sunday, 15 November 2026, 23:59** local time of the team's Local Event. You can resubmit until then; judges see the last version.
- [ ] **Keep the demo link alive until results (26 January 2027).** Judging runs for about two months: do not rename, delete or make the repository private, do not rename the GitHub account, do not push to `main` after submitting, and tag the submitted commit (for example `spaceapps-2026-submitted`). The demo has no external runtime dependencies and was verified with the browser clock set to every judging date.

---

## Project Name

ASTRAVITAL

## High-Level Project Summary

ASTRAVITAL is an onboard health companion for astronauts on lunar and Martian missions that keeps working when Earth cannot answer. A glasses-style display and Astra, a local voice companion, help a non-physician crew member understand two measured health domains, resting heart rate and bone density, by comparing each reading with their own baseline, explaining any change in plain language and helping them prepare an onboard medical review. The same evidence then reaches an onboard medical officer and, after a simulated communication delay, an Earth doctor view. It addresses the challenge by turning health indicators into a clear next step without relying on real-time support from Earth. Everything runs locally, and Astra is designed so it cannot invent a health fact.

## Link to Project Demo

*[TEAM: public link to the ≤30-second video or the ≤7-slide deck]*

## Link to Final Project

https://github.com/granitespinoza/astravital (live web demo, no install: https://granitespinoza.github.io/astravital/)

## Detailed Project Description

**What it does.** ASTRAVITAL shows an astronaut, through a heads-up glasses view, the status of two health domains named in the challenge: heart (resting heart rate) and bones (bone density). Tapping the glasses moves the camera through the lens into the wearer's view, where two calm status chips summarize the latest checks. The astronaut can ask Astra by voice or text, for example "Astra, how is my heart?". Astra answers in short sentences, explains why when asked, suggests the next step (check again or prepare a review) and saves a review request only after a separate confirmation. The request stays on the local system and is never presented as delivered to Earth. An onboard medical officer console and a simulated Earth doctor view show the same records: the flight surgeon sees a prioritized inbox, the heart and left-hip measurements, the evidence chain and an experimental trend forecast.

**How it works.** Simulated wearable and bone records enter a local SQLite database in layers: raw observations with provenance (Bronze), a quarantine for invalid records, normalized observations (Silver) and derived state (Gold). A versioned rule compares the latest valid resting heart rate with the same person's prior readings; bone measurements are compared only when region, side, method, units and calibration match, against the measurement's least significant change. Astra is a bounded, rule-based dialogue: it recognizes a closed set of intents and fills fixed sentences with values from the Gold layer, attaching the evidence IDs it used. Missing or invalid data produce "I can't assess…" instead of a plausible value; diagnosis and treatment requests are declined; symptoms are referred to the onboard medical officer. Speech recognition runs locally with whisper.cpp. Reports to Earth are frozen onboard and released after a modeled 3–22 minute delay. The experimental forecast (damped-trend exponential smoothing) is shown only to the doctor and never changes a decision; in a time-ordered backtest on 200 synthetic crews over 180 sols it adapted to each person (1.49 bpm error versus 3.05 bpm for a fixed reference) but did not beat repeating the last reading (1.46 bpm), so we present it as an evaluated experiment and claim early warning, not prediction.

**Benefits.** The astronaut gets a clear, personal answer and a safe next step even during a communication blackout, while the crew medical officer receives a traceable, confirmed request. The design follows NASA crew-interface requirements for stale or missing data, operator control and explained decision aids.

**What we hope to achieve.** A crew-facing layer that could connect to real wearables such as the CSA Bio-Monitor and to delay-tolerant links to flight surgeons, supporting NASA's direction toward Earth-independent medical operations.

**Tools.** JavaScript (ES modules), Node.js 22, SQLite (`node:sqlite`), Three.js, esbuild, HTML, CSS, the Web Audio API, a service worker for offline use, whisper.cpp (local speech recognition) and Kokoro (local neural voice). 75 automated tests plus end-to-end browser checks of the web demo, the live site and the full local app.

## Use of Super Intelligence (SI)

Yes. The team defined the concept and scope. OpenAI Codex and Anthropic Claude assisted with code, tests, synthetic data scenarios, research, source verification and documentation; the repository records where (docs/SI-USAGE.md). At runtime no generative AI produces health answers: Astra uses deterministic rules over validated data. Speech recognition (whisper.cpp) and the optional voice (Kokoro) are pretrained models that run locally; packaged interface audio cues were synthesized locally and are acknowledged in the repository. Five illustrations (three anatomy views in the app, two concept images) were generated with ChatGPT (OpenAI image generation) and carry a visible "AI-generated image" watermark; they are illustrative only and do not represent astronaut measurements, diagnoses or mission telemetry, and all values, status colours and alerts are rendered by the application. No AI-generated video is used, and no NASA branding is used.

## NASA Data

- NASA Human Research Program: hazards, risks and ongoing research pages (challenge resources), used to choose the two domains and frame the problem.
- NASA-STD-3001 Volume 2, Section 10 (Crew Interfaces): requirements V2 10020 (stale or missing data indication), V2 10169 (operator decides when to use decision aids) and V2 10170 (decision aids explain rationale and consequences) shaped the interface and Astra's behavior.
- NASA, "Mars Communications Disruption and Delay" and the Earth-Independent Medical Operations concept of operations (NTRS 20250000009): basis for working without Earth.
- NASA Medical Data Architecture (NTRS 20170000744, 20200000568): basis for the layered, plug-in data design.
- NASA bone and mineral evaluation and analysis (Human Health and Performance), and NASA GISS Mars24 (sol length).

Synthetic measurements generated by the project are not NASA physiological data.

## Space Agency Partner Data and Other References

- Canadian Space Agency: Bio-Monitor; Space Health study; Monitoring Radiation for Astronaut Health (challenge resource).
- Mishra et al. (2020), *Pre-symptomatic detection of COVID-19 from smartwatch data*, Nature Biomedical Engineering — personal-baseline resting heart rate.
- Antonsen et al. (2022), *Estimating medical risk in human spaceflight*, npj Microgravity — NASA Integrated Medical Model.
- NASA SUITS challenge — heads-up displays for crew.
- Hyndman and Athanasopoulos, *Forecasting: Principles and Practice* (3rd ed.), §8.2 — damped-trend exponential smoothing used by the experimental forecast.
- TRIPOD+AI (BMJ 2024), Riley et al. (BMJ 2020) and IMDRF Good Machine Learning Practice — evaluation and release criteria for any future forecast (docs/ARQUITECTURA.md).
- Software: three.js (MIT), esbuild (MIT), whisper.cpp (MIT), kokoro-js and Transformers.js (Apache-2.0), Kokoro-82M voice model (Apache-2.0), Fira Sans and Overpass fonts (SIL OFL).
- Full source register with links: docs/AUDITORIA-REFERENCIAS.md and the README.
