# TUI

```bash
npm run dev        # tsx src/cli.tsx   (or: node dist/cli.js after build)
```

## Keybindings (list screen)

Keybindings follow vim conventions where a natural equivalent exists.

| Key            | Action                                                     |
| -------------- | --------------------------------------------------------- |
| `j` / `k`, `↓` / `↑` | move selection                                      |
| `gg` / `G`, `Ctrl-↑` / `Ctrl-↓` | jump to top / bottom                    |
| `i` / `enter`  | edit selected task                                        |
| `o` / `a`      | add a task (title, then multi-line description)           |
| `dd`           | delete selected task                                       |
| `space`        | cycle status (pending → in_progress → completed → pending)|
| `1` / `2` / `3` / `4` | set status directly (pending / in_progress / completed / cancelled) |
| `x`            | toggle cancelled (cancelled ↔ pending)                    |
| `f`            | cycle status filter (all → each status → all)             |
| `p`            | switch / create project                                   |
| `r`            | reload from disk (pick up external changes, e.g. via MCP) |
| `q` / `Ctrl-C` | quit                                                      |

`gg` and `dd` are two-key sequences: press the first key, then the second.

Status glyphs: `[ ]` pending · `[~]` in progress · `[x]` completed · `[-]` cancelled.
The `space` cycle covers pending → in_progress → completed; `cancelled` is set
with `x` (or via edit), not part of the fast loop. Status display order
(in_progress → pending → completed → cancelled) is single-sourced as
`STATUS_ORDER` in `schema.ts`.

## Screens

- **List** (default) — header shows the current project, total task count, and a
  colored per-status breakdown. Tasks are grouped under status headers (with
  per-group counts) and sorted by `STATUS_ORDER`. The list is a scrolling
  viewport sized to the terminal: only the rows that fit are drawn, with
  `↑ N more` / `↓ N more` hints, and the selection (`❯`) always stays visible.
  The list sits in a bordered box; each task's title is colored by its status,
  and the selected row is highlighted with a filled status-color background.
  Completed/cancelled tasks are dimmed (cancelled is struck through). A `f`
  filter narrows the list to a single status; the active filter is shown in the
  status bar.
  - **Detail pane** — bordered in the task's status color; shows a filled
    status badge, the title, a relative "updated" time, and a description
    preview (clamped, with a "+N more lines" hint). Laid out beside the list on
    wide terminals (≥100 cols), stacked below it otherwise.

All colors come from `STATUS_STYLE` in `ui/theme.ts` (the single source for the
glyph/color of each status).
- **Task form** — a cyan-framed two-step flow with a filled heading badge
  (`NEW TASK` / `EDIT TASK`) and a `step N of 2` indicator. Step 1: single-line
  title in a bordered box (enter advances). Step 2: the title is echoed, then a
  multi-line description editor. In the editor: **enter** = newline,
  **Ctrl-S** = save, **esc** = cancel. Esc cancels at every step (no accidental
  save). **Drag-and-drop** a `.md` file onto the terminal to import its contents
  into the description (the terminal pastes the path; if it resolves to a real
  markdown file the editor appends its text and shows `✓ imported <name>`).
  Detection logic lives in `ui/dropImport.ts`.
- **Project picker** — select an existing project or `＋ New project…`, which walks
  a name → path sub-flow (path defaults to the current working directory).

## State

State lives in `App.tsx` (`useState`). After any mutation the app re-reads the
store (single source of truth) and updates state, so the view always reflects
disk. The rendered list is a derived view (`tasks` filtered by the active status
filter, then sorted by `STATUS_ORDER`); the selection indexes into that view and
is clamped on every render, so changing the filter or deleting the last task
never points off the end. Selection resets to the top when the active project or
the filter changes. The viewport height tracks the terminal via a `resize`
listener (`useTerminalSize`).
