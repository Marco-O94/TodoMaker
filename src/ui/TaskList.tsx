import { Box, Text } from "ink";
import type { Task, TaskStatus } from "../store/schema.js";
import { STATUS_STYLE } from "./theme.js";

/**
 * Scrollable, status-grouped task list. `tasks` is already filtered + sorted by
 * the caller (App). A viewport of `rows` items is windowed around `selected` so
 * long lists never overflow the terminal; off-screen counts show as ↑/↓ hints.
 * A group header (status label + count) prints whenever the status changes or at
 * the top of the viewport, so the current group is always labelled.
 */
export function TaskList({
  tasks,
  selected,
  rows,
}: {
  tasks: Task[];
  selected: number;
  rows: number;
}) {
  if (tasks.length === 0) {
    return (
      <Box paddingY={1}>
        <Text dimColor>No tasks here. Press 'a' to add one.</Text>
      </Box>
    );
  }

  const counts = new Map<TaskStatus, number>();
  for (const t of tasks) counts.set(t.status, (counts.get(t.status) ?? 0) + 1);

  const windowSize = Math.max(1, rows);
  const start = Math.max(
    0,
    Math.min(selected - Math.floor(windowSize / 2), tasks.length - windowSize),
  );
  const end = Math.min(tasks.length, start + windowSize);
  const visible = tasks.slice(start, end);

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="blue" paddingX={1}>
      {start > 0 ? <Text dimColor>  ↑ {start} more</Text> : null}
      {visible.map((task, i) => {
        const index = start + i;
        const prev = index > 0 ? tasks[index - 1] : undefined;
        const isSelected = index === selected;
        const style = STATUS_STYLE[task.status];
        const muted = task.status === "completed" || task.status === "cancelled";
        const showHeader = i === 0 || !prev || prev.status !== task.status;
        return (
          <Box key={task.id} flexDirection="column">
            {showHeader ? (
              <Text bold color={style.color}>
                {style.label.toUpperCase()} ({counts.get(task.status)})
              </Text>
            ) : null}
            <Text>
              <Text color="cyanBright">{isSelected ? "❯ " : "  "}</Text>
              <Text color={style.color}>{style.glyph}</Text>{" "}
              <Text
                backgroundColor={isSelected ? style.color : undefined}
                color={isSelected ? "black" : style.color}
                bold={isSelected}
                dimColor={muted && !isSelected}
                strikethrough={task.status === "cancelled"}
                wrap="truncate-end"
              >
                {" "}
                {task.title}{" "}
              </Text>
            </Text>
          </Box>
        );
      })}
      {end < tasks.length ? <Text dimColor>  ↓ {tasks.length - end} more</Text> : null}
    </Box>
  );
}
