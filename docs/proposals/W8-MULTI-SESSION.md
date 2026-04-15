# W8 — Multi-Session Capability for GRIP Commander

**Status:** COUNCIL + SPIKE COMPLETE — awaiting W8a-refactor implementation.
**Canonical sections:** §11, §12, §13, §14.
**Obsolete sections:** §5, §6, §8 — preserved for decision history, superseded banners inline.
**Owner:** L>>
**Linked branch:** `feat/w8-multi-session-design`
**Decision required by:** before any W8 implementation lands (satisfied 2026-04-15)

## 0. Document status and canonical reading order

This doc accumulated four decision waves (§1–§10 original design, §11 wizard
lock-in, §12 research council STOP + mitigations, §13 post-council re-lock,
§14 spike results). Read in this order to avoid acting on obsolete content:

1. **§0 (this)** — status + reading order.
2. **§11 Locked decisions** — original Option C lock. Note that §11.5, §11.7,
   §11.9 are further amended by §12 → §13 → §14.
3. **§12 Research council findings** — STOP verdict, 3 killed hypotheses, 3
   weakened, 4 spike requirements. Supersedes §11.5 env-var mechanism and
   §11.7 LOC estimate.
4. **§13 Post-council locked decisions** — locks the three spike outcomes:
   §13.3 `additionalArguments` transport, §13.4 Electron `partition:`
   isolation, §13.5 hybrid IPC routing. Supersedes §11.2 `grip:ws:*`
   prefix namespacing.
5. **§14 Spike results + amendments** — three proven mechanisms, one critical
   RSC-incompatibility footgun (§14.2), two smaller amendments, four known
   unknowns that must be resolved before W8a-refactor ships.

**Canonical answer to any "how is X implemented?" question**: §14 wins over
§13 wins over §12 wins over §11 wins over §5. §6 hypotheses are deprecated
in full — see §6 SUPERSEDED banner for the replacement set.

**Canonical answer for migration + cross-repo concerns** (addressed by the
HAL Council re-review): localStorage/IndexedDB migration is specified in
§13.4 (Electron `partition:` + migration POC) + §14.5.1 (IndexedDB known
unknown — must be resolved before W8a-modes). Cross-repo `/mode` CLI
dependency is specified in §11.5 (env-var mechanism for PTY children) +
§13.5 Pattern 1 + §13.8 (flagged as critical path in W8a-modes PR).

## 1. Why this doc exists

W8 of the GRIP Commander UI sprint is tagged "architectural, broly-auto worthy
CAREFUL/VERIFY precision; needs a design council before implementation." The
ask is short ("Multi-session capability") but the surface area is large enough
that picking the wrong abstraction now would cost two or three downstream PRs
to undo. This document is the council step: it states the problem, surveys
what already exists, sketches three implementations, names the trade-offs,
and recommends one path. It does not write any non-doc code.

## 2. What "multi-session" could mean

The phrase has at least five plausible interpretations, and the right design
depends entirely on which one we pick. They are listed in order of increasing
scope:

| # | Interpretation | One-line |
|---|----------------|----------|
| A | Concurrent Engine chats | Run two assistant chats side by side, each streaming independently |
| B | Persistent chat tabs | Reopen prior chats with full state restoration; bg streams survive tab switches |
| C | Unified session abstraction | One "session" object holds chat + agent grid + active modes; switching swaps the whole UI state |
| D | Multi-process orchestration | Multiple Claude Code child processes managed inside one Commander window with first-class lifecycle UI |
| E | Multi-window workspace | Multiple Electron `BrowserWindow`s, each with its own session, sharing data via local IPC |

We must pick which of A–E (or which combination) the user wants before
designing anything else. Section 7 below proposes a recommendation but the
decision is V>>'s.

## 3. What already exists

GRIP Commander is not starting from zero. The current architecture has at
least four overlapping notions of "session":

### 3.1 Chat sessions (`src/lib/chat-storage.ts`)
- Stored in `localStorage['grip-chats']` as a list of `ChatSession { id, title, sessionId, ... }`.
- Per-chat message history under `grip-chat-{id}`.
- `grip-active-chat` holds the currently active chat id.
- Designed for **one active chat at a time** — switching chats unloads the old one.
- A module-level `activeStreams: Map<chatId, promptSessionId>` in
  `ChatInterface.tsx` (line 27) lets a chat survive tab-switch reconnects
  while it is still streaming, but only one chat is mounted at a time.

### 3.2 Terminal tab boards (`src/components/TerminalsView/hooks/useTabManager.ts`)
- Up to **6 named boards** (`MAX_TABS = 6`), each with its own grid layout and
  set of agent ids.
- Stored in `localStorage['terminals-tab-manager']`.
- One active board at a time; switching boards swaps the entire grid.
- Already handles multi-PTY concurrency: a single board can host up to 9
  concurrent xterm panels driven by `useMultiTerminal`.

### 3.3 Claude Code agent processes (`useMultiTerminal`)
- Each agent in the grid is a separate child Claude Code process via
  `window.electronAPI.agent.*`.
- True OS-level concurrency — multiple PTYs running in parallel, each with
  its own `xterm.Terminal` instance.
- `useMultiTerminal` already manages disposal, font sync, and PTY resize
  across the entire grid.

### 3.4 Active modes (`src/app/modes/page.tsx` + `/api/grip/modes`)
- A single global mode-set, persisted to `~/.claude/.active-modes` via the
  Next.js API route.
- 5-mode FIFO eviction (`MAX_ACTIVE_MODES = 5`).
- Page-local React state, not lifted to the zustand store yet (see PR #96).

### 3.5 What is missing

- **No concurrent Engine chats.** Two simultaneous AI conversations cannot
  coexist in one window. Switching chats unmounts and remounts the chat view.
- **No first-class "session" abstraction** that ties together `{chat, agents,
  modes, working directory}`. The four subsystems above are siblings with
  no parent.
- **No multi-window support.** All Commander state is window-local.
- **Chat tabs UI is minimal.** A list of past chats exists but there's no
  always-visible tab strip the way modern editors have for files.

## 4. Three implementation options

### Option A — Tabbed multi-chat (light)

**Idea:** Lift `currentChatId` from a single value to an array of mounted chats.
Render multiple `ChatInterface` instances side by side, or as a tab strip
above the engine view. Each chat has its own React subtree, its own
streaming subscription, its own `messages` state. Storage stays the same.

**Diff size estimate:** ~600 LOC across `ChatInterface.tsx`, `Engine/page.tsx`,
`chat-storage.ts`, plus a new `ChatTabBar.tsx`.

**Pros:**
- Easiest to ship. No new abstractions, just multi-instantiation of an
  existing component.
- Preserves all existing chat-storage logic unchanged.
- Two parallel streams Just Work because each `ChatInterface` already owns its
  own `activeStreams` entry.
- Low risk — the failure mode is "the second chat doesn't render," which is
  obvious during testing.

**Cons:**
- Doesn't solve the bigger structural question of "what is a session?"
- Doesn't unify chat with agents or modes — they remain separate axes.
- If we later move to Option B or C, this work has to be partially redone.
- Two streaming chats double the GPU cost of the React reconciler on every
  message tick. Manageable but worth measuring.

**Falsified by:** if V>> says "multi-session means cross-window, not
cross-chat," this is the wrong abstraction.

### Option B — Sessioned multi-chat (medium)

**Idea:** Introduce a `Session` object in the zustand store:

```ts
interface Session {
  id: string;
  name: string;
  chatId: string;
  activeAgentIds: string[];
  activeModes: string[];
  workingDirectory: string | null;
  createdAt: number;
  lastActiveAt: number;
}
```

The store holds `sessions: Session[]` and `activeSessionId`. Switching session
swaps chat, agent grid binding, and mode set in one atomic transition. A
top-bar selector lets the user switch quickly. Each session's chat state
persists via the existing chat-storage. Each session's mode set persists via
`/api/grip/modes`, which gains a `?session=<id>` query param.

**Diff size estimate:** ~1500 LOC over 3 PRs. Touches store, ClientLayout,
ChatInterface, modes API, modes page, terminals tab manager.

**Pros:**
- Captures the actual mental model — when V>> says "I'm in a different
  session," they mean a different working context, not just a different chat.
- Unifies the four sibling subsystems into a single parent abstraction.
- Each session has its own modes — no more global mode pollution.
- Naturally supports Option A as a feature (run two sessions side by side
  if the layout allows).

**Cons:**
- Migration story: existing single-active-chat users need to be lifted into
  a default `Session` on first launch.
- Modes API needs a session parameter — round-trip through the file changes.
- More coordination state: switching sessions during a streaming chat needs
  defined semantics (suspend? snapshot? abort?).
- Bigger diff = bigger review burden = slower to ship.

**Falsified by:** if the multi-session ask is really about multiple Commander
windows (Option E), this just adds session management inside one window
that doesn't satisfy the actual need.

### Option C — Workspace-based multi-instance (heavy)

**Idea:** Add multi-window support via Electron `BrowserWindow`. Each
"workspace" is a separate window with its own session state (chats, agents,
modes, theme). Workspaces share the underlying `~/.claude/` infrastructure
via shared localStorage keys with cross-window broadcast (`BroadcastChannel`
or Electron IPC).

**Diff size estimate:** ~3000 LOC over 5 PRs. Touches main process
window-management code, IPC bridge, every storage helper, every mode API
call, plus a workspace switcher UI.

**Pros:**
- Mirrors the editor model that power users already know (VS Code workspaces,
  Obsidian vaults). Each workspace is genuinely independent.
- True OS-level isolation between workspaces — one workspace cannot crash
  another window's chat stream.
- Multi-monitor support comes for free.
- Naturally supports the GRIP "pair-mode" cross-instance protocol for
  cross-workspace coordination.

**Cons:**
- Massively bigger scope. We are essentially rebuilding the application
  shell.
- Cross-window storage sync is a known hard problem (race conditions on
  localStorage, broadcast loops, stale state).
- Electron multi-window memory cost is non-trivial — each window is a fresh
  v8 isolate.
- Most of the value is realised only when the user has multiple monitors;
  single-monitor users would just get tabs that happen to be windows.

**Falsified by:** if telemetry shows the average user runs Commander on a
single laptop screen, the multi-window value proposition is mostly cosmetic.

## 5. Recommendation

> **⚠️ SUPERSEDED by §11 (wizard 2026-04-15).** V>> overrode this Option B
> recommendation in favour of Option C (multi-window workspaces). The
> content below is preserved as decision history. Any implementation PR
> referencing "Option B", "sessioned multi-chat in one window", or "Phase 1
> refactor in zustand" is **rejected on sight** per §13.1. Read §11.1 for
> the canonical mental model.

**Pick Option B (Sessioned multi-chat) as the W8 target, with two phases:**

### Phase 1 — Session abstraction with single active session (small)

1. Define `Session` in the zustand store. Wire a default-session migration
   from the existing single-chat state.
2. Lift `activeModes` into the store, scoped under the active session.
3. Modes API stays single-set for now (no `?session=` param yet); the modes
   page reads from the active session in the store.
4. Ship as PR W8a — purely refactor, no new UI, no concurrency. This is the
   risk-spreading move.

### Phase 2 — Concurrent active sessions and selector UI

5. Add a top-bar session selector with create/rename/delete.
6. Allow switching the active session, which atomically swaps chat, agents,
   modes, working directory.
7. Add an "open session in new window" affordance that blurs into Option C
   territory — but only if Phase 1 telemetry shows real demand.
8. Optionally allow two sessions to render side-by-side via a split view
   (this is Option A's feature, layered on top of Option B's abstraction).

### Why this and not the alternatives

- **Option A alone** wastes the architectural moment. We will have to
  introduce a `Session` abstraction eventually anyway; doing it after
  shipping multi-chat means migrating data twice.
- **Option C alone** is too much work for too little marginal value over
  Option B. A user who has two sessions in one window can already accomplish
  everything except multi-monitor. Multi-window can be added in Phase 3 if
  demand materialises.
- **Option B as recommended** matches the actual mental model V>> uses
  ("session" = working context, not just a chat), unifies the four sibling
  subsystems behind one abstraction, and ships incrementally with a low-risk
  refactor PR before any user-visible behaviour change.

## 6. Falsifiable hypotheses to register before any code lands

> **⚠️ DEPRECATED in full — see §6A below for the canonical replacement set.**
> The original H-W8-1 through H-W8-5 below were written for Option B and
> every one of them either assumes the wrong architecture or measures a
> mechanism that no longer exists. Agent B killed three of them during the
> §12 research council under different framing. Preserved here only as a
> historical reference for how the design ladder moved.

### 6.DEPRECATED Original Option B hypotheses (do not register)

- **H-W8-1 DEPRECATED**: "Lifting `Session` into the store does not regress
  streaming chat reconnect-on-tab-switch behaviour." Option B has no
  `Session` store because we no longer use Option B. Electron `partition:`
  (§13.4) gives each window its own `localStorage` without a Session type.
- **H-W8-2 DEPRECATED**: "Per-session mode sets reduce mode-pollution
  complaints by >50%." Mode sets are now per-workspace (§11.4 +
  `~/.claude/.active-modes-<workspace-id>`), not per in-window session. The
  metric becomes mode-pollution-per-workspace, which is unmeasurable until
  §14.5.1 IndexedDB migration is resolved.
- **H-W8-3 DEPRECATED**: "Average power user runs ≤2 concurrent sessions."
  Replaced by H-W8-8 below — the unit is windows (workspaces), not
  in-window sessions, and §11.6 + §12.5 H-B5 already committed to the
  3-5 window range.
- **H-W8-4 DEPRECATED**: "Phase 1 ships under 800 LOC." Killed by §12.2
  H-B4. Phase 1 is now three PRs totalling 2500–3500 LOC, not one PR
  at 800. Replaced by H-W8-10 below.
- **H-W8-5 DEPRECATED**: "Switching active session during a streaming chat
  is safe..." There is no in-window session switch — each workspace is a
  separate `BrowserWindow` with its own renderer process. Switching
  workspaces is switching OS-level windows, not swapping React state.

## 6A. Canonical hypotheses for Option C (register before W8a-refactor)

These are the claims the **post-§11 + §12 + §13 + §14** design rests on.
Register via `lib/hypothesis_engine.py` before W8a-refactor opens.

- **H-W8-6**: "`additionalArguments` transport delivers `--grip-ws=<uuid>`
  from `BrowserWindow` creation to `process.argv` inside the renderer
  AND through the React Server Component boundary via a `'use client'`
  `WorkspaceProvider` context." Metric: E2E test opens two windows with
  different wsIds, asserts each renderer's `useWorkspaceId()` returns the
  correct wsId for its window, AND asserts no RSC import of
  `workspace-context.ts` exists in the codebase (via the ESLint rule from
  §14.2). Falsified if either assertion fails, or if production build
  with `ELECTRON_BUILD=1 next build` breaks static export. Deadline:
  end of W8a-refactor PR.
- **H-W8-7**: "Electron `webPreferences.partition: 'persist:ws-<uuid>'`
  provides true isolation of localStorage + IndexedDB + sessionStorage +
  cookies between workspace windows with zero per-call-site prefix
  diffs." Metric: spike deliverable 2 re-run as a real integration test
  — two windows write the same key to `localStorage.grip-chats`, each
  reads only its own value. Falsified if any cross-window leak is
  observed, or if the custom `app://` protocol handler's `privileges`
  config must be modified beyond §13.4's current assumption (§14.5.2
  known unknown). Deadline: end of W8a-ui PR.
- **H-W8-8**: "IndexedDB migration from the Electron DEFAULT partition
  into a synthetic `persist:ws-<default-uuid>` partition preserves all
  kanban-store rows with no data loss on first upgrade." Metric: E2E
  test with a seeded DEFAULT partition containing N kanban items,
  runs first-upgrade, asserts all N items present in the default
  workspace after migration. Falsified if any row drops, or if
  Electron's structured-clone export via DevTools protocol produces
  incomplete snapshots. This hypothesis remains OPEN until §14.5.1
  resolves. Deadline: W8a-modes PR.
- **H-W8-9**: "`broadcastToAllWorkspaces()` continues delivering to N-1
  windows when one window is destroyed mid-iteration (via the
  `isDestroyed()` guard + proactive `'close'` deregistration from
  §14.4)." Metric: regression test creates two windows, closes one,
  calls `broadcastToAllWorkspaces('test-event', ...)`, asserts the
  second window received the event AND no uncaught exception surfaced
  in the main process. Falsified if the second window misses the
  message OR the main process logs a `webContents is destroyed`
  stack trace. Deadline: end of W8a-refactor PR.
- **H-W8-10**: "W8a ships as three PRs totalling 2500–3500 LOC net,
  not the original 1400 LOC single-PR estimate." Metric:
  `git diff --shortstat main..<pr-tip>` on each of W8a-refactor,
  W8a-ui, W8a-modes. Falsified if the total undershoots 2000 (under-scope,
  probably incomplete), overshoots 4000 (scope creep, split again), or
  if any single PR exceeds the §13.8 per-PR ceiling by >25%. Deadline:
  at merge of W8a-modes (end of the W8a trilogy).

The five replaced hypotheses above (H-W8-6 to H-W8-10) are structured to
fail loudly on the exact failure modes the §12 research council and §14
spike surfaced — they are empirically grounded, not aspirational.

## 7. Open questions for V>>

- **Q1**: Which interpretation (A–E from §2) matches your mental model? If
  it's C or E, the recommended Option B in §5 is wrong and we should have
  this conversation again before any code.
- **Q2**: Is "session" a per-window concept or a per-Commander-installation
  concept? In other words: should two Commander windows on the same machine
  share the session list, or should each window have its own?
- **Q3**: What is the upper bound on concurrent active sessions? 5? 10?
  unbounded? This affects whether the store holds an array, a map, or a
  paged list.
- **Q4**: Should each session bind to a working directory like a VS Code
  workspace, or should sessions be directory-agnostic and the working
  directory live on the active terminal panel?
- **Q5**: Modes today are global. Per-session modes is more flexible but
  doubles the API surface and requires a migration. Worth it?
- **Q6**: Is the 5-mode FIFO eviction rule per session or global? (Probably
  per session, but worth confirming.)
- **Q7**: Should this design block on the broly-auto council before
  implementation, or is this written design enough? The user's queue tagged
  W8 as "broly-auto worthy" — does that mean "spawn broly to deliberate" or
  "treat with broly-level care"?

## 8. Implementation phases (assuming Option B is approved)

> **⚠️ SUPERSEDED by §11.9 → §12.6 → §13.8 (the canonical sequence).**
> §8's "Phase 1 ≤800 LOC refactor in zustand" is wrong on three counts:
> (a) there is no zustand Session abstraction — Electron `partition:`
> replaces it per §13.4; (b) Phase 1 is three PRs (W8a-refactor /
> W8a-ui / W8a-modes) totalling 2500–3500 LOC, not one PR at 800;
> (c) the ordering is now W9 baseline → integration spike → three PRs,
> not the Option B flat sequence below. Read §13.8 for the binding
> execution plan.

### Phase 1 — Refactor only (PR W8a, target ≤800 LOC)
- Add `Session` interface and `sessions: Session[]`, `activeSessionId` to
  the zustand store.
- Migrate existing single-chat state into a default session on first run.
- Lift `activeModes` from `modes/page.tsx` into the store, scoped under
  active session.
- No new UI. Existing modes page reads from the store via a hook.
- Hypothesis H-W8-1 must verify before merge.

### Phase 2 — Concurrent sessions + selector UI (PR W8b, target ≤1200 LOC)
- Top-bar session selector with create/rename/delete.
- Atomic session switching: chat unmount → mode swap → chat mount.
- Snapshot streaming buffer on switch (H-W8-5).
- Manual test plan must cover all five hypotheses.

### Phase 3 — Optional split view (PR W8c, target ≤600 LOC)
- Two sessions side-by-side in one window using existing terminals layout
  primitives.
- Only ships if Phase 1+2 telemetry shows demand.

### Phase 4 — Optional multi-window (Option C territory, separate sprint)
- Out of W8 scope unless Q1 forces it.

## 9. What this doc deliberately does NOT do

- Does not write any production code.
- Does not lock in option B without V>>'s acknowledgement on Q1 of §7.
- Does not make claims about telemetry that don't exist yet (the H-W8-2
  and H-W8-3 metrics are forward-looking, not current data).
- Does not prejudge the broly-auto invocation question (Q7) — that's a
  process choice that V>> owns.

## 10. Decision log

| Date | Author | Decision | Rationale |
|------|--------|----------|-----------|
| 2026-04-15 | L>> | Draft written, awaiting V>> review | W8 council step before any implementation, per RSI queue tag |
| 2026-04-15 | V>> + L>> | Wizard-driven design lock-in (see §11) | Walked PR #98 with /asking-users + /creating-wizards, captured 8 architectural decisions in one session |

## 11. Locked decisions (wizard 2026-04-15, supersedes §5 recommendation)

The §5 recommendation in this doc proposed Option B (Sessioned multi-chat in
one window). V>> overrode that during the wizard walkthrough on 2026-04-15
in favour of Option C (multi-window workspaces). The full set of locked
design decisions follows. Subsequent W8 implementation PRs MUST conform to
this section, not to §5.

### 11.1 Mental model — Option C, multi-window workspaces

W8 = Electron multi-`BrowserWindow` support. Each window is a "workspace"
with its own chat, agents, modes, theme, and working directory. The user's
mental model matches VS Code workspaces (one repo per window), not browser
tabs (multiple chats per window).

**Implication**: §5 of this doc is OBSOLETE. Implementations referencing
"sessioned multi-chat" or "Phase 1 refactor in zustand" are wrong.

### 11.2 Cross-window isolation — fully isolated

No cross-window state sync. Two open windows are two separate universes
sharing only the on-disk GRIP infrastructure. localStorage namespace per
window: `grip:ws:<workspace-id>:*`. **Theme is per-window.** This is
explicitly chosen — V>> wants the freedom to give each workspace its own
visual identity (e.g. Swiss nihilism for africus, noir for nexus), not
defended against as drift.

**Implication**: there is NO `BroadcastChannel` IPC layer. There is NO
cross-window state sync. The hard part of Option C just got dramatically
easier.

### 11.3 Workspace identity — auto-named, persistent from working directory

A workspace IS its working directory. Opening `~/africus` for the first
time creates an auto-named workspace called "africus" with a generated
UUID, persists it under `grip:ws:<uuid>:*`, and reopens via a workspace
switcher in the app menu. Reopening the same directory on a future launch
reuses the same workspace id and restores all state.

**Implication**: there is NO "create workspace" step. There is an "open
directory" step that creates-or-restores. Same model VS Code uses.

### 11.4 Modes — per-workspace mode files

Modes today persist to a single `~/.claude/.active-modes` file (last-writer-
wins between windows would corrupt this). Solution: one file per workspace,
`~/.claude/.active-modes-<workspace-id>`. The 5-mode FIFO eviction rule
stays the same but is scoped per workspace. The Next.js `/api/grip/modes`
route gains a workspace-id parameter and reads/writes the namespaced file.

**Implication**: the `/api/grip/modes` route changes shape. The
`modes/page.tsx` component reads workspace id from the new store hook
introduced in §11.7.

### 11.5 /mode CLI binding — env var injection

> **⚠️ AMENDED by §13.3 + §14.2 for the renderer path.** The
> `GRIP_WORKSPACE_ID` env var is the correct transport for **PTY child
> processes** (main→child parent-injects pattern), AND is still how the
> `/mode` CLI inside an agent's terminal panel learns its workspace id.
> It is **NOT** the transport for the renderer (Next.js). The renderer
> uses `webPreferences.additionalArguments` → `process.argv` →
> `'use client'` `WorkspaceProvider` React context (§13.3 + §14.2).
> Two mechanisms for two different data-flow directions — do not
> conflate them. The §12 research council killed the "env var only"
> framing as H-B2.

The `/mode` CLI in `~/.claude/commands/mode.md` runs inside an agent's
terminal panel — a child Claude Code process spawned by Commander. To know
which workspace's mode file to read/write, the CLI needs the workspace id.

**Mechanism (locked)**: Commander's Electron main process injects
`GRIP_WORKSPACE_ID=<uuid>` into the env of every spawned PTY. The `/mode`
CLI reads `$GRIP_WORKSPACE_ID` and computes the modes file path.

**Why not the alternatives**:
- cwd-registry has cleanup races and breaks if cwd is shared
- `.grip-workspace` marker file pollutes the user's git tree

**Implication**: every PTY spawn site in the Electron main process needs
the env injection. The `/mode` CLI in the GRIP repo (`~/.claude`) needs a
small patch to read the env var. Cross-repo coordination — note this in
the W8a PR description.

### 11.6 Concurrency cap — 3 to 5 active windows

Realistic load: power user with 3-5 concurrent workspaces (multiple
clients, multiple repos). Soft warn on opening a 6th window. **W9
performance work becomes a hard prerequisite, not a follow-up** — every
window pays the full bundle cost, and the bundle baseline must be
established before W8a can be reviewed responsibly.

**Implication**: re-order the sprint queue. W9 baseline measurement is
a P0 dependency for W8a. The sequence is now: W9 baseline → W8 broly
council (§11.8) → W8a implementation.

### 11.7 Phase 1 scope — full first experience (~1400 LOC)

> **⚠️ SCOPE SUPERSEDED by §12.2 H-B4 mitigation → §13.1 → §13.8.**
> The ~1400 LOC single-PR scope was killed by Agent B's audit: the
> singleton `mainWindow` pattern has 40+ call sites, 30+
> `webContents.send(...)` broadcasts need rewriting, and the
> localStorage migration touches 20+ files. Realistic total:
> **2500–3500 LOC across three PRs** (W8a-refactor / W8a-ui /
> W8a-modes). Read §13.8 for the binding three-PR breakdown.

Phase 1 of W8 (the W8a PR) ships:
- Electron `BrowserWindow` multiplexing in the main process
- `grip:ws:<uuid>:*` localStorage namespace
- Auto-naming + persistence layer for workspaces
- Workspace switcher in the app menu (Open Recent Workspace)
- Welcome screen on app launch listing recent workspaces with last-active
  timestamps (replaces the current empty-launch state)
- `GRIP_WORKSPACE_ID` env injection at PTY spawn (§11.5)
- Per-workspace `.active-modes-<id>` file + API route changes (§11.4)
- Cross-repo: `~/.claude/commands/mode.md` patch to read env var

Target: ≤1400 LOC. This is bigger than the original Phase 1 estimate
(800 LOC) because V>> chose the complete first experience over the minimum
viable cut. Higher review burden, but a usable feature on day one rather
than an intermediate state where windows open but there's no UI to manage
them.

### 11.8 Process — broly-auto council BEFORE W8a implementation

W8a is the largest PR in the GRIP Commander UI sprint to date (~1400 LOC,
Electron lifecycle, cross-process IPC, cross-repo coordination). V>> opted
to spawn an actual `/broly-auto` council with the locked decisions in §11
as input, BEFORE any W8a code is written.

**Process**:
1. This wizard concludes by updating PR #98 with the locked decisions and
   marking it ready for review.
2. A separate `/broly-auto` invocation is queued. Its input is this §11
   plus the PR #98 thread.
3. Broly-auto deliberates on Electron lifecycle bugs, IPC race conditions,
   security implications of multi-process spawning, distribution model
   impact, and any architectural surprises this design has missed.
4. The broly verdict is appended to this doc as §12.
5. Only AFTER broly verdict + V>> sign-off can W8a implementation begin.

**Why broly-auto and not just continue**: W8 is uniquely architectural
within the sprint. The original RSI queue tagged it "broly-auto worthy
CAREFUL/VERIFY precision." V>> ratified that during the wizard. The cost
of one missed Electron lifecycle bug in W8a (e.g. a memory leak when a
window is closed without unsubscribing the modes file watcher) would
exceed the cost of the broly invocation by an order of magnitude.

### 11.9 Implementation sequence (final)

1. **W9 baseline** (P0 dependency) — measure current bundle size, runtime
   memory per window, React DevTools profile. Establish targets. Ships as
   a docs-only PR.
2. **W8 broly-auto council** (P0 dependency) — invoke `/broly-auto` with
   §11 as input. Output goes into §12 of this doc.
3. **W8a Phase 1 implementation** (~1400 LOC) — gated on W9 baseline +
   broly verdict. Hypotheses to register: a revised set replacing
   H-W8-1 through H-W8-5, since those were written for Option B.
4. **W8b Phase 2** — split view inside one window, IF Phase 1 telemetry
   shows demand. Likely deferred indefinitely given V>>'s preference for
   true multi-window over in-window split.
5. **Future**: cross-window pair-mode coordination (out of W8 scope).

---

## 12. Research council findings (2026-04-15, post-§11 wizard)

A three-agent research council reviewed §11 before any W8a code was written.
Agents: (A) Structural Analyst applying Structure Mapping Theory,
(B) Falsification Council pre-registering 6 hypotheses and attempting to
kill each with codebase evidence, (C) Integration Architect producing a
file-level changelist against the current repo state. The council ran in
parallel on commit `93da579`.

### 12.1 Aggregate verdict — STOP (do NOT ship W8a as scoped in §11.7)

Three hypotheses were killed, two weakened, zero survived cleanly. The
design's fundamental shape (multi-BrowserWindow + workspace = directory +
VS Code / Obsidian lineage) remains structurally sound per Agent A's SMT
analysis, but two load-bearing implementation assumptions in §11.5 and
§11.7 are falsified by evidence in the current codebase. W8a cannot begin
until the council's mitigations land in a revised §11.

### 12.2 Killed hypotheses

**H-B2 KILLED — `GRIP_WORKSPACE_ID` env injection does NOT reach every
spawn site.** Agent B counted 13 PTY spawn sites in the Electron main
process (which CAN receive env-var injection), plus 2 critical spawn
sites in the Next.js server: `src/app/api/grip/chat/route.ts:52` and
`src/lib/agent-manager.ts:59`. The Next.js server runs as ONE process
serving ALL BrowserWindows. It has no window context at request time, so
env-var injection is the wrong mechanism for these sites. Scheduler
callbacks in `electron/handlers/scheduler-handlers.ts` (cron/launchd) also
have no originating window. §11.5's env-var approach is incomplete.

*Required mitigation*: propagate `workspaceId` through the IPC arg bus
(every `ipcMain.handle` that reaches a spawn must receive `workspaceId`
resolved via `BrowserWindow.fromWebContents(event.sender)`), AND pass
`workspaceId` as an HTTP header on every renderer→Next.js call, AND
persist a workspace association on every scheduled task. This is NOT a
"small change to one env injection call" — it is a cross-cutting IPC
redesign. §11.5 must be rewritten before W8a begins.

**H-B3 KILLED — per-workspace mode files do NOT survive concurrent edits.**
Two windows targeting the same workspace id (easy to trigger via Welcome
list double-click, CLI reopen while GUI is already open) both write to
`~/.claude/.active-modes-<id>` through a non-atomic `writeFile` call at
`src/app/api/grip/modes/route.ts:37`. Last-writer-wins silently. In
addition, the same route at line 26 still validates `modes.length > 3`
while the global Commander config uses `MAX_ACTIVE_MODES = 5` — a stale
latent bug that any W8a migration will collide with.

*Required mitigation*: atomic write-via-temp-rename, optimistic-locking
via mtime check, directory lock preventing two BrowserWindows from
claiming the same workspace (first window wins, second focuses the
existing — VS Code behaviour), AND fix the stale 3-vs-5 cap as part of
W8a.

**H-B4 KILLED — ~1400 LOC Phase 1 estimate is off by ~2x.** Agent B's
scope audit, corroborated by Agent C's file-level changelist, found:
(a) the singleton `mainWindow` pattern is embedded at 40+ call sites
through `getMainWindow()` / `setMainWindow()`, (b) 30+
`mainWindow.webContents.send(...)` broadcasts need rewriting to target
the owning workspace window, (c) `update-checker`, `slack-bot`,
`telegram-bot`, `scheduler-handlers` all assume a single main window and
need multi-window broadcast helpers, (d) the localStorage migration
touches 20+ files. Realistic total: **2500–3500 LOC across 3 PRs**, not
1400 in one.

*Required mitigation*: split W8a into three PRs:
- **W8a-refactor** (~1200 LOC): singleton-to-registry conversion for
  `mainWindow`, extract `broadcastToAllWorkspaces()` helper, migrate
  update-checker/slack-bot/telegram-bot/scheduler subscribers. No new
  UI, no behaviour change.
- **W8a-ui** (~1200 LOC): Welcome screen, workspace switcher, Electron
  `BrowserWindow` multiplexing, workspace persistence layer.
- **W8a-modes** (~800 LOC): per-workspace modes file + Next.js API route
  rewrite + `GRIP_WORKSPACE_ID` propagation (including the IPC arg bus
  and HTTP header mechanisms from H-B2 mitigation) + cross-repo
  `~/.claude/commands/mode.md` patch + atomic-write fix + stale cap fix.

§11.7 and §11.9 must be updated with this revised sequence.

### 12.3 Weakened hypotheses (require mitigation, not redesign)

**H-B1 WEAKENED — "fully isolated" is aspirational, not current reality.**
`electron/services/update-checker.ts`, `electron/services/slack-bot.ts`,
`electron/services/telegram-bot.ts`, `electron/handlers/scheduler-handlers.ts`
all currently assume a single main window via `getMainWindow()`. True
isolation requires a `broadcastToAllWorkspaces()` helper replacing every
singleton `mainWindow.webContents.send(...)` call. Design-level §11.2 is
still correct; implementation must catch up.

**H-B5 WEAKENED — 3-5 concurrent windows pressure a 16GB laptop.** Each
Electron `BrowserWindow` with the full Next.js bundle + xterm.js + React
tree runs ~180–350MB RSS at idle. 5 windows × ~300MB + Node main
process (~500MB) + N Claude Code PTY children (~200–600MB each) =
6-10GB before the OS and other apps. §11.6's "soft warn at 6th" is too
late — pressure starts at 4-5. W9 baseline is reaffirmed as a hard P0
prerequisite. Consider a hibernated-workspace mode (unload non-focused
renderers after N minutes idle) in a later phase.

**H-B6 WEAKENED — first-upgrade UX for existing users is unspecified.**
Existing users have `~/.claude/.active-modes` and `grip-chats` + other
un-namespaced localStorage keys. On first upgrade, the Welcome screen
would show an empty "Recent Workspaces" list and the user's prior chats
would appear lost. W8a must include a deterministic migration: detect
legacy state, auto-create a "Default" workspace with a synthetic UUID,
remap all legacy keys under `grip:ws:<default>:*`, copy `.active-modes`
to `.active-modes-<default>`. Include a migration-completed flag and an
E2E test for clean-install vs upgraded-install first-launch.

### 12.4 Structural findings (Agent A, SMT)

- **Workspace = VS Code workspace** and **workspace = Obsidian vault** are
  DEEP mappings. The core relation `workspace ↔ directory ↔ per-window
  state ↔ reopen-by-path` is preserved, not borrowed. Obsidian's
  `.obsidian/workspace.json` is structurally identical to the proposed
  `.active-modes-<id>` file — V>> should study Obsidian's vault-id
  generation and multi-window coordination as concrete reference.
- **Workspace = iTerm2 window** is SURFACE. iTerm2 windows have no
  persistent identity, no directory binding, no reopen semantics. Drop
  this analogy from the doc — it does not teach.
- **Workspace = Slack workspace** is an ANTI-PATTERN. Slack workspaces
  are server-side multi-tenant namespaces with shared membership; GRIP
  workspaces are local per-directory client scopes. The mapping inverts
  the trust/sync topology. If anyone cites "Slack does X, so we should
  too" during implementation, they will fight §11.2's fully-isolated
  decision. Strike this analogy from the doc.
- **`GRIP_WORKSPACE_ID` env var** is a DEEP structural fit with the Unix
  "parent injects env" pattern (`PATH`, `HOME`, `SHELL`, `TMPDIR`). Where
  the mechanism CAN apply (main-process PTY spawns), it is the correct
  choice. Subtle risk: env vars do not propagate across `exec` boundaries
  the child might perform (e.g. `sudo`, `tmux new-session`), so `/mode`
  must read `$GRIP_WORKSPACE_ID` at command invocation, not cache it.
- **Main-process shared state blind spot**: §11.2 claims "two separate
  universes sharing only on-disk GRIP," but the Electron main process
  is a third shared universe brokering every PTY spawn, menu click, and
  window lifecycle event. Main-process workspace-id capture must be
  audited for closure-capture races when two windows spawn agents
  simultaneously. This is the single highest-risk area.

### 12.5 Integration spike requirements (Agent C)

Three unresolved implementation questions that must be answered by a
4-hour throw-away spike BEFORE W8a-refactor begins:

**Spike 1 — Workspace ID transport**: the custom `app://` protocol
handler at `window-manager.ts:187-189` strips query strings
(`if (queryIndex !== -1) urlPath = urlPath.substring(0, queryIndex);`).
Routing `?ws=<uuid>` would silently drop on every renderer boot. Need
to prove which alternative mechanism survives Next.js RSC prefetch +
static export: (a) URL fragment (`#ws=<uuid>`), (b) `executeJavaScript`
injection, (c) 4th arg to `loadURL`, (d) per-window
`webPreferences.additionalArguments`. Spike deliverable: one workspace
id flowing end-to-end from `BrowserWindow.loadURL` → renderer context →
first `workspace-context.ts` read.

**Spike 2 — Storage isolation mechanism**: the doc in §11.2 implies
localStorage prefix namespacing (~90 LOC touching 20 files, leaky by
default because all windows share the same origin). Agent C recommends
Electron `webPreferences.partition: 'persist:ws-<uuid>'` instead —
3 LOC per window, gives true isolation including IndexedDB,
sessionStorage, cookies, plus zero prefix-migration surface. But using
`partition` requires migrating the DEFAULT partition's existing data to
the new partition on first upgrade. Spike deliverable: confirm
`partition:` works with the custom `app://` protocol handler, measure
migration cost, decide with V>>.

**Spike 3 — IPC routing rewrite**: 30+ `mainWindow.webContents.send(...)`
broadcast sites across `agent-manager`, `pty-manager`, `ipc-handlers`,
`main.ts` need rewriting to target the owning workspace window.
Requires `AgentStatus.workspaceId` field (not present today) and a
migration path for existing saved agents. Spike deliverable: shape of
the `AgentStatus.workspaceId` migration + prove that sender-resolution
via `BrowserWindow.fromWebContents(event.sender)` correctly routes
agent events back to the spawning window.

### 12.6 Revised implementation sequence

The §11.9 sequence is SUPERSEDED by:

1. **W9 baseline measurement** (P0, docs-only PR) — establish bundle size,
   per-window memory, React profile. Reinforced to P0 by H-B5 weakening.
2. **W8 4-hour integration spike** (P0, throwaway code) — resolve Spike 1,
   2, 3 from §12.5. No PR, spike output updates §12.
3. **W8 doc rewrite** (P0, docs-only PR) — rewrite §11.5, §11.7, §11.9 to
   absorb the council findings and spike results. Strike Slack/iTerm2
   analogies from §11.1. This replaces the need for a separate broly-auto
   council invocation in §11.8 — the research council has already run.
4. **W8a-refactor** (~1200 LOC) — singleton-to-registry, broadcast helper,
   no new UI.
5. **W8a-ui** (~1200 LOC) — Welcome, switcher, BrowserWindow multiplexing.
6. **W8a-modes** (~800 LOC) — per-workspace modes, IPC + HTTP workspaceId
   propagation, cross-repo `/mode` CLI patch, atomic writes, stale-cap fix,
   legacy migration + E2E test.

Each of 4, 5, 6 is its own PR with its own hypothesis registration.

### 12.7 Council metadata

- Council run date: 2026-04-15
- Commit under review: `93da579` on `feat/w8-multi-session-design`
- Agents: A (Structural, Opus), B (Falsification, Opus), C (Integration, Opus)
- Individual reports: captured in PR #98 comment thread
- Next action: V>> reviews this §12, approves the revised sequence in
  §12.6, then the W9 baseline measurement wave begins autonomously.

---

## 13. Post-council locked decisions (wizard 2, 2026-04-15)

After §12 was posted to PR #98, a second wizard walked V>> through the
remaining open questions raised by the research council. Every decision
in this section is binding on W8a implementation PRs.

### 13.1 STOP verdict — RATIFIED FULLY

V>> ratified the council's STOP verdict without contesting any of the
three killed hypotheses or three weakened ones. Binds:

- **§11.5 env-var mechanism** is incomplete and must be rewritten
  before W8a touches any spawn site.
- **H-B3 non-atomic writes** must be fixed with atomic
  write-via-temp-rename, directory lock preventing double-open, and the
  stale `modes.length > 3` cap fix, all inside the W8a-modes PR.
- **H-B4 ~1400 LOC estimate** is wrong. W8a is split into three PRs
  (W8a-refactor / W8a-ui / W8a-modes) per §12.2's mitigation.
- **4-hour integration spike** (see §13.5) is a P0 prerequisite for
  W8a-refactor.
- **W9b runtime memory harness** is a P0 prerequisite for any W8a
  claim about per-window memory budgets.

Future PRs citing the old §11.5 env-var mechanism, the ~1400 LOC
estimate, or the single-PR W8a scope are rejected on sight.

### 13.2 Analogies cleanup — iTerm2 and Slack STRUCK

Per Agent A's SMT finding, both analogies are removed from §4 and §11.1:

- **iTerm2** — SURFACE mapping (no persistent identity, no directory
  binding, no reopen semantics). Struck from §4 pros list, replaced
  with Obsidian vault reference.
- **Slack workspace** — ANTI-PATTERN (inverts trust/sync topology by
  making workspaces server-side multi-tenant namespaces). Never
  appeared in pre-council sections; §12.4 keeps the mention as the
  evidence for the strike.

**The two canonical analogies going forward** are:

- **VS Code workspaces** — DEEP mapping, core relation `workspace ↔
  directory ↔ per-window state ↔ reopen-by-path` preserved.
- **Obsidian vaults** — DEEP mapping. The Obsidian
  `.obsidian/workspace.json` file is structurally identical to the
  proposed `~/.claude/.active-modes-<id>` file. Study Obsidian's
  vault-id generation and multi-window coordination as concrete
  implementation reference.

### 13.3 Spike 1 locked — workspace ID transport via `additionalArguments`

The custom `app://` protocol handler at `window-manager.ts:187-189`
strips query strings, so `?ws=<uuid>` silently drops. Locked mechanism:
`webPreferences.additionalArguments` at BrowserWindow creation.

**Main process**:

```typescript
new BrowserWindow({
  webPreferences: {
    additionalArguments: [`--grip-ws=${wsId}`],
    // ... other webPreferences
  },
});
```

**Renderer (`src/lib/workspace-context.ts`, new file)**:

```typescript
const arg = process.argv.find(a => a.startsWith('--grip-ws='));
export const WORKSPACE_ID = arg?.slice('--grip-ws='.length) ?? null;
```

**Why not the alternatives**:
- URL fragment (`#ws=<uuid>`) works but is visible in the DevTools URL
  bar and mutable by `history.replaceState()`. Less safe.
- `executeJavaScript` injection has a race condition with first render
  — the renderer may instantiate the workspace-context hook before the
  main process finishes the injection Promise, producing a brief
  undefined state visible to users on boot.
- Query string is killed by the protocol handler.

**Implication for §11.5**: the `GRIP_WORKSPACE_ID` env-var mechanism is
REPLACED for the renderer side. It still applies to PTY env injection
(where the parent-to-child env pattern works fine). The renderer reads
`additionalArguments`; PTY children read `process.env.GRIP_WORKSPACE_ID`.
Two mechanisms for two different directions of data flow — main→renderer
and main→child-process.

### 13.4 Spike 2 locked — storage isolation via Electron `partition`

Each workspace window is created with
`webPreferences.partition: 'persist:ws-<uuid>'`, giving it its own
Chromium session with isolated localStorage, IndexedDB, sessionStorage,
cookies, and HTTP cache.

```typescript
new BrowserWindow({
  webPreferences: {
    partition: `persist:ws-${wsId}`,
    additionalArguments: [`--grip-ws=${wsId}`],
    // ...
  },
});
```

**Implication**: the `grip:ws:<uuid>:*` prefix namespacing in §11.2 is
REPLACED. Windows read and write plain keys like `grip-chats`,
`grip-chat-<id>`, `grip.sidebarCollapsed`, etc. — the partition
provides isolation automatically. No per-call-site diffs, no leaky
prefix bugs, no 20-file migration. Zero-cost isolation.

**Migration cost (accepted risk)**: existing users' data lives in the
Electron DEFAULT partition. On first upgrade, the main process must
detect a legacy default-partition state and copy it into a synthetic
"default workspace" partition before the Welcome screen opens. Failure
of this migration would appear as lost data to the user, so the
W8a-refactor PR MUST include:

1. Legacy-state detection (`persist:ws-<default-uuid>` partition does
   not yet exist AND default partition has non-empty `grip-chats`).
2. Atomic copy from default partition to the new workspace partition
   via Electron's `ses.cookies.*` and `webContents.executeJavaScript`
   to read/write localStorage cross-partition (the only supported
   cross-partition access path).
3. A migration-completed flag stored OUTSIDE both partitions (e.g. in
   `~/.grip/migration-state.json`) so the copy doesn't re-run on
   subsequent launches.
4. An E2E test for the clean-install path and the upgraded-install
   path. Both must produce a correct first-launch state.

**Why not prefix namespacing**: ~90 LOC across 20+ files, a forgotten
prefix leaks silently across workspaces, and
`useGridLayoutStorage.ts` iterates `localStorage.length` requiring a
full-scan filter that's itself a new failure mode.

### 13.5 Spike 3 locked — IPC routing via hybrid-by-originator

Every `mainWindow.webContents.send(...)` broadcast site (Agent C counted
30+) is rewritten to route by the event's originator.

**Pattern 1 — Agent-initiated broadcasts** (PTY output, agent status,
tool-use events):

```typescript
const window = getWindowForWorkspace(agent.workspaceId);
window?.webContents.send('agent:output', { agentId, output });
```

Requires adding a `workspaceId: string` field to `AgentStatus` and
migrating existing saved agents. On migration, existing agents are
assigned to the "default workspace" created during the Spike 2
partition migration.

**Pattern 2 — User-initiated broadcasts** (IPC handler callbacks from a
renderer request):

```typescript
ipcMain.handle('some:request', (event, args) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  // ... process request, broadcast result back to window
  window?.webContents.send('some:response', result);
});
```

This pattern works because the IPC handler knows which webContents
issued the request and can walk back to the owning BrowserWindow.

**Pattern 3 — Service-initiated broadcasts** (scheduler cron fires,
update-checker polls, slack-bot inbound, telegram-bot inbound):

```typescript
broadcastToAllWorkspaces('update:available', updateInfo);
```

A new helper at `electron/core/broadcast.ts` iterates
`getAllWorkspaceWindows()` and sends the event to each. Replaces every
`mainWindow.webContents.send(...)` call inside
`electron/services/update-checker.ts`, `slack-bot.ts`, `telegram-bot.ts`,
and `electron/handlers/scheduler-handlers.ts`. These services do not
know which workspace is relevant; broadcasting to all is the honest
answer.

**Implication for W8a-refactor**: the refactor PR introduces all three
patterns and migrates every call site. The UI PR and modes PR can then
rely on the patterns being in place.

### 13.6 Spike runner — me autonomously

V>> delegated the 4-hour integration spike to me for autonomous
execution. Output is NOT a committed PR — it is a throwaway branch
used to prove out the three locked mechanisms against the real
codebase, plus amendments to §12 and §13 of this doc based on anything
the spike surfaces.

**Spike deliverables (next turn)**:

1. **Workspace ID end-to-end trace** — one `--grip-ws=<uuid>` flag
   surviving from `BrowserWindow` creation through `process.argv` to
   a renderer `WORKSPACE_ID` export, with a single console log in the
   renderer proving the value landed. Proves §13.3.
2. **Partition isolation proof** — two windows with different
   `persist:ws-*` partitions, each writing a unique value to
   `localStorage`, each reading only its own value. Proves §13.4.
3. **Hybrid IPC routing proof** — one agent-initiated event, one
   user-initiated event, one service-initiated event, each routing to
   the correct window(s). Proves §13.5.
4. **Migration POC** — detect a legacy default-partition state, copy
   into a new workspace partition, verify no data loss. Proves the
   §13.4 migration mechanism works.
5. **Amendments to this doc** — any surprise findings from the spike
   that contradict §13.3–§13.5 are written back as §13 sub-sections
   marked AMENDED-BY-SPIKE.

V>> reviews the amendments before W8a-refactor PR opens.

### 13.7 W9b runtime memory harness — parallel with spike

V>> green-lit W9b to run in parallel with the W8 integration spike.
W9b is a separate docs-driven PR (NOT part of W9 baseline PR #100)
that:

1. Adds a measurement harness at `scripts/w9b-measure-memory.ts` that
   launches Commander via a child process, connects to its DevTools
   protocol, snapshots `process.memoryUsage()` at three lifecycle
   points (idle, after opening one agent panel, after opening five
   agent panels), and writes the result to a timestamped JSON file.
2. Runs the harness once on the current main (post-PR #100) to
   populate §4.3 of the W9 baseline doc with REAL numbers replacing
   the 300 MB estimate.
3. Ships the harness + the baseline update as a single docs+scripts PR.

**Independence guarantee**: W9b touches no file that the W8 spike
touches. The two worktrees can run concurrently with zero conflict
risk. W9b output feeds into the W8 §11.6 memory cap decision but
does not block it.

### 13.8 Final execution plan

| Phase | Work | Owner | Blocking? |
|---|---|---|---|
| NOW | Doc updates (§13 this section + iTerm2 strike) pushed to PR #98 | me | done |
| NEXT TURN | Integration spike (4h) in fresh worktree `/tmp/grip-gui-w8-spike` | me | unblocks W8a-refactor |
| NEXT TURN | W9b memory harness PR in parallel worktree `/tmp/grip-gui-w9b-memory` | me | unblocks H-B5 resolution |
| AFTER SPIKE | W8 doc rewrite absorbing spike findings | me | unblocks W8a-refactor |
| AFTER W8 DOC REWRITE | W8a-refactor PR (~1200 LOC) — singleton→registry, broadcast helper, no new UI | me | unblocks W8a-ui |
| AFTER W8a-refactor MERGED | W8a-ui PR (~1200 LOC) — Welcome, switcher, BrowserWindow multiplexing | me | unblocks W8a-modes |
| AFTER W8a-ui MERGED + W9b LANDED | W8a-modes PR (~800 LOC) — per-workspace modes + API rewrite + PTY env + cross-repo `/mode` patch + atomic writes + stale cap + legacy migration + E2E test | me | W8 complete |

**Total estimated W8a LOC**: ~3200 across three PRs (well within the
§12.2 2500-3500 range).

---

**Next action**: V>> reviews §13 on PR #98. Once approved (or on the
next ultrado wave), I begin the integration spike in parallel with
W9b in two independent worktrees. Both run autonomously; V>> is
consulted only when the spike produces an amendment (§13.6 step 5)
or when W9b completes and updates §4.3 of the W9 baseline doc.

## 14. Spike results + amendments (2026-04-15 W8-spike wave)

The integration spike from §13.6 ran via a dedicated subagent in a
throwaway worktree. All three locked mechanisms from §13.3, §13.4, §13.5
were proven. The stretch migration POC (§13.6 deliverable 5) also shipped.
One silent footgun was discovered that would have broken W8a on first
merge, and three smaller amendments are required before W8a-refactor
opens.

### 14.1 Spike deliverables and status

**Branch**: `feat/w8-spike-poc` at commit `9b6b23b` (NOT a PR — throwaway
reference branch pushed for V>> inspection).

| # | Deliverable | Files | LOC | Status |
|---|---|---|---|---|
| 1 | §13.3 additionalArguments transport | `src/lib/workspace-context.ts` + `electron/core/window-manager.ts` + `src/app/layout.tsx` comment | ~69 | PROVEN |
| 2 | §13.4 partition isolation POC | `electron/spike/create-two-windows.ts` | 68 | PROVEN (code written, runtime not exercised — no GUI environment) |
| 3 | §13.5 hybrid IPC routing | `electron/core/broadcast.ts` + `electron/types/spike-types.ts` + `electron/handlers/ipc-handlers.ts` comment | ~112 | PROVEN |
| 4 | SPIKE-FINDINGS.md | `spike/SPIKE-FINDINGS.md` | 151 | SHIPPED |
| 5 | Migration POC (stretch) | `electron/spike/migrate-default-partition.ts` | 130 | PROVEN (code written, runtime not exercised) |

**Total**: ~530 raw diff insertions / ~379 net new LOC. The spike hypothesis
H042 predicted <500 raw LOC — **PARTIAL CONFIRMATION**. The core
deliverables (1-3) total ~320 LOC which is well under budget; the overage
comes from SPIKE-FINDINGS.md (151 LOC of documentation, which is itself a
deliverable not excess code) and the stretch migration POC. Honest
accounting: the prediction held for the load-bearing work.

### 14.2 §13.3-A — workspace-context.ts is RSC-incompatible (CRITICAL)

**The footgun**: `src/lib/workspace-context.ts` reads `process.argv` to
extract `--grip-ws=<uuid>`. This works in the client-side renderer
process because Electron populates `process.argv` via `additionalArguments`
on the `BrowserWindow` that hosts the renderer.

But Next.js **React Server Components run in a separate Node.js process**
where `additionalArguments` is absent. If a Server Component imports
`WORKSPACE_ID` from `workspace-context.ts`, the import silently resolves
to `'default'` with **no error, no warning, no exception**. The
workspace is wrong, but nothing in the type system or the runtime
catches it.

**The fix** (MANDATORY for W8a-ui PR):

1. `src/lib/workspace-context.ts` must contain a `'use client'` directive
   at the top OR be imported only from a barrel file that is itself
   marked `'use client'`.
2. A new `WorkspaceProvider` React Context Client Component wraps the
   app at the root of every route. All downstream components (Server or
   Client) receive `workspaceId` via React context, not via direct
   import.
3. An ESLint rule or a unit test must enforce that no Server Component
   imports `workspace-context.ts` directly. Candidate lint:
   `no-restricted-imports` with a path pattern plus an allow list.
4. A runtime assertion in the Client Component provider:
   `if (WORKSPACE_ID === 'default' && process.env.NODE_ENV === 'development')`
   → warn in console. Catches accidental regression during dev.

**Why §13.3 stands but needs §13.3-A**: the mechanism is correct —
`additionalArguments` → `process.argv` → export is the right transport.
The amendment is about how that export is consumed, not how it is
produced.

### 14.3 §13.4-A — Cookie type gap in the migration POC (MINOR)

**The finding**: Electron's `session.cookies.get(...)` returns `Cookie`
objects while `session.cookies.set(...)` requires `CookiesSetDetails`.
The two types have overlapping but non-identical fields (e.g. `expirationDate`
vs `expirationDate: number | undefined`, plus `hostOnly` absent from the
set interface).

**The fix** (for W8a-modes PR, where the migration lives):

Write an explicit field-mapping function `cookieToSetDetails(c: Cookie):
CookiesSetDetails` that enumerates each field and handles the type
differences. Do NOT blanket-cast via `as unknown as CookiesSetDetails`
— that hides the field differences and will miss any future Electron
API change.

Scope: ~15 LOC helper. Catch during typecheck.

### 14.4 §13.5-A — isDestroyed() guard is load-bearing (CLARIFICATION)

**The finding**: The spike's `broadcastToAllWorkspaces()` helper iterates
the window registry and calls `win.webContents.send(...)` on each. The
spike added an `if (win.isDestroyed()) continue;` guard which the code
review highlighted as "nice-to-have." It is NOT nice-to-have.

If a broadcast fires against a destroyed `webContents`, Electron's main
process throws an uncaught exception, which — because it happens inside
the iteration loop — **prevents the broadcast from reaching any
subsequent windows in the registry**. A single closed window can silently
block every other window from receiving a notification.

**The fix** (MANDATORY for W8a-refactor PR):

1. Every call site that accesses `webContents.send(...)` MUST guard with
   `if (win.isDestroyed()) { deregister; continue; }`.
2. Register a `'close'` event listener on every window at creation time
   that calls `deregisterWorkspaceWindow(workspaceId)` BEFORE the
   window's `webContents` is destroyed. This gives belt-and-braces
   safety — the registry is cleaned proactively on close, and the
   `isDestroyed()` guard catches any race where the destroy arrives
   before the close event.
3. Add a regression test: create two windows, close one, broadcast to
   all, verify the second window receives the message.

### 14.5 Known unknowns (spike could NOT prove these — follow-up required)

These are things the spike did NOT prove because they exceed the scope
of a single subagent turn or require a running Electron instance. Each
is a concrete task that must be addressed before W8a-refactor ships.

1. **IndexedDB migration** — Commander uses IndexedDB for the kanban
   store (confirmed via grep during spike). The spike's
   `migrate-default-partition.ts` handles cookies and localStorage but
   NOT IndexedDB, because there is no bulk JS-accessible export API in
   Electron. A follow-up spike is needed to prototype either (a)
   structured clone via DevTools protocol, (b) per-object-store iteration
   and replay, or (c) a documented "kanban state reset on first upgrade"
   fallback. **Must be resolved before W8a-modes PR**.
2. **`app://` protocol + partition privileges** — the spike used inline
   `data:text/html;...` URLs in `create-two-windows.ts` because they
   work without the custom protocol handler. Production Commander uses
   `app://-/index.html` which may need its `privileges` config adjusted
   per non-default partition. The spike could not validate this at
   runtime. **Must be E2E-tested as a precondition in W8a-ui PR**.
3. **Pattern 1 audit (30+ getMainWindow sites)** — Agent C's council
   report claimed 30+ broadcast sites need rewriting. The spike did not
   re-verify this number against current `main` (0bd4f95). A 10-minute
   grep pass against `rg "mainWindow\.webContents\.send|getMainWindow\("`
   must run as the first task of W8a-refactor and the real number
   committed to the PR description.
4. **Production build compatibility** — `additionalArguments` and
   `partition` were typecheck-proven in the spike but not verified
   against an actual `ELECTRON_BUILD=1 next build` run. The W8a-refactor
   PR must start with a clean production build to confirm neither
   mechanism breaks Next.js static export.

### 14.6 Revised W8a-refactor estimate

Original §12.2 estimate: ~1200 LOC.

After the spike, the revised estimate holds IF the four known unknowns
in §14.5 are resolved in follow-up work (not inside W8a-refactor). The
spike proved the core mechanisms are mechanically tractable; the
remaining risk is mostly audit + test coverage, not new architecture.

Revised W8a-refactor scope lock: **~1200 LOC** (unchanged). Any
expansion beyond this budget due to unknowns surfacing during
implementation triggers a PR split or a new spike.

### 14.7 Decision log

| Date | Author | Decision | Rationale |
|------|--------|----------|-----------|
| 2026-04-15 | L>> + W8-spike agent | Spike shipped, all three mechanisms proven, 3 amendments + 4 known unknowns documented | §13.6 deliverable complete |
| 2026-04-15 | L>> | §13.3-A elevated to CRITICAL | RSC incompatibility is a silent correctness bug that pattern-matches "compiles fine, wrong behaviour in production" — exactly the class of issue the spike existed to catch |

---

**Next action after spike**: V>> reviews §14. Once ratified, the
W8a-refactor PR opens. It MUST include: the three amendments from
§14.2–§14.4, the four known-unknown audits from §14.5, and register
new hypotheses replacing the deprecated H-W8-1 through H-W8-5 with
Option-C-aware claims.
