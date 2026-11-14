---
name: astravital-qa
description: Tests and evaluation for ASTRAVITAL - unit tests for the baseline/Z-Score engine, seeded simulated sensor data with injected anomalies, false-alarm and missed-alert metrics, 7/14/28-day window comparison, missing data, baseline drift, sensor faults, and Moon/Mars Earth-link delay and blackout tests. Use for pruebas, tests, falsas alarmas, datos simulados, validation.
---

# Pruebas y evaluación de ASTRAVITAL

Objetivo: demostrar con datos reproducibles qué hace bien el sistema y dónde falla. Todo resultado de esta skill es [SIMULACIÓN] salvo que use datos reales con permiso.

## Reglas

- Tests sin red y deterministas: generador pseudoaleatorio con semilla fija.
- Para el motor, prefiere `node:test` (viene con Node y no requiere instalar nada). Usa otro framework solo si el proyecto ya lo tiene.
- Cada dataset simulado se documenta en `data/README.md`: semilla, supuestos, rangos y qué no representa.
- Un umbral clínico sin fuente es [HIPÓTESIS]. Los tests verifican el comportamiento del software, no la medicina.

## 1. Tests unitarios del motor (mínimo)

| # | Caso | Resultado esperado |
|---|---|---|
| 1 | La línea base usa los N días anteriores y **excluye** el día evaluado | media y desviación correctas |
| 2 | Menos días válidos que el mínimo (arranque) | estado `insufficient-baseline`, nunca alerta |
| 3 | Desviación típica 0 | sin Z-Score, con estado explícito |
| 4 | Valores faltantes | se omiten y se cuentan; estado `missing` ese día |
| 5 | Valor fuera del rango físico plausible | `sensor-fault`, excluido de la línea base, no es alerta de salud |
| 6 | Umbrales de Z | verde / amarillo / rojo según configuración; indicadores con dirección (por ejemplo, sueño solo cuando baja) |
| 7 | Límites de la ventana | exactamente N días; el día N+1 sale de la ventana |
| 8 | Unidad diaria | días o soles según el perfil, con la misma lógica |

## 2. Escenarios simulados con verdad conocida

| Id | Escenario | Qué mide |
|---|---|---|
| S1 | Normal, 60 días, sin eventos | tasa de falsas alarmas |
| S2 | Deriva gradual (por ejemplo, sueño −1,5 h en 10 días) | tiempo hasta detectarla y si la ventana la "absorbe" |
| S3 | Evento agudo de 1 día (por ejemplo, FC en reposo +20 lpm) | sensibilidad |
| S4 | Fallo de sensor (temperatura 0 °C o lectura congelada) | que salga como fallo, no como alerta |
| S5 | 3 días seguidos sin datos | estado y recuperación |
| S6 | Marte: enlace con la Tierra caído 14 días | las alertas locales siguen; el outbox se vacía al volver, en orden y sin duplicados |

Los valores de los escenarios son supuestos de simulación, no datos fisiológicos reales.

## 3. Métricas (tabla en el README)

- Falsas alarmas por tripulante-día (S1).
- Sensibilidad en eventos inyectados (S2, S3).
- Tiempo hasta detectar la deriva (S2).
- Carga de alertas: alertas por día y proporción de rojas.
- Comparación de ventanas de 7, 14 y 28 días con las mismas métricas: es la evaluación de la hipótesis de 14 días.

Añade siempre un párrafo de limitaciones: datos simulados, sin validación clínica, umbrales configurables.

## 4. Enlace con la Tierra

- `moon`: entregas con retardo ≈ 1,3 s.
- `mars`: retardo configurable (por ejemplo, 20 min) con reloj falso, y blackout de 14 días.
- Outbox persistente tras recargar, prioridad rojo > amarillo > resumen, ids idempotentes.
- Detalle de perfiles y fuentes: `astravital-offline`.

## 5. Aceptación de la interfaz

- El estado no depende solo del color: lleva texto e icono (accesibilidad).
- Cada alerta dice: indicador, cuánto se desvía de **su** normal, posible relación con un peligro del HRP (con fuente), acción sugerida y "Consult flight surgeons when the Earth link is available" en las rojas.
- Los estados `missing`, `sensor-fault` e `insufficient-baseline` son visibles y distintos.

## Definición de hecho

- [ ] `node --test` (o el comando del proyecto) pasa sin red.
- [ ] S1–S6 se reproducen con la semilla documentada.
- [ ] La tabla de métricas y las limitaciones están en el README.
