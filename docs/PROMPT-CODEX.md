> Internal team note in Spanish. Not part of the judged submission materials; see README.md.

# Prompt para continuar con Codex (equipo presencial)

Para la sesión de Codex que ya está conectada al repositorio.

```text
Eres el agente de desarrollo del equipo ASTRAVITAL (NASA Space Apps Challenge 2026,
reto "Create Health Monitoring Software for Astronauts on Space Missions").
La entrega cierra hoy, 15 de noviembre de 2026, a las 23:59 (hora de Lima).

Lo más reciente está en la rama chore/hackathon-coherence (PR #2). Ya incluye todo lo de
feat/dashboard-fc (PR #1), así que a partir de ahora trabaja sobre chore/hackathon-coherence.

1. Actualiza tu copia y arranca la app:
   git fetch origin
   git checkout chore/hackathon-coherence
   git pull
   npm ci
   npm run build
   npm run setup:voice            # solo si aún no está instalado (macOS: npm run setup:voice -- --install-binary)
   node scripts/setup-tts.mjs     # voz local de Astra, unos 96 MB, solo la primera vez
   npm run demo                   # http://127.0.0.1:4173/
   Para empezar desde cero (por ejemplo, antes de grabar): para el servidor, borra
   .runtime/demo.sqlite y vuelve a arrancarlo.

2. Verifica con: npm run verify
   Esperado: 62 pruebas, 60 aprobadas, 0 fallos, 2 omitidas (integración de voz opcional).

3. Antes de cambiar nada, lee lo nuevo: docs/RELEVO-EQUIPO.md, README.md,
   docs/AI-SAFETY.md y docs/SUBMISSION.md.

4. Acompaña al equipo en el recorrido de experiencia de usuario de docs/RELEVO-EQUIPO.md.
   Registra cada hallazgo como issue en el repositorio (título, captura y prioridad).

5. Prueba la demo web sin servidor:
   python3 -m http.server 4175 --directory app
   Abre http://127.0.0.1:4175/ : debe decir "WEB DEMO · RUNS IN YOUR BROWSER".
   Recorre la entrada de las gafas, pregunta por el corazón y guarda una revisión.

6. Reglas:
   - No hagas push a main ni fusiones el PR #2 sin la aprobación de una persona del equipo.
     Al fusionarlo, el workflow "Deploy web demo" publica https://granitespinoza.github.io/astravital/
   - Para cambios, crea una rama propia y un PR hacia chore/hackathon-coherence.
   - Todo lo visible en la app y el README va en inglés; los datos simulados van etiquetados.
   - Nada de diagnóstico, tratamiento ni "predictive": usamos "early warning".
   - Declara el uso de IA en docs/SI-USAGE.md. Nada de IA china.

7. Tu primera respuesta: confirma si la app arranca (o qué falló), el resultado de
   npm run verify y las 3 mejoras de experiencia de usuario de mayor impacto.
   No cambies código hasta que el equipo lo confirme.
```
