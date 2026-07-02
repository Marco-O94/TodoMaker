import { z } from "zod";

/**
 * Single source of truth for the persisted data model. Both the TUI and the MCP
 * server import these types/schemas — never redefine them elsewhere.
 */

export const TASK_STATUSES = ["pending", "in_progress", "completed", "cancelled", "blocked"] as const;
export const TaskStatusSchema = z.enum(TASK_STATUSES);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  title: z.string(),
  description: z.string().default(""),
  status: TaskStatusSchema,
  /** When true, an agent must enter plan mode before working this task. */
  planMode: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Task = z.infer<typeof TaskSchema>;

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  createdAt: z.string(),
});
export type Project = z.infer<typeof ProjectSchema>;

export const StoreSchema = z.object({
  version: z.literal(1),
  projects: z.array(ProjectSchema),
  tasks: z.array(TaskSchema),
});
export type Store = z.infer<typeof StoreSchema>;

export const EMPTY_STORE: Store = { version: 1, projects: [], tasks: [] };

/**
 * Statuses the `space` key cycles through in the TUI. `cancelled` is intentionally
 * excluded — it is a deliberate choice set via edit, not a step in the fast loop.
 */
export const STATUS_CYCLE: TaskStatus[] = ["pending", "in_progress", "completed"];

/**
 * Display order when grouping/sorting tasks by status in the TUI: active work
 * first, finished/abandoned last. Single source — the TUI must not reorder
 * statuses anywhere else.
 */
export const STATUS_ORDER: TaskStatus[] = ["in_progress", "pending", "blocked", "completed", "cancelled"];

export function nextStatus(current: TaskStatus): TaskStatus {
  const i = STATUS_CYCLE.indexOf(current);
  return STATUS_CYCLE[(i + 1) % STATUS_CYCLE.length] ?? "pending";
}
