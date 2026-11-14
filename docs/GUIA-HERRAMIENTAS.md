# Guía de herramientas — ASTRAVITAL

Qué usar para cada tarea y cómo invocarlo. En Claude Code se invoca con `/nombre`; en Codex, con `$nombre`. Las skills también se activan si las nombras en el mensaje.
Estado verificado el 2026-11-14.

## Por tarea

| Tarea | Claude Code | Codex | Notas |
|---|---|---|---|
| Respuestas breves (opcional) | `/caveman` · salir: "stop caveman" | `$caveman` | Sin hooks: solo se activa si lo pides. |
| Ideación y evaluación de propuestas | `/ce-ideate <tema>` | `$ce-ideate <tema>` | Genera ideas, las critica y las ordena. Guarda el resultado en `ideation/`. |
| Exploración libre de una idea | `/product-management:brainstorm` | igual (plugin product-management) | |
| Antecedentes y diferenciación | `/product-management:competitive-brief` | igual | Exige fuentes. Nada de "superamos a la NASA". |
| Definir el MVP | `/product-management:write-spec` | igual | Separa objetivos y no-objetivos. |
| Fuentes primarias biomédicas | Plugin **PubMed** (pendiente de activar) | plugin `bio-research` (trae PubMed y otros) | Cita siempre el PMID o el DOI. |
| Arquitectura local y offline | `/engineering:system-design`, `/engineering:architecture` (ADR) | igual | |
| Series temporales, Z-Score, anomalías | `/data:statistical-analysis`, `/data:explore-data` | igual | Evalúa falsas alarmas, datos faltantes y deriva. |
| Calidad de datos y validación | `/data:validate-data` | igual | |
| Gráficas | `/data:create-viz`, skill `dataviz` | igual | |
| Interfaz y factores humanos | `/design:user-research`, `/design:design-critique`, `/design:accessibility-review`, `/design:ux-copy` | igual | |
| Pruebas: sensores simulados y fallos de conexión | `/engineering:testing-strategy` | igual | Marca los datos simulados. |
| Documentación técnica | `/engineering:documentation` | igual | |
| Diagramas | skill `artifact-diagramming` | plugin `visualize` | |
| Presentación editable | Conector **Canva** (pendiente de conectar en Claude) · `/anthropic-skills:pptx` | Canva MCP configurado; herramientas no expuestas en esta conversación · plugin `presentations` | No publicar ni compartir sin confirmación. |
| Auditar un cambio | `/auditar` | `$auditar` | Skill propia ya existente. |
| **Space Apps: reglas, rúbrica y revisión previa a la entrega** | `/spaceapps-2026` | `$spaceapps-2026` | Skill del proyecto. Fechas, requisitos para la evaluación global, declaración del uso de IA, rúbrica de 1 a 5. |
| **Encaje con el reto oficial y MVP de 48 h** | `/astravital-reto` | `$astravital-reto` | Reto "Create Health Monitoring Software for Astronauts" y recursos del HRP. |
| **Demo: vídeo de 30 s o deck de 7 diapositivas** | `/spaceapps-demo` | `$spaceapps-demo` | Estructura oficial, en inglés, sin logos de la NASA. |
| **Offline en la Luna y Marte, red del hábitat, sync con la Tierra** | `/astravital-offline` | `$astravital-offline` | Perfiles de enlace con fuentes de la NASA, arquitectura local, HTTPS en la LAN, DTN. |
| **Pruebas, datos simulados y falsas alarmas** | `/astravital-qa` | `$astravital-qa` | Tests del motor, escenarios S1–S6, métricas y ventanas 7/14/28. |

> Las cinco skills del proyecto viven **dentro del proyecto** (`.claude/skills/` y `.agents/skills/`, copias idénticas). Cualquier miembro del equipo que abra esta carpeta en Claude Code o Codex las tendrá. Edita siempre en `.claude/skills/` y luego ejecuta `scripts/sync-skills.sh`.

## Canva: skill frente a conector

- **Conector (acceso real):** servidor MCP oficial `https://mcp.canva.com/mcp`. Permite buscar, leer, crear y exportar diseños de tu cuenta.
  - Codex: URL comprobada en `~/.codex/config.toml`. El registro previo de configuración informa de OAuth y una lectura exitosa, pero esta conversación no dispone de herramientas Canva y no puede repetir esa verificación. Configurado no equivale a conectado en todas las sesiones.
  - Claude: pendiente. Pulsa **Connect** en la tarjeta de Canva, o ve a Ajustes → Conectores → Canva, e inicia sesión.
- **Skills de instrucciones** (pptx, presentations): generan archivos locales y no acceden a tu cuenta de Canva.

## Dónde están instaladas

- Claude: `~/.claude/skills/{caveman,ce-ideate}`
- Codex: `~/.agents/skills/{caveman,ce-ideate}` · Canva en `~/.codex/config.toml` (copia previa: `config.toml.bak-astravital-20261114`)

## Fuentes

## Comprobación local posterior (2026-11-14)

- Confirmados `SKILL.md` de Caveman y ce-ideate en las carpetas de Claude y Codex indicadas arriba.
- Comprobadas las referencias Markdown citadas directamente por los dos `SKILL.md`: presentes.
- `ce-ideate` cubre ideación; no hay instalación verificada con el nombre literal `innovation`.
- Canva está configurado en Codex; autenticación y ejecución no verificadas desde esta conversación.
- La terminal tiene restricciones de escritura global y resolución DNS. El conector GitHub sí permite leer archivos públicos: se comprobó leyendo el SKILL.md original de Caveman. No atribuir estos límites al Wi-Fi del usuario.
- Las instrucciones del proyecto incluyen rutas explícitas para cargar las skills aunque el catálogo de la conversación no las muestre.

### Referencias de las instalaciones

- Caveman: https://github.com/JuliusBrussee/caveman (skill `skills/caveman`, tag `v4.1.0`, Apache-2.0)
- ce-ideate: https://github.com/EveryInc/compound-engineering-plugin (skill `skills/ce-ideate`, tag `compound-engineering-v3.38.1`, MIT)
- Canva MCP: https://mcp.canva.com/mcp (oficial de Canva)
- PubMed: plugin oficial del directorio de Anthropic (U.S. National Library of Medicine)
