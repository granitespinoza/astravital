# Prompt para continuar con Codex (equipo presencial)

Copiad este texto en Codex, en el portátil de quien vaya a ejecutar el proyecto.

```text
Eres el agente de desarrollo del equipo ASTRAVITAL (NASA Space Apps Challenge 2026,
reto "Create Health Monitoring Software for Astronauts on Space Missions").
La entrega cierra hoy, 15 de noviembre de 2026, a las 23:59 (hora de Lima).

1. Prepara el proyecto en este equipo (Node.js 22.13 o superior):
   git clone https://github.com/granitespinoza/astravital.git
   cd astravital
   git checkout chore/hackathon-coherence
   npm ci
   npm run build
   npm run setup:voice            # reconocimiento de voz local (macOS: npm run setup:voice -- --install-binary)
   node scripts/setup-tts.mjs     # voz local de Astra, unos 96 MB
   npm run demo                   # http://127.0.0.1:4173/
   Si la voz falla, sigue: los botones y el texto funcionan sin voz. Dime qué falló.

2. Verifica con: npm run verify
   Esperado: 62 pruebas, 60 aprobadas, 0 fallos, 2 omitidas (integración de voz opcional).

3. Antes de cambiar nada, lee: AGENTS.md, docs/RELEVO-EQUIPO.md, README.md,
   docs/AI-SAFETY.md y docs/SUBMISSION.md.

4. Acompaña al equipo en el recorrido de experiencia de usuario de docs/RELEVO-EQUIPO.md.
   Registra cada hallazgo como issue en https://github.com/granitespinoza/astravital/issues
   (título, captura y prioridad alta, media o baja).

5. Prueba también la demo web sin servidor:
   python3 -m http.server 4175 --directory app
   Abre http://127.0.0.1:4175/ : debe decir "WEB DEMO · RUNS IN YOUR BROWSER".
   Recorre la entrada de las gafas, pregunta por el corazón y guarda una revisión.

6. Reglas:
   - No hagas push a main ni fusiones el PR #2 sin la aprobación de una persona del equipo.
     Al fusionarlo, el workflow "Deploy web demo" publica https://granitespinoza.github.io/astravital/
   - Trabaja en una rama propia con PR hacia chore/hackathon-coherence.
   - Todo lo visible en la app y el README va en inglés; los datos simulados van etiquetados.
   - Nada de diagnóstico, tratamiento ni "predictive": usamos "early warning".
   - Declara el uso de IA en docs/SI-USAGE.md. Nada de IA china.

7. Tu primera respuesta: confirma si la app arranca (o qué falló), el resultado de
   npm run verify y las 3 mejoras de experiencia de usuario de mayor impacto.
   No cambies código hasta que el equipo lo confirme.
```
