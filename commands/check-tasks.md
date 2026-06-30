---
description: Check TodoMaker pending tasks for the current repo
allowed-tools: Bash(pwd), mcp__todomaker__get_current_project, mcp__todomaker__list_tasks, mcp__todomaker__register_project
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
   - each pending task's title as a checklist (`- [ ] <title>`).
   If there are none, say the project is all clear (no pending tasks).

Do not invent tasks or projects. Only report what the tools return.
