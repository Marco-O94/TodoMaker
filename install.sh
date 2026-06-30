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
if npm link; then
  echo "Linked. Run: todomaker"
else
  # ponytail: npm link needs write access to the global prefix; if it fails,
  # a shell alias is the zero-permission fallback.
  echo "npm link failed (permissions?). Add this alias to your ~/.zshrc instead:"
  echo "  alias todomaker=\"node $(pwd)/dist/cli.js\""
fi

cat <<'EOF'

Usage:
  todomaker            # interactive TUI (global command or alias)
  npm start            # node dist/cli.js, without linking
  npm run dev          # TUI from source (tsx, no build)
  npm run mcp          # MCP server over stdio

Store: $TODOMAKER_STORE, else ~/.todomaker/store.json
EOF
