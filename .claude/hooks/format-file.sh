#!/bin/bash
# Runs Prettier on the file Claude just wrote or edited. Files Prettier
# doesn't handle, and files outside the project, are left alone. Prettier
# isn't a project dependency, so this uses whichever one is on PATH and does
# nothing when there is none.
set -euo pipefail

file=$(node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const i=JSON.parse(s).tool_input??{};process.stdout.write(i.file_path??"")})')

case "$file" in
   "$CLAUDE_PROJECT_DIR"/*) ;;
   *) exit 0 ;;
esac
[ -f "$file" ] || exit 0
command -v prettier >/dev/null || exit 0

prettier --write --ignore-unknown --log-level warn "$file"
