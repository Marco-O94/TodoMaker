# Agent Plan: TodoMaker — Ink TUI + MCP Server

## 0. Goal & Success Criteria

Build a terminal application (Ink/React) called **TodoMaker** for managing todos
grouped by **project**, with a companion **MCP server** that lets an AI agent:

- list tasks of a specific project (filtering by status),
- create new tasks, asking/inferring which project to save them to,
- read a task's long description,
- update a task's status.

Projects are persisted with their **filesystem path**, so that an agent running
inside a given directory auto-resolves "the current project" by matching `cwd`
against stored project paths. New paths get registered on first use.

**Success criteria (all must hold):**
1. `npm run dev` (or the built binary) opens an interactive TUI: navigate a task
   list with arrows, toggle status, add tasks (title + multi-line description),
   delete tasks, switch/create projects.
2. Data persists across restarts in a single JSON store.
3. `npm run mcp` starts an MCP server over stdio exposing the tools listed in §5,
   verifiable with the MCP inspector or a real client (Claude Code / Claude Desktop).
4. The TUI and the MCP server read/write the **same** store, so a task added via
   MCP appears in the TUI after refresh, and vice-versa.

---

## 1. Tech Stack & Dependencies

- **Runtime:** Node.js ≥ 20, TypeScript, ESM (`"type": "module"`).
- **TUI:** `ink`, `react`, `ink-text-input`, `ink-select-input`, `ink-spinner`.
- **MCP:** `@modelcontextprotocol/sdk` (server, stdio transport), `zod` for tool
  input schemas.
- **Build:** `tsup` (or `tsc`); `tsx` for dev/watch.
- **IDs / misc:** `nanoid`.

Install:
```bash
npm i ink react ink-text-input ink-select-input ink-spinner \
      @modelcontextprotocol/sdk zod nanoid
npm i -D typescript tsx tsup @types/react @types/node
```

Set `package.json`:
```json
{
  "type": "module",
  "bin": { "todomaker": "./dist/cli.js" },
  "scripts": {
    "dev": "tsx src/cli.tsx",
    "mcp": "tsx src/mcp/server.ts",
    "build": "tsup src/cli.tsx src/mcp/server.ts --format esm --clean",
    "typecheck": "tsc --noEmit"
  }
}
```
`tsconfig.json`: `"jsx": "react-jsx"`, `"module": "ESNext"`,
`"moduleResolution": "Bundler"`, `"target": "ES2022"`, `"strict": true`.

---

## 2. Data Model (single source of truth)

One JSON store at `~/.todomaker/store.json` (override via `TODOMAKER_STORE` env
var — the MCP server and TUI MUST honor the same env var so tests can point them
at a temp file).

```ts
type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";

interface Task {
  id: string;            // nanoid
  projectId: string;     // FK -> Project.id
  title: string;
  description: string;   // long-form, may be multi-line/markdown; read by the AI
  status: TaskStatus;
  createdAt: string;     // ISO
  updatedAt: string;     // ISO
}

interface Project {
  id: string;            // nanoid
  name: string;
  path: string;          // absolute fs path; used to auto-resolve current project
  createdAt: string;
}

interface Store {
  version: 1;
  projects: Project[];
  tasks: Task[];
}
```

**Path matching rule (used by MCP "current project" resolution):** given a `cwd`,
pick the project whose `path` is the longest prefix of `cwd` (so nested dirs
resolve to the closest registered project). Normalize with `path.resolve` +
trailing-slash stripping before comparing. If none match, the project is
**unknown** → MCP should ask the caller which project, or create a new one with
the given `cwd` + a name.

---

## 3. Architecture / File Layout

Keep the persistence layer **shared and pure** so both entrypoints reuse it.

```
src/
  store/
    schema.ts        # zod schemas + TS types (Task, Project, Store)
    store.ts         # load(), save(), atomic write; resolves store path from env
    repo.ts          # pure data ops: addTask, setStatus, listTasks(filter),
                     # upsertProjectByPath, getProjectForCwd, deleteTask, etc.
  cli.tsx            # Ink entrypoint -> renders <App/>
  ui/
    App.tsx          # top-level state, keybindings, screen routing
    TaskList.tsx     # navigable list, status glyphs, selection
    TaskForm.tsx     # add/edit: title input + multiline description input
    ProjectPicker.tsx# select/create project (ink-select-input)
    StatusBar.tsx    # footer with keybinding hints
  mcp/
    server.ts        # MCP server (stdio) wiring tools to repo.ts
    tools.ts         # tool definitions (zod schemas + handlers)
```

**Critical invariant:** `repo.ts` is the ONLY module that mutates the store.
`cli.tsx` and `mcp/*` both call into it. No duplicated read/write logic.

**Concurrency:** TUI and MCP may run simultaneously. Implement `save()` as an
atomic write (write to `store.json.tmp` then `fs.rename`). On every repo write,
re-read the file first (read-modify-write) to avoid clobbering the other process.
This is a small app, so file-level last-write-wins after re-read is acceptable —
document it, don't over-engineer locking.

---

## 4. TUI Behaviour (Ink)

Screens, managed by a `screen` state in `App.tsx`:

1. **List screen (default).** Header shows current project name + task count.
   List rows show a status glyph + title:
   - `pending` → `[ ]`, `in_progress` → `[~]`, `completed` → `[x]`,
     `cancelled` → `[-]`. Color via Ink `<Text color>`.
   - Keys: `↑/↓` navigate, `enter` open detail/edit, `space` cycle status
     (pending → in_progress → completed → pending), `a` add, `d` delete,
     `p` switch project, `r` reload from disk, `q`/Ctrl-C quit.
   - Use `useInput` from ink for key handling; guard against handling keys while
     a text input is focused.
2. **Task form screen.** `ink-text-input` for title; for the long description use
   a multi-line approach — simplest reliable option: open the field, capture lines
   until the user submits with a sentinel (e.g. type `;;` on its own line) OR
   integrate `ink-text-input` per line. Document whichever you pick. Pre-fill when
   editing.
3. **Project picker screen.** `ink-select-input` listing existing projects +
   a "＋ New project…" item that prompts for name and path (default path = `cwd`).

State lives in `App.tsx` via `useState`; after any mutation call `repo`, then
re-`load()` and set state so the list reflects truth. Keep it simple — no global
store library needed.

---

## 5. MCP Server (stdio)

Use `@modelcontextprotocol/sdk` `McpServer` + `StdioServerTransport`. Register
these tools (names are the contract — keep them exact). All inputs validated with
zod; all handlers delegate to `repo.ts`.

1. **`list_projects`** → returns `{id, name, path}[]`. No input.
2. **`get_current_project`** — input `{ cwd: string }`. Resolves via longest-prefix
   path match (§2). Returns the project or `{ matched: false }` so the model knows
   it must ask the user / create one.
3. **`list_tasks`** — input `{ projectId?: string, cwd?: string, status?: TaskStatus }`.
   If `projectId` absent, resolve from `cwd`. Returns task summaries
   `{id, title, status, updatedAt}` (omit long description here to save tokens).
   **This is the "what should I work on" query** — support filtering by
   `status: "pending"` / `"in_progress"`.
4. **`get_task`** — input `{ taskId: string }`. Returns the FULL task including the
   long `description` (this is what the AI reads to understand the work).
5. **`create_task`** — input
   `{ title: string, description?: string, projectId?: string, cwd?: string, status?: TaskStatus }`.
   If neither `projectId` nor a resolvable `cwd` match exists, return a structured
   error telling the model to ask the user which project (and offer to register
   the cwd as a new project). **Do not silently guess.**
6. **`register_project`** — input `{ name: string, path: string }`. Upserts a
   project by normalized path. Used when the model is in a new directory.
7. **`update_task_status`** — input `{ taskId: string, status: TaskStatus }`.
8. *(optional)* **`update_task`** — input `{ taskId, title?, description?, status? }`.

Each tool returns text content with a JSON payload. Keep responses compact.
Server logs MUST go to **stderr only** (stdout is the MCP transport — writing to
stdout corrupts the protocol).

**Connection config** to document in README (for Claude Code `.mcp.json` /
Claude Desktop):
```json
{
  "mcpServers": {
    "todomaker": {
      "command": "node",
      "args": ["/abs/path/to/dist/mcp/server.js"]
    }
  }
}
```
For dev you can point `command` to `tsx` + the `.ts` path.

---

## 6. Implementation Phases (do in order, verify each before moving on)

**Phase 1 — Persistence core.**
Build `schema.ts`, `store.ts` (env-aware path, atomic write), `repo.ts` with all
ops. Write a throwaway script (`node --import tsx scratch.ts`) that creates a
project, adds tasks, lists by status, flips a status — confirm the JSON file
updates correctly. ✅ when round-trips persist.

**Phase 2 — MCP server.**
Wire `tools.ts` + `server.ts`. Verify with the MCP inspector:
`npx @modelcontextprotocol/inspector tsx src/mcp/server.ts`. Exercise every tool,
especially `get_current_project` longest-prefix matching and the `create_task`
"ask which project" error path. ✅ when all 7 tools respond correctly.

**Phase 3 — Ink TUI, read-only.**
`cli.tsx` + `App.tsx` + `TaskList.tsx` + `StatusBar.tsx`. Render the list with
glyphs/colors and arrow navigation against real store data. ✅ when the list shows
seeded tasks and navigates.

**Phase 4 — TUI mutations.**
Add `space` status cycle, `a` add (TaskForm with multi-line description), `d`
delete, `p` project picker (ProjectPicker + new-project flow), `r` reload.
✅ when a task added in the TUI shows up via the MCP `list_tasks`, proving the
shared store.

**Phase 5 — Polish & docs.**
Build with tsup, write README with install + MCP connection config + keybindings,
add `register_project`/`update_task` if not yet done. `npm run typecheck` clean.

---

## 7. Do's and Don'ts

- **DO** keep `repo.ts` the single writer; both entrypoints go through it.
- **DO** read-modify-write with atomic rename on every save (two processes share
  the file).
- **DO** send all MCP server logging to **stderr** — never `console.log` to stdout
  in the server, it breaks the stdio protocol.
- **DO** validate every MCP tool input with zod and return structured errors the
  model can act on (especially "which project?").
- **DON'T** let `create_task` guess a project when the path doesn't match — make
  the model ask or register first.
- **DON'T** block on a heavyweight global-state lib; `useState` + reload-after-write
  is enough for this scale.
- **DON'T** forget `"jsx": "react-jsx"` and ESM config, or Ink won't compile.
- **DON'T** put the store in the cwd — use `~/.todomaker/` (honoring
  `TODOMAKER_STORE`) so it's shared regardless of where either process runs.

## 8. Open Decisions (resolve early, note the choice)

1. Multi-line description capture in Ink — sentinel-terminated input vs. spawning
   `$EDITOR`. Spawning `$EDITOR` is more robust for long markdown; pick one and
   document it.
2. Concurrency model — confirmed simple read-modify-write is acceptable, or do you
   want a lockfile? Default: no lockfile.
3. Whether the TUI should live-watch the store file (fs.watch) for external MCP
   changes, or rely on manual `r` reload. Default: manual reload for v1.
