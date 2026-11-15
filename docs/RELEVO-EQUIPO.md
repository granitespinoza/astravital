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
