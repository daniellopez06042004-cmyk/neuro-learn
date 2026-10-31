#!/bin/sh
# Publish the app to GitHub Pages: bump the offline-cache version if any app
# code changed, commit everything, and push. Phones pick it up on next open.
#   sh dev/publish.sh "What changed"
set -e
cd "$(dirname "$0")/.."
msg="${1:?Usage: sh dev/publish.sh \"What changed\"}"

if [ -z "$(git status --porcelain --untracked-files=all)" ]; then
  echo "Nothing to publish."
  exit 0
fi

# Never publish broken lessons.
if ! sh dev/check.sh; then
  echo "Not published: fix the problems above first."
  exit 1
fi

# Lessons are always fetched fresh, and docs/dev tools never reach the phone,
# so only app code changes need a new version.
if git status --porcelain --untracked-files=all | awk '{print $NF}' | grep -qvE '^(content/|dev/|.*\.md$|\.gitignore$)'; then
  n=$(sed -n "s/^const VERSION = 'v\([0-9]*\)';/\1/p" sw.js)
  sed -i '' "s/^const VERSION = 'v$n';/const VERSION = 'v$((n + 1))';/" sw.js
  echo "Offline version v$n -> v$((n + 1))"
fi

git add -A
git commit -q -m "$msg"
git push -q origin main
echo "Published: $(git log -1 --format='%h %s')"

# Tell the content Project where things stand (../APP-STATUS.md).
/usr/bin/python3 -I dev/status.py >/dev/null 2>&1 || echo "Couldn't update APP-STATUS.md"
