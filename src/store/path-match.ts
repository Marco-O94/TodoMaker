import { resolve, sep } from "node:path";
import type { Project } from "./schema.js";

const CASE_INSENSITIVE_FS = process.platform === "win32" || process.platform === "darwin";

/** Absolute, trailing-separator-free path in its original case — the canonical form to store. */
export function normalizePath(p: string): string {
  const r = resolve(p);
  return r.length > 1 && r.endsWith(sep) ? r.slice(0, -1) : r;
}

/** Comparison form: forward-slash separators, case-folded on case-insensitive filesystems. */
function comparable(p: string): string {
  const slashed = normalizePath(p).split(sep).join("/");
  return CASE_INSENSITIVE_FS ? slashed.toLowerCase() : slashed;
}

/** True when two paths refer to the same directory (platform/case aware). */
export function isSamePath(a: string, b: string): boolean {
  return comparable(a) === comparable(b);
}

/**
 * Pick the project whose path is the longest prefix of `cwd`, so nested
 * directories resolve to the closest registered project. Returns null if none
 * contain `cwd`. Pure (no I/O) so it is trivially testable.
 */
export function resolveProjectForCwd(projects: Project[], cwd: string): Project | null {
  const target = comparable(cwd);
  let best: Project | null = null;
  let bestLen = -1;
  for (const project of projects) {
    const base = comparable(project.path);
    const contains = target === base || target.startsWith(base + "/");
    if (contains && base.length > bestLen) {
      best = project;
      bestLen = base.length;
    }
  }
  return best;
}
