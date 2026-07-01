---
description: Check the TodoMaker git repo for updates and install the new version
allowed-tools: Bash(bash:*), Bash(git:*), Bash(npm:*)
---

Update log:

!`bash "${CLAUDE_PLUGIN_ROOT}/update.sh"`

Summarize the update result above for the user:

- If it says "Already up to date", report that (with the short commit).
- If it updated, report the old → new version and remind the user to restart the
  TodoMaker TUI and reload the plugin so the new MCP server and commands take effect.
- If it reports uncommitted changes or a diverged branch, do **not** force
  anything — tell the user to commit/stash or resolve manually, then re-run.
