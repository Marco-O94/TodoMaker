import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Text, useApp, useInput, useStdout } from "ink";
import {
  addTask,
  deleteTask,
  getProjectForCwd,
  listProjects,
  listTasks,
  setStatus,
  updateTask,
  upsertProjectByPath,
} from "../store/repo.js";
import {
  nextStatus,
  STATUS_ORDER,
  TASK_STATUSES,
  type Project,
  type Task,
  type TaskStatus,
} from "../store/schema.js";
import { STATUS_STYLE } from "./theme.js";
import { TaskList } from "./TaskList.js";
import { TaskDetail } from "./TaskDetail.js";
import { TaskForm, type TaskFormValue } from "./TaskForm.js";
import { ProjectPicker } from "./ProjectPicker.js";
import { StatusBar } from "./StatusBar.js";

type Screen = "list" | "form" | "projects";

/** Live terminal size — re-renders on resize so the viewport stays correct. */
function useTerminalSize() {
  const { stdout } = useStdout();
  const [size, setSize] = useState({ rows: stdout.rows || 24, columns: stdout.columns || 80 });
  useEffect(() => {
    const onResize = () => setSize({ rows: stdout.rows || 24, columns: stdout.columns || 80 });
    stdout.on("resize", onResize);
    return () => {
      stdout.off("resize", onResize);
    };
  }, [stdout]);
  return size;
}

/** Filter cycle: all → each status (in display order) → all. */
const FILTERS: (TaskStatus | null)[] = [null, ...STATUS_ORDER];

/** The rendered list: tasks filtered by status, then sorted by STATUS_ORDER. */
function orderView(tasks: Task[], filter: TaskStatus | null): Task[] {
  return tasks
    .filter((t) => !filter || t.status === filter)
    .sort((a, b) => {
      const d = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
      return d !== 0 ? d : a.createdAt.localeCompare(b.createdAt);
    });
}

/**
 * Top-level state + screen routing. After any mutation it re-reads the store
 * (single source of truth) and updates state, so the view always reflects disk —
 * including changes made by the MCP server.
 */
export function App() {
  const { exit } = useApp();
  const { rows, columns } = useTerminalSize();
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selected, setSelected] = useState(0);
  const [filter, setFilter] = useState<TaskStatus | null>(null);
  const [screen, setScreen] = useState<Screen>("list");
  const [editing, setEditing] = useState<Task | null>(null);

  // On launch, prefer the project matching cwd, else the first registered one.
  useEffect(() => {
    const loaded = listProjects();
    setProjects(loaded);
    setCurrentProjectId(getProjectForCwd(process.cwd())?.id ?? loaded[0]?.id ?? null);
  }, []);

  const refresh = (projectId: string | null = currentProjectId): Task[] => {
    setProjects(listProjects());
    const next = projectId ? listTasks({ projectId }) : [];
    setTasks(next);
    return next;
  };

  // After a status change the view re-sorts, so move the cursor to follow the
  // same task (keeps it under the cursor instead of jumping to a stranger). If
  // the task left the active filter, fall through to the render-time clamp.
  const keepCursorOn = (taskId: string, nextTasks: Task[]) => {
    const i = orderView(nextTasks, filter).findIndex((t) => t.id === taskId);
    if (i >= 0) setSelected(i);
  };

  // Reload the task list whenever the active project changes, starting at the top.
  useEffect(() => {
    setSelected(0);
    refresh(currentProjectId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProjectId]);

  // Filtered + status-sorted view. Selection indexes into this, so it is derived
  // (not stored) and clamped wherever it is read.
  const view = useMemo(() => orderView(tasks, filter), [tasks, filter]);

  const clampedSelected = Math.min(selected, Math.max(0, view.length - 1));
  const current = view[clampedSelected];

  // Holds the first key of a vim two-key sequence (g→gg, d→dd) until the next press.
  const pendingKey = useRef<string | null>(null);

  useInput((input, key) => {
    if (screen !== "list") return;

    // Resolve pending vim sequences first; a non-matching second key falls through.
    const prev = pendingKey.current;
    pendingKey.current = null;
    if (prev === "g" && input === "g") return setSelected(0); // gg → top
    if (prev === "d" && input === "d") {
      // dd → delete
      if (current) {
        deleteTask(current.id);
        refresh();
      }
      return;
    }

    if (input === "q") return exit();
    if (key.ctrl && key.upArrow) return setSelected(0); // Ctrl+↑ → top
    if (key.ctrl && key.downArrow) return setSelected(Math.max(0, view.length - 1)); // Ctrl+↓ → bottom
    if (key.upArrow || input === "k") return setSelected(Math.max(0, clampedSelected - 1));
    if (key.downArrow || input === "j")
      return setSelected(Math.max(0, Math.min(view.length - 1, clampedSelected + 1)));
    if (input === "g") {
      pendingKey.current = "g";
      return;
    }
    if (input === "G") return setSelected(Math.max(0, view.length - 1));
    if (input === "f") {
      const i = FILTERS.indexOf(filter);
      setFilter(FILTERS[(i + 1) % FILTERS.length] ?? null);
      return setSelected(0);
    }
    if (input === "r") return refresh();
    if (input === "p") return setScreen("projects");
    if (input === "a" || input === "o") {
      if (!currentProjectId) return setScreen("projects"); // need a project first
      setEditing(null);
      return setScreen("form");
    }
    if (!current) return;
    if (input === "d") {
      pendingKey.current = "d";
      return;
    }
    // 1..4 set the status directly (1 pending, 2 in_progress, 3 completed, 4 cancelled).
    const direct = TASK_STATUSES[Number(input) - 1];
    if (direct && input >= "1" && input <= "4") {
      setStatus(current.id, direct);
      return keepCursorOn(current.id, refresh());
    }
    if (input === " ") {
      setStatus(current.id, nextStatus(current.status));
      return keepCursorOn(current.id, refresh());
    }
    if (input === "x") {
      // Toggle cancelled: a fast path that the space-cycle deliberately omits.
      setStatus(current.id, current.status === "cancelled" ? "pending" : "cancelled");
      return keepCursorOn(current.id, refresh());
    }
    if (key.return || input === "i") {
      setEditing(current);
      return setScreen("form");
    }
  });

  if (screen === "form") {
    return (
      <TaskForm
        initial={editing}
        onSubmit={(value: TaskFormValue) => {
          if (editing) updateTask(editing.id, value);
          else if (currentProjectId) addTask({ projectId: currentProjectId, ...value });
          setEditing(null);
          setScreen("list");
          refresh();
        }}
        onCancel={() => {
          setEditing(null);
          setScreen("list");
        }}
      />
    );
  }

  if (screen === "projects") {
    return (
      <ProjectPicker
        projects={projects}
        defaultPath={process.cwd()}
        onSelect={(id) => {
          setCurrentProjectId(id);
          setScreen("list");
        }}
        onCreate={(name, path) => {
          const project = upsertProjectByPath(name, path);
          setProjects(listProjects());
          setCurrentProjectId(project.id);
          setScreen("list");
        }}
        onCancel={() => setScreen("list")}
      />
    );
  }

  const project = projects.find((p) => p.id === currentProjectId) ?? null;

  // ponytail: fixed chrome budget (header/detail/status bar). Tune the constants
  // if the layout grows; not worth a measureElement pass for a few static rows.
  const wide = columns >= 100;
  const listRows = wide ? Math.max(3, rows - 8) : Math.max(3, rows - 18);
  const detailLines = wide ? Math.max(3, rows - 10) : 6;

  return (
    <Box flexDirection="column">
      <Header project={project} tasks={tasks} />
      {project ? null : <Text dimColor>Press 'p' to create or select a project.</Text>}
      {wide ? (
        <Box flexDirection="row">
          <Box flexDirection="column" width="50%">
            <TaskList tasks={view} selected={clampedSelected} rows={listRows} />
          </Box>
          <Box width="50%" paddingLeft={1}>
            <TaskDetail task={current ?? null} maxLines={detailLines} />
          </Box>
        </Box>
      ) : (
        <Box flexDirection="column">
          <TaskList tasks={view} selected={clampedSelected} rows={listRows} />
          <TaskDetail task={current ?? null} maxLines={detailLines} />
        </Box>
      )}
      <StatusBar filter={filter} />
    </Box>
  );
}

/** Project name + total + a colored per-status breakdown of the whole project. */
function Header({ project, tasks }: { project: Project | null; tasks: Task[] }) {
  const counts = new Map<TaskStatus, number>();
  for (const t of tasks) counts.set(t.status, (counts.get(t.status) ?? 0) + 1);
  return (
    <Text>
      <Text bold>{project ? project.name : "No project"}</Text>
      <Text dimColor> · {tasks.length} task(s)</Text>
      {STATUS_ORDER.filter((s) => counts.get(s)).map((s) => (
        <Text key={s} color={STATUS_STYLE[s].color}>
          {"   "}
          {STATUS_STYLE[s].glyph} {counts.get(s)}
        </Text>
      ))}
    </Text>
  );
}
