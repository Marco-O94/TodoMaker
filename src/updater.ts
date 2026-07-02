import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Silent background self-update for the TUI (Claude Code style): the app starts
 * instantly and a fast-forward + rebuild lands on the next launch. The heavy
 * lifting lives in `update.sh` at the repo root, which no-ops when already up to
 * date and refuses a dirty or diverged checkout — so this never clobbers local
 * work. Only the interactive TUI calls this; the MCP server never self-updates.
 */

/**
 * On unless `TODOMAKER_AUTO_UPDATE` is explicitly turned off, or we're running
 * from source via `npm run dev` (where silently fast-forwarding a dev's checkout
 * mid-session would be surprising — the built/installed command still updates).
 */
export function autoUpdateEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const v = env.TODOMAKER_AUTO_UPDATE?.trim().toLowerCase();
  if (v === "0" || v === "false" || v === "off") return false;
  if (env.npm_lifecycle_event === "dev") return false;
  return true;
}

/** Resolve `update.sh` at the repo root, whether running from `src/` or `dist/`. */
function updateScriptPath(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "update.sh");
}

/**
 * Fire-and-forget: spawn `update.sh` detached with output discarded, then unref
 * so it can outlive the current process. Any failure (no git/bash, dirty tree)
 * is swallowed — an update attempt must never break launch.
 * ponytail: no lockfile; worst case two launches race a harmless ff + rebuild.
 */
export function startBackgroundUpdate(env: NodeJS.ProcessEnv = process.env): void {
  if (!autoUpdateEnabled(env)) return;
  try {
    const child = spawn("bash", [updateScriptPath()], { detached: true, stdio: "ignore" });
    child.on("error", () => {}); // e.g. bash/git missing → skip silently
    child.unref();
  } catch {
    // never let an update attempt break launch
  }
}
