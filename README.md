# ASTRAVITAL

A local-first health monitoring prototype: a glasses UI, a contextual assistant and an inspectable data path from synthetic observations to a deliberate review request.

**NASA Space Apps Challenge 2026** · [Create Health Monitoring Software for Astronauts on Space Missions](https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/)

[Simulation] The runnable demonstration uses virtual cardiovascular and bone measurements. It is not a diagnostic system, physical sensor integration or validated spaceflight device. SPECS 27 is a design reference; the browser is not a native Lens.

## Start locally

Use **Node.js 22.13 or newer** (Node 26 recommended), npm and a current browser. From the repository root:

```sh
npm ci
npm run build
npm run setup:voice
npm run demo
```

The first installation and voice setup need internet. Voice setup downloads and hash-verifies the selected multilingual model in `models/`. It also requires an executable `whisper-cli`; inspect its output and [artifact manifest](models/manifest.json). On macOS with Homebrew, explicit `npm run setup:voice -- --install-binary` can install `whisper-cpp`. Other platforms must install/build the official engine and set `WHISPER_CPP_BIN` if it is outside PATH. A missing compiler/model must be reported, not silently replaced by remote recognition. Run `npm run demo` again to reuse the installed files. Seed **142** is applied automatically when the demo database is created; no manual database service is needed.

Open **http://127.0.0.1:4173/** for the glasses UI and **http://127.0.0.1:4173/review.html** for supporting review. Verify **http://127.0.0.1:4173/health** before testing voice: it reports API/database readiness, seed state and voice capabilities. If a model is unavailable, use the visible controls and retain the capability error; do not call typed input microphone recognition.

The SQLite file defaults to `.runtime/demo.sqlite`. Override `PORT`, `HOST`, `DB_PATH` or `SEED` through the process environment; [.env.example](.env.example) lists names. Do not commit runtime databases, microphone recordings, downloaded model weights or secrets.

To reproduce the synthetic seed explicitly:

```sh
npm run seed
```

Seed is a CLI operation, not a public HTTP reset endpoint. Re-seeding must be idempotent and must not delete unrelated records. It populates example data; it does not train a medical or speech model.

## Speech output

Dynamic spoken responses use only browser voices reported as `localService: true`. Voice availability depends on the operating system/browser. If no suitable local voice is available, Astra keeps the text and a visible limitation; it does not use an unannounced cloud voice. Piper is not installed or required for this increment. Acoustic intelligibility and real-glasses output still require separate testing.

## Exercise the complete workflow

1. Open `/health`, then enable the browser microphone on localhost and grant access. Choose the supported input language. Voice is available only when the local recognizer and model are ready.
2. Ask Astra about heart rate. Inspect the transcript and evidence-backed answer. A follow-up such as **Why?** must retain the current domain; a bone question switches domains.
3. Inspect quality, measurement time, context and source. Invalid or incompatible data must produce an unavailable/non-comparable result, never a plausible invented value.
4. Request review, inspect the confirmation, then explicitly confirm or cancel. A successful response means the service saved the request; it does not mean a clinician received or read it.
5. Reload and inspect the saved record through `/api/reviews` or the review view. A retry with the same `requestId` must not duplicate the request.
6. Deny microphone access, stop the recognizer, or remove the model from configuration: the UI must explain the failure and keep equivalent buttons/text input available. Private/mute mode stops spoken personal information.

The microphone captures **commands and questions**, not heart rate or bone density. Measurements come from virtual sources. Only finalized recognized input can enter the assistant, and every write action is validated against the active context and explicit confirmation.

### Local without Earth versus offline browser cache

After dependencies/models are installed, the local profile is designed to operate without WAN while localhost remains reachable. Verify this by removing external connectivity and keeping the local server running. DevTools **Offline** can block localhost API requests too; it is not the same test. Cached HTML/fonts/clips alone do not prove server-backed data or recognition availability.

The current increment's integrated evidence and pending checks are in [RESULTADOS.md](docs/RESULTADOS.md). Earlier browser-only test results are historical and do not prove the new API/voice path.

## Data and detection

- **Bronze:** immutable original virtual observations and provenance.
- **Quarantine:** invalid/conflicting records with reasons and original IDs.
- **Silver:** normalized, deduplicated observations with traceability.
- **Gold:** domain assessments, baselines/comparisons and the evidence cited by Astra.
- **Review events:** confirmed actions stored separately from observations.

These are explicit SQLite responsibilities, not a Databricks or Delta Lake deployment. The assistant reads validated derived state, not unrestricted raw SQL or unvalidated Bronze data.

[Hypothesis] The cardiovascular example compares valid prior resting measurements from the same person using a versioned personal-baseline rule. Seeded 68/73 bpm cases exercise WATCH/ALERT transitions; they are not clinical operating points or evidence that heart rate is the best biomarker. The 14-sol window and z-score thresholds remain simulation settings. Earlier 7/14/28-sol replay results are retained in [the results record](docs/RESULTADOS.md).

[Simulation] Bone analysis compares periodic virtual quantitative measurements only when region, side, method, units, calibration and timestamps are compatible. Unknown precision/LSC means significance is not established. A change is not a diagnosis of osteoporosis, porosity or fracture. See [bone evidence and limits](docs/SALUD-OSEA.md).

## API contract

| Route | Purpose |
| --- | --- |
| `GET /health` | API, database, seed and voice readiness |
| `GET /api/state?domain=cardiovascular&scenario=deviation` | Derived cardiovascular state; use `domain=bone` for bone |
| `GET /api/evidence` | Evidence and data provenance |
| `GET /api/reviews` | Persisted review requests |
| `POST /api/assistant` | `{ text, sessionId }` contextual turn |
| `POST /api/transcribe?language=es` | WAV request body; `es` or `en`, subject to installed recognizer/model |
| `POST /api/reviews` | `{ domain, scenario, confirmed, requestId }`; explicit confirmation and idempotency |

These routes belong to the authorized local implementation increment. Their verification status is recorded separately; do not infer production readiness from a route name.

## Verify

```sh
npm run verify
npm run test:browser
npm run test:functional
```

Record the actual Node/browser versions, test counts, seed, model/binary versions and failures in [RESULTADOS.md](docs/RESULTADOS.md). A real microphone acceptance test is separate from a deterministic WAV fixture test. No recognition accuracy or latency target is claimed as measured without the corresponding result.

## Azure profile: optional, not deployed

[Proposal] Container Apps can host an online evaluation API, with PostgreSQL for durable transactions, ADLS Gen2 for versioned exports, Azure Speech for online speech, Key Vault/managed identity for service access and Monitor for operational traces. The local path must not depend on those resources.

[infra/azure](infra/azure/README.md) contains an **unexecuted, disabled-by-default scaffold**, not a working Azure deployment. It does not provision PostgreSQL or Speech, wire a persistent database adapter, or create a live evaluation link. Container-local SQLite is ephemeral on Azure and is not a substitute for that persistent profile. No paid resources or account changes were created by this increment.

A [Dockerfile](Dockerfile) is provided for a local container with an explicit data volume. It does not bundle model weights or establish durable Azure storage. See the infrastructure notes before using it.

## Why this fits the challenge

[Evidence] The official challenge asks for health indicators that help astronauts evaluate their health and act. NASA HRP identifies **five hazards**, not five missions: radiation, isolation/confinement, distance from Earth, gravity fields and hostile/closed environments. They provide context; this prototype implements only two domains and does not claim to solve all five hazards. [Challenge](https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/), [NASA HRP hazards](https://www.nasa.gov/hrp/hazards/).

NASA's [EIMO concept](https://ntrs.nasa.gov/citations/20250000009) motivates onboard support when ground assistance is unavailable. [Crew-interface requirements](https://www.nasa.gov/reference/10-0-crew-interfaces-vol-2/) motivate unavailable-data labels, operator control and explanations. These sources are design inputs, not certification or validation of ASTRAVITAL. Synthetic observations are not NASA physiological data.

## Project map, attribution and license

[Architecture](docs/ARQUITECTURA.md) · [Requirements](docs/REQUISITOS-MVP.md) · [Results](docs/RESULTADOS.md) · [Submission evidence](docs/ENTREGA.md) · [Source audit](docs/AUDITORIA-REFERENCIAS.md) · [AI disclosure](docs/SI-USAGE.md)

The team defined the concept; OpenAI Codex assisted with implementation, tests, synthetic scenarios, documentation and infrastructure drafting. Recognition uses a downloaded model; medical answers are grounded in structured data and versioned rules. See model/binary manifests and licenses before redistribution. No unrestricted medical generative model is claimed.

Fira Sans/Overpass assets and licenses remain bundled locally in [licenses](licenses/), based on the [Space Apps brand guide](https://assets.spaceappschallenge.org/media/documents/Space_Apps_Brand_Guide_-_23_May_2025.pdf). The project has no selected LICENSE file; third-party licenses do not place the whole repository in the public domain or under an assumed project license. ASTRAVITAL uses its own name and claims no NASA endorsement.
