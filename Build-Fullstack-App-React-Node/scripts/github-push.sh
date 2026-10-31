#!/usr/bin/env bash
# Gets the project onto GitHub over SSH, handling the "key belongs to a different account" case.
# Usage: github-push.sh <owner> <repo> <step>
#   step = check  : report which GitHub account the default SSH key authenticates as (no changes)
#          keygen : create ~/.ssh/id_ed25519_<owner> (empty passphrase, no TTY available), add a
#                   `github-<owner>` host alias to ~/.ssh/config, print the PUBLIC key
#                   -> the user must add it at GitHub (signed in as <owner>) > Settings > SSH keys
#          push   : verify the alias authenticates as <owner>, set `origin`, push main with upstream
# Run from the project root. Ask the user before `push` (outward-facing). Never uses passwords/tokens.
set -euo pipefail
owner=${1:?owner}; repo=${2:?repo}; step=${3:?step: check|keygen|push}
key="$HOME/.ssh/id_ed25519_$owner"; alias_host="github-$owner"
who() { ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new -T "$1" 2>&1 | sed -n 's/^Hi \([^!]*\)!.*/\1/p'; }

case "$step" in
check)
  me=$(who git@github.com || true)
  echo "default key authenticates as: ${me:-<nobody / no key>}"
  [ "$me" = "$owner" ] && echo "MATCH: use git@github.com:$owner/$repo.git directly" \
    || echo "MISMATCH: run the keygen step (a key can only be on one GitHub account)";;
keygen)
  [ -f "$key" ] || ssh-keygen -t ed25519 -f "$key" -C "$owner" -N "" >/dev/null
  touch ~/.ssh/config
  if ! grep -q "^Host $alias_host\$" ~/.ssh/config; then
    [ -s ~/.ssh/config ] && [ -n "$(tail -c1 ~/.ssh/config)" ] && echo >> ~/.ssh/config
    printf 'Host %s\n  HostName github.com\n  User git\n  IdentityFile %s\n  IdentitiesOnly yes\n' "$alias_host" "$key" >> ~/.ssh/config
  fi
  echo "Add this public key to GitHub as '$owner' (Settings > SSH and GPG keys > New SSH key):"
  cat "$key.pub";;
push)
  me=$(who "git@$alias_host" || true)
  [ "$me" = "$owner" ] || { echo "ERROR: $alias_host authenticates as '${me:-nobody}', not '$owner'. Key not added yet?"; exit 1; }
  git remote get-url origin >/dev/null 2>&1 \
    && git remote set-url origin "git@$alias_host:$owner/$repo.git" \
    || git remote add origin "git@$alias_host:$owner/$repo.git"
  GIT_SSH_COMMAND="ssh -o BatchMode=yes" git push -u origin main;;
*) echo "unknown step: $step"; exit 1;;
esac
