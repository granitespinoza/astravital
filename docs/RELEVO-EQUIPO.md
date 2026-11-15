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

## Qué falta (por prioridad)

1. **Fusionar `chore/hackathon-coherence` en `main`** (PR y revisión de una persona del equipo).
2. **Demo:** vídeo de 30 s o menos, o deck de 7 diapositivas como máximo, en inglés. Guion en la skill `spaceapps-demo`.
3. **Formulario de Space Apps:** copiar los textos de `docs/SUBMISSION.md`, añadir el enlace de la demo y probar todos los enlaces en una ventana privada.
4. **Licencia:** el repositorio todavía no tiene licencia elegida.
5. **Entrega:** antes del domingo 15 de noviembre a las 23:59, hora del Local Event. La hace una persona del equipo.
