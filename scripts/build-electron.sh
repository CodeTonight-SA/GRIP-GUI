#!/usr/bin/env bash
# build-electron.sh — single source of truth for GRIP Commander packaging.
#
# Runs the full electron-builder pipeline: stash Next.js API/icon routes, build
# renderer + main process + MCP submodules, rebuild native modules for the
# target platform/arch, then package via electron-builder.
#
# Usage:
#   scripts/build-electron.sh <platform> <arch> [mode]
#
#     platform := mac | win | linux          (required)
#     arch     := arm64 | x64                (required)
#     mode     := dmg | nsis | deb | appimage | dir
#                 (default: platform-native primary target)
#
# Examples:
#   scripts/build-electron.sh mac arm64 dmg
#   scripts/build-electron.sh win x64 nsis
#   scripts/build-electron.sh linux x64 appimage
#   scripts/build-electron.sh mac arm64 dir        # unpacked, faster for iteration
#
# Environment:
#   SKIP_NOTARIZE=1   Skip macOS notarisation (default in CI)
#   SKIP_VERIFY=1     Skip post-build native-arch verifier (not recommended)
#   GRIP_DEBUG=1      Enable set -x
#
# Exit codes: 0 success, non-zero = failing step (set -euo pipefail aborts).

set -euo pipefail

if [[ "${GRIP_DEBUG:-0}" == "1" ]]; then
  set -x
fi

PLATFORM="${1:-}"
ARCH="${2:-}"
MODE="${3:-}"

if [[ -z "$PLATFORM" || -z "$ARCH" ]]; then
  echo "usage: $0 <mac|win|linux> <arm64|x64> [mode]" >&2
  exit 2
fi

case "$PLATFORM" in
  mac|win|linux) ;;
  *) echo "unknown platform: $PLATFORM" >&2; exit 2 ;;
esac

case "$ARCH" in
  arm64|x64) ;;
  *) echo "unknown arch: $ARCH" >&2; exit 2 ;;
esac

# Default target per platform.
if [[ -z "$MODE" ]]; then
  case "$PLATFORM" in
    mac)   MODE="dmg" ;;
    win)   MODE="nsis" ;;
    linux) MODE="appimage" ;;
  esac
fi

# Resolve repo root so the script works regardless of cwd.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MCP_SUBMODULES=(mcp-orchestrator mcp-telegram mcp-kanban mcp-vault mcp-socialdata mcp-x mcp-world)

# -----------------------------------------------------------------------------
# API route / icon.tsx stash: Next.js API routes and the React icon route are
# incompatible with electron's static export. Move them aside for the build
# and restore on exit regardless of outcome.
# -----------------------------------------------------------------------------

stash_incompatible_routes() {
  [[ -d src/app/api ]] && mv src/app/api src/app/_api_backup
  [[ -f src/app/icon.tsx ]] && mv src/app/icon.tsx src/app/_icon_backup.tsx
  return 0
}

restore_incompatible_routes() {
  [[ -d src/app/_api_backup ]] && mv src/app/_api_backup src/app/api
  [[ -f src/app/_icon_backup.tsx ]] && mv src/app/_icon_backup.tsx src/app/icon.tsx
  return 0
}

trap restore_incompatible_routes EXIT

# -----------------------------------------------------------------------------
# Build pipeline steps. Each is its own function so the failing step surfaces
# clearly in CI logs instead of being hidden inside a multiline bash string.
# -----------------------------------------------------------------------------

step_next_build() {
  echo "==> [1/5] Next.js renderer build"
  ELECTRON_BUILD=1 npx next build
}

step_tsc_main() {
  echo "==> [2/5] TypeScript compile — electron main process"
  npx tsc -p electron/tsconfig.json
}

step_mcp_submodules() {
  echo "==> [3/5] Build MCP submodules (${#MCP_SUBMODULES[@]})"
  for sub in "${MCP_SUBMODULES[@]}"; do
    if [[ ! -d "$sub" ]]; then
      echo "  ! skipping $sub (directory missing)" >&2
      continue
    fi
    echo "  --> $sub"
    (cd "$sub" && npm install --no-audit --no-fund && npm run build)
  done
}

step_rebuild_natives() {
  echo "==> [4/5] @electron/rebuild native modules for $PLATFORM-$ARCH"
  # Map our platform token to electron's platform token.
  local ep_platform
  case "$PLATFORM" in
    mac)   ep_platform="darwin" ;;
    win)   ep_platform="win32" ;;
    linux) ep_platform="linux" ;;
  esac
  npx @electron/rebuild \
    --arch "$ARCH" \
    --platform "$ep_platform" \
    --force
}

step_electron_builder() {
  echo "==> [5/5] electron-builder $PLATFORM $MODE --$ARCH"
  local flag
  case "$PLATFORM" in
    mac)   flag="--mac" ;;
    win)   flag="--win" ;;
    linux) flag="--linux" ;;
  esac
  # --publish never: publishing is a separate concern, gated on verifier success.
  npx electron-builder "$flag" "$MODE" "--$ARCH" --publish never
}

step_verify_arch() {
  if [[ "${SKIP_VERIFY:-0}" == "1" ]]; then
    echo "==> Skipping native-arch verifier (SKIP_VERIFY=1)"
    return 0
  fi
  echo "==> Post-build: verify native modules match $PLATFORM-$ARCH"
  node scripts/verify-native-arch.mjs --platform "$PLATFORM" --arch "$ARCH"
}

# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------

echo "==================================================================="
echo "GRIP Commander build: platform=$PLATFORM arch=$ARCH mode=$MODE"
echo "==================================================================="

stash_incompatible_routes
step_next_build
step_tsc_main
step_mcp_submodules
step_rebuild_natives
step_electron_builder
step_verify_arch

echo "==================================================================="
echo "Build complete. Artefacts in release/"
ls -lh release/ 2>/dev/null || true
echo "==================================================================="
