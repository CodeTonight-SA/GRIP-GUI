# W9 — Performance Baseline

**Status:** MEASURED — first run of a recurring baseline
**Owner:** L>>
**Commit under measurement:** `2a0e5f6` (`feat(chat): clickable expand-all on +N earlier tool-output marker (#97)`)
**Measurement date:** 2026-04-15
**Hypothesis:** H041
**Linked decisions:** W8 §12.6 reinforced this as a hard P0 prerequisite — every additional Commander window pays the full client-bundle cost, so the baseline must exist before any multi-window work is reviewable.

## 1. Why this exists

The W8 design council (§12 of `W8-MULTI-SESSION.md`) weakened hypothesis
H-B5 ("3-5 concurrent windows fit within a reasonable 16GB budget"). Agent
B's analysis estimated 180-350 MB RSS per idle `BrowserWindow`, which
compounds on every window opened. Without measured numbers, there is no
honest way to:

- Tell V>> how many workspaces a 16GB machine can actually host.
- Decide whether an "idle workspace hibernation" mode is necessary in
  Phase 1 or can be deferred to Phase 2.
- Evaluate whether any given W8a implementation PR improved, regressed,
  or left performance unchanged.

This document captures the first measured baseline. It is **not** an
optimisation plan. Optimisation comes only after (a) we have numbers,
and (b) we have chosen which numbers matter.

## 2. Measurement methodology

### 2.1 Build environment

- **Host**: macOS Darwin 25.3.0 (16GB RAM laptop, quiet state)
- **Node**: whatever `~/CodeTonight/GRIP-GUI/` has installed via the
  project's lockfile
- **Build command**: `npm run build` (which invokes `next build` with
  Next.js 16.2.1 Turbopack)
- **Repo state**: clean working tree on `main` at commit `2a0e5f6`,
  no modifications, no dev-server running
- **API routes**: LEFT IN PLACE for this baseline (dev build path, not
  `electron:build` which strips them). This matters for honest
  comparisons: the electron production build strips `src/app/api/` and
  produces a smaller client bundle. Future baseline runs MUST use the
  same path to stay comparable. This document is the "dev build"
  baseline; a separate `electron:build` baseline will be added in a
  follow-up measurement PR before W8a ships.

### 2.2 What is measured

1. **Client bundle size** — `.next/static/chunks/*.js` on disk after a
   clean `next build`. This is the code every `BrowserWindow` must
   load into its v8 isolate.
2. **Largest single chunk** — the biggest `.js` file in
   `.next/static/chunks/`. Under code-splitting, this is the chunk
   that every page load has to pay for at minimum.
3. **Chunk count** — total number of chunks in `.next/static/chunks/`.
   Guards against "improve size by splitting" Goodhart-ing.
4. **Full `.next/` output size** — total bytes on disk including
   server-side routes, build artefacts, and cache. This is the full
   cost of one build, relevant for CI disk budgets.
5. **Static source LOC** — `*.ts`/`*.tsx` line count in `src/` and
   `electron/`. Growth rate per PR matters more than absolute value.
6. **Component and page counts** — `*.tsx` files under
   `src/components/` and `page.tsx` files under `src/app/`. Tracks
   surface-area growth.
7. **Build duration** — wall time for TypeScript compile + static
   page generation + finalization, reported by Turbopack.
8. **Dependency count** — `dependencies` + `devDependencies` from
   `package.json`. Tracks supply-chain surface.

### 2.3 What is NOT measured in this baseline (deliberate)

- **Runtime memory (RSS per window)** — requires launching Commander
  with a DevTools protocol client, which in turn requires GUI display
  access and a measurement harness that does not currently exist. Agent
  B's estimate of ~180-350 MB per window is an industry-typical range
  for Electron + Next.js + xterm.js + React apps of this size, but it
  is NOT measured here. A follow-up PR will add the harness.
- **First meaningful paint** — same reason; requires a running app.
- **React DevTools profiler output** — same reason.
- **Gzip/Brotli transfer size** — Electron loads from local disk via
  the `app://` protocol, so gzip-transfer size is irrelevant for
  production. On-disk raw size is the honest cost.
- **MCP server footprint** — `mcp-orchestrator`, `mcp-kanban`,
  `mcp-socialdata`, `mcp-telegram`, `mcp-vault`, `mcp-world`, `mcp-x`
  each build into their own `dist/`. These run as separate processes
  in production but are NOT part of the Next.js bundle. Their
  footprint is tracked separately in a dedicated "MCP memory" baseline
  (future PR).

This document acknowledges the gap. It does not paper over it.

## 3. Measured results

### 3.1 Build output (`.next/` on disk)

| Subdirectory | Size | What's in it |
|---|---|---|
| `.next/` (total) | **26 MB** | Everything Next.js produces |
| `.next/static/` | 3.5 MB | Client-side bundle served to every BrowserWindow |
| `.next/static/chunks/` | **3.3 MB** | JS chunks (the per-window cost) |
| `.next/static/media/` | 180 KB | Fonts, images, inlined assets |
| `.next/server/` | 21 MB | Server-side code for API routes (stripped in electron:build) |
| `.next/build/` | 852 KB | Turbopack build artefacts |
| `.next/cache/` | 720 KB | Next.js incremental cache |

The 21 MB in `.next/server/` is dominated by `next-server.js.nft.json`
(a 41.6 KB manifest, but the file it describes pulls in dependency
closures that land in `.next/server/chunks/` and `.next/server/app/`).
This is **irrelevant for the multi-window cost** because the production
`electron:build` path moves `src/app/api/` out of the way before building,
and Commander ships without a running Next.js server. But it matters for
dev-mode performance and CI disk budgets, so it stays tracked.

### 3.2 Largest client-side chunks

| Rank | Size | Chunk filename | Probable contents (inferred) |
|---|---|---|---|
| 1 | **1.0 MB** | `0m0qybl9foie4.js` | Likely the vendor bundle — framer-motion + xterm.js + three.js + @dnd-kit + react-three/fiber + @slack/bolt. Single largest unit any window has to load. |
| 2 | 273 KB | `0wdtvhhvt6w42.js` | Secondary vendor or a large page chunk (automations 1189 LOC or memory 1062 LOC are candidates) |
| 3 | 199 KB | `0vq5df-d_~5u8.js` | — |
| 4 | 134 KB | `0_5dso3ka1qug.js` | — |
| 5 | 124 KB | `01yql11u99qc~.js` | — |
| 6 | 110 KB | `03~yq9q893hmn.js` | — |
| 7 | 97 KB | `164gijzvsjfqr.js` | — |
| 8 | 94 KB | `0~m-ef_ef-o0o.js` | — |

**Top 8 chunks ≈ 2.03 MB** out of the 3.3 MB total — long tail of smaller
chunks makes up the remaining 1.27 MB.

**Critical observation**: the single 1.0 MB chunk at rank 1 is what every
BrowserWindow has to load into its v8 isolate on first paint. At 5
concurrent windows (the W8 §11.6 target), that is **5 MB of identical
vendor code replicated across 5 v8 heaps**. v8 does not dedupe across
isolates, so this is pure cost, not amortised. This chunk is the primary
target for W9 optimisation IF any optimisation happens — but the baseline
is the honest number before we touch anything.

### 3.3 Static source inventory

| Metric | Value | Notes |
|---|---|---|
| `src/**/*.{ts,tsx}` total LOC | **46,306** | Renderer-side React + Next.js code |
| `electron/**/*.{ts,js}` total LOC | **15,578** | Main-process Electron code |
| `src/components/*.tsx` count | **132** | React components |
| `src/app/**/page.tsx` count | **20** | Next.js route pages |
| `dependencies` count | **30** | Runtime deps |
| `devDependencies` count | **19** | Build + test deps |

**Heaviest source files** (by LOC — candidates for decomposition review):

| LOC | File |
|---|---|
| 1,483 | `src/components/AgentTerminalDialog.tsx` |
| 1,189 | `src/app/automations/page.tsx` |
| 1,062 | `src/components/Memory/AgentKnowledgeGraph.tsx` |
| 939 | `src/app/plugins/page.tsx` |
| 913 | `src/app/projects/page.tsx` |
| 845 | `src/app/usage/page.tsx` |
| 787 | `src/components/Engine/ChatInterface.tsx` |
| 781 | `src/app/memory/page.tsx` |
| 760 | `src/types/electron.d.ts` |

Files over 700 LOC are a soft smell, not a hard problem. They are
surfaced here so future refactors can target the biggest wins first if
LOC budget discipline becomes an issue. This is NOT a request to
decompose them — YAGNI applies until there's evidence a specific file's
complexity is hurting correctness.

### 3.4 Build duration

- **TypeScript compile**: 12.0s
- **Static page generation** (34 routes, 7 workers): 2.6s
- **Total wall time** (end-to-end `npm run build`): ~20-25s on this
  laptop (cache warm)

### 3.5 Route inventory

Next.js reported **34 routes** total in the build output:
- 17 static pages (prerendered)
- 17 API routes (dynamic, server-rendered on demand — stripped in
  `electron:build`)

Static pages list: `/`, `/_not-found`, `/agents`, `/automations`,
`/coffee`, `/icon`, `/insights`, `/kanban`, `/learn`, `/learn/concepts`,
`/learn/walkthrough`, `/memory`, `/modes`, `/plugins`, `/projects`,
`/recurring-tasks`, `/roadmap`, `/settings`, `/skills`, `/usage`,
`/vault`, `/vortex`.

The W8 design's Welcome screen (§11.7) will add one more static route
(`/welcome`), bringing the count to 18 static.

## 4. Goodhart-protected targets

Each metric below has a **primary target** (what we want to hold steady
or improve) and a **shadow metric** (the thing that can silently make the
primary look better while making the app worse). A PR that improves the
primary must not degrade the shadow. If it does, the "improvement" is
Goodhart-ing and must be rejected regardless of what the primary says.

### 4.1 Client bundle total size

- **Primary**: `.next/static/chunks/` total ≤ **4 MB** (current: 3.3 MB)
- **Shadow**: chunk count in `.next/static/chunks/` ≤ **60** (current
  not measured precisely, but visibly under 60 from the top-15 scan)
- **Why the shadow**: a naive "optimisation" is to split one 1 MB chunk
  into ten 100 KB chunks. Same total size but 10× more HTTP round-trips
  (or, in Electron's local `app://` case, 10× more file reads per window
  load). The user sees no improvement and possibly jank.
- **Falsification**: any PR that lowers total size but raises chunk
  count above 60 is rejected and its hypothesis is marked KILLED.
- **Margin**: 4 MB vs 3.3 MB current = 700 KB headroom before alarm.

### 4.2 Largest single chunk

- **Primary**: largest `.js` in `.next/static/chunks/` ≤ **1.0 MB**
  (current: 1.0 MB — we are AT the ceiling, not under)
- **Shadow**: no duplication of the same module across chunks (measured
  via `@next/bundle-analyzer` once it's added as a dev-dep)
- **Why the shadow**: you can "shrink" the largest chunk by hoisting
  part of its content into other chunks that now import the same module
  — total bundle size grows, but the "largest chunk" metric improves.
- **Falsification**: a PR that lowers the largest-chunk size AND
  increases total bundle size is rejected (the trade is negative).
- **Action implied**: because we are already at the 1.0 MB ceiling, any
  W8 or W9 PR that adds a single new top-level import (especially in
  the vendor path) must verify the largest chunk has not crossed 1.0 MB.

### 4.3 Per-window runtime memory (ESTIMATED, not measured)

- **Primary estimate**: idle per-window RSS ≤ **300 MB**
- **Status**: NOT MEASURED in this baseline. Agent B's industry-typical
  range for apps of this composition is 180-350 MB per idle
  BrowserWindow. 300 MB is the midpoint used as a provisional target
  until a real measurement PR lands.
- **Shadow**: first-meaningful-paint time after window open ≤ **500 ms**
  on the baseline laptop. A "lower memory" optimisation that lazy-loads
  everything and causes visible jank on first page navigation is
  rejected.
- **Falsification**: any PR claiming a memory improvement without a
  reproducible measurement (instrumented launch + `process.memoryUsage()`
  snapshot or DevTools protocol capture) is rejected as self-scored.
- **Action implied**: a separate measurement-harness PR must land
  before any W8a implementation PR registers a hypothesis against this
  target. The harness is the precondition for honest future baselines.

### 4.4 Static source LOC growth rate

- **Primary**: per-PR net LOC delta in `src/` tracked, no hard cap
- **Shadow**: per-PR electron/ LOC delta — code moving from `src/`
  (counted) into `electron/` (counted separately here, but often
  untouched in "src/-only" baselines) is visible and not a free lunch
- **Why the shadow**: a PR can "reduce src/ LOC by 500" by moving 500
  lines into `electron/` or into an MCP server. Both are tracked
  separately in this baseline so the shift is visible.
- **Falsification**: a PR claiming negative net LOC but shifting code
  into untracked locations (node_modules vendoring, git submodules,
  .gitignored `generated/` directories) is rejected.

### 4.5 Build duration

- **Primary**: clean-cache `npm run build` wall time ≤ **90s** on the
  reference laptop (current ~20-25s warm, not measured cold)
- **Shadow**: CI cache-miss rate on builds ≤ **10%** of runs (requires
  CI telemetry that does not exist yet)
- **Why the shadow**: speeding up the build by caching aggressively can
  hide stale-output bugs that land in CI because the cache is reused
  when it shouldn't be.
- **Falsification**: a PR that lowers build wall time but coincides
  with at least one stale-output bug in the following two weeks is
  flagged for regression review.
- **Cold build number**: not captured in this baseline because it
  requires a `rm -rf .next/cache` + fresh build, which I deferred to
  avoid blowing the Turbopack cache in the middle of other work. Next
  baseline run will capture it.

## 5. What this baseline does NOT claim

- **It does not claim 5 windows fit in 16GB.** It cannot — runtime
  memory is estimated, not measured. The claim `5 × 300 MB idle = 1.5 GB
  plus OS + PTYs + other apps ≈ tight on 16 GB` is the honest
  inference, but Agent B's falsification in W8 §12.3 H-B5 stands
  unrefuted until real measurements land.
- **It does not claim the 1.0 MB vendor chunk is the right place to
  optimise.** It is the obvious target, but a `@next/bundle-analyzer`
  run is required to confirm its contents before any optimisation PR.
- **It does not claim the current numbers are bad.** They are the
  baseline. "Bad" is a comparison against a target, and the targets in
  §4 are best-effort first estimates that W9 Phase 2 will refine once
  real instrumentation exists.
- **It does not replace the W8 council's STOP verdict.** W8a is still
  blocked on the integration spike and doc rewrite regardless of this
  baseline. W9 is a parallel dependency, not a reason to skip the W8
  redesign work.

## 6. What comes next

1. **Add `@next/bundle-analyzer` as dev dep** — a follow-up PR that
   adds the analyser and captures one HTML visualisation of the current
   bundle. This replaces the "inferred contents" column in §3.2 with
   actual module-level detail. ~30 LOC of config, one committed
   artefact.
2. **Runtime memory harness** — a follow-up PR that launches Commander
   via `spectron` or a DevTools-protocol client and captures
   `process.memoryUsage()` snapshots at idle, after opening one panel,
   after opening five panels. Populates §4.3 with measured numbers.
   Scoped as a separate W9b PR because the harness is its own
   surface area.
3. **`electron:build` baseline** — run the production build path
   (`src/app/api/` stripped, `ELECTRON_BUILD=1`) and capture the same
   metrics against the shipping artefact. The dev build in this doc is
   a useful reference but not the shipping number.
4. **MCP server footprint** — measure the compiled size of each of the
   7 MCP servers (`mcp-orchestrator`, `mcp-kanban`, `mcp-socialdata`,
   `mcp-telegram`, `mcp-vault`, `mcp-world`, `mcp-x`) and track
   separately. These are part of the "per-user install cost" even
   though they aren't in the Next.js bundle.
5. **CI integration** — add a GitHub Action that runs this baseline on
   every PR and comments with deltas. Target: one baseline run
   committed to `docs/proposals/W9-BASELINE-<date>.md` per month, with
   a diff against the previous month.

## 7. Cross-reference to W8

The W8 design council (§12 of `W8-MULTI-SESSION.md`) reinforced W9 as a
hard P0 prerequisite for W8a implementation. Specifically:

- H-B5 (weakened): 3-5 windows × idle memory + PTYs pressure 16GB. The
  provisional 300 MB/window target in §4.3 here is the input to that
  calculation; if the runtime harness in §6.2 lands and shows the real
  number is 180 MB, the 5-window budget is comfortable; if it shows
  350 MB, the 5-window budget is tight; if it shows 400+ MB, W8 §11.6
  must revise the concurrency cap downward.
- §12.6 step 1 (W9 baseline, P0, docs-only) — this is that step.
- §12.6 step 2 (integration spike) — does not block W9 and can run
  in parallel.

## 8. Decision log

| Date | Author | Decision | Rationale |
|------|--------|----------|-----------|
| 2026-04-15 | L>> | First baseline captured against commit `2a0e5f6` | W9 Phase 1 per the W8 §12.6 revised sequence |
| 2026-04-15 | L>> | §4 targets are provisional first estimates, not locked | Real measurements (esp. §4.3) must replace guesses before a second PR cites them |

---

**Next action**: V>> reviews §4 targets and either ratifies or adjusts
them. W9b runtime memory harness PR begins in parallel. Neither blocks
W8 §12.6 step 2 (integration spike), which can run whenever V>> is ready.
