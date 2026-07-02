import type { TaskStatus } from "../store/schema.js";

/** Presentation for each status: list glyph, color, human label. Single source. */
export const STATUS_STYLE: Record<TaskStatus, { glyph: string; color: string; label: string }> = {
  pending: { glyph: "[ ]", color: "yellow", label: "pending" },
  in_progress: { glyph: "[~]", color: "cyan", label: "in progress" },
  completed: { glyph: "[x]", color: "green", label: "completed" },
  cancelled: { glyph: "[-]", color: "red", label: "cancelled" },
  blocked: { glyph: "[!]", color: "magenta", label: "blocked" },
};
