# Architecture

## Overview

TodoMaker has two entrypoints that share a single JSON store:

- **TUI** (`src/cli.tsx` → `src/ui/`) — interactive Ink/React terminal app.
- **MCP server** (`src/mcp/`) — stdio JSON-RPC server exposing the store to an AI agent.

Both go through one persistence layer (`src/store/`). A task created via MCP shows
up in the TUI after reload, and vice-versa.

## File layout

```
src/
  store/
    schema.ts      zod schemas + types (Task, Project, Store) + status cycle config
    store.ts       store path (env-aware), atomic write, mutate() read-modify-write
    path-match.ts  platform/case-aware path normalization + longest-prefix resolution
    repo.ts        the ONLY store writer: project/task CRUD, NotFoundError
  ui/
    App.tsx        top-level state, key handling, screen routing
    TaskList.tsx   navigable list with status glyphs
    TaskForm.tsx   add/edit: title + plan-mode toggle + multi-line description
    MultiLineInput.tsx  in-process multi-line editor
    ProjectPicker.tsx   switch / create project
    StatusBar.tsx  footer keybinding hints
    theme.ts       status glyph + color (presentation single source)
  mcp/
    tools.ts       tool registry (zod schemas + handlers) + error mapping
    server.ts      stdio wiring; registers every tool generically
  updater.ts       TUI-launch background self-update (spawns update.sh)
  cli.tsx          TUI entrypoint (kicks off the background update, then renders)
```

## Data model

```ts
type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled" | "blocked";

interface Task {
  id: string;          // nanoid
  projectId: string;   // FK -> Project.id
  title: string;
  description: string; // long-form, may be multi-line markdown
  status: TaskStatus;
  planMode: boolean;   // when true, an agent must plan before working the task
  createdAt: string;   // ISO
  updatedAt: string;   // ISO
}

interface Project {
  id: string;          // nanoid
  name: string;
  path: string;        // absolute fs path, original case; auto-resolves the current project
  createdAt: string;
}

interface Store {
  version: 1;
  projects: Project[];
  tasks: Task[];
}
```

The store lives at `~/.todomaker/store.json`, overridable with `TODOMAKER_STORE`
(honored by the TUI, the MCP server and the tests).

## Persistence invariants

- **`repo.ts` is the only writer.** Both entrypoints call it; there is no
  duplicated read/write logic. Reads load a fresh snapshot; writes go through the
  `mutate()` primitive.
- **`mutate(fn)`** is the single read-modify-write primitive: `load → fn(store) → save`.
- **`saveStore()`** writes to a per-write-unique temp file then `rename`s it into
  place. The rename is atomic for readers (never a partial file); the unique temp
  name means two concurrent writers can't corrupt each other's temp file.
- **`loadStore()`** funnels both JSON syntax errors and schema-validation failures
  into one `Corrupt store at <path>: …` error.

## Path resolution

`path-match.ts` resolves "the current project" for a `cwd` by **longest-prefix
match** (the closest registered project containing `cwd`). Comparison is
platform/case aware: separators are normalized and paths are case-folded on
case-insensitive filesystems (macOS, Windows). Stored paths keep their original
case (`normalizePath`); comparison uses the folded form (`isSamePath`,
`resolveProjectForCwd`).

## Status configuration (single source)

- `schema.ts` — `TASK_STATUSES`, `STATUS_CYCLE`, `nextStatus()` (the `space`-key cycle).
- `ui/theme.ts` — `STATUS_STYLE` (glyph + color + label).

Do not hard-code statuses, glyphs or the cycle order anywhere else.

## Error model

`repo.ts` throws a typed `NotFoundError(kind, id)` for missing tasks/projects.
The MCP layer's `mapError()` turns it into a precise structured result
(`task_not_found` / `project_not_found`) and maps anything else to
`internal_error` — never a blanket guess.

## Concurrency model (deliberate scope)

No cross-process lock. Two processes mutating in overlapping windows resolve to
**file-level last-write-wins** (a concurrent edit can be lost, but the file is
never corrupted thanks to the atomic unique-temp save). Durability is best-effort
(no `fsync`). This is adequate for a personal tool; add a lockfile in `store.ts`
if true multi-writer safety is ever required.

## Resolved design decisions

1. **Multi-line description:** an in-process `MultiLineInput` (enter = newline,
   Ctrl-S = save, esc = cancel) rather than spawning `$EDITOR` — keeps the
   terminal in Ink's raw mode with no handoff.
2. **Concurrency:** read-modify-write + atomic unique-temp rename, no lockfile.
3. **External changes:** manual `r` reload in the TUI (no `fs.watch`) for v1.

## Extending

- **New persisted field:** add it to the schema in `schema.ts`; the zod schema is
  the single source of truth for the shape.
- **New MCP tool:** append one entry to the `tools` array in `mcp/tools.ts`.
- **New storage backend:** reimplement `store.ts` only; `repo.ts` and both
  entrypoints stay unchanged.
