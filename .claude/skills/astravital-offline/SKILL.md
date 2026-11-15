---
name: astravital-offline
description: Offline-first local architecture for ASTRAVITAL on a lunar station or Mars base - no-Earth operation, habitat LAN and edge node, crew-device storage and sync, store-and-forward Earth link (DTN), Moon/Mars delay and blackout profiles, sols, PWA/service worker, local HTTPS. Use for offline, sin conexión, red local, Luna, Marte, sync, latency, deployment in the habitat.
---
# ASTRAVITAL offline-first: estación lunar y base en Marte

> Dirección vigente 2026-11-15: visor simulado como experiencia principal y consola como respaldo. Leer `docs/DECISION-VISOR.md`. No afirmar integración SPECS, ASR offline, monitoreo en segundo plano ni detección ósea; el audio abierto no es conducción ósea.


## Estado real y alcance de esta skill (2026-11-14)

La app actual demuestra caché de archivos y registro local de eventos, export/import y recarga sin red. No implementa EarthLink, outbox, perfiles Luna/Marte ni sincronización con el hábitat. Los apartados de transporte siguientes son diseño futuro, no requisitos pendientes para declarar operativo el recorrido local. Ver `docs/ARQUITECTURA.md`.


**Principio:** la Tierra es un destino de sincronización opcional, nunca una dependencia. Captura, línea base, Z-Score, alertas, explicaciones e historial funcionan dentro del hábitat sin enlace. Esto encaja con el trabajo de la NASA en operaciones médicas independientes de la Tierra (EIMO) [EVIDENCIA, ver Fuentes].

## 1. Perfiles de enlace (parámetros de configuración, nunca valores fijos en el código)

| Perfil | Retardo de ida | Interrupciones | Etiqueta |
|---|---|---|---|
| `leo` (ISS) | < 1 s | breves | referencia |
| `moon` | ≈ 1,3 s (384 400 km ÷ velocidad de la luz) | según visibilidad y relés (arquitectura LunaNet) | [EVIDENCIA] retardo · [HIPÓTESIS] patrón de cortes |
| `mars` | ≈ 3–22 min según la distancia Tierra–Marte (documentos de la NASA citan hasta ~24 min) | conjunción solar cada ~2 años: las misiones robóticas pausan comandos ~2 semanas; para misiones tripuladas la NASA prevé cortes que pueden durar semanas | [EVIDENCIA] |

El intervalo de sincronización, el tamaño de los paquetes y los reintentos que elijamos son [HIPÓTESIS] hasta medirlos.

## 2. Arquitectura de misión futura (no implementada)

```
[Sensores / entrada manual]
          │  LAN del hábitat (sin internet)
          ▼
[Dispositivo del tripulante]  PWA · IndexedDB · motor de alertas local
          │  sync por LAN cuando la red local está disponible
          ▼
[Nodo de borde del hábitat]   sirve el build · copia maestra · outbox
          │  enlace Tierra store-and-forward (DTN): minutos o semanas
          ▼
[Flight surgeons en la Tierra]  reciben resúmenes priorizados
```

- El dispositivo del tripulante funciona solo aunque caiga la LAN o el nodo de borde.
- El nodo de borde es un concepto de misión: en el MVP se documenta y se simula.
- Red, seguridad, HTTPS en la LAN, tiempo y DTN: lee `references/red-habitat.md` **solo** cuando trabajes en red, despliegue o seguridad.

## 3. Reglas locales y extensiones futuras

1. **Cero red en tiempo de ejecución:** sin CDNs, Google Fonts, analytics, mapas ni APIs externas. Todo va empaquetado en el build. Una sola petición externa rompe el modo offline.
2. **Service worker** con precache del app shell: la app arranca sin red después de la primera carga.
3. **Persistencia local:** IndexedDB para eventos predefinidos de la demo. Export/import JSON para respaldar ese registro; no es integración de mediciones arbitrarias.
4. **Futuro, fuera del MVP: capa `EarthLink`** con modos `online | delayed(ms) | blackout` y perfiles `leo | moon | mars`. Outbox persistente con prioridad (rojo > amarillo > resumen), reintentos e ids idempotentes. La interfaz muestra "Queued for Earth downlink". No está implementada en la demo actual.
5. **Tiempo (contrato de misión futuro):** no dependas de NTP terrestre. Guarda el timestamp UTC del reloj local y además `missionDay`. En Marte la unidad diaria es el sol (24 h 39 min 35 s): define si la ventana de 14 es de días o de soles y documéntalo [HIPÓTESIS].
6. **Datos append-only (contrato de misión futuro):** cada registro lleva UUID, origen y timestamp. El merge es por unión. Nunca "el último que escribe gana" con datos de salud.
7. **Degradación visible:** sensor caído, dato faltante o línea base insuficiente se muestran como estados propios. Nunca se rellenan en silencio.
8. **Pocas dependencias:** prefiere APIs nativas del navegador y `node:test`. Cada paquete es algo que debe funcionar y actualizarse sin internet. Si hay que instalar algo, el sandbox de Codex puede pedir aprobación de red: pídela.

## 4. Despliegue

- **Jueces (Tierra):** el mismo build estático en Vercel (HTTPS, así el service worker funciona). Se demuestra con el modo avión.
- **Misión:** el mismo build servido por el nodo de borde en la LAN del hábitat. Vercel no forma parte de la operación.

## 5. Cómo probar (separar actual de futuro)

- Futuro: tests unitarios de `EarthLink` con reloj falso: retardo de la Luna y de Marte, blackout de 14 días, reconexión que vacía el outbox en orden de prioridad y sin duplicados. Casos completos en `astravital-qa`.
- Navegador: DevTools → Network → Offline, recarga y comprueba que todo funciona. Filtra la pestaña Network por dominio: no debe haber peticiones externas.
- Escenario actual: datos simulados → calidad → desviación explicada → repetición → solicitud local → recarga sin red. Encolar o entregar paquetes es futuro.

## 6. Definición de hecho

- [ ] La app carga y calcula alertas con la red desactivada después de la primera visita.
- [ ] No hay peticiones a dominios externos.
- [ ] El registro local de eventos sobrevive a recargar; no exigir outbox aún inexistente.
- [ ] Los perfiles y transportes futuros están marcados como no implementados.
- [ ] El README explica qué está simulado (enlace Tierra, DTN, sensores) y por qué.

## Fuentes

- NASA, Mars Communications Disruption and Delay: https://www.nasa.gov/wp-content/uploads/2024/01/mars-communications-disruption-and-delay.pdf
- NASA (NTRS), Communication Delays, Disruptions, and Blackouts for Crewed Mars Missions: https://ntrs.nasa.gov/citations/20220013418
- NASA JPL, What's Mars Solar Conjunction, and Why Does It Matter?: https://www.jpl.nasa.gov/news/whats-mars-solar-conjunction-and-why-does-it-matter/
- NASA GISS, Mars24 (duración del sol): https://www.giss.nasa.gov/tools/mars24/help/notes.html
- NASA, Lunar Communications and Navigation Architecture: https://www.nasa.gov/wp-content/uploads/2024/01/lunar-communications-and-navigation-architecture.pdf
- NASA (NTRS), Earth-Independent Medical Operations ConOps: https://ntrs.nasa.gov/citations/20250000009
