# Focused source register and claim audit

AI assistance: OpenAI Codex. Updated 2026-11-14. Keep only references that explain the demonstrated workflow or its evaluation. Earlier exploratory material is recoverable from Git and the pre-cleanup backup.

| Source | Claim it supports | Product consequence | Verification / limit |
| --- | --- | --- | --- |
| [NASA EIMO ConOps, NTRS 20250000009](https://ntrs.nasa.gov/citations/20250000009) | Onboard medical support when ground communication is unavailable or impractically delayed | Local assessment and recording, with human review | Primary page opened in this pass; conceptual recommendation, not approval of this software |
| [NASA-STD-3001 Vol. 2, crew interfaces](https://www.nasa.gov/reference/10-0-crew-interfaces-vol-2/) | 10020: identify unavailable/stale data; 10169: operator control; 10170: explain decision aids | Distinct quality states, user-selected review, visible rule and explanation | Primary page opened in this pass; design inputs, not certification of compliance |
| [NASA Mars24 technical notes](https://www.giss.nasa.gov/tools/mars24/help/notes.html) | Mean solar day of 24 h 39 min 35.244 s | Simulation uses the rounded 88,775 s per sol, with windows explicitly in sols | Primary page opened in this pass; not a flight clock implementation |
| [CSA Bio-Monitor](https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp) | Prior repository research cites an ISS physiological monitoring system | Candidate source rationale for heart rate | Retained prior source; no hardware adapter or device validation demonstrated here |
| [Mishra et al., PMID 33208926](https://pubmed.ncbi.nlm.nih.gov/33208926/) | Prior repository research cites personal-baseline wearable observations on Earth | Research context for studying deviations | Retained prior source; not validation of our thresholds or performance in space |
| [Official Space Apps challenge](https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/) | Astronaut visual self-assessment and action | Scope of the single workflow | Official indexed summary recovered in this review; see [submission verification limits](ENTREGA.md) |

## Claims that must remain limited

- [Simulation] All dashboard data are synthetic and labeled. No NASA physiological dataset is consumed.
- [Hypothesis] Thresholds, window and stale limit are software simulation settings, not clinical operating points.
- [Verified result] Engine tests and offline browser checks establish behavior under their inputs. See [RESULTADOS.md](RESULTADOS.md); no clinical sensitivity or safety claim follows.
- [Hypothesis] More indicators, actual sensors, multi-device synchronization and Earth transport are future work.
- No validated diagnosis, treatment, forecast, digital twin, flight deployment, NASA certification, or superiority over existing NASA systems is claimed.

## Research removed from the active path

Neural implants, throat/ear sensors, voice assistants, suit integration, psychological assessment and broad vendor comparisons are not required to explain or verify this prototype. Their earlier notes remain in Git history and the complete backup; do not restore them as hackathon implementation commitments.
