#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SOURCE_SCRIPT="$REPO_ROOT/scripts/sss-token"
BIN_DIR="${XDG_BIN_HOME:-$HOME/.local/bin}"
TARGET_LINK="$BIN_DIR/sss-token"
DRY_RUN=false

usage() {
  cat <<'EOF'
Usage: ./scripts/install-sss-token.sh [--dry-run] [--bin-dir <path>]

Installs a symlink so `sss-token` is available on your shell PATH.

Options:
  --dry-run         Print planned actions without changing files
  --bin-dir <path>  Override target directory (default: $XDG_BIN_HOME or ~/.local/bin)
  -h, --help        Show this help message
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --bin-dir)
      if [ "${2:-}" = "" ]; then
        echo "error: --bin-dir requires a value" >&2
        exit 2
      fi
      BIN_DIR="$2"
      TARGET_LINK="$BIN_DIR/sss-token"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "error: unknown option '$1'" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [ ! -x "$SOURCE_SCRIPT" ]; then
  echo "error: expected executable script at $SOURCE_SCRIPT" >&2
  exit 1
fi

if [ -e "$TARGET_LINK" ] && [ ! -L "$TARGET_LINK" ]; then
  echo "error: $TARGET_LINK exists and is not a symlink. Remove it manually and re-run." >&2
  exit 1
fi

echo "Source: $SOURCE_SCRIPT"
echo "Target: $TARGET_LINK"

if [ -L "$TARGET_LINK" ] && [ "$(readlink "$TARGET_LINK")" = "$SOURCE_SCRIPT" ]; then
  echo "Already installed."
  exit 0
fi

if [ "$DRY_RUN" = true ]; then
  echo "[dry-run] mkdir -p \"$BIN_DIR\""
  echo "[dry-run] ln -sfn \"$SOURCE_SCRIPT\" \"$TARGET_LINK\""
else
  mkdir -p "$BIN_DIR"
  ln -sfn "$SOURCE_SCRIPT" "$TARGET_LINK"
  echo "Installed sss-token -> $TARGET_LINK"
fi

if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
  echo "Note: $BIN_DIR is not currently in PATH."
  echo "Add this to your shell profile:"
  echo "  export PATH=\"$BIN_DIR:\$PATH\""
fi
