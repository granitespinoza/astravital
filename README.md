# ASTRAVITAL

An astronaut dashboard for early warning from resting heart rate, designed for use when Earth is out of reach.

**NASA Space Apps Challenge 2026** · *Create Health Monitoring Software for Astronauts on Space Missions*

[Simulation] In a Mars habitat with the Earth link unavailable, a crew member sees a resting heart rate outside their personal band. They can inspect the measurement and its quality, simulate a repeat measurement, and record a request for onboard review by a Crew Medical Officer (CMO).

## Run the dashboard

Use Node.js 24 and run the local server from the repository root.

```sh
node scripts/serve.mjs
```

Open the localhost URL printed by the script. The `app/` folder is the complete static site and can also be served directly over HTTPS. The dashboard uses browser APIs and local assets with zero external runtime requests.

### Try the offline workflow

1. Open the dashboard and wait for **Offline ready** and **Local storage ready**.
2. Choose **Resting deviation**. Compare the reading with the personal baseline. The assessment explains the status, the rule version, and the available action.
3. In browser developer tools, set **Network** to **Offline** and reload. Select **Simulate repeat reading** and then **Record CMO review request**.
4. Reload again and check the **Local review log**. Try **Missing reading** and **Device disconnected** to see how data availability and an explicit sensor fault are represented.
5. Use **Export demo records** and **Import demo records** to copy the review events between browser profiles. Use **Close simulated review** to end the local workflow when you are done.

First-time loading requires access to the static host. After the service worker has cached the site, the same browser profile and origin can open it without network access. The app stores demo records in IndexedDB. **Request persistent storage** asks the browser to retain the local data. Browser data clearing or eviction can still remove the offline cache and log. Use **Export demo records** to keep a separate copy.

## How the warning works

[Hypothesis] The engine compares a new reading with earlier valid resting measurements from the same person. It uses sample standard deviation and a rolling window with an initial setting of 14 Martian sols. The default rule requires at least five valid samples and uses thresholds of `|z| ≥ 2` for **Watch** and `|z| ≥ 3` for **Alert**. These are simulation settings defined in the rule configuration. The stale limit is 26 hours. A z-score describes the difference from the personal mean in units of standard deviation. The trend describes measurements already taken.

The engine's input and output types are documented in JSDoc. A given reading, history, clock value, and rule configuration produce the same decision in the browser and in the tests. Quality states cover missing or stale data, suspect signals, reported device faults, and insufficient history. The repeat uses the original baseline, and the local review log keeps the original and repeat reading IDs with the decision and rule thresholds. The astronaut chooses whether to record a review request, and the CMO retains responsibility for review.

[Simulation] The dashboard is functional. The sensor, mission clock, and Earth blackout are simulated. CMO review, the habitat node, and Earth synchronization are represented in the [system concept](docs/CONCEPTO-SISTEMA.md). A review request in this prototype is an entry in the astronaut's local log.

## Verify the prototype

```sh
node --test
node tests/browser.mjs
```

The browser check uses a local Chromium-based browser. The engine tests exercise data quality, thresholds and baseline behavior.

[Verified result] In the replay with seed 142, Watch counts as a potential interruption. Alert counts were zero across 60 stable sols for each window.

| Baseline window | False Watch per crew-sol | First drift flag after onset | Drift sols flagged | Missed injected events |
| --- | --- | --- | --- | --- |
| 7 sols | 4/60 (0.067) | 5 sols | 5/10 | 0/2 |
| 14 sols | 2/60 (0.033) | 5 sols | 5/10 | 0/2 |
| 28 sols | 1/60 (0.017) | 1 sol | 8/10 | 0/2 |

[Simulation] The acute spike was flagged on its first sol at each window size. These counts quantify potential interruptions in one synthetic trace per condition. They do not estimate clinical performance or crew workload. See the [simulation method](data/README.md) and [test results](docs/RESULTADOS.md).

## Design references

- [Evidence] NASA's crew-interface requirements call for visibly identifying unavailable data and explaining decision aids while keeping the operator in control. ASTRAVITAL uses these requirements as design inputs for its quality labels, assessment panel, and user-initiated review request. [NASA-STD-3001 Volume 2, section 10](https://www.nasa.gov/reference/10-0-crew-interfaces-vol-2/)
- [Evidence] NASA's concept for Earth-Independent Medical Operations describes onboard medical support when ground help is delayed or unavailable. That scenario drives local computation and recording in this prototype. [NASA EIMO Concept of Operations](https://ntrs.nasa.gov/citations/20250000009)
- [Evidence] The Canadian Space Agency's Bio-Monitor measures pulse on the ISS. Wearable research has also examined deviations relative to a person's resting heart rate baseline on Earth. These precedents informed the choice of signal and baseline. [CSA Bio-Monitor](https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp), [Mishra et al., PMID 33208926](https://pubmed.ncbi.nlm.nih.gov/33208926/)

## Use of AI

The team set the project goal and scope. OpenAI Codex helped implement and review the dashboard, local decision engine, synthetic scenarios, tests, and accompanying documentation. Runtime assessments use deterministic code. See the [AI disclosure](docs/SI-USAGE.md).
