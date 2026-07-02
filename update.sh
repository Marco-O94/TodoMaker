#!/usr/bin/env bash
# Check the git remote for a newer TodoMaker and install it (fast-forward only).
# Run from inside the cloned repo:  ./update.sh
set -euo pipefail
cd "$(dirname "$0")"

# Serialize updates: an atomic mkdir lock so two launches never run git/npm
# concurrently on this checkout. A stale lock only skips one run; the next clears it.
LOCK_DIR=".update.lock"
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  echo "Another update is in progress; skipping."
  exit 0
fi
trap 'rmdir "$LOCK_DIR" 2>/dev/null || true' EXIT

command -v git >/dev/null || { echo "git not found."; exit 1; }
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || {
  echo "Not a git checkout; cannot self-update."; exit 1;
}

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
echo "==> Fetching origin/$BRANCH"
git fetch --quiet origin "$BRANCH"

LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse "origin/$BRANCH")"

if [ "$LOCAL" = "$REMOTE" ]; then
  echo "Already up to date ($(git rev-parse --short HEAD))."
  exit 0
fi

echo "Update available: $(git rev-parse --short HEAD) -> $(git rev-parse --short "$REMOTE")"

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Working tree has uncommitted changes; not updating. Commit or stash first."
  exit 1
fi

if ! git merge --ff-only "origin/$BRANCH"; then
  echo "Local branch has diverged from origin/$BRANCH (local commits). Resolve manually."
  exit 1
fi

echo "==> Installing dependencies"
npm install --no-fund --no-audit --loglevel=error

# Atomic-ish build: `tsup --clean` wipes dist/ before writing, so a failed or
# interrupted build would leave a broken dist/. Back it up and restore on failure
# so a launch never sees a half-written dist/.
echo "==> Building"
rm -rf dist.bak
if [ -d dist ]; then cp -R dist dist.bak; fi
if npm run build; then
  rm -rf dist.bak
else
  echo "Build failed; restoring previous dist."
  rm -rf dist
  if [ -d dist.bak ]; then mv dist.bak dist; fi
  exit 1
fi
echo "Updated to $(git rev-parse --short HEAD). Restart TodoMaker / reload the plugin."
