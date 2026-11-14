# ASTRAVITAL — relevo de Codex a Claude

> **Estado (2026-11-14):** relevo asumido por Claude. Hechas la tarea 1 (correcciones del concepto), la 2 (requisitos y boceto en `REQUISITOS-MVP.md`) y la 5 (guías oficiales verificadas; ver la auditoría). Las tareas 3 y 4 (implementación y pruebas) esperan a que el equipo confirme las decisiones abiertas de `REQUISITOS-MVP.md`.

Fecha: 2026-11-14, America/Lima. Documento interno de continuidad; no es la entrega a jueces.

## Encargo y orden de lectura

[EVIDENCIA] El usuario pidió documentar las decisiones y revisiones en este entorno y que Claude asuma el relevo. Leer `AGENTS.md`, este documento, `AUDITORIA-REFERENCIAS.md` y `CONCEPTO-SISTEMA.md`. Las instrucciones de AGENTS prevalecen. El concepto conserva propuestas anteriores: consultar sus correcciones en la auditoría antes de reutilizar afirmaciones.

[EVIDENCIA] Restricciones del usuario: nada de IA china; software de monitoreo de signos vitales; dashboard del astronauta como MVP funcional y arquitectura restante como esquema. Build estático, procesamiento en navegador, sin backend ni dependencias externas en ejecución. Operación local en estación lunar/base marciana; Tierra es destino diferido, no dependencia. App, README y entrega en inglés; documentar generación con IA.

## Estado comprobado y límites

[EVIDENCIA] La inspección local de Codex y un agente encontró documentación, instrucciones, skills y script de sincronización; no encontró aplicación, motor, generador, pruebas ni build de aplicación. Reinspeccionar antes de implementar: otra sesión puede haber añadido trabajo. Existe `.git` en la inspección más reciente; revisar `git status` y preservar cambios ajenos. Codex no creó código de aplicación en este relevo.

[EVIDENCIA] Se ejecutaron tres revisiones separadas: rúbrica/reto, respaldo técnico y alcance/estado local. Revisaron fuentes y documentación; no constituyen validación clínica ni certificación independiente del producto.

[EVIDENCIA] Mentor: completar bien dos o tres aspectos físicos, avanzar paso a paso y separar psicología por complejidad. Es consejo de alcance, no una regla NASA de exactamente tres funciones.

## Recorte recomendado, aún propuesta

[HIPÓTESIS] Resolver un caso completo: medición → calidad/contexto → desviación explicada → revisión humana, incluso con Tierra desconectada.

| Capacidad propuesta | Aceptación observable |
| --- | --- |
| Consultar mediciones físicas e historial individual | Empezar con FC en contexto definido y temperatura cutánea. Mostrar unidad, hora de adquisición, origen, contexto, calidad y simulación. No mezclar piel con temperatura central. |
| Explicar desviaciones y confiabilidad | Regla y versión visibles; distinguir dato ausente, antiguo, sospechoso, fallo reportado por dispositivo e historial insuficiente. Z-Score es desviación estadística, no diagnóstico. |
| Conservar y consultar offline | Tras preparar la app, cortar red y recargar: historial y cálculo siguen disponibles sin dominios externos. Primera instalación y límites de persistencia documentados. |

[HIPÓTESIS] Fuera de la demo funcional: evaluación psicológica/ánimo, chatbot/voz, hardware nuevo, integración física de sensores, control del traje, tratamientos y gemelo fisiológico. CMO, nodo del hábitat y Tierra quedan como esquema; el enlace puede simularse si no desplaza el recorrido principal. La vista CMO no debe convertirse en otro producto pendiente.

[HIPÓTESIS] “Predictivo” requiere definir variable/evento, horizonte, incertidumbre y error medido. No prometer “cruzará su banda roja en X días” por una simple pendiente sin evaluación. “Adaptativo” debe especificar qué cambia y evitar absorber deterioro persistente como nueva normalidad. Ventanas 7/14/28 pendientes de comparación, no elegir 14 como parámetro validado.

## Pruebas y evidencia

[SIMULACIÓN] Preparar generador con semilla y documentar origen, rangos, supuestos y lo que no representa. Casos: normalidad, evento agudo, deriva, faltantes, sensor desconectado/lectura sospechosa y enlace Tierra caído. Medir falsas alarmas por tripulante-día, eventos no señalados, tiempo de detección y coste de interrupciones/revisiones. Comparar ventanas con los mismos escenarios. No inferir fallo físico solamente por valor extremo o señal constante.

[HIPÓTESIS] Pruebas con datos sintéticos comprueban software, no fisiología ni eficacia clínica. Para declarar [RESULTADO COMPROBADO], registrar comando, datos/semilla, versión y resultado reproducible. No hay resultados funcionales registrados todavía.

## Rúbrica: fuente oficial, no puntuación inventada

[EVIDENCIA] Se corroboraron en resultados indexados de páginas oficiales 2026 cinco criterios: Impact, Creativity, Validity, Relevance, Presentation. El resumen oficial del reto pide software que reúna indicadores y permita al astronauta evaluar su salud y actuar. Enlaces y límites de verificación en la auditoría.

[EVIDENCIA] Las guías centrales de evaluación y entrega fallaron al abrir (502/timeout). No quedaron confirmadas desde su texto vigente la escala, ponderaciones ni todas las condiciones de elegibilidad. Las skills locales incluyen reglas de entrega que requieren corroboración; no sustituir la guía 2026 por un PDF de 2025 ni por respuestas comunitarias. Mantener las restricciones de inglés/declaración de IA del proyecto mientras se verifica.

**Actualización de Claude (2026-11-14):** Claude leyó las dos guías directamente ese mismo día. Escala de 1 a 5 por criterio, sin ponderaciones publicadas; requisitos de elegibilidad y de declaración de IA confirmados. Detalle en `AUDITORIA-REFERENCIAS.md` y en la skill `spaceapps-2026`.

## Trabajo que Claude debe retomar

1. Inspeccionar cambios actuales; leer las fuentes y corregir los excesos señalados del concepto sin borrar su visión futura. **✅ Hecho (2026-11-14): 8 correcciones aplicadas en `CONCEPTO-SISTEMA.md`.**
2. Convertir las tres capacidades recomendadas en requisitos verificables y un boceto simple del dashboard. Separar decisiones del usuario de recomendaciones todavía abiertas. **✅ Hecho: `REQUISITOS-MVP.md`.**
3. Continuar con una implementación acotada cuando corresponda al plan del equipo, preservando cualquier código recién añadido. Cargar solo las skills pertinentes; no reinstalar el entorno. **⏳ Pendiente de que el equipo confirme las decisiones de `REQUISITOS-MVP.md` §1.**
4. Ejecutar pruebas adecuadas y registrar resultados y limitaciones. No presentar datos sintéticos como datos NASA. **⏳ Pendiente, después de la tarea 3.**
5. Verificar guías oficiales y preparar trazabilidad criterio → evidencia del proyecto. No puntuar un producto no probado. **✅ Hecho: guías leídas; trazabilidad en `REQUISITOS-MVP.md` §5.**

[EVIDENCIA] El login de GitHub/Vercel corresponde a una persona. Este relevo no autoriza enviar a evaluación, publicar, cambiar autenticación ni subir secretos. No abrir permisos globales ni buscar atajos ante restricciones. Pedir intervención solo ante un bloqueo concreto necesario.

## Preguntas de cierre

- ¿Hábitat o actividad exterior como escenario inicial? La pantalla de muñeca no implica hardware EVA validado.
- ¿FC en reposo o durante actividad? ¿Temperatura cutánea medida dónde y con qué dispositivo?
- ¿Qué significa alerta y qué decisión útil facilita? ¿Quién revisa el evento sin Tierra?
- ¿Qué dataset, formato y acceso de dispositivo existen realmente?
- ¿Cómo se medirá la comprensión de la alerta y el coste de falsas alarmas?

[EVIDENCIA] Excalidraw se abrió y se inspeccionó, pero Codex no insertó el esqueleto. Se entregó Mermaid por chat. No informar al usuario de un tablero editado ni de un despliegue inexistente.

## Estado de entrega

[EVIDENCIA] Los documentos fueron guardados y comprobados. La entrega directa a la conversación abierta de Claude no se confirmó: la aplicación interrumpió los intentos por cambios de ventana. No se observó mensaje enviado ni respuesta de aceptación. CLAUDE.md importa este documento para la siguiente lectura. Para activar la continuidad, enviar en Claude: «Lee docs/RELEVO-CLAUDE.md y asume el relevo de ASTRAVITAL».

**Actualización (2026-11-14):** Claude recibió y asumió el relevo en la conversación activa. Cuando terminen las tareas 3 y 4, conviene quitar `@docs/RELEVO-CLAUDE.md` de `CLAUDE.md` para no cargar contexto antiguo en cada sesión.
