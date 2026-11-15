> Internal team note in Spanish. Not part of the judged submission materials; see README.md.

# Relevo para el equipo — 15 de noviembre de 2026

Documento interno. Para continuar ASTRAVITAL en cualquier máquina. Escrito por Claude al retomar el trabajo de Codex, que se quedó sin uso disponible (se restablece a las 12:09 p. m.).

## Estado

- **Rama con todo el trabajo:** `chore/hackathon-coherence`. Incluye lo de `feat/dashboard-fc` (PR #1) y lo de `docs/investigacion-ux-lentes`.
- **`main` todavía NO tiene la app.** Los jueces abren `main`: hay que fusionar esta rama antes de entregar. El PR #1 queda incluido en ella, así que basta un PR de `chore/hackathon-coherence` a `main`.
- **Pruebas:** `npm run verify` → 59 pruebas, 57 aprobadas, 0 fallos, 2 omitidas (integración de voz opcional, que también pasó al ejecutarla). Detalle en `docs/RESULTADOS.md`.

## Ejecutarlo en otra máquina

```sh
git clone https://github.com/granitespinoza/astravital.git
cd astravital
git checkout chore/hackathon-coherence
npm ci
npm run build
npm run setup:voice            # reconocimiento de voz local (necesita whisper-cli; en macOS: npm run setup:voice -- --install-binary)
node scripts/setup-tts.mjs     # voz local de Astra (Kokoro, unos 96 MB)
npm run demo                   # abre http://127.0.0.1:4173/
```

Requisitos: Node.js 22.13 o superior. La instalación necesita internet una vez; después funciona en local.

**Antes de grabar la demo:** parar el servidor, borrar `.runtime/demo.sqlite` y volver a arrancar. Así se eliminan las solicitudes de revisión guardadas en pruebas anteriores.

## Qué está hecho

- Entrada de las gafas: anillo que invita a tocar, acercamiento cinematográfico, paso a través de la lente, destello tipo iris, encendido escalonado del visor y botón "Replay intro".
- Vista del cuerpo minimalista: corazón y cadera izquierda claramente visibles, con halo, anillo y etiqueta.
- Voz local de Astra conectada (`POST /api/speak`), en un proceso aislado y con la red bloqueada.
- README para jueces, salvaguardas contra alucinaciones (`docs/AI-SAFETY.md`) y texto listo para el formulario de Space Apps (`docs/SUBMISSION.md`).

## Para el equipo presencial: revisar la experiencia de usuario

**Traer lo último:** `git fetch origin && git checkout chore/hackathon-coherence && git pull`. Los cambios también se ven en el PR #2: https://github.com/granitespinoza/astravital/pull/2

**Recorrido de 10 minutos.** Anotad lo que no se entienda a la primera:

1. **Entrada:** ¿se entiende que hay que tocar las gafas? ¿La transición se siente fluida? ¿Se encuentra el botón "↺ Replay intro"?
2. **Visor:** ¿se entienden "Heart · Review change" y "Bones · Worth a review" sin explicación?
3. **Astra:** preguntad "How is my heart?" por voz y por texto. ¿La respuesta es corta y clara? ¿La voz se entiende bien?
4. **Flujo de revisión:** "Check again" → "Prepare review" → "Confirm save". ¿Queda claro que no se envió nada a la Tierra?
5. **Medical details:** ¿un médico entendería los números y su origen?
6. **Body context:** ¿se distinguen el corazón y la cadera?
7. **Sin internet:** con el servidor local en marcha, desconectad el Wi-Fi. ¿Sigue funcionando todo?
8. **Pantalla pequeña:** estrechad la ventana del navegador. ¿Se lee bien?

**Cómo proponer mejoras:** abrid un issue en https://github.com/granitespinoza/astravital/issues con título, captura y prioridad (alta, media o baja). Para cambios de código, usad una rama propia y un PR hacia `chore/hackathon-coherence`. No editéis a la vez que Claude `app/experience.js`, `app/view3d.js` ni `README.md`.

**Qué está haciendo Claude ahora:** una demo web que funciona sin servidor (se publicará en https://granitespinoza.github.io/astravital/ al fusionar en `main`), CI con pruebas automáticas, un kit de demo (capturas, guion de 30 s, deck de 7 diapositivas) y una revisión al estilo de los jueces.

## Estado al pausar Claude (15 nov, mañana)

- **Hecho y subido:** demo web que funciona sin servidor (`app/web-demo.js`): Astra ejecuta en el navegador el mismo archivo de reglas que el servidor, y una prueba demuestra que da respuestas idénticas. Workflows de CI y de GitHub Pages en `.github/workflows/`.
- **Para publicar la demo en vivo:** fusionar el PR #2 en `main`. El workflow "Deploy web demo" la publica en https://granitespinoza.github.io/astravital/ (comprobadlo en la pestaña Actions). GitHub Pages ya está activado.
- **Pendiente de comprobar:** que la demo web se vea bien en el navegador (abrir esa URL, recorrer la entrada, preguntar por el corazón y guardar una revisión) y que el CI pase en el PR.
- **En pausa:** un kit de demo (capturas, guion de 30 s y deck de 7 diapositivas) y una revisión al estilo de los jueces. Si al volver no están en el repo, se rehacen.

## Qué falta (por prioridad)

1. **Fusionar `chore/hackathon-coherence` en `main`** (PR y revisión de una persona del equipo).
2. **Demo:** vídeo de 30 s o menos, o deck de 7 diapositivas como máximo, en inglés. Guion en la skill `spaceapps-demo`.
3. **Formulario de Space Apps:** copiar los textos de `docs/SUBMISSION.md`, añadir el enlace de la demo y probar todos los enlaces en una ventana privada.
4. **Licencia:** el repositorio todavía no tiene licencia elegida.
5. **Entrega:** antes del domingo 15 de noviembre a las 23:59, hora del Local Event. La hace una persona del equipo.

## Claude handoff — connected-care UX, 2026-11-15

User priority: judges will inspect ONLY https://granitespinoza.github.io/astravital/. Finish, publish through an authorized write path, and verify that actual URL. Local changes alone do not complete the request. User requested this handoff before context runs out. No commit, push, deployment or judging submission has been made in this pass.

Workspace: `/Users/granitespinozasalazar/Desktop/simulacro ` (trailing space). Branch main, base HEAD 6dc62e69745fcdaf7841cb866882111737e40753. Working tree was clean before this pass. Preserve all changes. Read AGENTS.md; stale browser-only skill descriptions are superseded by current requirements.

Implemented, UNCOMMITTED:
- app/case-messages.js: shared pure message validation, evidence context, stable request IDs, recipient-only receipt/review transitions; browser localStorage adapter with fresh reads, Web Locks in browsers, read-back verification. Browser messages ALWAYS remain local-only, including when reviewed. No model training.
- server/case-messages.mjs: additive SQLite case_messages table, transactions and evidence ownership validation. No destructive schema migration. Wired through server/database.mjs.
- server/http.mjs: loopback POST /api/messages; paired POST /api/mission/messages forces crew identity/role from bearer token. Extra UI assets allowed on crew LAN surface. Earth messages use explicitly simulated receipt; queued text withheld from recipients.
- app/case-thread.js + case-thread.css: shared per-crew/domain conversation, author/recipient, draft, Astra-assisted draft attribution, preview, separate confirm/cancel, stable retries, source/event history, truthful receipt labels; draft isolation and preview cancellation on context change. Async selection changes deferred while saving. Internal notes remain separate.
- app/index.html + experience.js: astronaut case summary; focused visor title/state, timestamp, primary action and Ask Astra / Details / Messages shortcuts; shared conversation; reset clears message history. Clears stale explanatory text on domain changes.
- app/mission.html + mission.js + ground-view.js: doctor case summary with identity, personal reference, timestamps, heart/bone states; shared conversation in Ground; local CMO and paired crew threads. Notes labeled internal, not sent. Forecast remains doctor-only.
- app/sw.js: cache v20, new assets and updated versioned entry points (experience v19, mission v18, ground-view v18).
- tests/case-messages.test.js: 4 tests for confirmation/text/evidence, withheld queue contents and transitions, restart/idempotency, shared browser storage and write failure.
- tests/e2e-web.mjs: added browser journey checks for preview/cancel/send, doctor reply/review, persistence, separation from internal notes, astronaut sees reply. NOT EXECUTED successfully in this environment.

Verification actually performed, Node v26.6.0, seed 142:
- npm run build PASSED.
- node --test tests/case-messages.test.js PASSED 4/4.
- node --test tests/case-messages.test.js tests/database.test.js tests/assistant.test.js PASSED 19/19.
- Suite excluding HTTP/mission network tests: 66 tests, 64 passed, 2 optional voice integrations skipped.
- Full node --test: 75 tests, 65 passed, 8 failed, 2 skipped. All 8 failures are listen EPERM on 127.0.0.1 (7 existing HTTP tests + mission HTTP test). Do NOT report the full suite green.
- node tests/e2e-web.mjs could not start its static server (unsettled await, exit 13). Environment prohibits listening sockets. Do not weaken sandbox/network policy to work around it.
- git diff --check PASSED before the latest small CSS/model edits; rerun.

Visual inspection actually performed with Chrome cursor using an INTERMEDIATE server-free rendering harness, NOT the published URL or full HTTP integration:
- /tmp/astravital-render-preview.html bundles actual modified UI code with esbuild; embeds synthetic snapshots and intercepts health fetch. File is temporary, NOT production source, NOT a deliverable.
- Enter glasses, click visor Check again: 73 bpm / Review change; new primary action and shortcuts visible.
- Messages -> Use Astra summary -> Review message -> Cancel worked, no saved entry.
- Repeat preview -> Confirm save locally worked: message appears with author, recipient and Saved locally · Not delivered.
- No reload or doctor reply was manually verified yet.
- Harness currently has font URL construction missing slash and doctor-mode protocol check prevents loading Ground (file: blocked by original initStaff guard). Fix HARNESS ONLY if reusing: CSS asset directory needs trailing slash; bundle define location.protocol/hostname as HTTPS preview values. Do not alter production guards to satisfy harness.

Small issues FOUND during inspection, still to address:
1. Initial visor scene-summary says I'm here when you need me instead of the meaningful current brief. In renderCrewCase set scene-summary to brief(state); turn() subsequently replaces it with actual response as intended.
2. Astra-generated message draft after repeat still uses stale decision.reason saying a repeat can help confirm. messageContext should use repeated/performed state + watch/alert to describe the already completed repeat, without diagnosis or treatment.
3. Primary visor button hover inherits generic dark hover background with dark text. Add explicit .visor-caption .hud-primary:hover:not(:disabled) contrast styling.
4. Test narrow/mobile/200% zoom, context-switch while preview, cross-tab refresh and storage denial in a REAL served browser. New focus visor hides old status pair; Heart/Bones remain selectable using assistant domain tabs and Body context. Verify intended UX.
5. Mission crew polling skips render when payload unchanged, so messages from other devices might not refresh automatically; explicitly refresh existing threads on successful polls or use a bounded timer. Static cross-tab storage events and focus refresh are implemented.
6. Browser persistence requires storage available; adapter now resolves localStorage lazily so denied storage should only disable messaging, not crash entire app. Verify UI error path.
7. Review server scope/validation and exact idempotency of transitions; request IDs handle send retries. This remains synthetic demo-role attribution, not production authentication.

Publication blockers observed:
- GitHub connector get_repo reports push:false for granitespinoza/astravital.
- Attempt to create feat/case-conversation-ux from base SHA returned HTTP 403 Resource not accessible by integration. Branch was NOT created.
- gh api repos/granitespinoza/astravital failed connecting to api.github.com in managed shell.
- Chrome regular profile Tu Chrome is NOT signed into GitHub (Sign in shown). Do not request/extract tokens or weaken protections. An authorized GitHub write connection or user browser sign-in is needed.
- Public main currently still base SHA and has a failing status indicator predating these changes; inspect CI rather than assuming failure was introduced here.

Next steps:
1. Resolve small issues above, review diff, add requirements/risk mapping RF11–RF13 (case card, messages, visor), update docs/SI-USAGE.md and docs/RESULTADOS.md with actual outcomes and limits. README current two-chip wording needs updating for focused visor. Do not edit project skills.
2. Run build/unit checks. Run existing e2e-web and e2e-local in an environment permitting localhost. Added browser checks must pass before claiming completion.
3. Obtain authorized publishing access, use isolated branch/PR and CI, preserve teammates' work, publish and verify actual public link with a fresh browser. No paid resources, authentication changes, secrets or judging submission.
4. Tell user explicitly if site has NOT been updated. User values working public experience over local architecture descriptions.
