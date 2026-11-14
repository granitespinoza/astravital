---
name: astravital-reto
description: Scope and plan ASTRAVITAL against the official Space Apps 2026 challenge "Create Health Monitoring Software for Astronauts on Space Missions" - challenge objectives, NASA HRP resources for the NASA Data field, Moon/Mars environment fit, 48-hour MVP priorities and feature-to-rubric mapping. Use when choosing features, indicators or MVP scope, or checking challenge relevance.
---

# ASTRAVITAL frente al reto oficial

Reto: **Create Health Monitoring Software for Astronauts on Space Missions** · https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/

## Flujo de trabajo (síguelo antes de diseñar o programar una función)

1. **¿Responde al objetivo del reto?** Herramienta visual de autoevaluación de salud con orientación sobre acciones. Si no aporta a eso, queda fuera del MVP.
2. **¿Funciona sin la Tierra?** Aplica `astravital-offline`.
3. **¿Está etiquetada?** `[EVIDENCIA]`, `[HIPÓTESIS]`, `[SIMULACIÓN]` o `[RESULTADO COMPROBADO]` (ver AGENTS.md).
4. **¿Cómo se prueba?** Define el test o el escenario con `astravital-qa`.
5. **¿Qué criterio de la rúbrica mejora?** Consulta la tabla de abajo.

## Lo que pide el reto

- Una herramienta **visual** para que el astronauta **evalúe su propia salud** y reciba **orientación sobre tratamientos y mejoras**.
- Contexto: los 5 peligros del HRP (radiación, aislamiento y confinamiento, distancia a la Tierra, campos de gravedad, entorno cerrado hostil).
- Indicadores citados: presión arterial, frecuencia cardiaca, glucosa (mg/dL), temperatura corporal, horas de sueño y estado de ánimo. Se admiten otros, como imágenes de ultrasonido.
- Entrada libre: teclado, clics o cámara.
- Preguntas guía: qué se puede medir en el espacio, por qué hace falta cada examen, cómo afectan los peligros a cada indicador, cuándo avisar a la tripulación o a los flight surgeons y qué acciones previenen un estado crítico.
- El reto menciona entornos como **nave, estación, rover o base en otro planeta o luna**: encaja con nuestro objetivo de estación lunar y base en Marte.
- Ideas opcionales: recordatorios de medición, gamificación, gráficas temporales, colores por estado, figura humana clicable e instrucciones simples (no asumir que el astronauta sabe evaluarse).

## Recursos oficiales (cítalos en el campo "NASA Data")

- NASA HRP, 5 Hazards of Human Spaceflight: https://www.nasa.gov/hrp/hazards/
- NASA HRP, Risks of Human Spaceflight: https://www.nasa.gov/hrp/risks/
- NASA HRP, Ongoing HRP Research: https://www.nasa.gov/hrp/ongoing-hrp-research/
- CSA, Monitoring Radiation for Astronaut Health: https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp
- CSA, Why Do We Conduct Science Experiments in Space?: https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp
- Comunicaciones Luna/Marte y operaciones médicas independientes de la Tierra (EIMO): fuentes en `astravital-offline`.

Para sumar en Relevance, el conocimiento de la NASA debe **cambiar el producto**: qué indicador vigilar por cada peligro, textos de orientación, perfiles Luna/Marte. No basta con un enlace al final.

## MVP de 48 horas (en este orden)

1. **Motor local:** línea base móvil por tripulante, Z-Score por indicador y estados `ok / watch / alert / missing / sensor-fault / insufficient-baseline`.
2. **Datos:** formulario manual de 4–6 indicadores y generador simulado con semilla y escenario de demo.
3. **Explicación:** cada alerta dice qué indicador, cuánto se aleja de su normal, qué peligro del HRP se relaciona (con fuente), qué acción se sugiere y cuándo consultar a los flight surgeons.
4. **Offline:** PWA con service worker, IndexedDB y perfil `moon` / `mars` con `EarthLink` simulado y outbox.
5. **Interfaz:** panel con colores y texto, gráfica temporal por indicador y, si sobra tiempo, figura humana.
6. **Pruebas y métricas:** escenarios S1–S6 de `astravital-qa`.

**Fuera del MVP:** diagnóstico, ML opaco, hardware real, DTN real, gemelo digital y afirmaciones clínicas.

## Funciones frente a la rúbrica

| Función | Criterio que mejora |
|---|---|
| Alertas explicadas con fuente del HRP | Validity, Relevance |
| Perfiles Luna/Marte con retardo y conjunción solar | Creativity, Relevance, Best Mission Concept |
| Funciona en modo avión | Validity, Presentation (demo) |
| Métricas de falsas alarmas y ventanas 7/14/28 | Validity, Best Use of Science |
| Interfaz clara para no expertos | Impact, Presentation |

## Encaje de las ideas de ASTRAVITAL

| Idea | Etiqueta |
|---|---|
| Línea base individual + Z-Score | [HIPÓTESIS] método explicable; no es diagnóstico |
| Ventana de 14 días (o soles) | [HIPÓTESIS] compárala con 7 y 28 |
| Procesamiento local sin la Tierra | Diseño; se demuestra con la simulación del enlace |
| Interfaz de priorización | Prototipo; es el núcleo del reto |
| Gemelo digital | [VISIÓN] como mucho, en la última diapositiva |

Todo lo que vaya a la página de entrega o a la app se escribe **en inglés**.
