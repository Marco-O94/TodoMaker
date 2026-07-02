# MCP server

```bash
npm run mcp        # tsx src/mcp/server.ts   (or: node dist/mcp/server.js)
```

Inspect every tool with the MCP inspector:

```bash
npx @modelcontextprotocol/inspector npm run mcp
```

The server speaks JSON-RPC over **stdio**; all logging goes to **stderr** so the
transport on stdout is never corrupted.

## Tools

| Tool                 | Input                                                | Returns |
| -------------------- | ---------------------------------------------------- | ------- |
| `list_projects`      | —                                                    | `{id,name,path}[]` |
| `get_current_project`| `{ cwd }`                                            | matched project or `{matched:false}` |
| `list_tasks`         | `{ projectId? , cwd? , status? }`                    | task summaries (incl. `planMode`, no description) |
| `get_task`           | `{ taskId }`                                         | full task incl. description |
| `create_task`        | `{ title, description?, projectId?, cwd?, status?, planMode? }` | created task |
| `register_project`   | `{ name, path }`                                     | upserted project |
| `update_task_status` | `{ taskId, status }`                                 | updated task |
| `update_task`        | `{ taskId, title?, description?, status?, planMode? }` | updated task |
| `delete_task`        | `{ taskId }`                                         | `{ deleted: true, taskId }` |

`status` ∈ `pending | in_progress | completed | cancelled | blocked`. Required
text inputs (`title`, `name`, `path`) reject empty/whitespace-only values via zod.

`planMode` (boolean) declares that an agent should enter plan mode before working
the task. An agent may set it via `create_task` / `update_task` when it judges a
task complex; it is returned in every `list_tasks` summary so the flag is visible
without a full `get_task`.

## Project resolution

When `projectId` is omitted, the server resolves the project whose registered path
is the **longest prefix** of `cwd` (closest registered project). Resolution rules:

- An explicit `projectId` that does not exist → structured `project_not_found`.
- `cwd` that matches no project → `project_not_resolved` (the model should ask the
  user or call `register_project`, then retry).
- `create_task` **never guesses** a project.

## Error contract

Every handler returns a structured JSON result; failures set `isError: true` with
an `error` code:

| Code                  | Meaning |
| --------------------- | ------- |
| `task_not_found`      | no task with that id |
| `project_not_found`   | explicit projectId does not exist |
| `project_not_resolved`| cwd matched no registered project |
| `project_required`    | neither projectId nor cwd provided |
| `internal_error`      | unexpected failure (store I/O, corruption); carries `message` |

## Connection config

Claude Code `.mcp.json` / Claude Desktop, using the built server:

```json
{
  "mcpServers": {
    "todomaker": {
      "command": "node",
      "args": ["/abs/path/to/todo-cli/dist/mcp/server.js"]
    }
  }
}
```

For development without a build step, point at the TypeScript source:

```json
{
  "mcpServers": {
    "todomaker": {
      "command": "npx",
      "args": ["tsx", "/abs/path/to/todo-cli/src/mcp/server.ts"]
    }
  }
}
```
