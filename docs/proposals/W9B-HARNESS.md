# W9b — Memory Measurement Harness

**Status:** Ready — awaiting manual run by V>>
**Owner:** L>>
**Date:** 2026-04-15
**Scope:** macOS only (Linux/Windows out of scope for this iteration)

## Purpose

W9 Performance Baseline §4.3 contains a provisional estimate of "idle
per-window RSS ≤ 300 MB" sourced from Agent B's industry-typical range
for Electron + Next.js + xterm.js + React apps. That number is not
measured. W8 §12 weakened hypothesis H-B5 ("3-5 concurrent windows fit
within a reasonable 16 GB budget") precisely because runtime memory was
unverified. This harness replaces the estimate with real numbers captured
from a running Commander instance on V>>'s 16 GB MacBook.

## Prerequisites

- macOS (Darwin). Linux and Windows are out of scope for now — `ps` field
  ordering and RSS units differ across platforms.
- Commander is installed and launchable (`npm run electron:dev` or the
  packaged `.app`).
- Bash 4+ (`bash --version`).
- `bc` installed (ships with macOS by default).
- No other Electron-based apps running during measurement (Slack, VS Code,
  etc.) to avoid contaminating the process list.

## How to run

Run three measurements per session — one per lifecycle stage.

**Step 1 — Launch Commander**

```bash
cd ~/CodeTonight/GRIP-GUI
npm run electron:dev
```

Wait for the main window to finish loading (splash gone, sidebar visible).

**Step 2 — Idle measurement**

In a separate terminal:

```bash
cd ~/CodeTonight/GRIP-GUI
bash scripts/measure-memory.sh --idle
```

**Step 3 — One-panel measurement**

Open one agent panel inside Commander (click any agent to open its
terminal/chat view). Then:

```bash
bash scripts/measure-memory.sh --one-panel
```

**Step 4 — Five-panel measurement**

Open four more agent panels (total: five panels open simultaneously). Then:

```bash
bash scripts/measure-memory.sh --five-panels
```

Each run writes a timestamped JSON file and prints a summary to stdout.
For a reliable baseline, complete three full sessions and use the median
`total_commander_rss_mb` across runs.

## Output format

Each run produces `docs/proposals/W9B-MEASUREMENT-<date>-<mode>.json`:

```json
{
  "timestamp": "2026-04-15T14:00:00Z",
  "mode": "idle",
  "host": "macbook-pro",
  "host_total_ram_gb": 16,
  "commit": "2a0e5f6",
  "total_commander_rss_mb": 280.5,
  "processes": [
    { "pid": 12345, "rss_mb": 210.0, "vsz_mb": 1800.0, "role": "main", "cmd": "..." },
    { "pid": 12346, "rss_mb": 45.2,  "vsz_mb": 600.0,  "role": "gpu",  "cmd": "..." },
    { "pid": 12347, "rss_mb": 25.3,  "vsz_mb": 400.0,  "role": "helper","cmd": "..." }
  ],
  "notes": "manual-run measurement (idle) against commit 2a0e5f6. RSS from macOS ps(1) in KB /1024."
}
```

| Field | Unit | Notes |
|---|---|---|
| `total_commander_rss_mb` | MB | Sum of all Commander process RSS values |
| `rss_mb` (per process) | MB | Resident set size — physical RAM pages currently held |
| `vsz_mb` (per process) | MB | Virtual address space — typically much larger, less meaningful |
| `role` | string | Inferred from command line: `main`, `renderer`, `gpu`, `plugin`, `helper` |

## How to update the W9 baseline

Once you have three sets of JSON files (nine files total — three modes ×
three runs), do the following:

1. Compute the median `total_commander_rss_mb` for each mode across the
   three runs.
2. Edit `docs/proposals/W9-PERFORMANCE-BASELINE.md` §4.3: replace the
   "300 MB provisional estimate" with your measured idle median.
3. Add a table in §4.3.1 showing all three medians (idle / one-panel /
   five-panels) and the delta between idle and five-panels.
4. Cite the JSON filenames as the evidence artefacts.
5. If the measured idle number exceeds 350 MB, escalate H-B5 to WEAKENED
   (CRITICAL) and re-open the W8 §11.6 concurrency cap discussion.

## Known limitations

- **RSS is a rough proxy.** macOS `ps` reports resident set size, which
  counts all pages currently in physical RAM for that process. It does not
  account for memory shared between v8 isolates (e.g. read-only code pages
  that the OS shares between renderer processes). Actual unique physical cost
  per process may be lower than RSS suggests. For a sharper number, use
  `vmmap -summary <pid>` and look at "TOTAL PRIVATE" — but that is outside
  this harness's scope.
- **macOS only.** Linux uses the same `ps -o rss` field name but returns
  different values in some configurations; Windows has no `ps`. Porting is
  deferred.
- **GPU memory excluded.** The GPU process RSS reflects system RAM allocated
  by the GPU driver, not VRAM. Metal/VRAM footprint is not captured.
- **MCP server footprint excluded.** `mcp-orchestrator` and sibling servers
  run as separate Node processes. They are not matched by the Commander
  pgrep pattern and are tracked separately per W9 baseline §2.3.
- **Single measurement is noisy.** App startup timing, background OS
  activity, and JIT warm-up affect RSS. Take three runs and use the median.
- **No automation.** The harness requires V>> to manually open panels
  between runs. Automating panel open via Spectron or Playwright is a future
  improvement once the raw numbers are established.

## Falsification criterion

If two consecutive idle measurements (same Commander session, no panels
opened between them) differ by more than 20%, the methodology is too noisy
and needs refinement before any baseline claim can be made. In that case,
investigate background OS memory pressure (`memory_pressure` command) and
re-run in a quieter system state.
