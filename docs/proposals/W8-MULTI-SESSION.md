# W8 — Multi-Session Capability for GRIP Commander

**Status:** DRAFT — design council, awaiting V>> review
**Owner:** L>>
**Linked branch:** `feat/w8-multi-session-design`
**Decision required by:** before any W8 implementation lands

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
  iTerm2 windows). Each workspace is genuinely independent.
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

These are the claims this design rests on. Each one would, if disproved,
force a redesign. They should be registered with the GRIP hypothesis engine
as the W8 implementation begins, so we are forced to confront the evidence.

- **H-W8-1**: "Lifting `Session` into the store does not regress streaming
  chat reconnect-on-tab-switch behaviour." Metric: `activeStreams` map
  preserved across the migration. Falsified if any in-flight stream is lost
  during the Phase 1 refactor.
- **H-W8-2**: "Per-session mode sets reduce mode-pollution complaints by
  >50%." Metric: count of mode-related issues filed per week before vs after
  the W8 ship. Three-month verification window.
- **H-W8-3**: "Average power user runs ≤2 concurrent sessions." Metric:
  daily session count from telemetry (if any). Falsified if median user has
  >3, in which case the selector UI needs better affordances than a single
  top-bar dropdown.
- **H-W8-4**: "Phase 1 ships under 800 LOC." Metric: `git diff --shortstat`
  on the merged PR.
- **H-W8-5**: "Switching active session during a streaming chat is safe if we
  snapshot the streaming buffer to chat-storage before the swap, then resume
  from snapshot on session re-entry." Falsified if any stream loses chunks
  during a session switch in manual testing.

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

**Next action after council**: V>> approves the STOP verdict and the
revised sequence in §12.6. W9 baseline measurement begins in parallel
(does not block on W8 council sign-off). W8a does NOT begin until the
doc rewrite in step 3 of §12.6 lands.
