import { test } from "node:test";
import assert from "node:assert/strict";
import { autoUpdateEnabled } from "./updater.js";

test("auto-update is on by default and when the flag is a truthy/unknown value", () => {
  assert.equal(autoUpdateEnabled({}), true);
  assert.equal(autoUpdateEnabled({ TODOMAKER_AUTO_UPDATE: "1" }), true);
  assert.equal(autoUpdateEnabled({ TODOMAKER_AUTO_UPDATE: "yes" }), true);
});

test("auto-update is off only for explicit off values (case/space-insensitive)", () => {
  for (const v of ["0", "false", "off", "  OFF ", "False"]) {
    assert.equal(autoUpdateEnabled({ TODOMAKER_AUTO_UPDATE: v }), false, `expected off for ${JSON.stringify(v)}`);
  }
});

test("auto-update is off when running from source via `npm run dev`", () => {
  assert.equal(autoUpdateEnabled({ npm_lifecycle_event: "dev" }), false);
  // still honored under other npm scripts (start/test) which run the built code
  assert.equal(autoUpdateEnabled({ npm_lifecycle_event: "start" }), true);
});
