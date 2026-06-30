import { nanoid } from "nanoid";
import { loadStore, mutate } from "./store.js";
import { isSamePath, normalizePath, resolveProjectForCwd } from "./path-match.js";
import type { Project, Task, TaskStatus } from "./schema.js";

/**
 * Repository: the ONLY module that mutates the store. The TUI and the MCP server
 * both go through these functions — no duplicated read/write logic lives anywhere
 * else. Reads load a fresh snapshot; writes go through the `mutate()` primitive.
 */

/** Thrown when an operation targets a task or project that does not exist. */
export class NotFoundError extends Error {
  constructor(
    readonly kind: "task" | "project",
    readonly id: string,
  ) {
    super(`Unknown ${kind === "task" ? "taskId" : "projectId"}: ${id}`);
    this.name = "NotFoundError";
  }
}

const now = (): string => new Date().toISOString();

// --- Projects ---------------------------------------------------------------

export function listProjects(): Project[] {
  return loadStore().projects;
}

export function getProjectForCwd(cwd: string): Project | null {
  return resolveProjectForCwd(loadStore().projects, cwd);
}

/** Create a project, or rename the existing one registered at the same path. */
export function upsertProjectByPath(name: string, path: string): Project {
  return mutate((store) => {
    const existing = store.projects.find((p) => isSamePath(p.path, path));
    if (existing) {
      existing.name = name;
      return existing;
    }
    const project: Project = { id: nanoid(), name, path: normalizePath(path), createdAt: now() };
    store.projects.push(project);
    return project;
  });
}

// --- Tasks ------------------------------------------------------------------

export interface TaskFilter {
  projectId?: string;
  status?: TaskStatus;
}

export function listTasks(filter: TaskFilter = {}): Task[] {
  return loadStore().tasks.filter(
    (t) =>
      (filter.projectId === undefined || t.projectId === filter.projectId) &&
      (filter.status === undefined || t.status === filter.status),
  );
}

export function getTask(id: string): Task | null {
  return loadStore().tasks.find((t) => t.id === id) ?? null;
}

export interface NewTask {
  projectId: string;
  title: string;
  description?: string;
  status?: TaskStatus;
}

export function addTask(input: NewTask): Task {
  return mutate((store) => {
    if (!store.projects.some((p) => p.id === input.projectId)) {
      throw new NotFoundError("project", input.projectId);
    }
    const timestamp = now();
    const task: Task = {
      id: nanoid(),
      projectId: input.projectId,
      title: input.title,
      description: input.description ?? "",
      status: input.status ?? "pending",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    store.tasks.push(task);
    return task;
  });
}

export type TaskPatch = Partial<Pick<Task, "title" | "description" | "status">>;

export function updateTask(id: string, patch: TaskPatch): Task {
  return mutate((store) => {
    const task = store.tasks.find((t) => t.id === id);
    if (!task) throw new NotFoundError("task", id);
    if (patch.title !== undefined) task.title = patch.title;
    if (patch.description !== undefined) task.description = patch.description;
    if (patch.status !== undefined) task.status = patch.status;
    task.updatedAt = now();
    return task;
  });
}

export function setStatus(id: string, status: TaskStatus): Task {
  return updateTask(id, { status });
}

export function deleteTask(id: string): void {
  mutate((store) => {
    const index = store.tasks.findIndex((t) => t.id === id);
    if (index === -1) throw new NotFoundError("task", id);
    store.tasks.splice(index, 1);
  });
}
