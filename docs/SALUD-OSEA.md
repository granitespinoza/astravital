# Bone monitoring: evidence and scope decision

AI assistance: OpenAI Codex. 2026-11-15. Research for a possible second capability, not a finding about an astronaut.

**Decision:** retain bone health as an evidence-backed extension. Do not train today with arbitrary “healthy/unhealthy” X-ray pictures or claim porosity, osteoporosis or fracture risk from them. The current body view states **no bone measurement available**.

| Method | Supported use | Limit for this prototype |
| --- | --- | --- |
| DXA | Areal bone mineral density; NASA pre/post-flight assessment, commonly hip/spine. | Not continuous telemetry, direct porosity or demonstrated onboard capture. |
| QCT / HR-pQCT | Volumetric density, geometry and suitable region-specific microarchitecture research. | Not interchangeable with a casual photograph; hardware and protocol remain required. |
| Quantitative ultrasound | Portable radiation-free research candidate; region-specific bed-rest studies exist. | One site does not represent every bone; generic ultrasound is not automatically a validated BMD monitor. |
| Blood/urine markers | Whole-skeleton remodeling context. | Cannot locate a particular injured hip/vertebra or independently establish fracture prediction. |
| ML on conventional radiographs | Research estimates BMD with large paired radiograph–DXA datasets and external validation. | Does not validate ASTRAVITAL, astronaut use, porosity or training with unrelated good/bad pictures. |

Primary evidence:

- [NASA Bone and Mineral Laboratory](https://www.nasa.gov/directorates/esdmd/hhp/bone-and-mineral-evaluation-and-analysis/): astronaut measurement methods.
- [NASA fracture evidence report 2024](https://ntrs.nasa.gov/citations/20240005190): density/microarchitecture and fracture-risk limitations.
- [ISCD official positions](https://iscd.org/official-positions-2023/): comparable longitudinal measurements, precision/least significant change and cross-calibration.
- [Qin et al., ultrasound bed-rest study](https://pmc.ncbi.nlm.nih.gov/articles/PMC6718925/): region-specific evidence and tissue/confounding limitations.
- [Hsieh et al., Nature Communications 2021](https://www.nature.com/articles/s41467-021-25779-x): paired-data radiographic ML, not an ASTRAVITAL validation.
- [NIAMS bone-density interpretation](https://www.niams.nih.gov/health-topics/bone-mineral-density-tests-what-numbers-mean): a densitometric population-reference Z-score differs from our personal heart-rate Z-score.

## Defensible future increment

A region-based view can show measured region/side, method, timestamp, units, quality, source and simulation status. Comparisons need compatible regions/methods, calibration and an appropriate precision basis. Otherwise show `Not comparable` or `Significance not established`, rather than “bone mass is falling”. A calculated percentage is not automatically significant biological change.

A seeded dataset can verify units, filtering, storage and rendering. It cannot establish clinical sensitivity, microgravity effects or hardware performance. Even assumed ideal hardware needs an explicit measurement method and limits.

The useful differentiation is understandable context and human review. Cloud image training cannot replace the missing paired dataset, acquisition protocol, reference measurements or validation; it also adds a network dependency outside today's offline path.
