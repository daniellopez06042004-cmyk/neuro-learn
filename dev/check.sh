#!/bin/sh
# Check all lesson content with the app's own rules. Uses macOS's built-in
# JavaScript engine, so nothing needs installing.
#   sh dev/check.sh
set -e
cd "$(dirname "$0")/.."
JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc
if [ ! -x "$JSC" ]; then
  echo "Can't find macOS's JavaScript engine; skipping the content check."
  exit 0
fi
# The engine always exits 0 and complains about lessons that aren't written
# yet, so filter that out and decide success from the last line.
out=$("$JSC" -m dev/check.mjs -- content/lessons/*.json 2>&1 | grep -v '^Could not open file:' || true)
echo "$out"
case "$out" in
  *"No problems found.") exit 0 ;;
  *) exit 1 ;;
esac
