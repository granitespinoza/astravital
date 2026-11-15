# AI safety: how Astra avoids misinforming an astronaut

AI assistance: Anthropic Claude, from the code and tests written with OpenAI Codex. See [SI-USAGE.md](SI-USAGE.md).

**Principle: Astra may say less, but never something false.** When the data cannot support an answer, Astra says so and offers a safe next step.

## Where AI is used and where it is not

| Component | Uses AI? | Role | Can it create a health fact? |
| --- | --- | --- | --- |
| Astra's dialogue ([`server/assistant.mjs`](../server/assistant.mjs)) | No: deterministic rules | Maps a question to one of a closed set of intents and fills fixed sentences with computed values | No |
| Heart and bone decisions ([`app/engine.js`](../app/engine.js), [`app/bone.js`](../app/bone.js), [`server/database.mjs`](../server/database.mjs)) | No: versioned rules | Personal baseline, z-score, bone comparison with least significant change | No |
| Speech recognition ([`scripts/transcribe.mjs`](../scripts/transcribe.mjs), whisper.cpp) | Yes: pretrained local model | Turns the astronaut's speech into text | No: the text is only a question, and it is shown back as *"You said: …"* |
| Voice output (browser local voices; optional Kokoro, [`scripts/synthesize.mjs`](../scripts/synthesize.mjs)) | Kokoro: pretrained local neural voice | Reads aloud a sentence Astra already produced | No |

No cloud AI service is called at runtime.

## Risks and safeguards

| Risk | Safeguard | Automated test ([`tests/assistant.test.js`](../tests/assistant.test.js) unless noted) |
| --- | --- | --- |
| An invented or plausible-looking value | Answers use only validated (Gold) state; unusable data produce *"I can't assess…"* | *mute and out-of-scope medical questions retain evidence without inventing a diagnosis* |
| A diagnosis or a treatment | Declined: the synthetic measurements cannot diagnose or prescribe | *mute and out-of-scope medical questions retain evidence without inventing a diagnosis* |
| False reassurance or a false claim of contact | *"Earth is unavailable in this simulation. I haven't contacted anyone."*; symptoms are referred to the onboard medical officer | *friendly greetings, help, thanks, symptoms and Earth questions do not invent contact or assurance* |
| An accidental or misheard action | A review needs a separate confirmation turn tied to the exact context, expiring after 5 minutes, with an idempotent request ID; negations such as *"don't save"* cancel | *request, ambiguous confirmation and cancellation never persist a review* · *independent confirmation persists one review; a combined request/confirm only opens pending* · *pending confirmation is scoped, expiry is enforced, and failed writes have no success response* · *natural English keeps confirmation independent and negated actions have no side effects* |
| A real change "normalized away" | A repeat check keeps the original reference | *heart requests require a repeat and preserve the frozen reference in SQLite* |
| Answering about the wrong topic | Follow-ups keep the current domain; switching domain clears any pending action | *dialogue follows heart/bone context across natural Spanish and English questions with DB evidence* |
| Overloading a busy astronaut | Status answers stay short; numbers appear only when asked | *natural English status is warm, actionable and at most 35 words without measurements* · *technical measurements appear only after an explicit why, compare or medical-details request* |
| Bad or incompatible input data | Invalid records go to quarantine with reasons; bones are compared only when region, side, method, units and calibration match | [`tests/database.test.js`](../tests/database.test.js) · [`tests/bone.test.js`](../tests/bone.test.js) |
| Misrecognized speech | The transcript is shown; voice never becomes a measurement and cannot save without confirmation | [`tests/voice.test.js`](../tests/voice.test.js) |

## What this does not guarantee

- Thresholds (WATCH at |z| ≥ 2, ALERT at |z| ≥ 3, bone least significant change) are simulation settings, not clinically validated values.
- Tests use synthetic data: they verify software behavior, not clinical effectiveness.
- Intent recognition is keyword-based. Unusual phrasing gets a clarifying question instead of an answer: the system fails safe, not silent.
- Astra's comprehension by astronauts has not been measured in a user study yet.
