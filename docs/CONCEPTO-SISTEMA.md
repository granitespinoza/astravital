# ASTRAVITAL: concepto del sistema (versión aterrizada)

> Revisión del 2026-11-14: Claude aplicó las 8 correcciones de [la auditoría de fuentes](AUDITORIA-REFERENCIAS.md) que dejó Codex. Los requisitos verificables del MVP y el boceto del dashboard están en [REQUISITOS-MVP.md](REQUISITOS-MVP.md). Nada de lo descrito aquí está implementado todavía.

Fecha: 2026-11-14. Propuesta del equipo, ordenada a partir de su conversación y de la recomendación del mentor: hacer bien 2 o 3 aspectos físicos y dejar la parte psicológica para después. Etiquetas de `AGENTS.md`: `[EVIDENCIA]`, `[HIPÓTESIS]`, `[SIMULACIÓN]`, `[RESULTADO COMPROBADO]`. Las ideas de futuro se marcan como `[HIPÓTESIS] — visión futura`.

---

## 1. La respuesta corta

**Qué es ASTRAVITAL:** software de monitoreo de signos vitales para la tripulación que funciona a bordo sin la Tierra. Reúne mediciones físicas en un historial personal, compara cada medición con la normalidad de **esa** persona en el mismo contexto, explica la desviación y la confiabilidad del dato, y facilita una revisión humana (el oficial médico de la tripulación) aunque la Tierra no responda. A largo plazo es la cara para el tripulante de un "mini sistema operativo" de salud.

**Un solo problema con una sola cara:**

- **Problema:** lejos de la Tierra, un astronauta que no es médico tiene que darse cuenta a tiempo de que sus signos vitales se apartan de su normalidad, con datos repartidos entre dispositivos y sin respuesta inmediata desde la Tierra.
- **Cara (lo funcional):** el dashboard del astronauta, con un caso completo: medición → calidad y contexto → desviación explicada → revisión humana, incluso con la Tierra desconectada.
- **Detrás (lo esquemático):** la arquitectura del "mini sistema operativo": sensores → unificación → decisión → comunicación.

Por qué así: la rúbrica premia responder "de lleno" al reto (Relevance). Un sistema que lo abarca todo sin foco se percibe como idea, no como solución.

**Palabra clave del equipo:** *predictivo y adaptativo*. "Adaptativo" tiene un significado concreto en el MVP (sección 7). "Predictivo" sigue siendo [HIPÓTESIS] hasta definir variable, horizonte, incertidumbre y error medido; mientras tanto, el MVP ofrece **alerta temprana** basada en la tendencia personal.

---

## 2. El problema, con evidencia

- El reto oficial dice que, en misiones largas, los astronautas cargan con gran parte de la responsabilidad de detectar cambios en su propia salud. [EVIDENCIA]
- El riesgo médico crece con la distancia a la Tierra y con la duración de la misión (Antonsen et al., 2022, *npj Microgravity*, con el Integrated Medical Model de la NASA). [EVIDENCIA]
- Comunicación: Marte ≈ 3–22 min de retardo de ida (puede superar 21–23 min según la trayectoria) y cortes de semanas en la conjunción solar; Luna ≈ 1,3 s. Fuentes en la skill `astravital-offline`. [EVIDENCIA]
- Las misiones actuales en órbita baja y a la Luna dependen del contacto continuo con control de misión. La NASA está definiendo cómo pasar a **operaciones médicas independientes de la Tierra (EIMO)**; su concepto de operaciones es una recomendación inicial que se irá revisando. [EVIDENCIA]
- La NASA reconoce que la gestión de datos médicos en vuelo está **poco integrada con los dispositivos a bordo** (proyecto Medical Data Architecture, brecha "Med 07"). Esto confirma la intuición del equipo: los datos no están unificados. [EVIDENCIA]

**Problem statement (inglés, para la entrega):**
> On missions far from Earth, astronauts who are not physicians must notice early when their vital signs drift from their own normal, but their data is scattered across devices and help from Earth can be minutes, or weeks, away.

---

## 3. Respuestas verificadas a las dudas del equipo

| Pregunta | Respuesta |
|---|---|
| ¿Existe ya un sistema médico autónomo? | **No hemos verificado un despliegue operativo equivalente completo.** La NASA documenta una arquitectura de datos médicos y un sistema de apoyo a la decisión clínica desarrollados y demostrados (MDA/CDSS), y trabaja en EIMO. Proponemos **apoyo a la decisión con autoridad humana**, no un médico autónomo. |
| ¿Es cierto que "nadie predice ni se adapta"? | **No, tal cual.** La NASA usa el Integrated Medical Model (operativo desde 2017) para estimar riesgos médicos **de la misión**, a nivel de población y antes de volar. Nuestra propuesta es la vigilancia **a bordo e individual** de desviaciones respecto a la normalidad personal. La predicción individual es [HIPÓTESIS] a evaluar. |
| ¿El "mini sistema operativo" es una idea nueva? | La NASA ya explora la unificación de datos médicos con su **Medical Data Architecture (MDA)**: arquitectura modular por capas con plugins; integró el chaleco Astroskin y un guante de ECG, y se probó en un hábitat análogo de Gateway. **No lo vendemos como invento:** ASTRAVITAL es la **capa para el tripulante** que se conectaría a una arquitectura así. Eso suma Validity. |
| ¿Neuralink para "hablar sin hablar"? | Neuralink es un implante cerebral para restaurar la comunicación, que requiere neurocirugía: no es lo que describís ni una dependencia del MVP. Lo que describís coincide con un **sensor de garganta no invasivo** (UCLA, *Nature Communications* 2024): detecta el movimiento de los músculos de la laringe y lo convierte en voz con ML. 94,68 % de precisión al clasificar **cinco frases preseleccionadas**, con 8 adultos sanos. No se puede extrapolar a conversación libre, emergencias ni uso con traje. [HIPÓTESIS] — visión futura |
| ¿La latencia es de 6–7 minutos? | Varía: ≈ 3–22 min de ida según la posición de la Tierra y Marte, ≈ 1,3 s en la Luna y cortes de semanas en la conjunción solar. Usamos perfiles configurables. |
| ¿El software depende de nuestros sensores nuevos? | **No debe.** Si depende de hardware no probado, pierde Validity. El núcleo se diseña para fuentes que ya existen (entrada manual, dispositivos estándar, sistemas tipo Bio-Monitor) mediante adaptadores. En el MVP, los adaptadores usan datos simulados con el mismo formato; todavía no hay ningún adaptador real demostrado. |
| ¿Y la parte psicológica (ánimo)? | Fuera del MVP por recomendación del mentor y por complejidad. [HIPÓTESIS] — visión futura |

---

## 4. Los actores ("Pepito es él")

| Actor | Quién es | Qué aporta | Qué recibe | Herramienta |
|---|---|---|---|---|
| **Pepito** (astronauta) | Especialista de misión, por ejemplo ingeniero de estructuras. No es médico y está concentrado en su tarea. | Mediciones físicas: FC en un contexto definido y temperatura cutánea; confirmaciones y nuevas mediciones | Estado, desviación respecto a su normalidad, confiabilidad del dato y siguiente paso | Dashboard en tablet o pantalla de muñeca |
| **CMO** (Crew Medical Officer) | Tripulante con formación médica, usuario previsto también en el MDA de la NASA | Revisión del caso y aplicación de procedimientos | Solicitudes de revisión por la red local | Vista de revisión [esquema] |
| **Motor ASTRAVITAL** (a bordo) | Software en el dispositivo y, en la misión, en el nodo del hábitat | Línea base por persona y contexto, Z-Score, tendencia descriptiva, estados de calidad, explicación | Datos normalizados y contexto (perfil de misión, estado del enlace) | No diagnostica ni receta |
| **Hábitat** | Sistemas de la estación o la base | Contexto ambiental: CO2, temperatura, dosis de radiación [HIPÓTESIS de integración] | — | Telemetría [esquema] |
| **Flight surgeon** (Tierra) | Médico de vuelo en control de misión | Respuestas asíncronas | Resúmenes priorizados, con retardo | Consola en la Tierra [esquema] |
| **Enlace con la Tierra** | Red store-and-forward (DTN) | Transporte de paquetes | — | Puede tardar minutos o semanas; en el MVP, simulado |

---

## 5. Un día de Pepito en la base de Marte (escenario de demo) [SIMULACIÓN]

1. **Sol 142, 07:05.** Medición matutina en reposo (protocolo de ejemplo: 5 minutos sentado). El dashboard muestra dos tarjetas: *Heart rate · resting* en **WATCH** y *Skin temperature* en **OK**.
2. Pepito abre la tarjeta: *"72 /min. Your resting normal is 61 ± 4 (last 14 sols, n = 13). z = +2.8. Trend: rising 1.5 /min per sol over 5 sols (descriptive, not a forecast). Rule: personal z-score v0.1. This is a statistical deviation, not a diagnosis."*
3. Siguiente paso sugerido, solo de procedimiento: *"Re-measure after 5 min seated rest"* o *"Request CMO review"*. Pepito decide volver a medir.
4. **07:12.** La nueva medición (73 /min) confirma la desviación. Pepito pulsa *Request CMO review*. Mientras la alerta está abierta, la línea base se congela para no absorber el cambio como "nueva normalidad".
5. Enlace con la Tierra: día 3 de conjunción solar → *"Earth unavailable — CMO review onboard"*. Un resumen queda en la cola de salida.
6. **14:00, en plena tarea de estructuras.** El chaleco envía la FC con contexto *activity*: se muestra, pero no se compara con la línea base de reposo. El sensor de temperatura envía el mismo valor durante 40 minutos → *SUSPECT: flat signal* (no se afirma que esté roto). Después el dispositivo informa una desconexión → *DEVICE FAULT: disconnected*. Son estados distintos.
7. El CMO revisa el caso a bordo y registra su decisión. La autoridad clínica es humana.
8. **Sol 155.** Vuelve el enlace: el resumen llega al flight surgeon, que responde de forma asíncrona.

---

## 6. Sensores e interfaces: qué existe y qué proponemos

| # | Dispositivo | Mide o hace | Estado real | Papel en ASTRAVITAL | Etiqueta |
|---|---|---|---|---|---|
| 1 | **Bio-Monitor** de la CSA (camisa Astroskin, diadema y app) | Pulso y actividad eléctrica del corazón, presión arterial, respiración y volumen, temperatura cutánea, SpO2, actividad | Probado en la ISS desde la misión de David Saint-Jacques (2018–2019). Las capacidades son del sistema completo, no solo del chaleco | Fuente candidata de datos continuos; **no hay adaptador demostrado** | [EVIDENCIA] del dispositivo · [HIPÓTESIS] de integración |
| 2 | Entrada manual y dispositivos estándar (por ejemplo, un pulsómetro) | FC y nuevas mediciones | Existen | Medición y re-medición en el MVP | [EVIDENCIA] |
| 3 | **Sensor en el oído** | FC y temperatura; SpO2 en desarrollo | Estudios en tierra: FC con buena concordancia; temperatura con sesgo de −0,4 a −1,4 °C según el frío; SpO2 con menos evidencia; un estudio reportó fallos del dispositivo en ~1/3 de las pruebas. Compatibilidad con traje y misión no demostrada | Plugin futuro. Comparar con la normalidad personal podría reducir el efecto de un sesgo estable; requiere evaluación | [EVIDENCIA en tierra] · [HIPÓTESIS] — visión futura |
| 4 | **Sensor de garganta** (habla silenciosa) | Clasifica frases a partir del movimiento laríngeo | Prototipo de laboratorio: cinco frases, 8 adultos sanos | Posible canal de comunicación | [HIPÓTESIS] — visión futura |
| 5 | **Pantalla de muñeca o guante** | Ver estado y alertas sin sacar la tablet | Dentro del hábitat equivale a un reloj o una tablet. En el traje es un área activa de la NASA (NASA SUITS); el uso con guantes requiere pruebas | Cara del dashboard durante tareas manuales | [HIPÓTESIS] de diseño · traje: visión futura |
| 6 | **Compañero de voz** (IA) | Consultas manos libres | Precedente: CIMON en la ISS (2018–2019; CIMON-2 desde 2019), asistente con IA de DLR, Airbus e IBM, no médico | Interfaz de voz que debería funcionar **en local** | [HIPÓTESIS] — visión futura |
| 7 | Sensores del hábitat | CO2, temperatura, radiación | La CSA monitorea la radiación para la salud del astronauta (recurso oficial del reto) | Contexto para explicar alertas | [HIPÓTESIS] de integración |

**Principio:** el MVP simula las fuentes con el formato canónico. Las integraciones reales son fuentes candidatas con adaptadores pendientes.

---

## 7. "Predictivo y adaptativo", definido sin humo

| Capacidad | Qué significa en ASTRAVITAL | MVP | Futuro |
|---|---|---|---|
| Adaptativo | Línea base personal por contexto (reposo no se mezcla con actividad), actualizada con una ventana móvil | Sí | — |
| Adaptativo | Umbrales por persona: el Z-Score compara con *su* normal, no con la población | Sí | — |
| Adaptativo | La línea base se congela mientras hay una alerta abierta, para no absorber un deterioro persistente | Sí [HIPÓTESIS] | Reglas aprobadas por médicos |
| Adaptativo | Perfiles de misión (órbita baja, Luna, Marte; días o soles) y revisión a bordo cuando la Tierra no está disponible | Sí, simulado | Integración DTN real |
| Adaptativo | Interfaz según el contexto: en tarea, solo lo crítico; en descanso, el detalle | Básico | Carga de trabajo medida |
| Predictivo | Tendencia descriptiva: dirección y pendiente de las últimas mediciones, **sin cuenta atrás** | Sí | — |
| Predictivo | Pronóstico individual | No | Solo tras definir variable, horizonte, incertidumbre y error medido [HIPÓTESIS] |
| Predictivo | Modelos de ML con datos reales de tripulación | No | Requiere datos y permisos |
| Predictivo | Gemelo digital | No | [HIPÓTESIS] — visión futura |

**Diferencial frente a lo existente:** el Integrated Medical Model estima el riesgo de una misión a nivel de población antes de volar. ASTRAVITAL vigila a bordo las desviaciones respecto a la normalidad personal, explica su confiabilidad y mantiene la revisión humana sin depender de la Tierra.

---

## 8. Arquitectura del "mini sistema operativo" (esquema)

```
 SENSORES E INTERFACES          ADAPTADORES (uno por protocolo)
 Bio-Monitor (candidato)  ──►   SDK o archivo del fabricante ─┐
 Bluetooth estándar       ──►   Perfiles GATT                ─┤
 Entrada manual           ──►   Formulario                   ─┼──► 1. INGESTA Y NORMALIZACIÓN
 Telemetría del hábitat   ──►   Interfaz del hábitat         ─┘       registro canónico · unidades · hora · contexto · calidad
                                                                        │
                                                                        ▼
                                                              2. ALMACÉN POR TRIPULANTE
                                                                 append-only · cifrado · copia en el nodo del hábitat
                                                                        │
                                                                        ▼
                                                              3. MOTOR DE DECISIÓN
                                                                 línea base por contexto · Z-Score · tendencia · estados · escalado
                                                                        │
                                   ┌────────────────────────────────────┼─────────────────────────────────┐
                                   ▼                                    ▼                                 ▼
                     4a. DASHBOARD DEL ASTRONAUTA          4b. REVISIÓN DEL CMO (red local)   4c. ENLACE TIERRA (DTN, outbox)
                         [MVP funcional]                       [esquema]                          [simulado / esquema]
```

1. **Adaptadores:** uno por protocolo, todos traducen al registro canónico. Ejemplos estándar: perfiles Bluetooth GATT (Heart Rate `0x180D`, Health Thermometer `0x1809`, Blood Pressure `0x1810`, Glucose `0x1808`, Pulse Oximeter `0x1822`), SDK o archivos del fabricante, e IEEE 11073 para dispositivos médicos personales. **Añadir un sensor nuevo es escribir un adaptador, no cambiar el sistema**: el mismo principio de plugins que el MDA de la NASA.
2. **Normalización:** unidades (UCUM: `/min`, `Cel`), tiempo (UTC más día de misión o sol, con corrección de reloj por dispositivo), contexto de medición (reposo, actividad, sueño), muestreo (agregación a ventanas comunes) y calidad: dato ausente, antiguo, sospechoso (valor imposible o señal plana), fallo informado por el dispositivo e historial insuficiente.
3. **Almacén:** append-only por tripulante, en el dispositivo y, en la misión, con copia en el nodo del hábitat. Cifrado y con política de retención.
4. **Motor:** secciones 7 y 9 de este documento, `REQUISITOS-MVP.md` y skill `astravital-qa`.
5. **Experiencia:** dashboard del astronauta (MVP); revisión del CMO y voz como esquema o visión futura.
6. **Comunicación:** sincronización con el CMO por la red local y con la Tierra por DTN con paquetes priorizados. Exportación a HL7 FHIR para el historial médico en la Tierra [HIPÓTESIS de interoperabilidad: FHIR no conecta sensores ni garantiza interoperabilidad con la NASA]. Detalle de red: skill `astravital-offline`.

**Registro canónico (ejemplo):**

```json
{
  "id": "uuid",
  "crewId": "crew-03",
  "indicator": "heart_rate",
  "code": { "system": "LOINC", "value": "8867-4" },
  "value": 72,
  "unit": "/min",
  "context": "rest",
  "observedAt": "2026-11-14T07:05:00Z",
  "missionDay": { "unit": "sol", "value": 142 },
  "source": { "device": "biomonitor-sim-01", "protocol": "vendor-sim" },
  "quality": "ok",
  "simulated": true
}
```

Frecuencia cardiaca usa el código LOINC `8867-4`. La temperatura cutánea necesita su propio código de temperatura de piel: **no** usar `8310-5` (temperatura corporal). El campo `simulated` obliga a etiquetar los datos simulados.

---

## 9. Niveles de escalado (la automatización avisa; la autoridad clínica es humana)

| Nivel | Cuándo | Qué hace el sistema | Quién decide |
|---|---|---|---|
| N0 Informar | OK | Registra y muestra | — |
| N1 Comprobar | WATCH, o tendencia hacia ALERT | Explica y ofrece pasos de procedimiento: volver a medir, ver el historial | Pepito |
| N2 Revisión a bordo | ALERT confirmada o WATCH persistente | Crea una solicitud de revisión para el CMO con el resumen | CMO |
| N3 Consulta a la Tierra | Además, enlace disponible | Encola un resumen priorizado para el flight surgeon y muestra el retardo esperado | Flight surgeon, de forma asíncrona |
| N3' Tierra no disponible | Enlace caído o retardo largo | *"Earth unavailable — CMO review onboard"*; el resumen queda en cola | CMO |
| N4 Emergencia | Evento crítico | Alerta a toda la tripulación | Toda la tripulación · [HIPÓTESIS] — visión futura |

**Regla:** el sistema prioriza, explica y escala. **No diagnostica ni prescribe**, y la desconexión con la Tierra nunca autoriza una prescripción automática. Los pasos de procedimiento deben venir de protocolos aprobados por médicos; en el MVP son textos de ejemplo [HIPÓTESIS].

Esto es lo que el equipo llamaba "sistema autónomo en el caso crítico": autonomía para **detectar, priorizar y comunicar**. La decisión médica sigue siendo humana.

---

## 10. Qué presentamos y cómo

| Nivel | Qué incluye | Cómo se ve en la entrega |
|---|---|---|
| **Funcional (MVP)** | Dashboard del astronauta con 2 indicadores físicos; estados de calidad; desviación explicada; solicitud de revisión humana; modo offline; enlace con la Tierra simulado si no desplaza el recorrido principal | App desplegada y demo |
| **Esquemático** | Arquitectura completa, niveles de escalado, modelo de datos, revisión del CMO y flujo con la Tierra | Un diagrama en el deck y en el README |
| **Visión futura** | Ánimo y psicología, compañero de voz local, sensor de garganta, pantalla en guante o traje, pronóstico individual, ML con datos reales, gemelo digital | Última diapositiva, marcada como visión |

---

## 11. Viabilidad: lo que preguntará un juez

| Riesgo | Respuesta |
|---|---|
| Falsas alarmas y fatiga de alertas | Línea base personal por contexto, confirmación por re-medición, métricas S1–S6 (`astravital-qa`) |
| Sensores con sesgo o fallos | Estados `suspect` y `device-fault` distintos; no se infiere un fallo físico solo por un valor extremo. Comparar con la normalidad personal puede reducir el efecto de sesgos estables [HIPÓTESIS] |
| Integración compleja | Adaptadores y registro canónico; fuentes candidatas; MVP simulado; mismo enfoque modular que el MDA |
| Privacidad | Cifrado, acceso por tripulante, registro de auditoría |
| Confianza excesiva en la automatización | No diagnostica; decide una persona; cada explicación muestra regla, versión y fuente (NASA-STD-3001 Vol. 2, requisitos 10169 y 10170) |
| Hardware no probado | El núcleo no depende de él |

---

## 12. Pitch en inglés (borrador para la entrega; revisadlo como equipo)

**Tagline:** *Adaptive crew health monitoring — onboard, even when Earth can't answer.* (Decisión abierta del equipo: usar "predictive" solo si se evalúa un pronóstico; ver `REQUISITOS-MVP.md`.)

**Summary:**
> ASTRAVITAL is vital-signs monitoring software for crews on lunar and Martian missions. It keeps each astronaut's measurements in one personal record, compares every reading with that astronaut's own normal for the same context, and shows on a simple dashboard how far it deviates, how reliable the data is, and what the next step is. It works onboard without Earth: when the link is delayed or down, it routes the case to the crew medical officer for review and queues a summary for flight surgeons. It does not diagnose or prescribe; it helps non-physician crew notice changes early and keeps people in charge of decisions.

---

## Fuentes

- Reto oficial: https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/
- Antonsen et al. (2022), *Estimating medical risk in human spaceflight*, npj Microgravity: https://doi.org/10.1038/s41526-022-00193-9
- NASA ExMC, Medical Data Architecture (NTRS): https://ntrs.nasa.gov/citations/20170000744 · https://ntrs.nasa.gov/citations/20200000568 · MDA/CDSS (según la auditoría): https://ntrs.nasa.gov/citations/20220017869
- NASA, Earth-Independent Medical Operations ConOps (NTRS): https://ntrs.nasa.gov/citations/20250000009
- NASA, apoyo a la decisión clínica en vuelo (NTRS): https://ntrs.nasa.gov/citations/20220007443
- NASA-STD-3001 Vol. 2, §10 Crew Interfaces (requisitos 10020, 10169, 10170): https://www.nasa.gov/reference/10-0-crew-interfaces-vol-2/
- CSA, Bio-Monitor: https://www.asc-csa.gc.ca/eng/sciences/astroskin.asp
- Sensor en el oído: MedSENS, *Scientific Reports* 2024: https://doaj.org/article/1bbc79b43c984246a43f4e3cce181eb1 · cosinuss° One, estudio piloto en cirugía: https://pmc.ncbi.nlm.nih.gov/articles/PMC9633487
- Sensor de garganta: Che et al. (2024), *Nature Communications*: https://doi.org/10.1038/s41467-024-45915-7
- Neuralink, restauración del habla: https://neuralink.com/trials/speech-restoration/
- CIMON (DLR): https://www.dlr.de/en/latest/news/2019/03/20190828_cimon-back-on-earth-after-14-months · https://www.dlr.de/en/latest/news/2019/04/20191205_cimon2-on-its-way-to-the-iss
- NASA SUITS: https://www.nasa.gov/learning-resources/spacesuit-user-interface-technologies-for-students/
- Estándares: HL7 FHIR R5 Observation https://hl7.org/fhir/R5/observation.html · Bluetooth Assigned Numbers https://www.bluetooth.com/specifications/assigned-numbers/ · UCUM https://ucum.org · LOINC https://loinc.org
- Comunicaciones Luna y Marte, DTN y EIMO: fuentes en `.claude/skills/astravital-offline/`
