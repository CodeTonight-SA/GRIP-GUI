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

**Next action**: convert PR #98 from draft to ready-for-review with §11
in place. Queue W9 baseline measurement and W8 broly-auto council as
parallel P0 dependencies before W8a implementation.
