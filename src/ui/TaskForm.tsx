import { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import type { Task } from "../store/schema.js";
import { MultiLineInput } from "./MultiLineInput.js";

export interface TaskFormValue {
  title: string;
  description: string;
  planMode: boolean;
}

/** The `[x]`/`[ ]` plan-mode checkbox — shown on the plan step and echoed later. */
function PlanCheckbox({ on }: { on: boolean }) {
  return (
    <Text bold color={on ? "magenta" : "gray"}>
      {on ? "[x]" : "[ ]"}
    </Text>
  );
}

/** Filled heading badge + step indicator, shared by every step. */
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
 * Three-step add/edit form: single-line title (enter advances), a plan-mode
 * toggle (space/y/n, enter advances), then a multi-line description (Ctrl-S
 * saves). Pre-filled when editing. Esc cancels at every step.
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
  const [step, setStep] = useState<"title" | "plan" | "description">("title");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [planMode, setPlanMode] = useState(initial?.planMode ?? false);
  const heading = initial ? "EDIT TASK" : "NEW TASK";

  useInput((input, key) => {
    if (step === "description") return; // MultiLineInput owns the keyboard here (incl. esc)
    if (key.escape) return onCancel(); // esc cancels on the title & plan steps
    if (step !== "plan") return;
    if (input === " " || input === "y" || input === "n")
      return setPlanMode(input === "n" ? false : input === "y" ? true : !planMode);
    if (key.return) return setStep("description");
  });

  if (step === "title") {
    return (
      <Box flexDirection="column">
        <FormHeader heading={heading} step="step 1 of 3 · title" />
        <Box borderStyle="round" borderColor="cyan" paddingX={1} marginTop={1}>
          <Text color="cyan" bold>
            Title{" "}
          </Text>
          <TextInput
            value={title}
            onChange={setTitle}
            onSubmit={() => title.trim() && setStep("plan")}
          />
        </Box>
        <Text dimColor>enter: next · esc: cancel</Text>
      </Box>
    );
  }

  if (step === "plan") {
    return (
      <Box flexDirection="column">
        <FormHeader heading={heading} step="step 2 of 3 · plan mode" />
        <Box marginTop={1}>
          <Text dimColor>title  </Text>
          <Text bold color="whiteBright">
            {title}
          </Text>
        </Box>
        <Box borderStyle="round" borderColor="magenta" paddingX={1} marginTop={1}>
          <Text color="magenta" bold>
            Plan mode{" "}
          </Text>
          <PlanCheckbox on={planMode} />
        </Box>
        <Text dimColor>space/y/n: toggle · enter: next · esc: cancel</Text>
        <Text dimColor>when on, an agent must enter plan mode before working this task</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <FormHeader heading={heading} step="step 3 of 3 · description" />
      <Box marginTop={1}>
        <Text dimColor>title  </Text>
        <Text bold color="whiteBright">
          {title}
        </Text>
        <Text dimColor>   plan mode  </Text>
        <PlanCheckbox on={planMode} />
      </Box>
      <MultiLineInput
        label="Description (markdown ok)"
        value={description}
        onChange={setDescription}
        onSubmit={() => onSubmit({ title: title.trim(), description, planMode })}
        onCancel={onCancel}
      />
    </Box>
  );
}
