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
  reports its **pending** tasks, marking plan-mode ones (`🧠 plan`). If no project
  is registered for the repo it offers to register one. It may also set `planMode`
  on a task it judges complex (via `update_task`).

- **`todomaker` skill** (`skills/todomaker/SKILL.md`) — explains how to add
  tasks/projects, list/complete/cancel them, and which to view (pending). Loads
  when the user talks about managing todos.

## Layout

```
.claude-plugin/
  plugin.json        # manifest + mcpServers (auto-registered on install)
  marketplace.json   # lets the repo be added as a plugin marketplace
commands/check-tasks.md
skills/todomaker/SKILL.md
install.sh            # build + link the `todomaker` command
update.sh            # fetch + fast-forward + reinstall + rebuild
src/updater.ts       # TUI launch hook that runs update.sh in the background
```

## Updating

Updating is **automatic**. The TUI self-updates on launch: it spawns `update.sh`
in the background (Claude Code style), so the app starts instantly and a
fast-forward + rebuild lands on the **next** launch. `update.sh` fast-forwards
from `origin/<branch>` only — it no-ops when already up to date and refuses a
checkout with uncommitted changes or divergent local commits, so it never
clobbers local work.

Safety: a `mkdir`-based lock (`.update.lock`) serializes updates so two launches
never run `git`/`npm` concurrently, and the build backs up `dist/` and restores it
if the rebuild fails — a launch never sees a half-written `dist/`.

- Auto-update is **skipped under `npm run dev`** (running from source): a dev's
  checkout is never silently fast-forwarded mid-session. The built/installed
  command (`todomaker`, `npm start`) still self-updates.
- Disable it entirely by setting `TODOMAKER_AUTO_UPDATE=0` (also `false`/`off`).
- Update manually / on demand by running the script directly from the repo:

  ```bash
  ./update.sh
  ```

There is intentionally **no `/update` slash command** — the update has to run
outside the program (it rebuilds the very code Claude Code is running), so it
lives in the TUI launch and the standalone script, not as an in-chat command.

## Install

Add the plugin straight from GitHub, then install it:

```bash
/plugin marketplace add Marco-O94/TodoMaker
/plugin install todomaker@todomaker
```

Installing (and enabling) the plugin registers the MCP server automatically.

Prerequisite: the MCP launch uses the plugin's local `node_modules/.bin/tsx`, so
run `npm install` once inside the plugin directory (Claude Code prints its path on
install) before the `mcp__todomaker__*` tools work. The store path still honors
`TODOMAKER_STORE` (else `~/.todomaker/store.json`). Restart Claude Code if the
tools do not appear immediately.

A local clone works too: `/plugin marketplace add /abs/path/to/todo-cli`.
