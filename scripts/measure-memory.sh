#!/usr/bin/env bash
# measure-memory.sh — Commander runtime RSS snapshot (macOS only)
# Usage: bash scripts/measure-memory.sh --idle | --one-panel | --five-panels
# Output: docs/proposals/W9B-MEASUREMENT-<iso-date>.json + stdout summary
#
# macOS ps returns RSS in kilobytes. This script divides by 1024 for MB.
# Linux is out of scope for now (ps field ordering differs).

set -euo pipefail

# ── argument handling ────────────────────────────────────────────────────────

MODE=""
case "${1:-}" in
  --idle)       MODE="idle" ;;
  --one-panel)  MODE="one-panel" ;;
  --five-panels) MODE="five-panels" ;;
  *)
    echo "Usage: $0 --idle | --one-panel | --five-panels" >&2
    exit 1
    ;;
esac

# ── locate Commander processes ───────────────────────────────────────────────

# Match Electron main process and all helpers/renderers spawned by Commander.
# Exclude this script's own grep invocation via [E] anchor trick via pgrep -f.
PIDS=$(pgrep -f "Electron|GRIP Commander|grip-commander|Commander Helper" 2>/dev/null || true)

if [[ -z "$PIDS" ]]; then
  echo "ERROR: No Commander process found. Launch Commander first, then re-run." >&2
  exit 1
fi

# ── collect per-process stats ────────────────────────────────────────────────

# ps -o rss,vsz,comm,pid returns KB on macOS.
TOTAL_RSS_KB=0
PROCESSES_JSON=""
FIRST=1

while IFS= read -r pid; do
  [[ -z "$pid" ]] && continue

  # Read rss(KB), vsz(KB), full command line for this pid.
  STAT=$(ps -o rss=,vsz=,command= -p "$pid" 2>/dev/null || true)
  [[ -z "$STAT" ]] && continue

  RSS_KB=$(echo "$STAT" | awk '{print $1}')
  VSZ_KB=$(echo "$STAT" | awk '{print $2}')
  CMD=$(echo "$STAT" | awk '{for(i=3;i<=NF;i++) printf $i (i<NF?" ":""); print ""}')

  RSS_MB=$(echo "scale=1; $RSS_KB / 1024" | bc)
  VSZ_MB=$(echo "scale=1; $VSZ_KB / 1024" | bc)
  TOTAL_RSS_KB=$((TOTAL_RSS_KB + RSS_KB))

  # Infer role from command string.
  ROLE="helper"
  if echo "$CMD" | grep -qi "gpu"; then          ROLE="gpu"
  elif echo "$CMD" | grep -qi "renderer";        then ROLE="renderer"
  elif echo "$CMD" | grep -qi "plugin";          then ROLE="plugin"
  elif echo "$CMD" | grep -qi "Helper";          then ROLE="helper"
  elif echo "$CMD" | grep -qi "Electron$\|Electron "; then ROLE="main"
  fi

  # Escape double-quotes in CMD for valid JSON.
  CMD_ESC="${CMD//\"/\\\"}"

  [[ "$FIRST" -eq 0 ]] && PROCESSES_JSON+=","
  PROCESSES_JSON+=$(printf '\n    {"pid":%s,"rss_mb":%s,"vsz_mb":%s,"role":"%s","cmd":"%s"}' \
    "$pid" "$RSS_MB" "$VSZ_MB" "$ROLE" "$CMD_ESC")
  FIRST=0
done <<< "$PIDS"

TOTAL_RSS_MB=$(echo "scale=1; $TOTAL_RSS_KB / 1024" | bc)

# ── resolve commit sha ───────────────────────────────────────────────────────

SHA=$(git -C "$(dirname "$0")/.." rev-parse --short HEAD 2>/dev/null || echo "unknown")

# ── write JSON output ────────────────────────────────────────────────────────

ISO_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
DATE_TAG=$(date -u +"%Y-%m-%d")
OUT_FILE="docs/proposals/W9B-MEASUREMENT-${DATE_TAG}-${MODE}.json"

mkdir -p "$(dirname "$OUT_FILE")"

cat > "$OUT_FILE" <<JSON
{
  "timestamp": "${ISO_DATE}",
  "mode": "${MODE}",
  "host": "$(hostname)",
  "host_total_ram_gb": 16,
  "commit": "${SHA}",
  "total_commander_rss_mb": ${TOTAL_RSS_MB},
  "processes": [${PROCESSES_JSON}
  ],
  "notes": "manual-run measurement (${MODE}) against commit ${SHA}. RSS from macOS ps(1) in KB /1024."
}
JSON

# ── stdout summary ───────────────────────────────────────────────────────────

echo ""
echo "Commander memory snapshot — mode: ${MODE}"
echo "  Commit    : ${SHA}"
echo "  Timestamp : ${ISO_DATE}"
echo "  Total RSS : ${TOTAL_RSS_MB} MB (across $(echo "$PIDS" | wc -l | tr -d ' ') processes)"
echo "  Output    : ${OUT_FILE}"
echo ""
