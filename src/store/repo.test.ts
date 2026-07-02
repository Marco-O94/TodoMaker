import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let dir: string;

before(() => {
  dir = mkdtempSync(join(tmpdir(), "todomaker-"));
  process.env.TODOMAKER_STORE = join(dir, "store.json");
});

after(() => rmSync(dir, { recursive: true, force: true }));

test("project + task round-trip persists, filters by status, and updates", async () => {
  // Import after the env override is set so the store path resolves to the temp file.
  const { upsertProjectByPath, addTask, listTasks, setStatus, getTask } = await import("./repo.js");

  const project = upsertProjectByPath("demo", "/tmp/demo");
  addTask({ projectId: project.id, title: "first" });
  const second = addTask({ projectId: project.id, title: "second", status: "in_progress" });

  assert.equal(listTasks({ projectId: project.id }).length, 2);
  assert.equal(listTasks({ projectId: project.id, status: "in_progress" }).length, 1);

  setStatus(second.id, "completed");
  assert.equal(getTask(second.id)?.status, "completed");
  assert.equal(listTasks({ projectId: project.id, status: "completed" })[0]?.id, second.id);
});

test("upsert by path renames instead of duplicating", async () => {
  const { upsertProjectByPath, listProjects } = await import("./repo.js");
  const before = listProjects().length;
  const renamed = upsertProjectByPath("demo-renamed", "/tmp/demo");
  assert.equal(renamed.name, "demo-renamed");
  assert.equal(listProjects().length, before); // no new project created
});

test("addTask rejects an unknown projectId with a typed NotFoundError", async () => {
  const { addTask, NotFoundError } = await import("./repo.js");
  assert.throws(
    () => addTask({ projectId: "nope", title: "x" }),
    (err: unknown) => err instanceof NotFoundError && err.kind === "project" && err.id === "nope",
  );
});

test("planMode defaults to false and is set on create, toggled on update", async () => {
  const { upsertProjectByPath, addTask, updateTask, getTask } = await import("./repo.js");
  const project = upsertProjectByPath("plan", "/tmp/plan");

  const plain = addTask({ projectId: project.id, title: "plain" });
  assert.equal(plain.planMode, false);

  const planned = addTask({ projectId: project.id, title: "planned", planMode: true });
  assert.equal(planned.planMode, true);

  const cleared = updateTask(planned.id, { planMode: false });
  assert.equal(cleared.planMode, false);
  assert.equal(cleared.title, "planned"); // other fields untouched
  assert.equal(getTask(planned.id)?.planMode, false);
});

test("a task can be set to the blocked status and read back", async () => {
  const { upsertProjectByPath, addTask, setStatus, listTasks } = await import("./repo.js");
  const project = upsertProjectByPath("block", "/tmp/block");
  const task = addTask({ projectId: project.id, title: "stuck" });

  const blocked = setStatus(task.id, "blocked");
  assert.equal(blocked.status, "blocked");
  assert.equal(listTasks({ projectId: project.id, status: "blocked" })[0]?.id, task.id);
});

test("deleteTask removes a task and throws NotFoundError on a missing id", async () => {
  const { upsertProjectByPath, addTask, deleteTask, getTask, NotFoundError } = await import("./repo.js");
  const project = upsertProjectByPath("del", "/tmp/del");
  const task = addTask({ projectId: project.id, title: "doomed" });

  deleteTask(task.id);
  assert.equal(getTask(task.id), null);
  assert.throws(
    () => deleteTask(task.id),
    (err: unknown) => err instanceof NotFoundError && err.kind === "task" && err.id === task.id,
  );
});

test("a legacy store (task without planMode) loads and backfills planMode:false", async () => {
  const { getTask } = await import("./repo.js");
  const shared = process.env.TODOMAKER_STORE;
  const legacy = join(dir, "legacy.json");
  writeFileSync(
    legacy,
    JSON.stringify({
      version: 1,
      projects: [{ id: "p1", name: "old", path: "/tmp/old", createdAt: "2020-01-01T00:00:00.000Z" }],
      // A task shaped like the OLD schema — no planMode field.
      tasks: [
        {
          id: "t1",
          projectId: "p1",
          title: "legacy",
          description: "",
          status: "pending",
          createdAt: "2020-01-01T00:00:00.000Z",
          updatedAt: "2020-01-01T00:00:00.000Z",
        },
      ],
    }),
  );
  process.env.TODOMAKER_STORE = legacy;
  try {
    assert.equal(getTask("t1")?.planMode, false);
  } finally {
    process.env.TODOMAKER_STORE = shared; // restore so later runs use the shared store
  }
});
