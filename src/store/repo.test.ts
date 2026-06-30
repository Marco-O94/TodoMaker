import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
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
