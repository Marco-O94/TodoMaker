import { readFileSync, statSync } from "node:fs";
import { basename } from "node:path";

/**
 * Dropping a file onto a terminal pastes its path (often quoted, with escaped
 * spaces, and a trailing space). If `raw` is such a path to an existing markdown
 * file, return its name + content; otherwise null. Used to let the description
 * editor import a `.md` file by drag-and-drop.
 */
export function readDroppedMarkdown(raw: string): { name: string; content: string } | null {
  let p = raw.trim();
  if (p.length < 4) return null;
  if ((p.startsWith('"') && p.endsWith('"')) || (p.startsWith("'") && p.endsWith("'"))) {
    p = p.slice(1, -1);
  }
  p = p.replace(/\\ /g, " "); // shells escape spaces in drag-dropped paths
  if (!/\.(md|markdown)$/i.test(p)) return null;
  try {
    if (!statSync(p).isFile()) return null;
    return { name: basename(p), content: readFileSync(p, "utf8") };
  } catch {
    return null; // not a real path / unreadable → treat as ordinary text
  }
}
