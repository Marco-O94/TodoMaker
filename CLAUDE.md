# TodoMaker — project instructions

Terminal todo manager (Ink TUI) with a companion MCP server, grouped by project.
The TUI and the MCP server share one JSON store.

## Documentation

- **All project documentation lives in `docs/`.** Read the relevant file before
  changing a module:
  - `docs/architecture.md` — data model, store layer, concurrency, design decisions
  - `docs/tui.md` — TUI screens and keybindings
  - `docs/mcp.md` — MCP tools, project resolution, connection config
  - `docs/plugin.md` — Claude Code plugin (`/check-tasks` command, skill,
    auto-registered MCP server)
- When you change a module, **update its doc in `docs/` in the same change**.
- Write all documentation in **English**.
- Keep the root `README.md` a short overview that links into `docs/` — put detail
  in `docs/`, not in the README.

## Commands

- `npm run dev` — run the TUI (tsx)
- `npm run mcp` — run the MCP server over stdio (tsx)
- `npm run build` — bundle both entrypoints to `dist/` (tsup)
- `npm run typecheck` — `tsc --noEmit`
- `npm test` — `node:test` suite

### Standalone binary (Bun) — not wired yet

`npm run build` produces ESM bundles that still need Node ≥20. To ship a
self-contained executable (no Node required), compile with Bun:

```bash
bun build src/cli.tsx       --compile --outfile dist/todomaker      # TUI binary
bun build src/mcp/server.ts --compile --outfile dist/todomaker-mcp  # MCP server binary
```

When wiring this up, add a `build:bin` script for both targets. The store path
still honors `TODOMAKER_STORE` (else `~/.todomaker/store.json`) inside the binary.

## Architecture invariants (do not break)

- `src/store/repo.ts` is the **only** module that mutates the store. Every write
  goes through the `mutate()` primitive in `store.ts`. The TUI and the MCP server
  both call `repo` — no duplicated read/write logic anywhere else.
- Add an MCP tool by appending one entry to the `tools` array in
  `src/mcp/tools.ts`; the server wires it generically. Validate every input with
  zod and return **structured** errors (use `NotFoundError` + `mapError`); never
  let a handler throw raw.
- The MCP server logs to **stderr only** — stdout is the JSON-RPC transport.
- Status definitions are single-sourced: cycle/order in `schema.ts`, glyph/color
  in `ui/theme.ts`. Do not hard-code statuses elsewhere.
- The store path resolves from `TODOMAKER_STORE` (else `~/.todomaker/store.json`).
  The TUI, the MCP server and the tests must all honor it.

## Conventions

- TypeScript, ESM (`"type": "module"`). Import local files with the `.js`
  extension. `verbatimModuleSyntax` is on → use `import type` for type-only imports.
- Path comparison is platform/case aware via `path-match.ts` (`isSamePath`,
  `resolveProjectForCwd`); store paths in their original case (`normalizePath`).
- Tests use `node:test` + `node:assert`; non-trivial logic gets a test. Point
  tests at a temp store via `TODOMAKER_STORE`.
