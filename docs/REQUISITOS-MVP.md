# ASTRAVITAL: requisitos verificables del MVP

Fecha: 2026-11-14. Convierte el recorte recomendado del [relevo](RELEVO-CLAUDE.md) en requisitos con criterio de aceptación. Contexto: [concepto](CONCEPTO-SISTEMA.md) · fuentes: [auditoría](AUDITORIA-REFERENCIAS.md). Nada está implementado todavía.

**Objetivo del MVP:** un caso completo y demostrable: **medición → calidad y contexto → desviación explicada → revisión humana**, también con la Tierra desconectada.

---

## 1. Decisiones

### Ya decididas (por el usuario, según el relevo de Codex)

- Software de monitoreo de signos vitales; el MVP funcional es el **dashboard del astronauta** y el resto se presenta como esquema.
- Build estático, procesamiento en el navegador, sin backend ni dependencias externas en ejecución.
- Operación local en estación lunar o base marciana; la Tierra es un destino diferido, no una dependencia.
- App, README y entrega en inglés; documentar la generación con IA.
- Nada de IA china.
- Consejo del mentor: hacer bien 2 o 3 aspectos físicos, paso a paso, y separar la psicología.

### Abiertas (valor por defecto recomendado; el equipo puede cambiarlo)

| # | Decisión | Valor por defecto recomendado |
|---|---|---|
| D1 | Escenario inicial | Dentro del hábitat. La actividad exterior (EVA) queda como visión futura |
| D2 | Indicadores del MVP | Dos: **FC en reposo** con protocolo definido y **temperatura cutánea** del sensor del chaleco (simulado) |
| D3 | Protocolo de reposo | Medición matutina tras 5 minutos sentado [HIPÓTESIS]. La FC en actividad se muestra, pero no se compara con la línea base de reposo |
| D4 | Qué significa una alerta | Desviación estadística respecto a la normalidad personal que justifica volver a medir y, si se confirma, pedir revisión al CMO |
| D5 | Quién revisa sin la Tierra | El CMO, a bordo |
| D6 | Ventana de la línea base | 14 días o soles por defecto, configurable; comparar 7, 14 y 28 en las pruebas [HIPÓTESIS] |
| D7 | Umbrales | WATCH con \|z\| ≥ 2, ALERT con \|z\| ≥ 3, configurables [HIPÓTESIS] |
| D8 | Antigüedad máxima del dato | 26 h para mediciones diarias [HIPÓTESIS] |
| D9 | "Predictive" en el pitch | Usar *early warning* en el MVP y dejar *predictive* como hoja de ruta, salvo que se evalúe un pronóstico con variable, horizonte, incertidumbre y error |
| D10 | Tercer indicador | Ninguno en el MVP. Candidatos para después: SpO2 o presión arterial |

---

## 2. Requisitos

### C1. Consultar mediciones e historial individual

| Id | Requisito | Aceptación |
|---|---|---|
| R1.1 | Cada medición muestra: valor, unidad (UCUM), hora de adquisición (UTC + día de misión o sol), dispositivo de origen, contexto, estado de calidad y la marca `SIMULATED` cuando corresponda | Test del modelo de vista: ninguna medición mostrada carece de alguno de los 7 campos |
| R1.2 | La FC solo se compara con mediciones del mismo contexto. La temperatura se rotula *Skin temperature*, nunca *body* ni *core temperature* | Test: la línea base de reposo excluye mediciones de actividad · búsqueda en los textos de la interfaz |
| R1.3 | Historial por tripulante con su banda personal (media ± umbral × desviación) para la ventana configurada | El gráfico muestra mediciones y banda leídas del almacén local |
| R1.4 | Registro canónico como el del concepto (sección 8), con `context` y `simulated`. Un adaptador convierte el formato de origen simulado al canónico | Test de validación del esquema · test del adaptador simulado |

### C2. Explicar desviaciones y confiabilidad

| Id | Requisito | Aceptación |
|---|---|---|
| R2.1 | Estados de dato distintos: `missing` (no hay medición en el intervalo esperado), `stale` (más antigua que D8), `suspect` (valor imposible o señal plana; no se llama fallo), `device-fault` (el dispositivo informa error o desconexión) e `insufficient-history` (pocas mediciones válidas en la ventana) | Un test por estado · cada uno con texto e icono propios (NASA-STD-3001 Vol. 2, 10020) |
| R2.2 | Estados de desviación `ok`, `watch` y `alert` a partir del Z-Score personal con los umbrales de D7. Se ven el nombre y la versión de la regla, la ventana y los umbrales | Tests en los límites de los umbrales · la interfaz muestra la línea de la regla |
| R2.3 | Cada desviación se explica: indicador, distancia a la normalidad personal (media ± desviación, n), contexto, calidad, el texto *"statistical deviation, not a diagnosis"* y las consecuencias de cada opción (NASA-STD-3001 Vol. 2, 10170) | Test de la explicación generada: contiene regla, versión y aviso |
| R2.4 | Autoridad humana: el sistema solo ofrece pasos de procedimiento (volver a medir, pedir revisión al CMO) y la persona elige (NASA-STD-3001 Vol. 2, 10169). Ningún texto de diagnóstico ni de tratamiento | Test: las sugerencias pertenecen a la lista permitida · búsqueda de términos prohibidos en la interfaz |
| R2.5 | Ciclo de revisión: alerta → confirmación → solicitud de revisión registrada (quién, cuándo, estado del enlace). Funciona con la Tierra caída (*"Earth unavailable — CMO review onboard"*) | Test de escenario en blackout: queda la entrada en el registro |
| R2.6 | Tendencia descriptiva (dirección y pendiente de las últimas K mediciones). **Sin pronóstico ni cuenta atrás** en el MVP | Test de la tendencia · ningún texto de cuenta atrás en la interfaz |
| R2.7 | Mientras una alerta está abierta, sus mediciones no actualizan la línea base (*"baseline frozen while alert is open"*) [HIPÓTESIS] | Escenario S2 (deriva): la alerta no desaparece por absorción sin revisión |

### C3. Conservar y consultar offline

| Id | Requisito | Aceptación |
|---|---|---|
| R3.1 | Tras la primera visita, la app carga y calcula sin red (service worker con precache) | Prueba manual registrada en `docs/RESULTADOS.md`: DevTools sin red y recarga, se ven el historial y los estados |
| R3.2 | Ninguna petición a dominios externos en ejecución | Pestaña Network solo con el mismo origen · comprobación automática de URLs externas en los archivos servidos |
| R3.3 | Persistencia local (IndexedDB) que sobrevive a recargar, export/import JSON, solicitud de almacenamiento persistente y límites documentados (primera instalación, desalojo del navegador) | Test de recarga · test de ida y vuelta export → import con datos idénticos |
| R3.4 | Opcional, solo si no desplaza el recorrido principal: perfil de enlace `moon` / `mars` / blackout y cola de salida | Test con reloj falso (skill `astravital-offline`) |

---

## 3. Boceto del dashboard (textos en inglés, como la app)

```
┌───────────────────────────────────────────────────────────────────────────┐
│ ASTRAVITAL · Pepito (crew-03) · Mars base · Sol 142 · 07:12               │
│ Earth link: BLACKOUT (solar conjunction, day 3) · Offline ready ✓          │
│ ⚠ SIMULATED DATA — prototype, not a medical device                         │
├─────────────────────────────────┬─────────────────────────────────────────┤
│ HEART RATE · resting            │ SKIN TEMPERATURE · vest sensor          │
│ ▲ WATCH                         │ ● OK                                    │
│ 72 /min   (normal 61 ± 4)       │ 33.9 °C   (normal 33.6 ± 0.3)           │
│ z = +2.8 · trend ↑ 1.5/sol      │ z = +1.0 · trend →                      │
│ 07:05 · biomonitor-sim · good   │ 07:05 · biomonitor-sim · good           │
├─────────────────────────────────┴─────────────────────────────────────────┤
│ WHY AM I SEEING THIS?                                                     │
│ Your resting heart rate is 2.8 SD above YOUR normal (last 14 sols, n=13). │
│ Rule: personal z-score v0.1 · window 14 sols · watch ≥ 2 · alert ≥ 3      │
│ Statistical deviation, not a diagnosis.                                   │
│ [ Re-measure after 5 min seated rest ]   [ Request CMO review ]           │
├───────────────────────────────────────────────────────────────────────────┤
│ HISTORY · 14 sols    ▁▂▁▂▂▃▃▅▆   ░░ personal band                          │
├───────────────────────────────────────────────────────────────────────────┤
│ REVIEW LOG  07:12 re-measured 73 /min · CMO review requested (onboard)    │
│ OUTBOX      1 summary queued for Earth                                     │
└───────────────────────────────────────────────────────────────────────────┘

Leyenda de estados (texto e icono, nunca solo color):
OK · WATCH · ALERT · MISSING · STALE · SUSPECT · DEVICE FAULT · INSUFFICIENT HISTORY
```

---

## 4. Pruebas y evidencia

- Escenarios S1–S6 de la skill `astravital-qa`, con semilla documentada en `data/README.md`.
- Cada resultado se registra en `docs/RESULTADOS.md` con comando, semilla, versión y resultado. Solo entonces se puede etiquetar `[RESULTADO COMPROBADO]`.
- Los datos sintéticos prueban el software, no la fisiología ni la eficacia clínica.
- Prueba de comprensión opcional (10 minutos): tres compañeros sin contexto responden "¿qué debe hacer Pepito?" mirando el dashboard; registrar tiempo y aciertos.

---

## 5. Trazabilidad criterio → evidencia (sin puntuar)

| Criterio | Evidencia que mostraremos |
|---|---|
| Impact | El problema del astronauta no médico lejos de la Tierra y la decisión que facilita la alerta (R2.4, R2.5) |
| Creativity | Línea base personal por contexto, estados de confiabilidad y revisión a bordo según el enlace, frente a antecedentes (MDA/CDSS, IMM) sin afirmar que la NASA carece de ellos |
| Validity | Requisitos, pruebas, métricas y limitaciones; diseño alineado con NASA-STD-3001 Vol. 2 (10020, 10169, 10170), sin declarar conformidad |
| Relevance | Indicadores físicos que apoyan la autoevaluación y la acción, con recursos del HRP en el campo NASA Data |
| Presentation | Un recorrido funcional (el día de Pepito) y la distinción entre demo, esquema y visión futura |
