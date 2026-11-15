# Web experience and visual system

AI assistance: OpenAI Codex. Implemented 2026-11-14 in the existing static application.

> Earlier console design. Since 2026-11-15 it is secondary at `/review.html`; the current primary UX is in [DECISION-VISOR.md](DECISION-VISOR.md).

## Experience: a signal, a reason, a chosen action

| View | User question | Working interaction | Requirement |
| --- | --- | --- | --- |
| Crew overview | Is this reading different from my normal, and what can I do? | Scenario, quality, personal band, repeat, local review and backup | R1.1–R1.3, R2.1–R2.7, R3.1–R3.3 |
| Detection lab | Why did the rule flag it? | Synthetic value, 7/14/28-sol window, z-score, included observations and actual five-stage trace | R4.1–R4.3 |
| Data flow | What happens to my data, and where does processing stop? | Select a pipeline stage; inspect its actual input or output; see human action and separate browser stores | R4.4 |

The crew overview is the primary task. Lab controls do not change the crew's baseline or write review events. All three views share a scenario selector and work within the same offline shell. Browser back/forward restores views using hash navigation.

## Identity and assets

The reference is the [official Space Apps brand page](https://www.spaceappschallenge.org/brand/). That page returned 502 during this pass; the [official brand guide PDF, 23 May 2025](https://assets.spaceappschallenge.org/media/documents/Space_Apps_Brand_Guide_-_23_May_2025.pdf) supplied the verifiable visual guidance.

- Deep Blue `#07173F`: page and navigation foundation.
- Electric Blue `#0042A6`, Neon Blue `#0960E1`, Blue Yonder `#2E96F5`: hierarchy, selection and chart accents.
- Neon Yellow `#EAFE07`: limited action/current-reading accents, not a full-page background.
- White and light blue-gray: text. Semantic WATCH/ALERT colors also carry text and symbols.
- Fira Sans Bold: headings; Overpass Regular/Bold: interface text. Code inspection uses the local system monospace stack.

The app retains the independent ASTRAVITAL name and a typographic star. It does not use a NASA insignia or claim NASA endorsement. See [NASA brand guidance](https://www.nasa.gov/nasa-brand-center/brand-guidelines/).

Font binaries are bundled in `app/`, served from the same origin, and precached. No CDN, external fonts, analytics or AI service is requested at runtime. Font licenses and exact sources/checksums are in [licenses](../licenses/). These are third-party licensed fonts, not AI-generated assets.

## Layout and access

Desktop uses side navigation and two-column cards. Tablet compresses the navigation; mobile uses three labeled navigation links and a single-column workflow. Text and icons identify states independently of color. Buttons have a 44 px minimum height, keyboard focus is visible, a skip link reaches the workspace, history has a text table, and reduced-motion preferences disable transitions.

These choices do not establish full accessibility compliance or successful astronaut usability. A comprehension study with representative users remains pending.

## Data and detection boundaries

The lab reuses the crew scenario's exact 14 recent readings and extends it with 14 older seeded readings when comparing a 28-sol window. The insufficient-history scenario remains at three observations. The source is synthetic in every case. Lab changes are transient and never become medical records.

`traceDecision` and `decide` share one implementation: acquire -> quality -> resting context -> baseline -> deviation. The web trace describes the engine's actual execution; blocked stages prevent later calculations. Duplicate history IDs cannot inflate the baseline; conflicting eligible copies are excluded. Invalid clocks, policies, fields or frozen snapshots return an explicit non-assessable state.

Frozen baseline snapshots must still be supplied by the caller for the same episode; the prototype does not implement multi-person clinical identity management. There is no automatic flat-signal detector, physical sensor connection, diagnosis, treatment or forecast.

## Prototype availability

`node scripts/serve.mjs` serves the local preview. The site remains in the existing repository; no new hosting account, remote push, production deployment or judging submission is part of this implementation.
