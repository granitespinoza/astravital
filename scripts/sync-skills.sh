#!/usr/bin/env bash
# Copia las skills del proyecto de .claude/skills (fuente, Claude Code) a .agents/skills (Codex).
# Edita siempre en .claude/skills y ejecuta este script después.
set -euo pipefail
cd "$(dirname "$0")/.."
rsync -a --delete .claude/skills/ .agents/skills/
echo "Skills sincronizadas: $(ls .agents/skills | tr '\n' ' ')"
