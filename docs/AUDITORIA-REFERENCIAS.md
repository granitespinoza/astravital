# ASTRAVITAL — fuentes, ambigüedades y revisión

Fecha de consulta: 2026-11-14. Autor: Codex con tres agentes de revisión. Documento interno.

## Qué está respaldado y cómo usarlo

| Arista | [EVIDENCIA] Fuente primaria y alcance | [HIPÓTESIS] Integración o límite |
| --- | --- | --- |
| Datos y autonomía médica | NASA MDA/CDSS, HRP-48032 Rev. B, publicación 2023: https://ntrs.nasa.gov/citations/20220017869 . Declara una arquitectura de datos médicos desarrollada y demostrada. EIMO ConOps 2025: https://ntrs.nasa.gov/citations/20250000009 | Arquitectura modular de apoyo a decisiones. No afirmar inexistencia global de autonomía ni despliegue equivalente completo. |
| Asistencia contextual | NASA CDSS requisitos: https://ntrs.nasa.gov/citations/20210025824 | Explicaciones pertinentes a la tarea. No prueba utilidad de nuestra interfaz. |
| Bio-Monitor | CSA: https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp . Sistema con camisa, diadema y app; pulso/actividad eléctrica cardiaca, presión, respiración/volumen, temperatura cutánea, SpO2 y actividad. | Capacidades del sistema completo, no solo del chaleco. Fuente candidata; no existe adaptador demostrado con ASTRAVITAL. |
| Sensor intraauricular | Estudio piloto 2022, DOI https://doi.org/10.1007/s10916-022-01872-6 ; texto https://pmc.ncbi.nlm.nih.gov/articles/PMC9633487/ | Evidencia terrestre para FC/temperatura; compatibilidad con traje y misión no demostrada. |
| Sensores y calidad | NASA ficha de evaluación OAWSS: https://techport.nasa.gov/projects/96057 . El registro de estudio informa problemas de fiabilidad, validez y aceptación en la configuración evaluada. | Tener un sensor no garantiza calidad; evaluar dispositivo, actividad y señal. No generalizar ese resultado a todos los sensores. |
| Traje | NASA-STD-3001 vol.2, sección11: https://www.nasa.gov/reference/11-0-spacesuits-vol-2/ , requisitos11034–11036 sobre presión, ppO2 y ppCO2. | Telemetría del traje separada de fisiología. No usar saturación sanguínea como sustituto de oxígeno del traje. |
| Interoperabilidad | HL7 FHIR R5 Observation: https://hl7.org/fhir/R5/observation.html | Mapear sujeto, dispositivo, unidad, valor, tiempo y ausencia. FHIR no conecta sensores automáticamente ni garantiza interoperabilidad con NASA. |
| Offline navegador | Service Workers: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API ; IndexedDB: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API | Base técnica para prototipo estático local; no certificación de software de vuelo. Comprobar caché, persistencia y recuperación. |
| Comunicaciones | NASA: https://www.nasa.gov/wp-content/uploads/2024/01/mars-communications-disruption-and-delay.pdf . Retardo depende de trayectoria, puede superar21–23min de ida y hay cortes de semanas. | Cola persistente y perfiles configurables; no seis minutos fijos. Simular transporte, no afirmar DTN real. |
| Interfaz y autoridad humana | https://www.nasa.gov/reference/10-0-crew-interfaces-vol-2/ :10020 datos antiguos/ausentes;10169 control humano;10170 explicación de ayudas. Guantes: https://www.nasa.gov/wp-content/uploads/2023/03/human-integration-design-handbook-revision-1.pdf , sección10.4.11. | Menos interacción, controles distinguibles y texto/iconos además de color. Tamaños y uso con guantes requieren pruebas. No declarar conformidad con toda la norma. |
| Habla silenciosa MIT | https://www.media.mit.edu/projects/alterego/frequently-asked-questions/ ; publicación https://www.media.mit.edu/publications/alterego-IUI/ | Señales neuromusculares superficiales de habla silenciosa deliberada. No es lectura de pensamientos ni canal de emergencia espacial demostrado. |
| Garganta UCLA | Che et al., Nature Communications15,1873(2024), DOI https://doi.org/10.1038/s41467-024-45915-7 ; texto https://pmc.ncbi.nlm.nih.gov/articles/PMC10933441/ . Clasificación de cinco frases preseleccionadas, ocho participantes,94,68%. | No extrapolar precisión a conversación libre, emergencia ni uso con traje. Mantener como visión futura etiquetada [HIPÓTESIS]. |
| Neuralink | https://neuralink.com/trials/speech-restoration/ | Implante cerebral para restauración de comunicación; distinto de los sensores de garganta. No es dependencia propuesta del MVP. |
| Gemelo digital | NASA: https://science.nasa.gov/biological-physical/why-does-the-world-and-nasa-need-digital-twins/ | Fuente sobre potencial de investigación; no prueba un clon humano completo ni nuestra predicción. |
| Peligros y análogos | https://www.nasa.gov/hrp/hazards/ ; https://www.nasa.gov/analog-missions/ | Contextualizar investigación; no inferir causa radiológica ni diagnóstico psicológico del pulso. Un análogo no reproduce toda la misión. |
| Datos disponibles | https://www.nasa.gov/hrp/nlsp/ ; https://osdr.nasa.gov/bio/repo ; acceso controlado: https://www.nasa.gov/reference/osdr-tutorials-requesting-controlled-access-datasets/ | Seleccionar por variables, población, tiempos, unidades y permiso. No se identificó un dataset que valide todo el sistema. |

## Rúbrica: verificación parcial

[EVIDENCIA] El resultado indexado del reto oficial https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/ confirma reunir indicadores y ayudar al astronauta a evaluar su salud y actuar. Páginas oficiales de eventos2026 enumeran Impact, Creativity, Validity, Relevance, Presentation: https://www.spaceappschallenge.org/2026/local-events/ajmer/ ; corroboración https://www.spaceappschallenge.org/2026/local-events/faisalabad/ y https://www.spaceappschallenge.org/2026/local-events/islamabad/ . El resultado indexado no equivale a haber leído la guía completa.

[EVIDENCIA] Estas páginas centrales fallaron al abrirse, incluso tras reintento: https://www.spaceappschallenge.org/resources/judging-awards-guide/ y https://www.spaceappschallenge.org/resources/project-submission-guide/ . Pendiente confirmar escala, ponderaciones y condiciones exactas2026. No usar respuestas comunitarias ni PDF2025 como reglas vigentes. La web oficial2026 indexada sí informó cierre15nov23:59hora local: https://www.spaceappschallenge.org/2026/ . Confirmar condiciones del Local Event.

| Criterio | [HIPÓTESIS] Evidencia que prepararíamos |
| --- | --- |
| Impact | Dificultad concreta del astronauta y decisión útil facilitada. |
| Creativity | Mejora específica frente a antecedentes, sin afirmar que NASA carece de la tecnología. |
| Validity | Métodos, límites, pruebas y factibilidad de integración. |
| Relevance | Indicadores físicos que apoyen autoevaluación en el dashboard. |
| Presentation | Un recorrido funcional y distinción entre demo, esquema y visión. |

## Correcciones pendientes en CONCEPTO-SISTEMA.md

1. [EVIDENCIA] “No en operación” no está demostrado como afirmación absoluta. Usar “no hemos verificado un despliegue operativo equivalente completo”.
2. [HIPÓTESIS] Sustituir promesas de integración “desde el primer día” por fuentes candidatas y adaptadores pendientes.
3. [HIPÓTESIS] No prometer predicción individual continua, cuenta atrás hasta banda roja ni compensación general del sesgo mediante Z-Score sin evaluación.
4. [HIPÓTESIS] Separar temperatura cutánea y central; no llamar reposo a mediciones durante tarea física sin contexto.
5. [HIPÓTESIS] Retirar psicología/ánimo del MVP recomendado, también en pitch, actores y formularios; preservar otras ideas solo como futuras.
6. [HIPÓTESIS] Usar las cuatro categorías de AGENTS. Reemplazar quinta etiqueta [VISIÓN] por “[HIPÓTESIS] — visión futura”.
7. [HIPÓTESIS] Fallo comunicado del dispositivo y lectura sospechosa son estados diferentes; no diagnosticar sensor roto por una lectura extrema.
8. [HIPÓTESIS] Separar automatización de alertas de autoridad clínica. Desconexión con Tierra no autoriza prescripción automática.

## Preguntas que siguen abiertas

- ¿Escenario inicial dentro del hábitat o EVA? ¿Quién es usuario y quién revisa cada evento?
- ¿Qué dos indicadores, localización corporal, frecuencia y contexto son comparables?
- ¿Qué dispositivos y formatos están realmente accesibles para integrar?
- ¿Qué significa “predictivo”: variable/evento, horizonte, referencia, incertidumbre y error?
- ¿Qué se adapta y quién aprueba cambios? ¿Cómo impedir que una deriva se vuelva “normal”?
- ¿Qué demora máxima de adquisición a alerta y qué antigüedad de dato tolera la tarea?
- ¿Qué coste de falsas alarmas aceptamos y cómo se registran eventos no detectados?
- ¿Qué decisión facilita la alerta y qué procedimiento revisado la respalda?
- ¿Quién accede a cada dato y cómo se recupera el historial ante fallo local?
- ¿Qué mejora de comprensión/tiempo/errores muestra el dashboard frente a una referencia?

[SIMULACIÓN] La verdad de los eventos sintéticos proviene del generador, no de un diagnóstico. Documentar semilla, rangos, supuestos, muestreo y limitaciones; probar faltantes, deriva y fallos/desconexiones, y medir tasa/coste de falsas alarmas. Una prueba reproducible de software no es validación clínica.

## Verificación de Claude (2026-11-14)

- [EVIDENCIA] Claude leyó directamente en el navegador, el mismo día, las dos guías oficiales (versión del 13 de noviembre de 2026): https://www.spaceappschallenge.org/resources/project-submission-guide/ y https://www.spaceappschallenge.org/resources/judging-awards-guide/ . Confirmado desde su texto: cinco criterios (Impact, Creativity, Validity, Relevance, Presentation), cada uno puntuado de 1 a 5 en todas las fases, **sin ponderaciones publicadas**; requisitos de evaluación global (reto oficial, 1 a 6 miembros en el mismo Local Event, campos obligatorios, demo de 30 s o menos o de 7 diapositivas como máximo, inglés, casillas de términos y de originalidad, sin menores de 18 años, enlaces públicos); al menos un dato o recurso de la NASA para optar a premio global; cierre el domingo 15 de noviembre a las 23:59 hora del Local Event; reglas de declaración de IA. Resumen en la skill `spaceapps-2026`. Si las páginas vuelven a fallar, re-verificar antes de enviar.
- [EVIDENCIA] NASA-STD-3001 Vol. 2, §10: verificados en https://www.nasa.gov/reference/10-0-crew-interfaces-vol-2/ los textos de V2 10020 (indicación visual de datos antiguos, ausentes, no disponibles o desconocidos), V2 10169 (el operador decide cuándo usar una ayuda de decisión y qué estrategia) y V2 10170 (las ayudas dan explicaciones, razones y consecuencias de las acciones posibles). Se usan como requisitos de diseño, no como declaración de conformidad.
- [EVIDENCIA] Responden desde la terminal: https://ntrs.nasa.gov/citations/20220017869 y https://hl7.org/fhir/R5/observation.html . La página de la CSA `bio-monitor.asp` no respondió desde la terminal (error SSL); el concepto mantiene `astroskin.asp`, verificada antes en búsqueda.
- Las correcciones 1–8 se aplicaron en `CONCEPTO-SISTEMA.md` el 2026-11-14. Los requisitos verificables están en `REQUISITOS-MVP.md`.
