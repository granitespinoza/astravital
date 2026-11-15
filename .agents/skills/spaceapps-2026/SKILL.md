---
name: spaceapps-2026
description: Official NASA Space Apps Challenge 2026 rules - deadlines, Global Judging eligibility, project form fields, AI (SI) disclosure, 1-5 judging rubric and awards - plus a pre-submission audit. Use when filling or reviewing the project page, checking eligibility, scoring against the rubric, or asking "what is missing before we submit".
---
# NASA Space Apps 2026: reglas, rúbrica y auditoría de entrega

## Estado real y alcance de esta skill (2026-11-14)

La revisión actual no pudo reabrir las guías centrales (502). Las reglas detalladas de abajo conservan la verificación histórica del equipo; escala, descriptores, fechas de resultados y condiciones exactas requieren reconfirmación antes de enviar. Consultar `docs/ENTREGA.md` para el estado vigente. No presentar esta skill como una nueva verificación web.


Fuentes oficiales (publicadas el 13 de noviembre de 2026):
- https://www.spaceappschallenge.org/resources/project-submission-guide/
- https://www.spaceappschallenge.org/resources/judging-awards-guide/

Si una regla parece haber cambiado, vuelve a leer la guía antes de afirmarla.

## Plazos (hora del Local Event)

- Entrega abierta del **sábado 14 de noviembre a las 9:00** al **domingo 15 de noviembre a las 23:59**.
- Universal Event: cuenta la hora local del Team Owner.
- Se puede reenviar hasta el cierre; los jueces ven el último envío guardado.
- Resultados: Global Nominees el 3 de diciembre de 2026, Finalists el 17 de diciembre de 2026, Winners el 26 de enero de 2027.

## Requisitos para la evaluación global (todos son obligatorios)

1. Responder a un reto oficial ("Create Your Own Challenge" no entra).
2. De 1 a 6 miembros, todos en el mismo Local Event, sin lista de espera y visibles en Members (en el Universal Event, mínimo 2).
3. Todos los campos obligatorios completos.
4. Demo: vídeo de **30 s o menos** o deck de **7 diapositivas como máximo**, contando portada e introducción. Si se pasa del límite, queda fuera.
5. Todo en inglés. Un vídeo en otro idioma necesita subtítulos en inglés; los decks, siempre en inglés.
6. Al menos un dato o recurso de la NASA.
7. Las casillas de Terms & Conditions y "Confirm All Work is Original" marcadas; toda fuente externa (código, texto, imágenes, también open source) en References.
8. Nada que muestre a menores de 18 años.
9. Enlaces públicos sin login, probados en una ventana privada.
10. La página solo admite imágenes (JPG, PNG o GIF de hasta 10 MB); vídeos y documentos van como enlace.

## Campos del formulario

Project Name · High-Level Project Summary · Link to Project Demo · Link to Final Project · Detailed Project Description · Use of Super Intelligence (SI) · NASA Data · Space Agency Partner Data and Other References.

## Uso de IA ("Super Intelligence", SI)

- Permitida como acelerador; **no** se puede usar para inventar la idea de la solución.
- El contenido generado no puede usar ni modificar marcas de la NASA (logos, banderas, identificadores de misión).
- Imágenes y vídeos generados: marca de agua visible. Audio: declararlo en el texto y en los metadatos.
- **Código y datos generados (Claude, Codex): declararlo en el texto y en los metadatos.** Usa `docs/SI-USAGE.md`, una sección "Use of AI" en el README y un comentario de cabecera en los archivos generados.
- Los jueces no ven la respuesta del formulario sobre SI, pero sí las marcas de agua y las declaraciones dentro del proyecto.

## Rúbrica (de 1 a 5 por criterio) y premios

| Criterio | Un 5 significa |
|---|---|
| Impact | un problema significativo, con gran alcance |
| Creativity | un enfoque original o una mejora con sentido |
| Validity | base científica, viable, usable y listo para el mundo real |
| Relevance | responde de lleno al reto, con los datos de la NASA como núcleo |
| Presentation | una historia clara; cuentan la demo y el proyecto completo |

Premios globales afines a ASTRAVITAL: Best Use of Science, Best Use of Data, Best Mission Concept y Galactic Impact.

**Afirmaciones offline:** si decimos que funciona en la Luna o en Marte sin conexión, la demo debe mostrarlo y el README debe decir qué está simulado (enlace con la Tierra, DTN, sensores). Una afirmación no demostrada baja Validity.

## Auditoría previa a la entrega (formato de salida)

1. Tabla de los 10 requisitos: ✅ cumplido, ❌ falta, ❓ no verificable (indica quién debe comprobarlo).
2. Puntuación honesta de 1 a 5 por criterio y el cambio concreto que subiría un punto.
3. Lista de afirmaciones sin respaldo: validación clínica, "mejor que la NASA", offline no demostrado.
4. Enlaces probados en ventana privada: sí o no.
5. Nunca pulses "Submit for Judging" ni publiques nada por el equipo: eso lo hace una persona.

## Últimas horas (recomendación, no regla)

- Domingo 18:00: versión desplegada congelada y demo terminada.
- Domingo 21:00: auditoría completa y enlaces probados.
- Antes de las 23:59: tag o release en Git y envío.
