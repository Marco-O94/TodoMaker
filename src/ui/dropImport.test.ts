import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readDroppedMarkdown } from "./dropImport.js";

const dir = mkdtempSync(join(tmpdir(), "drop-"));
const md = join(dir, "notes.md");
writeFileSync(md, "# Title\n\nbody");

test("imports an existing .md path", () => {
  const r = readDroppedMarkdown(md);
  assert.equal(r?.name, "notes.md");
  assert.equal(r?.content, "# Title\n\nbody");
});

test("handles quotes, escaped spaces, and trailing space", () => {
  const spaced = join(dir, "my notes.md");
  writeFileSync(spaced, "x");
  assert.equal(readDroppedMarkdown(`'${spaced}' `)?.content, "x");
  assert.equal(readDroppedMarkdown(spaced.replace(/ /g, "\\ ") + " ")?.content, "x");
});

test("returns null for non-markdown or non-existent paths", () => {
  assert.equal(readDroppedMarkdown("just some typed text"), null);
  assert.equal(readDroppedMarkdown(join(dir, "nope.md")), null);
  assert.equal(readDroppedMarkdown(join(dir, "notes.txt")), null);
});
