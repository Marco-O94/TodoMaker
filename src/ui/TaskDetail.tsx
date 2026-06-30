import { Box, Text } from "ink";
import type { Task } from "../store/schema.js";
import { STATUS_STYLE } from "./theme.js";

/** Coarse "x ago" for the updated timestamp — enough for a TUI, no date lib. */
function ago(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

/**
 * Detail pane for the selected task: status badge, title, and a description
 * preview clamped to `maxLines` (the rest is summarised as "+N more"). Borderless
 * empty state when nothing is selected.
 */
export function TaskDetail({ task, maxLines }: { task: Task | null; maxLines: number }) {
  if (!task) {
    return (
      <Box borderStyle="round" borderColor="gray" paddingX={1}>
        <Text dimColor>No task selected.</Text>
      </Box>
    );
  }

  const style = STATUS_STYLE[task.status];
  const body = task.description.trim();
  const lines = body ? body.split("\n") : [];
  const shown = lines.slice(0, Math.max(1, maxLines));
  const hidden = lines.length - shown.length;

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={style.color} paddingX={1}>
      <Text>
        <Text backgroundColor={style.color} color="black" bold>
          {" "}
          {style.glyph} {style.label}{" "}
        </Text>
        <Text dimColor>  updated {ago(task.updatedAt)}</Text>
      </Text>
      <Box marginTop={1}>
        <Text bold color="whiteBright" wrap="truncate-end">
          {task.title}
        </Text>
      </Box>
      {body ? (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color="blue">
            description
          </Text>
          {shown.map((line, i) => (
            <Text key={i} wrap="truncate-end">
              {line || " "}
            </Text>
          ))}
          {hidden > 0 ? <Text dimColor>… +{hidden} more line(s)</Text> : null}
        </Box>
      ) : (
        <Box marginTop={1}>
          <Text dimColor>(no description)</Text>
        </Box>
      )}
    </Box>
  );
}
