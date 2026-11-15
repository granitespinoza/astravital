---
name: astravital-qa
description: Tests and evaluation for ASTRAVITAL - unit tests for the baseline/Z-Score engine, seeded simulated sensor data with injected anomalies, false-alarm and missed-alert metrics, 7/14/28-day window comparison, missing, stale and suspect data, device faults, baseline drift, and Moon/Mars Earth-link delay and blackout tests. Use for pruebas, tests, falsas alarmas, datos simulados, validation.
---
# Pruebas y evaluación de ASTRAVITAL

> Dirección vigente 2026-11-15: visor simulado como experiencia principal y consola como respaldo. Leer `docs/DECISION-VISOR.md`. No afirmar integración SPECS, ASR offline, monitoreo en segundo plano ni detección ósea; el audio abierto no es conducción ósea.


## Estado real y alcance de esta skill (2026-11-14)

El recuento vigente de pruebas del motor, escenarios y HUD está en los resultados; resultados en `docs/RESULTADOS.md`. S6 solo demuestra el flujo y registro local con la red desactivada; vaciar una cola Tierra es una prueba futura porque no existe transporte. No describir una señal plana como detectada automáticamente: el escenario suspect llega marcado y el motor comprueba entradas básicas.


Objetivo: demostrar con datos reproducibles qué hace bien el sistema y dónde falla. Todo resultado de esta skill es [SIMULACIÓN] salvo que use datos reales con permiso. Requisitos que se prueban: `docs/REQUISITOS-MVP.md`.

## Reglas

- Tests sin red y deterministas: generador pseudoaleatorio con semilla fija.
- Para el motor, prefiere `node:test` (viene con Node y no requiere instalar nada). Usa otro framework solo si el proyecto ya lo tiene.
- Cada dataset simulado se documenta en `data/README.md`: semilla, rangos, supuestos, muestreo y qué no representa. La "verdad" de los eventos sale del generador, no de un diagnóstico.
- Un umbral clínico sin fuente es [HIPÓTESIS]. Los tests verifican el comportamiento del software, no la medicina.
- Registra cada resultado en `docs/RESULTADOS.md` con comando, semilla, versión y resultado. Solo así se puede etiquetar `[RESULTADO COMPROBADO]`.

## 1. Tests unitarios del motor (mínimo)

| # | Caso | Resultado esperado |
|---|---|---|
| 1 | La línea base usa las mediciones válidas anteriores dentro de la ventana del **mismo contexto** y excluye la evaluada | Media y desviación correctas; la FC en actividad no entra en la línea base de reposo |
| 2 | Pocas mediciones válidas en la ventana | `insufficient-history`, nunca alerta |
| 3 | Desviación típica 0 | Sin Z-Score, con estado explícito |
| 4 | No hay medición en el intervalo esperado | `missing` |
| 5 | Medición más antigua que la edad máxima | `stale` |
| 6 | Entrada inválida o fixture marcado suspect | `suspect`; la detección automática de señal plana queda futura. No inferir fallo físico |
| 7 | El dispositivo informa error o desconexión | `device-fault`, distinto de `suspect` |
| 8 | Umbrales de Z | `ok / watch / alert` según la configuración, incluidos los valores límite |
| 9 | Alerta abierta | Sus mediciones no actualizan la línea base hasta la revisión |
| 10 | Límites de la ventana | Exactamente N días o soles; el N+1 sale de la ventana |
| 11 | Tendencia | Dirección y pendiente correctas; ningún texto de pronóstico ni cuenta atrás |

## 2. Escenarios simulados con verdad conocida

| Id | Escenario | Qué mide |
|---|---|---|
| S1 | Normal, 60 días, sin eventos | Tasa de falsas alarmas |
| S2 | Deriva gradual (por ejemplo, FC en reposo +1,5 /min por día durante 10 días) | Tiempo hasta detectarla y que la alerta no desaparezca por absorción |
| S3 | Evento agudo de 1 día (por ejemplo, FC en reposo +20 /min) | Sensibilidad |
| S4 | Fixture marcado suspect y, aparte, fallo informado por el dispositivo | Dos estados distintos; ninguno genera alerta de salud |
| S5 | 3 días seguidos sin datos | `missing`, luego `stale`, y la recuperación |
| S6 | Escenario Marte con blackout simulado y navegador sin red | Repetición, solicitud local y recarga funcionan. No simula el paso de 14 días ni entrega por cola; transporte diferido |

Los valores de los escenarios son supuestos de simulación, no datos fisiológicos reales.

## 3. Métricas (tabla en el README)

- Falsas alarmas por tripulante-día (S1).
- Eventos no señalados y sensibilidad en eventos inyectados (S2, S3).
- Tiempo hasta detectar la deriva (S2).
- Carga de interrupciones: alertas y revisiones por día.
- Comparación de ventanas de 7, 14 y 28 días con los mismos escenarios: es la evaluación de la hipótesis de 14 días.
- Si alguien añade un pronóstico: definir variable, horizonte e incertidumbre y medir su error. Sin eso, solo tendencia descriptiva.

Añade siempre un párrafo de limitaciones: datos simulados, sin validación clínica, umbrales configurables.

## 4. Enlace con la Tierra (opcional en el MVP)

- `moon`: entregas con retardo ≈ 1,3 s.
- `mars`: retardo configurable (por ejemplo, 20 min) con reloj falso, y blackout de 14 días.
- Cola persistente tras recargar, prioridad por gravedad e ids idempotentes.
- Detalle de perfiles y fuentes: `astravital-offline`.

## 5. Aceptación de la interfaz

- El estado no depende solo del color: lleva texto e icono.
- Cada desviación muestra indicador, distancia a **su** normalidad (media ± desviación, n), contexto, calidad, regla y versión, y "statistical deviation, not a diagnosis".
- Solo pasos de procedimiento: volver a medir o pedir revisión al CMO. Ningún diagnóstico ni tratamiento.
- Con la Tierra caída: *"Earth unavailable — CMO review onboard"*.
- Los cinco estados de dato son visibles y distintos.

## Definición de hecho

- [ ] `node --test` (o el comando del proyecto) pasa sin red.
- [ ] S1–S5 y el flujo local de S6 se reproducen; transporte futuro se etiqueta como no implementado.
- [ ] La tabla de métricas y las limitaciones están en el README y en `docs/RESULTADOS.md`.
