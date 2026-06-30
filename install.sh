#!/usr/bin/env bash
# Build TodoMaker and expose the `todomaker` command on your PATH.
# Run from inside the cloned repo:  ./install.sh
set -euo pipefail
cd "$(dirname "$0")"

command -v node >/dev/null || { echo "Node.js >= 20 is required."; exit 1; }

echo "==> Installing dependencies"
npm install

echo "==> Building (dist/cli.js, dist/mcp/server.js)"
npm run build

echo "==> Linking the 'todomaker' command globally"
npm link

cat <<'EOF'

Done. Usage:
  todomaker            # interactive TUI (the global command)
  npm run dev          # TUI without linking (tsx)
  npm run mcp          # MCP server over stdio

Store: $TODOMAKER_STORE, else ~/.todomaker/store.json
EOF
