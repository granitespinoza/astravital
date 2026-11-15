# Executable increment requirements

AI assistance: OpenAI Codex. Updated 2026-11-15. Scope: local Node.js 22.13+ (26 recommended), a browser glasses UI, seeded SQLite medallion data, real local microphone recognition when installed, cardiovascular and bone queries, and confirmed persistent review actions. Azure remains optional and unexecuted.

The earlier browser-only R1–R5 checks remain historical in [RESULTADOS.md](RESULTADOS.md). The following acceptance gates supersede them for the new backend increment. **Pending integrated verification** does not mean implemented, tested or clinically validated.

| ID | Required behavior | Repeatable acceptance | Status of evidence at documentation update |
| --- | --- | --- | --- |
| RF1 | Initialize a synthetic database and maintain Bronze/quarantine/Silver/Gold | Fresh DB receives seed142; rerun seed preserves IDs/content and adds no duplicates; invalid input has quarantine reason | Pending integrated verification |
| RF2 | Capture microphone audio and transcribe with configured local ASR | Permission granted, WAV sent, non-typed final transcript; compare a deterministic audio fixture and a separate live microphone run | Pending integrated verification |
| RF3 | Interpret supported questions with session context | Heart-rate status -> Why? retains domain; bone question switches domain; ambiguity triggers clarification | Pending integrated verification |
| RF4 | Derive cardiovascular state from compatible earlier valid data | Existing personal-baseline regression cases, threshold boundaries, quality outcomes and frozen-repeat snapshot | Prior detector evidence exists; API path pending |
| RF5 | Compare periodic bone observations with evidence limits | Matched region/side/method/unit/calibration; invalid/missing/unknown precision produces explicit non-comparable/unknown-significance result | Pending integrated verification |
| RF6 | Display one next action and details on request | UI state references evidence; body marker denotes system context, never a lesion or inferred pathology | Earlier UI evidence exists; integrated path pending |
| RF7 | Confirm, cancel, save and retry a review without invented success | Cancel creates none; failed save creates no success; explicit retry with same requestId creates one; reload returns it | Earlier browser event evidence exists; SQLite/API path pending |
| RF8 | Operate locally without Earth after setup | Disconnect WAN while preserving localhost; query state, transcribe installed local model, confirm save and reload; capture zero external runtime requests | Pending integrated verification; browser cache alone is insufficient |
| RF9 | Keep equivalent controls when voice fails | Denied permission, missing model/binary, silence, timeout and failed recognition leave buttons/text input usable | Pending integrated verification |
| RF10 | Start reproducibly and expose readiness | `npm ci`, `npm run setup:voice`, `npm run demo`; `/health` reports API, DB, seed and recognizer truthfully | Pending clean-start verification |

## Data meaning and human control

- All virtual observations must identify simulation, origin, observation time, quality and seed/schema provenance.
- A microphone provides spoken commands, never measured heart rate or bone density.
- Heart rate is the reproducible software example, not a proven optimal biomarker. WATCH/ALERT thresholds and window are simulation settings.
- The bone module must not diagnose osteoporosis, porosity or fracture. Unknown precision prevents a significance claim.
- Only explicit final confirmation in the active action context can persist a request. `Saved` does not imply `delivered`, `read` or medical approval.
- Physical SPECS, actual native gestures, continuous background monitoring, diagnosis and further health domains are outside this executable increment.

## Nonfunctional acceptance gates

| ID | Gate | Measurement | Interpretation |
| --- | --- | --- | --- |
| N1 | Zero external requests on the prepared local critical path | WAN-isolated API/recognizer/browser exercise with localhost accessible | Offline operation test; setup is excluded and documented |
| N2 | Deterministic and idempotent data/actions | Reopen seed 142 and compare evidence IDs and counts. Retry an identical crew packet and local review action. Reject a reused ID with different input. | Local SQLite and web demo checks in [results](RESULTADOS.md#n2-determinism-and-idempotence). |
| N3 | No false success after write failure | Failure injection and subsequent read-back | Persistence acknowledgement, not delivery |
| N4 | Sensitive input stays out of routine logs | Inspect API/recognizer logs and retained files | No real patient data admitted in this public demo scope |
| N5 | Capability degradation is explicit | Health/UI checks for missing/failed ASR and denied microphone | UI remains usable without voice |

Latency, recognition accuracy, storage retention, peak load, availability and battery budgets are **targets to be chosen after measurement**, not achieved results. Record actual environment and outcomes in [RESULTADOS.md](RESULTADOS.md).

## NASA relevance boundary

The [official challenge](https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/) requires indicators supporting self-assessment and action. [HRP](https://www.nasa.gov/hrp/hazards/) lists five hazard categories, not five separate missions. Cardiovascular and bone are the only two implemented domains in scope; hazard labels must not generate fictional normal states for the other domains.

## Azure acceptance is separate

The [Azure scaffold](../infra/azure/README.md) does not satisfy RF8 or a durable public evaluation requirement. Before any durable Azure claim: implement PostgreSQL/ADLS/Speech adapters, configure authentication and resource-scoped permissions, test replica replacement and idempotent receiver acknowledgements, and record a live URL/result. No deployment, credentials, entitlement or spending authorization is implied by committing IaC.
