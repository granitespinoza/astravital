# ASTRAVITAL: ideas de frecuencia cardiaca que ya funcionan y cómo las adaptamos

Fecha: 2026-11-14. Objetivo: "tropicalizar" soluciones probadas en lugar de inventar desde cero. Etiquetas de `AGENTS.md`.

## 1. Lo que ya existe

| # | Antecedente | Qué hace y qué se ha demostrado | Límite |
|---|---|---|---|
| A | **CSA Space Health** (Ontario Tech, con el Bio-Monitor) | Estudio en la ISS titulado *Autonomous Health Monitoring for Adaptation Assessment on Long Range Missions Using Big Data Analytics*. Evalúa el desacondicionamiento cardiovascular con pulso, presión, respiración, temperatura cutánea y actividad; según la NASA (2022) creará un **gemelo digital** del astronauta, y sus resultados podrían apoyar un **sistema autónomo de monitoreo cardiovascular** para misiones futuras. [EVIDENCIA] | Estudio de investigación; no hemos verificado resultados publicados ni un sistema operativo para la tripulación. |
| B | **CSA Bio-Monitor** | Camisa inteligente, diadema y app de tablet; en la ISS desde 2019. [EVIDENCIA] | Las fuentes discrepan sobre si transmite en tiempo real o almacena y reenvía. |
| C | **Línea base personal de FC en reposo** (Mishra et al., 2020, *Nature Biomedical Engineering*) | Detectar elevaciones de la FC en reposo **respecto a la línea base de cada persona** (ventana móvil de 28 días) con un sistema de aviso en dos niveles. En retrospectiva, el 63 % de los casos de COVID-19 se habrían detectado antes de los síntomas; un estudio prospectivo posterior (*Nature Medicine*, 2021) funcionó en tiempo real. [EVIDENCIA] | Cohorte pequeña de casos (32); requiere suficiente línea base estable; no distingue entre enfermedades. |
| D | **FC en reposo a escala poblacional** (Radin et al., 2020, *Lancet Digital Health*) | La proporción de usuarios de Fitbit con FC en reposo elevada mejoró la estimación de enfermedad tipo gripe en 5 estados de EE. UU. [EVIDENCIA] | Señal poblacional, no diagnóstico individual. |
| E | **Notificaciones de FC del Apple Watch** | Avisos de FC alta o baja con umbral ajustable cuando la persona parece inactiva 10 minutos; la notificación de ritmo irregular está autorizada por la FDA (sensibilidad 88,6 %, especificidad 99,3 % frente a ECG en parche). [EVIDENCIA] | Umbrales fijos de población para FC alta o baja; la ausencia de aviso no descarta un problema. |
| F | **Estudios cardiovasculares en la ISS** (CCISS, CARDIOBREATH) | Holter y actividad en astronautas: la FC nocturna no cambió en órbita y el ejercicio a bordo protege del desacondicionamiento. [EVIDENCIA] | Muestras de 6 a 7 astronautas. |

## 2. Cómo lo adaptamos ("tropicalización")

| Idea probada | Qué tomamos | Qué cambiamos para la Luna y Marte |
|---|---|---|
| Línea base personal (C) | Comparar con *tu* normal, no con la población | Ventana en **soles**, comparando 7, 14 y 28 (C usó 28); medición de reposo con protocolo para no mezclar contextos |
| Aviso en dos niveles (C) | WATCH y ALERT | Cada aviso explica regla, versión y confiabilidad del dato; sin diagnóstico |
| Umbral ajustable (E) | Parámetros configurables | Umbral relativo a la persona en lugar de 120/40 lpm fijos |
| Bio-Monitor (B) | Fuente de datos candidata | Adaptador al registro canónico; en la demo, datos simulados |
| Sistema autónomo y gemelo digital (A) | Dirección de investigación que la CSA ya persigue | Nos centramos en lo que le falta al tripulante: **ver, entender y pedir revisión humana sin la Tierra**. El gemelo digital queda como visión futura y se cita a la CSA |

## 3. Qué cambia en el discurso

- **No decir** que el software de la NASA es "simple" o "básico": no está demostrado. La necesidad concreta es del usuario: interpretar su FC sin respuesta inmediata de la Tierra.
- **No presentar** el sistema autónomo ni el gemelo digital como idea nuestra: la CSA ya los investiga (A). Presentarlos como el camino al que ASTRAVITAL se conectaría.
- **Sí apoyar** el método en evidencia: la detección por desviación de la línea base personal de FC en reposo ya funcionó en estudios con wearables (C, D).

## 4. Texto para la diapositiva (inglés)

| Parte | Texto |
|---|---|
| Title | ASTRAVITAL: Offline Heart Rate Monitoring for Astronauts |
| Problem | Far from Earth, astronauts need to understand changes in their own heart rate without waiting for flight surgeons. |
| Solution | A local dashboard that compares resting heart rate with the astronaut's personal baseline, shows data quality and explains deviations for human review. |
| Built on what works | Personal-baseline resting heart rate alerts detected illness early in wearable studies (Mishra et al., 2020). The CSA Bio-Monitor already records heart rate on the ISS. |
| Demo | Simulated heart rate data show the workflow: deviation, re-measurement, missing readings, sensor disconnection and offline operation. |
| Future | More indicators, environmental context and a virtual assistant; autonomous monitoring and digital twins, as the CSA Space Health study explores. Wellbeing assessment needs separate research. |

## Fuentes

- CSA Space Health / Bio-Monitor: https://asc-csa.gc.ca/eng/iss/news.asp · https://news.ontariotechu.ca/archives/2021/07/reaching-for-the-stars-new-ontario-tech-research-on-the-health-of-astronauts-in-space.php · https://www.asc-csa.gc.ca/eng/sciences/astroskin.asp
- Mishra et al. (2020), *Nature Biomedical Engineering*: https://www.nature.com/articles/s41551-020-00640-6 · estudio prospectivo (2021), *Nature Medicine*: https://www.nature.com/articles/s41591-021-01593-2
- Radin et al. (2020), *Lancet Digital Health*: https://doaj.org/article/0b19ae2d635a4893af58fc85285cdef4
- Apple Watch y FDA: https://www.apple.com/healthcare/apple-watch/ · https://fda.innolitics.com/device/DEN180042 · https://510k.innolitics.com/device/K212516
- CARDIOBREATH (CSA): https://asc-csa.gc.ca/eng/sciences/cardiobreath.asp · CCISS: https://pmc.ncbi.nlm.nih.gov/articles/PMC5516430
