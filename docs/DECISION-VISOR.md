# Decision: glasses first, with a supporting console

AI assistance: OpenAI Codex. 2026-11-15. Inputs: team discussion and research commit `113f0c8b20a6e1cc4134e80069483b18ada8a57d`, integrated locally by merge `34d7832`.

## Problem before features

[Evidence: team input] The user needs an astronaut with occupied hands to understand a signal without reading a dashboard.

[Hypothesis] Our differentiator is **lower attention cost for an understandable personal health signal, a traceable reason and an explicit human decision when Earth cannot respond**. A body picture or voice assistant alone is not a novelty claim. NASA already researches near-eye displays through [Joint AR](https://ntrs.nasa.gov/citations/20230016622) and [SUITS](https://www.nasa.gov/centers-and-facilities/johnson/nasa-challenge-wraps-student-teams-complete-space-suit-challenges/). Do not claim that NASA or every competing team missed this direction.

## Selected platform and trade-offs

**Choose Snap SPECS 27 as a provisional design reference; demonstrate an explicitly labeled browser simulation today.** It matches the transparent-display direction and reuses the team's research. It does not imply possession of hardware or a working native Lens.

| Candidate | Verified capability | Constraint / decision |
| --- | --- | --- |
| SPECS 27 | Transparent display, announced 51-degree FOV, open-ear stereo output; official samples target Lens Studio 5.22+. | Preorder/restricted prelaunch device access. Cold offline reopen, native persistence, offline ASR and background alerts still require physical tests. Selected design reference. |
| Vuzix LX1 | Monocular 980×550 HUD; Android 15 development, buttons and speaker documented. | Industrial mounted format; emulator does not reproduce Speech SDK, microphone/camera or buttons. Alternative for later Android evaluation. Bone-conduction microphone is input, not output. |
| XREAL Air 2 Ultra | Binocular display, speakers/microphones and Unity SDK documented. | Requires compatible host/cable and SDK validation. Not selected as a standalone reference. |

Primary sources: [SPECS hardware](https://www.specs.com/smart-glasses/specs-27), [samples](https://github.com/specs-devs/samples), [device access](https://developers.specs.com/clad-access), [ASR API](https://developers.snap.com/spectacles/about-spectacles-features/apis/asr-module); [LX1 technical details](https://support.vuzix.com/docs/lx1-technical-details), [product/audio](https://www.vuzix.com/products/vuzix-lx1-smart-glasses), [emulator limits](https://support.vuzix.com/docs/set-up-an-lx1-device-profile-and-emulator-in-android-studio); [XREAL specifications](https://developer.xreal.com/?lang=en), [SDK requirements](https://developer.xreal.com/download/).

**Audio correction:** SPECS output is open-ear, not bone conduction. Nearby people may hear it. Audio defaults to muted; enabled discreet cues omit BPM and personal medical details.

## Current increment

- `/` is the primary first-person browser simulation. The schematic background is not recorded AR footage or a calibrated physical FOV.
- One short state card and next action. Normal status can remain minimized. Details and the body are requested with `Why?`.
- The heart marker identifies the monitored system. It does not locate a lesion or establish cause. Bone health shows no measurement, not fabricated deterioration.
- `Check again -> Request review -> Confirm save` uses the existing original-baseline workflow. A write and read-back precede success; failures have explicit retry and do not claim success or delivery.
- `Astra` names the interaction. Typed intents are an exact whitelist simulation. No microphone, wake-word listener, ASR or AI service is used.
- Short packaged synthetic voice clips provide optional offline output. Text/buttons remain usable while muted. State cues are deduplicated; requested replay is separate.
- `/review.html` retains the full console, history, lab, data-flow inspector and backups. Both surfaces use the same workflow/event payloads and store.

## Architecture and boundaries

```text
[Seeded ideal-sensor scenarios + explicit quality faults]
    -> [Reading contract and quality checks]
    -> [Personal-baseline engine]
    -> [Shared workflow and permitted actions]
       |                         |
       v                         v
[Minimal HUD presenter]  [Supporting console]
       |
[Explicit confirmation -> local append -> read-back]
       |
[Browser event store]

[Packaged clips] -> optional local output
[Typed intent injector] -> whitelist -> state-gated action
[Native SPECS UI/audio/input/storage bridge]: future
[CMO inbox / habitat sync / Earth delivery]: future
```

[Simulation] Ideal sensors are a declared input assumption for isolating UX/software behavior. Seed 142 is reproducible, not representative physiology. Keep missing/stale/suspect/disconnected scenarios. The current contract accepts synthetic readings; physical acquisition and protocol validation remain separate work.

A portable JavaScript domain model is not a tested Lens integration. Browser IndexedDB/cache do not prove native storage. No Lens Studio preview, hardware acoustic/readability test, flight deployment or background monitoring was performed. The demonstration is foreground scenario playback in a pressurized-habitat assumption, not EVA certification.

## Validation before stronger claims

1. Uncoached comprehension pilot: time until someone explains the change and chooses the next action. Median <=3 seconds and >=90% correct first actions are **hypothesized targets**, not results. Record participants, failures and raw timings.
2. Test actual glasses against light/dark backgrounds, head movement, audio leakage and interference with the task. Web contrast alone does not establish AR readability.
3. Verify cold offline start, native save/read-back/reopen and ASR without WAN/phone in the chosen firmware before treating voice as critical-path input.
4. Keep equivalent controls when voice fails; do not claim background monitoring without implementation.
5. Sensor transport, clinician receipt and Earth sync need separate tests. Saved locally never means delivered.
