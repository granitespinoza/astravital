# Red, seguridad y despliegue en el hábitat (concepto de misión)

Úsalo para diseñar y documentar. En el MVP del hackathon no se implementa: se describe en el README y se simula con `EarthLink`.

## Topología

- **LAN aislada del hábitat**, sin ruta por defecto hacia internet. El único camino hacia la Tierra es el enlace DTN gestionado por el nodo de borde.
- **Segmentos separados** (VLAN o subredes): tripulación (tablets, laptops), sensores y wearables, y gestión. El nodo de borde solo enruta lo necesario entre segmentos.
- **Nodo de borde** (idealmente dos, redundantes): servidor web del build estático, almacén maestro, NTP local, DNS local y cola DTN.
- **Direcciones:** fijas o reservas DHCP para el nodo y los sensores; DHCP para los dispositivos de la tripulación.
- **Nombres:** DNS local o mDNS (por ejemplo `astravital.local`). Sin dependencia de DNS público.
- **Wi-Fi del hábitat:** autenticación fuerte (por ejemplo WPA3-Enterprise) y el segmento de sensores aislado de la red de tripulación [HIPÓTESIS de diseño].

## HTTPS en la LAN (crítico para el modo offline del navegador)

- Los service workers solo funcionan en un contexto seguro: HTTPS o `localhost`. Servida como `http://astravital.local`, la PWA **no** activa su modo offline.
- Solución de misión: una **CA local de la misión** firma el certificado del nodo de borde, y el certificado raíz se instala en los dispositivos antes del vuelo.
- En el equipo de desarrollo, `localhost` ya cuenta como contexto seguro.

## Tiempo

- El nodo de borde sirve NTP local desde un reloj de referencia del hábitat. La deriva frente a la Tierra se corrige cuando hay enlace.
- Guarda siempre UTC + `missionDay` (o sol) + un id monotónico. No ordenes eventos solo por la hora del navegador.

## Enlace con la Tierra (DTN)

- Store-and-forward con DTN: Bundle Protocol v7 (RFC 9171), seguridad BPSec (RFC 9172) y LTP para enlaces de larga distancia (RFC 5326).
- Implementaciones abiertas de la NASA: ION (JPL) y HDTN (NASA Glenn, en pruebas en la ISS en 2024).
- La app no habla DTN directamente: entrega paquetes al nodo de borde, que los encola. En el MVP, `EarthLink` simula ese comportamiento.
- **Contenido del paquete:** resumen priorizado (alertas rojas primero), sin datos crudos completos si el ancho de banda es limitado, ids idempotentes y acuse de recibo cuando vuelve la confirmación.

## Seguridad y privacidad (datos de salud)

- Cifrado en reposo en el nodo de borde y en los dispositivos.
- TLS en la LAN. Acceso por tripulante: cada uno ve sus datos; el oficial médico de la tripulación ve los de todos según el protocolo de misión [HIPÓTESIS].
- Registro de auditoría de accesos y exportaciones.
- Paquetes hacia la Tierra cifrados y firmados.
- En el MVP: ningún dato real de personas, solo [SIMULACIÓN].

## Actualizaciones sin internet

- Builds versionados y firmados, cargados en el nodo de borde antes del vuelo o por el enlace.
- El service worker gestiona las versiones y nunca debe dejar la app inservible si una actualización llega a medias.

## Fuentes

- NASA SCaN, DTN Resources for Mission Development: https://www.nasa.gov/directorates/heo/scan/engineering/technology/disruption_tolerant_networking_use
- NASA (NTRS), NASA Delay Tolerant Networks: operational, evolving and ready for expansion: https://ntrs.nasa.gov/citations/20230001324
- NASA (NTRS), HDTN ISS Testing 2024: https://ntrs.nasa.gov/citations/20240007078
- NASA (NTRS), LunaNet Interoperability Specification: https://ntrs.nasa.gov/citations/20210021289
- IETF: RFC 9171 https://www.rfc-editor.org/rfc/rfc9171 · RFC 9172 https://www.rfc-editor.org/rfc/rfc9172 · RFC 5326 https://www.rfc-editor.org/rfc/rfc5326
