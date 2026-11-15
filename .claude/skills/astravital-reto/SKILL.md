---
name: astravital-reto
description: Scope and plan ASTRAVITAL against the official Space Apps 2026 challenge "Create Health Monitoring Software for Astronauts on Space Missions" - challenge objectives, NASA HRP resources for the NASA Data field, Moon/Mars environment fit, 48-hour MVP priorities and feature-to-rubric mapping. Use when choosing features, indicators or MVP scope, or checking challenge relevance.
---
# ASTRAVITAL frente al reto oficial

> Dirección vigente 2026-11-15: visor simulado como experiencia principal y consola como respaldo. Leer `docs/DECISION-VISOR.md`. No afirmar integración SPECS, ASR offline, monitoreo en segundo plano ni detección ósea; el audio abierto no es conducción ósea.


## Estado real y alcance de esta skill (2026-11-14)

El código actual demuestra solo FC en reposo con datos simulados. Temperatura cutánea, adaptadores físicos y transporte Tierra quedan fuera del MVP demostrado. Los requisitos y su estado vigente están en `docs/REQUISITOS-MVP.md`; no implementar capacidades nuevas por una lista histórica de esta skill.


Reto: **Create Health Monitoring Software for Astronauts on Space Missions** · https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/

## Flujo de trabajo (síguelo antes de diseñar o programar una función)

0. **Lee `docs/CONCEPTO-SISTEMA.md` y `docs/REQUISITOS-MVP.md`** si no los has leído en esta sesión: actores, arquitectura, requisitos con aceptación y decisiones abiertas.
1. **¿Responde al objetivo del reto?** Herramienta visual de autoevaluación de salud que ayuda a actuar. Si no aporta a eso, queda fuera del MVP.
2. **¿Funciona sin la Tierra?** Aplica `astravital-offline`.
3. **¿Está etiquetada?** `[EVIDENCIA]`, `[HIPÓTESIS]`, `[SIMULACIÓN]` o `[RESULTADO COMPROBADO]` (ver AGENTS.md). Las ideas de futuro van como `[HIPÓTESIS] — visión futura`.
4. **¿Cómo se prueba?** Define el test o el escenario con `astravital-qa`.
5. **¿Qué criterio de la rúbrica mejora?** Consulta la tabla de abajo.

## Lo que pide el reto

- Una herramienta **visual** para que el astronauta **evalúe su propia salud** y reciba orientación para actuar.
- Contexto: los 5 peligros del HRP (radiación, aislamiento y confinamiento, distancia a la Tierra, campos de gravedad, entorno cerrado hostil).
- Indicadores que cita el reto: presión arterial, frecuencia cardiaca, glucosa (mg/dL), temperatura corporal, horas de sueño y estado de ánimo. El prototipo demostrado solo usa FC en reposo; otros indicadores quedan diferidos.
- Entrada libre: teclado, clics o cámara.
- Preguntas guía: qué se puede medir en el espacio, por qué hace falta cada examen, cómo afectan los peligros a cada indicador, cuándo avisar a la tripulación o a los flight surgeons y qué acciones previenen un estado crítico.
- El reto menciona entornos como **nave, estación, rover o base en otro planeta o luna**: encaja con nuestro objetivo de estación lunar y base en Marte.

## Recursos oficiales (cítalos en el campo "NASA Data")

- NASA HRP, 5 Hazards of Human Spaceflight: https://www.nasa.gov/hrp/hazards/
- NASA HRP, Risks of Human Spaceflight: https://www.nasa.gov/hrp/risks/
- NASA HRP, Ongoing HRP Research: https://www.nasa.gov/hrp/ongoing-hrp-research/
- CSA, Monitoring Radiation for Astronaut Health: https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp
- CSA, Why Do We Conduct Science Experiments in Space?: https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp
- Diseño de interfaz: NASA-STD-3001 Vol. 2, requisitos 10020, 10169 y 10170: https://www.nasa.gov/reference/10-0-crew-interfaces-vol-2/

Para sumar en Relevance, el conocimiento de la NASA debe **cambiar el producto** (contextos de medición, estados de confiabilidad, revisión según el enlace), no aparecer solo como enlace.

## MVP: un caso completo (medición → calidad y contexto → desviación explicada → revisión humana)

1. **Datos:** un indicador demostrado, **FC en reposo**, con generador simulado de semilla fija y contrato interno `Reading`. La repetición también es simulada, no entrada manual ni adaptador físico.
2. **Motor local:** línea base por persona y contexto, Z-Score, tendencia descriptiva **sin cuenta atrás**, estados `ok / watch / alert` y estados de dato `missing / stale / suspect / device-fault / insufficient-history`. Línea base congelada mientras hay una alerta abierta.
3. **Explicación y revisión humana:** regla y versión visibles, "statistical deviation, not a diagnosis", solo pasos de procedimiento (volver a medir, pedir revisión al CMO) y solicitud de revisión que funciona con la Tierra caída.
4. **Offline:** App estática con service worker, IndexedDB para eventos de demo y export/import. El perfil de enlace `moon` / `mars` es opcional si no desplaza el recorrido principal.
5. **Interfaz:** tarjetas con texto e icono (no solo color) e historial con la banda personal. Boceto en `docs/REQUISITOS-MVP.md`.
6. **Pruebas y métricas:** escenarios S1–S5 y flujo local de S6 de `astravital-qa`, registrados en `docs/RESULTADOS.md`.

**Fuera del MVP demostrado:** temperatura cutánea y demás indicadores, entrada manual real, sincronización y outbox Tierra, ánimo y psicología, voz o chatbot, diagnóstico, tratamientos, pronóstico individual, ML opaco, hardware real, DTN real, gemelo digital y afirmaciones clínicas.

## Funciones frente a la rúbrica

| Función | Criterio que mejora |
|---|---|
| Desviación explicada con regla, versión y confiabilidad | Validity, Relevance |
| Revisión a bordo cuando la Tierra no responde | Creativity, Relevance, Best Mission Concept |
| Funciona en modo avión | Validity, Presentation (demo) |
| Métricas de falsas alarmas y ventanas 7/14/28 | Validity, Best Use of Science |
| Interfaz clara para no expertos | Impact, Presentation |

## Encaje de las ideas de ASTRAVITAL

| Idea | Etiqueta |
|---|---|
| Línea base individual por contexto + Z-Score | [HIPÓTESIS] método explicable; no es diagnóstico |
| Ventana de 14 días (o soles) | [HIPÓTESIS] compárala con 7 y 28 |
| Procesamiento local sin la Tierra | Diseño; se demuestra en modo avión |
| "Predictivo" | [HIPÓTESIS] solo con variable, horizonte, incertidumbre y error medido; en el MVP, alerta temprana por tendencia |
| Gemelo digital | [HIPÓTESIS] — visión futura; como mucho, en la última diapositiva |

Todo lo que vaya a la página de entrega o a la app se escribe **en inglés**.
