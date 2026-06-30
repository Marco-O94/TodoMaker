import { test } from "node:test";
import assert from "node:assert/strict";
import { isSamePath, resolveProjectForCwd } from "./path-match.js";
import type { Project } from "./schema.js";

const CASE_INSENSITIVE_FS = process.platform === "win32" || process.platform === "darwin";

const project = (id: string, path: string): Project => ({ id, name: id, path, createdAt: "" });

test("longest-prefix match picks the closest registered project", () => {
  const projects = [project("root", "/code"), project("inner", "/code/app")];
  assert.equal(resolveProjectForCwd(projects, "/code/app/src")?.id, "inner");
  assert.equal(resolveProjectForCwd(projects, "/code/other")?.id, "root");
});

test("no false match on a sibling directory sharing a prefix string", () => {
  const projects = [project("a", "/code/app")];
  assert.equal(resolveProjectForCwd(projects, "/code/app-other"), null);
});

test("exact path matches", () => {
  const projects = [project("a", "/code/app")];
  assert.equal(resolveProjectForCwd(projects, "/code/app")?.id, "a");
});

test("returns null when nothing contains the cwd", () => {
  assert.equal(resolveProjectForCwd([project("a", "/code/app")], "/elsewhere"), null);
});

test("path comparison follows the filesystem's case sensitivity", () => {
  assert.equal(isSamePath("/Code/App", "/code/app"), CASE_INSENSITIVE_FS);
  assert.equal(isSamePath("/code/app", "/code/app"), true);
});
