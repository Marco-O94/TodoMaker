# Claude Code plugin

This repo ships a Claude Code plugin (the repo root is the plugin root) so
TodoMaker can be driven from Claude Code. It bundles three things:

- **MCP server** — auto-registered when the plugin is installed (no manual
  `.mcp.json` editing). Declared in `.claude-plugin/plugin.json` under
  `mcpServers`; launched with the repo's local `tsx` against
  `src/mcp/server.ts`, so no build step is needed:

  ```json
  "mcpServers": {
    "todomaker": {
      "command": "${CLAUDE_PLUGIN_ROOT}/node_modules/.bin/tsx",
      "args": ["${CLAUDE_PLUGIN_ROOT}/src/mcp/server.ts"]
    }
  }
  ```

  Tools appear namespaced as `mcp__todomaker__<tool>` (see `docs/mcp.md`).

- **`/check-tasks` command** (`commands/check-tasks.md`) — resolves the project
  for the current working directory (`pwd` is injected into the prompt), then
  reports its **pending** tasks. If no project is registered for the repo it
  offers to register one.

- **`/update` command** (`commands/update.md`) — runs `update.sh`: fetches the
  git remote and, if a newer version exists, fast-forwards, reinstalls, and
  rebuilds. Refuses to touch a dirty or diverged checkout.

- **`todomaker` skill** (`skills/todomaker/SKILL.md`) — explains how to add
  tasks/projects, list/complete/cancel them, and which to view (pending). Loads
  when the user talks about managing todos.

## Layout

```
.claude-plugin/
  plugin.json        # manifest + mcpServers (auto-registered on install)
  marketplace.json   # lets the repo be added as a plugin marketplace
commands/check-tasks.md
commands/update.md
skills/todomaker/SKILL.md
install.sh            # build + link the `todomaker` command
update.sh            # fetch + fast-forward + reinstall + rebuild
```

## Updating

From Claude Code, run `/update`. Standalone, from the repo:

```bash
./update.sh
```

It fast-forwards from `origin/<branch>` only — it will not update a checkout
with uncommitted changes or local commits that diverge from the remote.

## Install

Prerequisite: `npm install` in this repo (the MCP launch uses the local
`node_modules/.bin/tsx`). The store path still honors `TODOMAKER_STORE`
(else `~/.todomaker/store.json`).

Add the repo as a marketplace, then install the plugin:

```bash
/plugin marketplace add /abs/path/to/todo-cli
/plugin install todomaker@todomaker
```

Installing (and enabling) the plugin registers the MCP server automatically.
Restart Claude Code if the `mcp__todomaker__*` tools do not appear immediately.
