# Verification results

AI assistance: OpenAI Codex. See [SI usage](SI-USAGE.md).

## Local decision engine

[RESULTADO COMPROBADO] **9 passed, 0 failed** on Node.js 24.22.1 with the `Personal resting heart rate z-score v0.1` rule. From the repository root, run:

```sh
node --test tests/engine.test.js
```

The suite checks that the baseline uses only earlier, valid readings from the same astronaut and measurement context. It checks the rolling window boundaries, positive and negative WATCH and ALERT thresholds, zero variance, distinct data quality states, descriptive slope, and simulated source labeling. In the frozen-baseline test, a follow-up reading remains at ALERT with the saved baseline after 14 shifted readings would have brought it to OK against the rolling baseline.

[SIMULACIÓN] The replay uses seed **142** and a fresh pseudorandom stream for each scenario and window. Each run warms up with 28 sols and scores the following 60 sols. It generates one resting reading per sol by rounding a uniform draw between 57 and 65 bpm. A sol lasts 88,775,000 ms in the simulation. S1 adds no event. S2 adds 1.5 bpm on sol 21, then another 1.5 bpm per sol for a total of ten elevated readings. S3 adds 20 bpm to the reading on sol 21 only. In S2 and S3 the replay freezes the baseline at the first flagged event reading for the rest of the injected event. The tests use `|z| ≥ 2` for WATCH, `|z| ≥ 3` for ALERT and a minimum of five valid baseline readings.

[RESULTADO COMPROBADO] The replay counts either WATCH or ALERT as one flag per observation. Detection delay is measured from the first elevated observation. The test command prints one diagnostic record per window.

| Baseline window | S1 false flags / 60 crew-sols | S1 false flags per crew-sol | S2 delay to first flag | S2 flagged event sols / 10 | S3 delay to first flag | Missed events / 2 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 7 sols | 4 | 0.0667 | 5 sols | 5 | 0 sols | 0 |
| 14 sols | 2 | 0.0333 | 5 sols | 5 | 0 sols | 0 |
| 28 sols | 1 | 0.0167 | 1 sol | 8 | 0 sols | 0 |

All S1 flags were WATCH. S4 produces separate outcomes for a suspect signal and a reported device disconnect. S5 covers three missing sols and recovery. It also checks that a retained reading becomes stale after 26 hours. These quality outcomes suppress the deviation alert for the affected reading.

[HIPÓTESIS] The interruption estimate counts flagged sols. It has no measured estimate of time spent repeating a reading or waiting for an onboard review. The replay uses one noise sequence, one crew member and two injected events per window. It provides a software check under those assumptions. A choice of operating window or claims of clinical performance require representative data and further evaluation. See [simulation inputs](../data/README.md).

[RESULTADO COMPROBADO] The engine and scenario generator passed strict JavaScript type checking with TypeScript 6.0.3. With the compiler available, reproduce the check with:

```sh
tsc --allowJs --checkJs --strict --noEmit --target es2022 --module nodenext app/engine.js app/scenarios.js
```

## Offline dashboard

[RESULTADO COMPROBADO] The browser integration suite passed on Node.js 24.22.1 with Chrome 157.0.8103.78 and Edge 157.0.4341.46. From the repository root, run:

```sh
node tests/browser.mjs
```

The suite opened the static app on localhost, checked the desktop and mobile layouts and all five data quality states, then disabled browser networking. It recorded a repeat reading and an onboard review request. Reloading fetched the document from the service worker and restored the reading and log from IndexedDB. The suite closed the simulated review, exported the three records offline and imported the same backup twice into a fresh browser profile without duplicating records. It observed zero HTTP requests from the dashboard to external origins.

[SIMULACIÓN] The Mars blackout models the crew workflow. The browser network disconnection tests actual software behavior. The CMO request stays in the local log. The habitat network and Earth delivery remain architecture concepts.
