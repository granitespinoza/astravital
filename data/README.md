# Simulated heart rate data

[Simulation] Every dashboard reading represents a fictional crew member (`crew-03`) and simulated sensor. The `simulated` field is set to `true`. Source timestamps are UTC, and the canonical unit `/min` is presented as beats per minute (bpm) in the dashboard.

## Dashboard scenarios

[Simulation] The generator starts with seed `142` in a 32-bit linear congruential generator. The baseline series uses rounded draws between 57 and 65 bpm at one sample per Mars sol (88,775 seconds), generally for 14 sols. The insufficient-history scenario has three prior samples. Synthetic timestamps and a fixed clock make the scenarios repeatable. [Scenario generator](../app/scenarios.js), [NASA Mars24 technical notes](https://www.giss.nasa.gov/tools/mars24/help/notes.html)

| Scenario | Injected condition |
| --- | --- |
| Resting deviation | A current resting value of 68 bpm after the reference history |
| Stable readings | A current resting value of 61 bpm |
| Gradual drift | An increment of 1.5 bpm per sol in the trailing readings, followed by a current value of 73 bpm |
| Missing reading | The current slot has no reading |
| Stale reading | The latest measurement is at least 27 hours old |
| Suspect signal | A 61 bpm reading is given a suspect quality flag |
| Device disconnected | An explicit device-fault report with no numeric measurement |
| Insufficient history | Three prior readings for a rule that requires at least five |

The repeat measurement advances the clock by seven minutes and uses a fixed follow-up value. The Earth link blackout is simulated. The blackout label describes the mission scenario. A browser network disconnection used in an offline test is a separate condition.

## Window comparison

[Simulation] The reproducible engine tests start from the same seed with 28 warm-up sols and 60 evaluated sols. They compare 7-, 14-, and 28-sol windows with a stable series, a ten-sol upward drift (+1.5 bpm per sol), and a one-sol spike (+20 bpm). The event begins at evaluation sol 21. Replay holds the first flagged baseline through each injected event. [Method and observed results](../docs/RESULTADOS.md)

[Hypothesis] Sampling frequency, variability, drift sizes and thresholds were chosen to exercise the prototype. The generator does not represent data from astronauts, clinical physiology, actual sensor error distributions, or the effect of the space environment. Injected events provide a reference for testing the code.
