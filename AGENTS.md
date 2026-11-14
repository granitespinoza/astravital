# ASTRAVITAL — instrucciones para agentes (Claude y Codex)

**Proyecto:** Software inteligente de monitoreo y adaptación humana para misiones espaciales.
**Estado:** propuesta en fase inicial. Nada de lo siguiente está implementado salvo que el repositorio lo demuestre.

## Propuesta de trabajo (no son funcionalidades existentes)

- Monitoreo de variables fisiológicas de astronautas.
- Procesamiento local cuando no hay comunicación con la Tierra (offline-first).
- Alertas explicables basadas en líneas base individuales y Z-Score.
- Ventana móvil de 14 días: **hipótesis** pendiente de evaluar, no parámetro fijado.
- Interfaz que ayude al tripulante a interpretar y priorizar alertas.
- Clon o gemelo digital: **visión futura**, alcance por definir.

## Reglas obligatorias

1. **Separa siempre** cuatro categorías y etiqueta cada afirmación:
   `[EVIDENCIA]` (fuente verificable) · `[HIPÓTESIS]` · `[SIMULACIÓN]` · `[RESULTADO COMPROBADO]` (con datos y método reproducibles).
2. Un Z-Score **no es un diagnóstico médico** ni prueba suficiente de un gemelo digital. Descríbelo como señal estadística de desviación respecto a la línea base.
3. No afirmes que el proyecto supera a la NASA ni que tiene validación clínica sin evidencia publicada que lo respalde.
4. Marca todo dato simulado como tal y registra sus limitaciones: origen, generador, supuestos y lo que no representa.
5. Toda propuesta de detección debe evaluar: falsas alarmas (tasa y coste), datos faltantes, deriva de la línea base y fallos o desconexión de sensores.
6. Respalda cada afirmación científica con una fuente verificable (DOI, PMID o URL de una agencia o revista). Si no la encuentras, dilo y marca la afirmación como `[HIPÓTESIS]`. No inventes referencias.
7. Prefiere fuentes primarias: artículos revisados por pares, NASA Technical Reports Server (NTRS), Human Research Program, ESA. Las secundarias solo como contexto.

## Respuestas breves (opcional)

Por defecto responde con explicaciones completas. Usa el estilo Caveman solo cuando el usuario lo pida (`/caveman` en Claude, `$caveman` en Codex, o "sé breve"). Desactívalo con "stop caveman" o "normal mode". Documentos, código y commits siempre en prosa normal.

## Qué herramienta usar

Consulta `docs/GUIA-HERRAMIENTAS.md`.

## Objetivo de misión

ASTRAVITAL debe funcionar en una **estación lunar y en una base en Marte sin conexión con la Tierra**. Todo el procesamiento es local; la Tierra es solo un destino de sincronización con retardo o cortes. Detalle técnico: skill `astravital-offline`.

## NASA Space Apps Challenge 2026

Competimos en el reto oficial **"Create Health Monitoring Software for Astronauts on Space Missions"**. La entrega cierra el **domingo 15 de noviembre de 2026 a las 23:59** (hora del Local Event). Todo lo que vaya a la entrega se escribe en inglés. Hay que declarar el código y las imágenes generados con IA.

## Concepto del sistema

Antes de diseñar funciones o la interfaz, lee `docs/CONCEPTO-SISTEMA.md` (actores, sensores existentes y propuestos, arquitectura del "mini sistema operativo", niveles de escalado y qué se presenta como funcional, esquemático o visión futura) y `docs/REQUISITOS-MVP.md` (requisitos con criterio de aceptación, boceto del dashboard y decisiones abiertas). El MVP funcional es el **dashboard del astronauta** con dos indicadores físicos; el resto se presenta como esquema.

## Enrutador de skills (carga solo la que toque)

| Fase o tarea | Skill (Claude `/nombre` · Codex `$nombre`) |
|---|---|
| Elegir funciones, indicadores y alcance del MVP | `astravital-reto` |
| Offline, red del hábitat, sync, Luna/Marte, despliegue local | `astravital-offline` (su `references/red-habitat.md` solo para red o seguridad) |
| Tests, datos simulados, falsas alarmas, ventanas 7/14/28 | `astravital-qa` |
| Revisar la página de entrega, elegibilidad y rúbrica | `spaceapps-2026` |
| Guion de 30 s o deck de 7 diapositivas | `spaceapps-demo` |
| Generar y comparar ideas antes de decidir | `ce-ideate` |
| Respuestas breves durante el sprint (opcional) | `caveman` |
| Auditar un cambio importante | `auditar` |

No cargues todas a la vez: cada skill indica cuándo leer sus referencias.

## Resolución de skills en este entorno

- Caveman está instalado para Codex en `~/.agents/skills/caveman/SKILL.md` y para Claude en `~/.claude/skills/caveman/SKILL.md`.
- La capacidad de innovación instalada es `ce-ideate`: `~/.agents/skills/ce-ideate/SKILL.md` para Codex y `~/.claude/skills/ce-ideate/SKILL.md` para Claude. No afirmar que existe una skill instalada con el nombre literal `innovation`.
- Si una skill no aparece en el catálogo de la conversación, comprobar su archivo y leerlo por su ruta antes de concluir que falta. Leer las referencias requeridas cuando se use.
- No usar la posibilidad de escribir en `~/.codex/skills` como prueba de que faltan las skills de `~/.agents/skills`.
- Canva está registrado en la configuración local de Codex. Su disponibilidad en una conversación depende de que el cliente exponga sus herramientas. La presencia de la URL no verifica la autenticación ni una conexión activa.
- Si Canva no aparece entre las herramientas de esta conversación, informar de esa limitación específica. No reinstalar ni borrar una configuración existente por ese motivo.

## Entorno web y despliegue (para Codex/Claude)

- Build estático con procesamiento en el navegador, sin backend.
- Demo para los jueces: Vercel plan gratuito (`*.vercel.app`), con la URL de producción pública y sin login (desactivar Vercel Authentication en producción). En la misión, el mismo build lo sirve un nodo local del hábitat.
- Cero dependencias de red en tiempo de ejecución: sin CDNs, fuentes externas ni analytics. Prefiere APIs nativas del navegador y `node:test`.
- Si un comando necesita red (por ejemplo `npm install`), el sandbox de Codex puede pedir aprobación: pídela en lugar de buscar atajos.
- Las skills del proyecto se editan en `.claude/skills/` y se copian a `.agents/skills/` con `scripts/sync-skills.sh`.
- Todo texto visible en la app y el README en inglés. Declarar código e imágenes generados con IA en `docs/SI-USAGE.md` y en el README.
- No subir secretos. El login de Vercel/GitHub lo hace una persona del equipo.
