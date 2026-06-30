import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { EMPTY_STORE, StoreSchema, type Store } from "./schema.js";

/**
 * Resolve the store path. `TODOMAKER_STORE` overrides the default so the TUI, the
 * MCP server and tests can all be pointed at the same (or a temp) file.
 */
export function storePath(): string {
  const override = process.env.TODOMAKER_STORE;
  if (override && override.trim() !== "") return override;
  return join(homedir(), ".todomaker", "store.json");
}

export function loadStore(): Store {
  const path = storePath();
  if (!existsSync(path)) return structuredClone(EMPTY_STORE);

  let data: unknown;
  try {
    data = JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    // A truncated/partial file (e.g. an interrupted external write) lands here.
    throw new Error(`Corrupt store at ${path}: ${(err as Error).message}`);
  }

  const parsed = StoreSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(`Corrupt store at ${path}: ${parsed.error.message}`);
  }
  return parsed.data;
}

/**
 * Write via a unique temp file then rename. The rename is atomic w.r.t. readers,
 * so a concurrent reader never sees a partial file; the per-write-unique temp
 * name means two concurrent writers can't corrupt each other's temp file.
 * (Best-effort durability: no fsync, so a crash mid-rename may lose the last
 * write — acceptable for a personal tool.)
 */
export function saveStore(store: Store): void {
  const path = storePath();
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.${randomUUID()}.tmp`;
  try {
    writeFileSync(tmp, JSON.stringify(store, null, 2), "utf8");
    renameSync(tmp, path);
  } catch (err) {
    rmSync(tmp, { force: true });
    throw err;
  }
}

/**
 * The single read-modify-write primitive for every store mutation.
 *
 * Concurrency model: no cross-process lock. Two processes mutating in overlapping
 * windows resolve to file-level last-write-wins (a concurrent edit can be lost,
 * but the file is never corrupted thanks to the atomic, unique-temp save). This is
 * adequate for a personal tool; add a lockfile here if true multi-writer safety
 * is ever required.
 */
export function mutate<T>(fn: (store: Store) => T): T {
  const store = loadStore();
  const result = fn(store);
  saveStore(store);
  return result;
}
