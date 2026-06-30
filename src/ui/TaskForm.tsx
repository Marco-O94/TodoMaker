import { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import type { Task } from "../store/schema.js";
import { MultiLineInput } from "./MultiLineInput.js";

export interface TaskFormValue {
  title: string;
  description: string;
}

/** Filled heading badge + step indicator, shared by both steps. */
function FormHeader({ heading, step }: { heading: string; step: string }) {
  return (
    <Text>
      <Text backgroundColor="cyan" color="black" bold>
        {" "}
        {heading}{" "}
      </Text>
      <Text dimColor>  {step}</Text>
    </Text>
  );
}

/**
 * Two-step add/edit form: single-line title (enter advances), then a multi-line
 * description (Ctrl-S saves). Pre-filled when editing. Esc cancels at every step.
 */
export function TaskForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: Task | null;
  onSubmit: (value: TaskFormValue) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<"title" | "description">("title");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const heading = initial ? "EDIT TASK" : "NEW TASK";

  useInput((_input, key) => {
    if (step === "title" && key.escape) onCancel();
  });

  if (step === "title") {
    return (
      <Box flexDirection="column">
        <FormHeader heading={heading} step="step 1 of 2 · title" />
        <Box borderStyle="round" borderColor="cyan" paddingX={1} marginTop={1}>
          <Text color="cyan" bold>
            Title{" "}
          </Text>
          <TextInput
            value={title}
            onChange={setTitle}
            onSubmit={() => title.trim() && setStep("description")}
          />
        </Box>
        <Text dimColor>enter: next · esc: cancel</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <FormHeader heading={heading} step="step 2 of 2 · description" />
      <Box marginTop={1}>
        <Text dimColor>title  </Text>
        <Text bold color="whiteBright">
          {title}
        </Text>
      </Box>
      <MultiLineInput
        label="Description (markdown ok)"
        value={description}
        onChange={setDescription}
        onSubmit={() => onSubmit({ title: title.trim(), description })}
        onCancel={onCancel}
      />
    </Box>
  );
}
