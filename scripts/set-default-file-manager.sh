#!/usr/bin/env bash
set -euo pipefail

desktop_id="${1:-lingfm.desktop}"

if ! command -v xdg-mime >/dev/null 2>&1; then
  echo "xdg-mime is required to set LingFM as the default file manager." >&2
  exit 1
fi

xdg-mime default "$desktop_id" inode/directory
xdg-mime default "$desktop_id" x-scheme-handler/file

echo "inode/directory=$(xdg-mime query default inode/directory)"
echo "x-scheme-handler/file=$(xdg-mime query default x-scheme-handler/file)"
