#!/usr/bin/env bash
# Usage: scaffold.sh <target-dir> "<App Name>"
# Copies the starter template into <target-dir> (must not exist or be empty)
# and fills in the app name. Does not install packages or touch the database.
set -euo pipefail

target=${1:?usage: scaffold.sh <target-dir> "<App Name>"}
name=${2:?usage: scaffold.sh <target-dir> "<App Name>"}
tpl="$(cd "$(dirname "$0")/.." && pwd)/assets/template"

if [ -e "$target" ] && [ -n "$(ls -A "$target" 2>/dev/null)" ]; then
  echo "Refusing: $target exists and is not empty:" >&2; ls -A "$target" >&2; exit 1
fi
mkdir -p "$target"
cp -R "$tpl/." "$target/"
mv "$target/README.md.tmpl" "$target/README.md"
mv "$target/CLAUDE.md.tmpl" "$target/CLAUDE.md"

slug=$(printf '%s' "$name" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]\{1,\}/-/g; s/^-//; s/-$//')
[ -n "$slug" ] || slug=app
export APP_NAME="$name" APP_SLUG="$slug"
find "$target" -type f -not -path '*/node_modules/*' -print0 |
  xargs -0 perl -pi -e 's/__APP_NAME__/$ENV{APP_NAME}/g; s/__APP_SLUG__/$ENV{APP_SLUG}/g'
echo "Scaffolded '$name' (package: $slug) in $target"
