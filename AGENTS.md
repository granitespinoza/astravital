# ASTRAVITAL — agent instructions

## Current direction and scope

Build a local-first executable demonstration: glasses UI, real microphone input when local ASR is installed, contextual structured-data queries, seeded SQLite medallion processing, cardiovascular and bone domains, and persisted explicit review actions. The static/browser-only implementation and its earlier results are historical baselines, not proof of the new backend or voice capabilities.

SPECS 27 remains a design reference. Do not describe the browser as a native Lens, typed input as ASR, open-ear speakers as bone-conduction output, a body marker as a lesion, or a local saved request as delivered care. Physical sensors, native glasses, clinical validation and background monitoring are not demonstrated.

## Read only the context needed

- `README.md`: startup, health, API, boundaries and verification.
- `docs/ARQUITECTURA.md`: local/optional Azure profiles, data ownership and errors.
- `docs/REQUISITOS-MVP.md`: acceptance gates and implementation status.
- `docs/RESULTADOS.md`: actual results and checks still pending.
- `data/README.md`, `docs/SALUD-OSEA.md`: synthetic data and bone interpretation limits.
- `docs/ENTREGA.md`, `docs/AUDITORIA-REFERENCIAS.md`: challenge evidence and external claims.
- `docs/DECISION-VISOR.md`, `docs/INVESTIGACION-UX-LENTES-SPECS-27.md`: design history, to be read against the current direction.
- `infra/azure/README.md`: optional, not executed Azure scaffold.

## Integrity

1. Distinguish `[Evidence]` / `[EVIDENCIA]`, `[Hypothesis]` / `[HIPÓTESIS]`, `[Simulation]` / `[SIMULACIÓN]`, and `[Verified result]` / `[RESULTADO COMPROBADO]`.
2. Z-score and longitudinal bone change are not diagnoses, validated forecasts or digital twins. Do not invent clinical validation or superiority to NASA.
3. Cite primary sources for scientific claims. Unsupported thresholds, precision and workloads are hypotheses.
4. Seed 142 and virtual observations demonstrate software; they do not train ASR, simulate all physiology or become NASA measurements.
5. Treat missing, stale, suspect, device-fault and insufficient/incompatible evidence separately. Do not infer a broken sensor from an unusual value.
6. Bone significance needs compatible measurements and known precision/LSC; otherwise report the limitation. Do not infer fracture/osteoporosis from a colored body model.
7. Keep explicit user control over saved actions. Confirm only final recognized input, revalidate context, persist, then report success. Idempotent retry must reuse the request ID.
8. Record commands, versions, seed, actual outcomes and limitations in `docs/RESULTADOS.md`. Never turn a target or historical test into a current result.

## Implementation boundaries

- Use Node.js 22.13+ (26 recommended) and preserve existing domain logic/tests unless the authorized change needs an adaptation.
- SQLite owns local observations, layers and review state. Do not introduce a second authoritative IndexedDB store for the same data. Cache Storage is for assets.
- Enforce Bronze -> validation/quarantine -> Silver -> evaluation -> Gold. The assistant must not bypass validation or execute dictated SQL.
- The microphone carries commands, not physiological observations. Local ASR must use installed artifacts; never silently fall back to a cloud service.
- Local operation without Earth means WAN disconnected with localhost reachable after setup. DevTools Offline can block local APIs and is a different test.
- Speech output uses only `localService: true` browser voices; missing local voice means text fallback. Do not claim Piper is installed.
- Keep voice listening visible, consented and cancelable. Suspend input during spoken output to prevent self-triggered actions; keep equivalent controls.
- Azure is a separately configured online profile. The scaffold does not prove deployment, durable database integration or Speech integration. Never put persistent SQLite on ephemeral replicas and call it durable.
- Do not create paid resources, publish, change account authentication, push or submit to judging without authorization. Never expose secrets or raw microphone recordings in logs.
- Every new component needs a requirement/risk. No extra health domains, brokers, gateways or lakehouse product without a measured need.
- Preserve teammates' changes and create a recoverable backup before deletion or migration.
- App, README and submission content stay in English; document AI/model/assets and licenses in `docs/SI-USAGE.md` and the relevant manifest.

## Project skills

Load only the relevant project skill. Existing skill checklists predate this backend increment; the user's current scope and the evidence in `README.md`/requirements take precedence over stale browser-only statements. Do not edit those skills as part of a bounded docs/IaC task.

Edit project skills in `.claude/skills/`, then synchronize `.agents/skills/` using `bash scripts/sync-skills.sh` when skill changes are separately in scope. Respond at the user's requested length; keep persisted documents in normal prose.
