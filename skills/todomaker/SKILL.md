---
name: todomaker
description: How to use TodoMaker to manage project todos from Claude Code. Use when the user wants to add, list, complete, or cancel tasks; register or switch projects; check which tasks are pending for the current repo; or asks how TodoMaker works.
---

# TodoMaker

TodoMaker is a terminal todo manager that groups tasks by **project** (a project
is a name bound to a filesystem path). Tasks and projects live in one JSON store
(`$TODOMAKER_STORE`, else `~/.todomaker/store.json`), shared by the interactive
TUI and this MCP server. This plugin bundles that MCP server — it is registered
automatically when the plugin is installed.

A task has a `status`: `pending` · `in_progress` · `completed` · `cancelled`.

## Quick start

- **What's pending here?** Run `/check-tasks` — it resolves the project for the
  current working directory and lists its pending tasks. This is the default
  "what should I work on" view.

## MCP tools

Resolution rule: when `projectId` is omitted, pass `cwd` (the absolute working
directory) and the server matches the project whose registered path is the
**longest prefix** of `cwd`. The server never guesses a project — on no match it
returns a structured error so you ask the user or register a project first.

| Tool | Use it to |
| ---- | --------- |
| `mcp__todomaker__get_current_project` | resolve the project for a `cwd` (or learn none is registered) |
| `mcp__todomaker__list_projects` | list every registered project |
| `mcp__todomaker__register_project` | register a project (`name`, `path`) — or rename the one already at that path |
| `mcp__todomaker__list_tasks` | list tasks for a project (`projectId` or `cwd`), optionally filtered by `status` |
| `mcp__todomaker__get_task` | get one task with its full description |
| `mcp__todomaker__create_task` | create a task (`title`, optional `description`, `projectId` or `cwd`) |
| `mcp__todomaker__update_task_status` | change only a task's `status` |
| `mcp__todomaker__update_task` | change a task's `title` / `description` / `status` |

## Common flows

**See which tasks are pending** (the usual ask):
`list_tasks { cwd: "<repo path>", status: "pending" }`.

**Add a project** for the current repo:
`register_project { name: "<basename>", path: "<repo path>" }`.

**Add a task** to the current repo's project:
`create_task { cwd: "<repo path>", title: "...", description: "..." }`.
If `cwd` resolves to no project, register the project first, then retry —
`create_task` never guesses.

**Mark a task done / cancelled:**
`update_task_status { taskId: "...", status: "completed" }` (or `"cancelled"`).

## Interactive TUI

For hands-on use, the user can run the TUI (`npm run dev` in the TodoMaker repo):
arrow keys move, `space` cycles status, `1`–`4` set status directly, `a` adds,
`p` switches/creates projects, `f` filters by status. The TUI and this MCP server
read and write the same store, so changes appear in both.
