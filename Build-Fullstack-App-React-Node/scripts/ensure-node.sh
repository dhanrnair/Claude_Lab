#!/usr/bin/env bash
# Checks for Node >= 22 (on PATH or in ~/.local/node). Pass --install to download
# the official LTS build into ~/.local/node (no admin rights needed) if it's missing.
# Always ask the user before running with --install.
set -euo pipefail

need=22
check() { # $1 = node binary
  local v; v=$("$1" -v 2>/dev/null | sed 's/^v//; s/\..*//') || return 1
  [ -n "$v" ] && [ "$v" -ge "$need" ]
}

if command -v node >/dev/null && check "$(command -v node)"; then
  echo "OK: $(node -v) on PATH"; exit 0
fi
if [ -x "$HOME/.local/node/bin/node" ] && check "$HOME/.local/node/bin/node"; then
  echo "OK: $("$HOME/.local/node/bin/node" -v) at ~/.local/node/bin (not on PATH)"
  echo "Use: export PATH=\"\$HOME/.local/node/bin:\$PATH\""; exit 0
fi
if [ "${1:-}" != "--install" ]; then
  echo "MISSING: Node >= $need not found. Re-run with --install (after asking the user)."; exit 2
fi

case "$(uname -s)" in Darwin) os=darwin;; Linux) os=linux;; *) echo "Unsupported OS: $(uname -s)"; exit 1;; esac
case "$(uname -m)" in arm64|aarch64) arch=arm64;; x86_64) arch=x64;; *) echo "Unsupported CPU: $(uname -m)"; exit 1;; esac

ver=$(curl -fsSL https://nodejs.org/dist/index.json | python3 -c "import json,sys; print(next(r['version'] for r in json.load(sys.stdin) if r['lts']))")
file="node-$ver-$os-$arch.tar.gz"
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
cd "$tmp"
curl -fsSLO "https://nodejs.org/dist/$ver/$file"
curl -fsSLO "https://nodejs.org/dist/$ver/SHASUMS256.txt"
grep " $file\$" SHASUMS256.txt | shasum -a 256 -c -     # abort (set -e) on checksum mismatch
mkdir -p "$HOME/.local"
tar -xzf "$file" -C "$HOME/.local"
rm -rf "$HOME/.local/node"
mv "$HOME/.local/node-$ver-$os-$arch" "$HOME/.local/node"
echo "Installed $("$HOME/.local/node/bin/node" -v) at ~/.local/node"
echo "Use: export PATH=\"\$HOME/.local/node/bin:\$PATH\""
