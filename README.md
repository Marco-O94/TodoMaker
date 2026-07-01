# TodoMaker

Terminal todo manager (Ink TUI) with a companion **MCP server**, organized by
**project**. The TUI and the MCP server share one JSON store, so a task created
by an AI agent shows up in the TUI (after reload) and vice-versa.

## Install from GitHub

Requires Node.js ≥ 20.

```bash
git clone https://github.com/Marco-O94/TodoMaker.git
cd TodoMaker
./install.sh        # npm install + build + link the global `todomaker` command
```

`install.sh` builds the project and runs `npm link`, so you get a `todomaker`
command on your PATH. Manual equivalent:

```bash
npm install
npm run build       # emits dist/cli.js and dist/mcp/server.js
npm link            # optional: expose the global `todomaker` command
```

## Run from the terminal

```bash
todomaker           # global command (after `npm link` / install.sh)
npm start           # same, without linking: node dist/cli.js
npm run dev         # TUI straight from TypeScript (tsx, no build)
npm run mcp         # MCP server over stdio
```

Data lives in one JSON file at `~/.todomaker/store.json`, overridable with the
`TODOMAKER_STORE` environment variable.

### Does the build produce an executable?

`npm run build` emits **Node bundles**, and `dist/cli.js` is a runnable script
(`#!/usr/bin/env node` + executable bit) — after `npm link` you launch it as
`todomaker`, but it still needs Node installed.

For a **standalone binary** (no Node required), compile with [Bun](https://bun.sh):

```bash
npm run build:bin   # -> dist/todomaker  and  dist/todomaker-mcp
./dist/todomaker
```

## Use it from Claude Code (plugin)

This repo is also a Claude Code plugin. Add it straight from GitHub — the
TodoMaker MCP server is registered automatically:

```bash
/plugin marketplace add Marco-O94/TodoMaker
/plugin install todomaker@todomaker
```

The MCP server runs from the plugin's own `node_modules`, so after installing run
`npm install` once inside the plugin directory (Claude Code prints its path), then
reload. Then `/check-tasks` reports the pending tasks for the current repo, and
`/update` pulls newer versions. See [`docs/plugin.md`](docs/plugin.md).

## Documentation

Full documentation lives in [`docs/`](docs/):

- [`docs/architecture.md`](docs/architecture.md) — data model, store layer, concurrency, design decisions
- [`docs/tui.md`](docs/tui.md) — TUI screens and keybindings
- [`docs/mcp.md`](docs/mcp.md) — MCP tools, project resolution, connection config
- [`docs/plugin.md`](docs/plugin.md) — Claude Code plugin (`/check-tasks`, skill, auto-registered MCP)

## Develop

```bash
npm run typecheck
npm test           # node:test — path matching + repo round-trips
```
