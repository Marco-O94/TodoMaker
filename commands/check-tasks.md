---
description: Check TodoMaker pending tasks for the current repo
allowed-tools: Bash(pwd), mcp__todomaker__get_current_project, mcp__todomaker__list_tasks, mcp__todomaker__register_project, mcp__todomaker__update_task
---

Current working directory: !`pwd`

You are checking TodoMaker for **pending** tasks belonging to the repository at
the working directory shown above. Use that absolute path as `cwd`.

1. Call `mcp__todomaker__get_current_project` with `cwd` = the working directory above.
2. If the result is `{ "matched": false }`: tell the user no TodoMaker project is
   registered for this repo. Offer to register it — if they agree, call
   `mcp__todomaker__register_project` with `name` (suggest the directory's basename)
   and `path` = the working directory. Then continue to step 3.
3. Call `mcp__todomaker__list_tasks` with `cwd` = the working directory and
   `status` = `"pending"`.
4. Report concisely:
   - the project name and path,
   - the number of pending tasks,
   - each pending task's title as a checklist (`- [ ] <title>`). Append `🧠 plan`
     to any task whose `planMode` is true (the `list_tasks` summary includes it).
   If there are none, say the project is all clear (no pending tasks).

Plan mode:
- When the user starts a task whose `planMode` is true, **enter plan mode first**
  — research, present a plan, wait for approval before editing.
- If a task looks complex enough to deserve a plan but is not flagged, you may set
  it with `mcp__todomaker__update_task { taskId, planMode: true }` (or `false` to
  clear). Do not flag trivial tasks.

Do not invent tasks or projects. Only report what the tools return.
