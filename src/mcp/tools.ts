import { z } from "zod";
import {
  addTask,
  getProjectForCwd,
  getTask,
  listProjects,
  listTasks,
  NotFoundError,
  setStatus,
  updateTask,
  upsertProjectByPath,
} from "../store/repo.js";
import { TaskStatusSchema, type Project, type Task } from "../store/schema.js";

/**
 * MCP tool registry. Adding a capability = adding one entry to `tools` — the
 * server wires every entry generically (Open/Closed). Each handler is a thin
 * adapter that validates nothing itself (zod does, via `inputSchema`) and
 * delegates straight to the repository.
 */

export interface ToolResult {
  content: { type: "text"; text: string }[];
  isError?: boolean;
}

const ok = (data: unknown): ToolResult => ({
  content: [{ type: "text", text: JSON.stringify(data) }],
});

const fail = (error: string, extra: Record<string, unknown> = {}): ToolResult => ({
  content: [{ type: "text", text: JSON.stringify({ error, ...extra }) }],
  isError: true,
});

/** Map a thrown error to a precise structured result — never a blanket guess. */
const mapError = (err: unknown): ToolResult =>
  err instanceof NotFoundError
    ? fail(`${err.kind}_not_found`, { [`${err.kind}Id`]: err.id })
    : fail("internal_error", { message: err instanceof Error ? err.message : String(err) });

// Wire-shape projections — the single source of truth for what each tool exposes.
const toProjectSummary = (p: Project) => ({ id: p.id, name: p.name, path: p.path });
const toTaskSummary = (t: Task) => ({ id: t.id, title: t.title, status: t.status, updatedAt: t.updatedAt });

const nonEmpty = z.string().trim().min(1);

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: z.ZodRawShape;
  handler: (args: any) => ToolResult | Promise<ToolResult>;
}

/**
 * Resolve a project id from an explicit id or a cwd. On failure returns a
 * structured error telling the model to ask the user / register a project —
 * we never silently guess which project a task belongs to.
 */
function resolveProjectId(args: {
  projectId?: string;
  cwd?: string;
}): { id: string } | { error: ToolResult } {
  if (args.projectId) {
    if (!listProjects().some((p) => p.id === args.projectId)) {
      return { error: fail("project_not_found", { projectId: args.projectId }) };
    }
    return { id: args.projectId };
  }
  if (args.cwd) {
    const project = getProjectForCwd(args.cwd);
    if (project) return { id: project.id };
    return {
      error: fail("project_not_resolved", {
        message:
          "No project registered for this cwd. Ask the user which project, or call register_project, then retry.",
        cwd: args.cwd,
      }),
    };
  }
  return {
    error: fail("project_required", {
      message: "Provide projectId, or cwd to resolve the project by path.",
    }),
  };
}

export const tools: ToolDef[] = [
  {
    name: "list_projects",
    description: "List all registered projects (id, name, filesystem path).",
    inputSchema: {},
    handler: () => ok(listProjects().map(toProjectSummary)),
  },
  {
    name: "get_current_project",
    description:
      "Resolve the project for a working directory via longest-path-prefix match. Returns { matched: false } when none applies so the caller knows to ask or register.",
    inputSchema: { cwd: nonEmpty.describe("Absolute working directory") },
    handler: ({ cwd }) => {
      const project = getProjectForCwd(cwd);
      return project ? ok({ matched: true, project: toProjectSummary(project) }) : ok({ matched: false });
    },
  },
  {
    name: "list_tasks",
    description:
      "List task summaries (id, title, status, updatedAt) for a project, optionally filtered by status. The 'what should I work on' query. Resolves the project from cwd when projectId is omitted.",
    inputSchema: {
      projectId: z.string().optional(),
      cwd: z.string().optional(),
      status: TaskStatusSchema.optional(),
    },
    handler: (args) => {
      const resolved = resolveProjectId(args);
      if ("error" in resolved) return resolved.error;
      return ok({
        projectId: resolved.id,
        tasks: listTasks({ projectId: resolved.id, status: args.status }).map(toTaskSummary),
      });
    },
  },
  {
    name: "get_task",
    description: "Get a single task including its full long-form description.",
    inputSchema: { taskId: nonEmpty },
    handler: ({ taskId }) => {
      const task = getTask(taskId);
      return task ? ok(task) : fail("task_not_found", { taskId });
    },
  },
  {
    name: "create_task",
    description:
      "Create a task. Requires projectId, or a cwd that resolves to a registered project. Returns a structured error (never guesses) when the project is unknown.",
    inputSchema: {
      title: nonEmpty,
      description: z.string().optional(),
      projectId: z.string().optional(),
      cwd: z.string().optional(),
      status: TaskStatusSchema.optional(),
    },
    handler: (args) => {
      const resolved = resolveProjectId(args);
      if ("error" in resolved) return resolved.error;
      try {
        return ok(
          addTask({
            projectId: resolved.id,
            title: args.title,
            description: args.description,
            status: args.status,
          }),
        );
      } catch (err) {
        return mapError(err);
      }
    },
  },
  {
    name: "register_project",
    description:
      "Register a project by filesystem path, or rename the one already at that path (upsert by normalized path).",
    inputSchema: { name: nonEmpty, path: nonEmpty },
    handler: ({ name, path }) => {
      try {
        return ok(upsertProjectByPath(name, path));
      } catch (err) {
        return mapError(err);
      }
    },
  },
  {
    name: "update_task_status",
    description: "Update only the status of a task.",
    inputSchema: { taskId: nonEmpty, status: TaskStatusSchema },
    handler: ({ taskId, status }) => {
      try {
        return ok(setStatus(taskId, status));
      } catch (err) {
        return mapError(err);
      }
    },
  },
  {
    name: "update_task",
    description: "Update a task's title, description and/or status.",
    inputSchema: {
      taskId: nonEmpty,
      title: nonEmpty.optional(),
      description: z.string().optional(),
      status: TaskStatusSchema.optional(),
    },
    handler: ({ taskId, title, description, status }) => {
      try {
        return ok(updateTask(taskId, { title, description, status }));
      } catch (err) {
        return mapError(err);
      }
    },
  },
];
