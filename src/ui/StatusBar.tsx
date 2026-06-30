import { Box, Text } from "ink";
import type { TaskStatus } from "../store/schema.js";
import { STATUS_STYLE } from "./theme.js";

/** Key hints, grouped left→right roughly by frequency of use. */
const KEYS: { key: string; label: string }[] = [
  { key: "↑/↓", label: "move" },
  { key: "space", label: "cycle" },
  { key: "1-4", label: "set" },
  { key: "x", label: "cancel" },
  { key: "enter", label: "edit" },
  { key: "a", label: "add" },
  { key: "d", label: "delete" },
  { key: "f", label: "filter" },
  { key: "g/G", label: "top/bottom" },
  { key: "p", label: "project" },
  { key: "r", label: "reload" },
  { key: "q", label: "quit" },
];

/** Bordered info panel: optional active-filter line, then wrapping key chips. */
export function StatusBar({ filter }: { filter: TaskStatus | null }) {
  return (
    <Box
      marginTop={1}
      flexDirection="column"
      borderStyle="round"
      borderColor="blue"
      paddingX={1}
    >
      {filter ? (
        <Box marginBottom={1}>
          <Text color="blue" bold>
            filter{" "}
          </Text>
          <Text color={STATUS_STYLE[filter].color} bold>
            {STATUS_STYLE[filter].label}
          </Text>
          <Text dimColor>  · f to change · cleared shows all</Text>
        </Box>
      ) : null}
      <Box flexWrap="wrap">
        {KEYS.map((k) => (
          <Box key={k.key} marginRight={2}>
            <Text color="cyanBright" bold>
              {k.key}
            </Text>
            <Text dimColor> {k.label}</Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
