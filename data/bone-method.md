# Synthetic longitudinal bone measurement method

AI assistance: OpenAI Codex. These fixtures test software behavior, not human physiology or NASA instrument performance.

## Provenance and contract

`astravital.bone-measurement.v1` identifies the `bone` domain's synthetic DXA areal-BMD adapter. Each record declares person, region, side, method, unit, calibration, UTC acquisition time, quality, simulation flag and a precision basis. A future device adapter must supply a separate validated acquisition and normalization process; this contract does not establish compatibility with real hardware.

Seed **142** starts the same documented 32-bit LCG as the heart demo: state = (1,664,525 × state + 1,013,904,223) modulo 2^32, output = state / 2^32. The first draw generates a rounded baseline `round((0.99 + draw × 0.02) × 100) / 100`, equal to **1.00 g/cm²**. Scenario offsets are deliberate test injections, not modeled biology.

## Scenarios

All paired evaluations are separated by six months, **2026-05-15** and **2026-11-15**. They are not continuous telemetry or proof of an onboard DXA implementation.

| Scenario | Baseline / current | Purpose |
| --- | --- | --- |
| missing | No records | No bone measurement available |
| change | 1.00 / 0.97 g/cm² | A -3% numerical change exceeds the explicitly assumed 2.5% LSC |
| stable | 1.00 / 0.99 g/cm² | A -1% numerical change stays within that assumption; no clinical-health label |
| mismatch | Left / right total hip | Prevent incompatible regional comparison |
| missing-lsc | 1.00 / 0.97 g/cm² without precision basis | Show descriptive numerical change; significance not established |

The **2.5% LSC is a synthetic precision assumption**, not a clinical threshold, manufacturer specification or NASA result. It has a synthetic assessment ID and basis. Both records must have the same explicit basis before the software classifies change relative to it.

## Calculation and gates

Percentage change = `(current - baseline) / baseline × 100`. Strictly greater absolute change than LSC is `exceeds-measurement-lsc`; equality stays `within-measurement-lsc`, allowing only floating-point rounding tolerance. This is a measurement comparison, not an inference of disease, bone porosity, fracture risk or biological cause.

The comparison rejects mismatched person, region, side, DXA method, unit or calibration; invalid/non-increasing dates; duplicate IDs; nonpositive/nonfinite values; flagged quality; unsupported contracts; and non-simulated input. Input order may be sorted by valid timestamps without changing the original records. Missing/incoherent precision permits a percentage but never establishes significance.

[ISCD official adult positions](https://iscd.org/official-positions-2023/) describe measurement precision/LSC and cross-calibration. They motivate the metadata gates; they do not supply or validate this synthetic 2.5% value. The [project bone evidence note](../docs/SALUD-OSEA.md) records research scope and limits. No radiographs, ML training, real astronaut datasets or physiological prediction are used here.

Run `node --test tests/bone.test.js` to reproduce the arithmetic and invalid-input checks. Seeded fixtures establish determinism, not medical sensitivity or safety.
