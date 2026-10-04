#!/bin/bash
# Cloud sessions start from a fresh clone without node_modules, so install
# dependencies before typecheck, lint and tests can run. Local sessions keep
# their own node_modules and skip this.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
   exit 0
fi

cd "$CLAUDE_PROJECT_DIR"
pnpm install --frozen-lockfile
