import { useState } from "react";
import { Box, Text, useInput } from "ink";
import { readDroppedMarkdown } from "./dropImport.js";

/**
 * Minimal in-process multi-line editor — no $EDITOR handoff, so terminal raw
 * mode is never surrendered. Enter inserts a newline; Ctrl-S saves; Esc cancels
 * (consistent with the rest of the form, where Esc always aborts).
 *
 * Drag-and-drop: dropping a `.md` file onto the terminal pastes its path; when
 * that path resolves to a real markdown file its contents are imported into the
 * description (appended after the current text).
 */
export function MultiLineInput({
  label,
  value,
  onChange,
  onSubmit,
  onCancel,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const [imported, setImported] = useState<string | null>(null);

  useInput((input, key) => {
    if (key.escape) return onCancel();
    if (key.ctrl && input === "s") return onSubmit();
    if (key.return) return onChange(value + "\n");
    if (key.backspace || key.delete) return onChange(value.slice(0, -1));
    if (key.ctrl || key.meta) return; // ignore other control combos
    if (input) {
      const dropped = readDroppedMarkdown(input);
      if (dropped) {
        onChange(value.trim() ? `${value.replace(/\s+$/, "")}\n\n${dropped.content}` : dropped.content);
        return setImported(dropped.name);
      }
      onChange(value + input);
    }
  });

  const lines = value.length > 0 ? value.split("\n") : [""];
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold color="cyan">
        {label}
      </Text>
      <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
        {lines.map((line, i) => (
          <Text key={i}>
            {line}
            {i === lines.length - 1 ? <Text backgroundColor="cyan"> </Text> : null}
          </Text>
        ))}
      </Box>
      {imported ? (
        <Text color="green">✓ imported {imported}</Text>
      ) : (
        <Text dimColor>drop a .md file here to import it</Text>
      )}
      <Text dimColor>enter: newline · ctrl-s: save · esc: cancel</Text>
    </Box>
  );
}
