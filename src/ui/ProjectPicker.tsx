import { useState } from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import TextInput from "ink-text-input";
import type { Project } from "../store/schema.js";

const NEW_PROJECT = "__new__";

/**
 * Switch project, or create one. Selecting "New project…" walks a name → path
 * sub-flow (path defaults to the current working directory).
 */
export function ProjectPicker({
  projects,
  defaultPath,
  onSelect,
  onCreate,
  onCancel,
}: {
  projects: Project[];
  defaultPath: string;
  onSelect: (projectId: string) => void;
  onCreate: (name: string, path: string) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<"select" | "name" | "path">("select");
  const [name, setName] = useState("");
  const [path, setPath] = useState(defaultPath);

  useInput((_input, key) => {
    if (step === "select" && key.escape) onCancel();
  });

  if (step === "select") {
    const items = [
      ...projects.map((p) => ({ label: `${p.name}  (${p.path})`, value: p.id })),
      { label: "＋ New project…", value: NEW_PROJECT },
    ];
    return (
      <Box flexDirection="column">
        <Text bold>Switch project</Text>
        <SelectInput
          items={items}
          onSelect={(item) =>
            item.value === NEW_PROJECT ? setStep("name") : onSelect(String(item.value))
          }
        />
        <Text dimColor>↑/↓ select · enter confirm · esc cancel</Text>
      </Box>
    );
  }

  if (step === "name") {
    return (
      <Box flexDirection="column">
        <Text bold>New project — name</Text>
        <TextInput value={name} onChange={setName} onSubmit={() => name.trim() && setStep("path")} />
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold>New project — path</Text>
      <TextInput
        value={path}
        onChange={setPath}
        onSubmit={() => path.trim() && onCreate(name.trim(), path.trim())}
      />
      <Text dimColor>default: {defaultPath}</Text>
    </Box>
  );
}
