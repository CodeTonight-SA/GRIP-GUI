# UX Audit Inventory — GRIP Commander v0.4.3

**Auditor**: Phase 1 W1 (FAST, depth 1).
**Scope**: Every Next.js route (`src/app/**/page.tsx`), every top-level component in `src/components/`, all modal/dialog surfaces.
**Method**: Source walk. No human test subjects yet — that's a later phase.
**Format**: one row per `(surface × friction)`.

---

## Executive summary

GRIP Commander ships 18 routes, a 12-item sidebar, 8-tab chat engine, Cmd+K palette, and a
rich bottom status bar. The engineering is dense; the surface is serious. The **gap** is
**signal fidelity and response feedback** — most ambient indicators render hardcoded defaults,
many interactions are silent, and the "hidden depth" (Vortex, rave, chime, pulse, sparkline)
is locked behind easter-egg discovery rather than curated onboarding.

Top three patterns:

1. **Fake ambient signals** — the `GripStatusBar` component renders 9 rich widgets
   (mode, skills, context %, streaming, model, duration, turns, sparkline, pulse,
   gates, elapsed, version) but the parent `page.tsx` passes only `skillCount`. All
   other widgets show hardcoded defaults (e.g. `contextPercent=23`, `activeMode="code"`,
   `safetyActive=true`, `"GRIP 0.1.0"`). A shipped v0.4.3 displays v0.1.0 in its chrome.
2. **Intent events dispatched into the void** — `CommandPalette.tsx:49` dispatches
   `grip:activate-skill` / `grip:run-command` via `window.dispatchEvent`, and the
   inline comment admits *"today they are unwired (no-op after the palette closes)"*.
   The best keyboard surface in the app routes users to a page instead of actually
   running the thing they picked.
3. **Delight locked behind easter eggs** — triple-click the logo → `/vortex`; `/coffee`
   route exists; rave/chime/pulse components exist; but nothing surfaces these to a
   new operator. Power features are present, discovery path is absent.

---

## Per-route friction

Severity scale: **H** = blocks core flow, **M** = degrades trust/confidence, **L** = minor polish.

### `/` — ENGINE (primary chat) — `src/app/page.tsx`

| # | Friction | Sev | Notes |
|---|----------|-----|-------|
| 1 | Status bar signals are cosmetic — only `skillCount` is live. `contextPercent`, `activeMode`, `safetyActive`, `isStreaming`, `model`, `totalDurationMs`, `numTurns`, `messageTimestamps` are all unwired from the parent page. | H | `page.tsx:253` passes `skillCount` only. `GripStatusBar.tsx` has 9 props, 8 defaulted. |
| 2 | `GRIP 0.1.0` string hardcoded in status bar footer while `package.json` says 0.4.3. New operators see a stale version on every screen. | H | `GripStatusBar.tsx:144`. |
| 3 | `WelcomeAnimation` shows on every mount (`showWelcome` init = `true`). Returning operators watch the same intro each launch. | M | `page.tsx:33`. No "dismiss forever" storage. |
| 4 | `MAX_TABS = 8` is a silent cap — attempting a 9th tab is a no-op with no toast, no explanation. | M | `page.tsx:24,126`. |
| 5 | Right panel is collapsible (280px ↔ 8px) but not resizable. Context + history content fight for the fixed 240px history footer. | L | `page.tsx:237`. |
| 6 | Tabs cannot be reordered, grouped, or pinned. No hover-preview of a tab's chat title. | M | `page.tsx:180`. |
| 7 | `health` polls every 30s via `electronAPI.grip.getHealth()`. No visible indicator while the request is in-flight or when it has failed silently (`catch {}` block). | M | `page.tsx:55`. |
| 8 | `createChatSession('sonnet')` always defaults to Sonnet even if operator's last tab was another model. No "inherit last choice". | L | `page.tsx:95`. |
| 9 | No visible state for "what mode stack is active" — Sidebar has no active-mode badge, status bar shows `activeMode="code"` hardcoded. Modes live entirely in `/modes` page. | H | Cross-cutting. |
| 10 | `FocusMode` toggle hides sidebar + status bar + right panel + mobile toolbar. No hint for how to return (keyboard shortcut? button?). | M | `FocusMode.tsx` needs separate read. |

### Sidebar — `src/components/Sidebar.tsx` (global on all routes)

| # | Friction | Sev | Notes |
|---|----------|-----|-------|
| 11 | 12 top-level items + 5 bottom items = 17 nav surfaces. No visual grouping, no pinned/recent. Every route has equal visual weight. | M | `Sidebar.tsx:29-42`. |
| 12 | No active-session indicator in nav (e.g. "3 agents running" next to AGENTS). Vault is the only item with a badge. | M | `Sidebar.tsx:96-110`. |
| 13 | Keyboard shortcuts shown in nav (`1` through `9`, `M`, `I`, `R`, `?`) but no global handler wires them. Hint without functionality. | H | Confirmed by searching the file — labels only. |
| 14 | "NEW SESSION" button calls `electronAPI.grip.createSession()` — different from Cmd+T new tab. Two "new session" paths with unclear distinction. | M | `Sidebar.tsx:196-208`. |
| 15 | Theme cycle is a single-direction button (no picker). Operator must cycle through N themes to pick one. | L | `Sidebar.tsx:209-228`. |
| 16 | Triple-click on logo → `/vortex`. Undiscoverable without source reading. | L | `Sidebar.tsx:136`. Classic easter egg, no affordance. |
| 17 | Status indicator at footer is always green "ONLINE" — no variation when Electron IPC is degraded, when grip-channel is off, etc. | M | `Sidebar.tsx:250-258`. |
| 18 | Animated stagger on mount (`navItemVariants`) fires on every route change, not just session start. Feels laggy on fast nav. | L | `Sidebar.tsx:155`. |

### CommandPalette (⌘K) — `src/components/CommandPalette.tsx`

| # | Friction | Sev | Notes |
|---|----------|-----|-------|
| 19 | Intent dispatch is unwired. Clicking a skill in the palette dispatches `grip:activate-skill` → routes to `/skills?highlight=...` instead of actually activating. Comment says *"today they are unwired (no-op after the palette closes)"*. | H | `CommandPalette.tsx:49-52, 106-110`. |
| 20 | Slash-command list: clicking `/save` routes to `/` and dispatches a run-event no-one listens for. Operator sees the engine screen with nothing happening. | H | `CommandPalette.tsx:81-84`. |
| 21 | No preview pane. Long descriptions truncate with `.truncate` — palette is information-thin. | M | `CommandPalette.tsx:316-319`. |
| 22 | `MAX_RECENT = 5` is fine, but "recent" across sessions bleeds into every project. No project-scoped recents. | L | `CommandPalette.tsx:21`. |
| 23 | No fuzzy scoring visible — matches are binary `.includes()`. "shipit" matches but "ship" doesn't unless description also has it. | M | `CommandPalette.tsx:159-161`. |
| 24 | No keyboard hints for categories (e.g. `Tab` to cycle MODES → SKILLS). All nav is ↓/↑ through a flat list. | L | `CommandPalette.tsx:227`. |
| 25 | No inline action indicators — the "ENTER" hint only appears on the selected row. Operator can't tell which rows are nav vs. which trigger Electron actions vs. which are intent-events. | M | `CommandPalette.tsx:321-325`. |

### `/agents` — Agent list

| # | Friction | Sev | Notes |
|---|----------|-----|-------|
| 26 | `DesktopRequiredMessage` component exists → implies the web build shows a block-and-explain rather than a degraded-but-usable view. Guild/Slack readers who hit localhost:3000 get walled off. | M | `components/AgentList/DesktopRequiredMessage.tsx`. |
| 27 | `StartPromptModal` is a modal on top of the list — no inline "quick-start" row at the top of the list. | L | |
| 28 | No global "+ New Agent" affordance visible from anywhere other than this page (palette has nav-only action). | M | |

### `/kanban` — Task board

| # | Friction | Sev | Notes |
|---|----------|-----|-------|
| 29 | Column config unknown from component list (`KanbanColumn`, `KanbanCard`, `KanbanDoneSummary`). Need to check if columns are customisable or fixed. | L | Deferred — not blocking for W1. |
| 30 | `NewTaskModal` is the only path to create — no inline "add card" row per column (standard Trello/Linear pattern). | M | |

### `/vault` — Document storage

| # | Friction | Sev | Notes |
|---|----------|-----|-------|
| 31 | `vaultUnreadCount` surfaces on sidebar but the vault page itself may or may not have a "mark all read" flow. Needs inspection. | L | `Sidebar.tsx:66`. |
| 32 | `ObsidianVaultView` component exists alongside `VaultView` — duplicate code paths or variant? Ambiguous to operator. | M | |

### `/skills` — Skill browser

| # | Friction | Sev | Notes |
|---|----------|-----|-------|
| 33 | `?highlight=<id>` query param is the Cmd+K-to-skills handoff — no visible ripple/scroll-into-view on arrival would be a polish win. | L | `CommandPalette.tsx:109`. |
| 34 | `GRIP_SKILLS.length` is ~210 per CLAUDE.md. Palette slices to 20; the `/skills` page needs a fast filter surface to avoid being a 200-row list. | M | Needs inspection. |

### `/modes` — Mode stack

| # | Friction | Sev | Notes |
|---|----------|-----|-------|
| 35 | Toggling via palette calls `/api/grip/modes` — success/failure silent (`try/catch {}` block: *"silent — matches the page's existing silent fail posture"*). No toast on failure. | H | `CommandPalette.tsx:369-371`. |
| 36 | `MAX_ACTIVE_MODES = 5` silently evicts the oldest when 6th is toggled — no confirm, no warning. | M | `CommandPalette.tsx:355-361`. |

### `/automations` + `/recurring-tasks`

| # | Friction | Sev | Notes |
|---|----------|-----|-------|
| 37 | Two separate surfaces for "scheduled work" — `AUTOMATIONS` (href `/automations`) and `SCHEDULED` (href `/recurring-tasks`). Distinction unclear from sidebar labels alone. | M | `Sidebar.tsx:36-37`. |
| 38 | Recurring tasks has its own modals (`CreateTaskModal`, `EditTaskModal`, `LogsModal`) + `FilterBar` + `Toast` — heaviest route by component count. Risk of being a nested sub-app rather than a surface. | L | |

### `/memory` — Knowledge graph

| # | Friction | Sev | Notes |
|---|----------|-----|-------|
| 39 | `AgentKnowledgeGraph` is the only component. No tabular view, no search, no filter visible from component list. | M | |

### `/insights`, `/usage`, `/roadmap`

| # | Friction | Sev | Notes |
|---|----------|-----|-------|
| 40 | These read as "dashboard pages" but don't appear to feed the main status bar. Signal silos. | M | |

### `/learn`, `/learn/concepts`, `/learn/walkthrough`

| # | Friction | Sev | Notes |
|---|----------|-----|-------|
| 41 | Three-route learning flow — no unified progress indicator ("2 of 3 walkthrough steps done") visible from sidebar. | L | |

### `/settings`

| # | Friction | Sev | Notes |
|---|----------|-----|-------|
| 42 | Settings split from the theme-cycle button at sidebar footer. Theme is a global preference — splitting its surface from the Settings route is fragmented. | L | |

### `/coffee` — easter egg

| # | Friction | Sev | Notes |
|---|----------|-----|-------|
| 43 | Discoverable only via direct URL or palette `HIDDEN` category. Not linked from anywhere else. | L | Intentional — but worth cataloguing. |

### `/vortex` — knowledge double helix

| # | Friction | Sev | Notes |
|---|----------|-----|-------|
| 44 | Reachable by triple-click on logo OR palette HIDDEN. Zero onboarding. | L | `Sidebar.tsx:136`. |

---

## Cross-cutting friction

### Feedback & affordances

| # | Friction | Sev | Notes |
|---|----------|-----|-------|
| 45 | Silent failures are systemic. Multiple files declare `try { … } catch { /* silently fail */ }` (health poll, localStorage, mode-toggle API, command-palette intent dispatch). Good-path works, bad-path is invisible. | H | Grep will turn up ≥ 6 instances; the pattern is encoded as an *aesthetic*. |
| 46 | No global toast system observable from the survey — `KeyboardToast` exists but is keyboard-specific. | M | `KeyboardToast.tsx`. |
| 47 | No "undo" affordance after any destructive action (delete tab, delete task, clear recents, etc.). | M | |
| 48 | No inline progress feedback during slash-command execution because the commands aren't actually executing. See #19, #20. | H | |

### Ambient signal

| # | Friction | Sev | Notes |
|---|----------|-----|-------|
| 49 | `GripPulse` component exists and renders in the status bar, but with no observable input — it's ornamental. Real session vitals (gen, fitness, convergence depth) never reach it. | H | `GripStatusBar.tsx:127`. |
| 50 | `SessionSparkline` only renders when `messageTimestamps.length >= 2`. The parent page doesn't pass timestamps. So nobody ever sees it. | H | `GripStatusBar.tsx:117-121`. |
| 51 | `ConvergenceIndicator`, `GateIndicator`, `RetrievalTierIndicator`, `ThinkingIndicator` all exist as components. Unclear which ChatInterface actually mounts. Need a "signals currently live on screen" map. | M | |
| 52 | Fitness is fetched (`data.fitness`) and ignored in render. 0.467 fitness is a talking point, invisible today. | M | `page.tsx:51`. |

### Keyboard

| # | Friction | Sev | Notes |
|---|----------|-----|-------|
| 53 | Sidebar shows number-shortcut hints (`1`–`9`, `M`, `I`, `R`, `?`, `N`, `T`) — the only ones actually handled are ⌘T / ⌘W / ⌘1–9 (tab mgmt in `page.tsx`) and ⌘K (palette). The rest are visual lies. | H | Cross-checked by grepping for `handleKey` in Sidebar — none. |
| 54 | No `KeyboardShortcutsHelp` overlay keybinding (`?` hint shown but not confirmed wired). | L | `KeyboardShortcutsHelp.tsx`. |
| 55 | Focus mode has no keyboard toggle visible in the source. Mouse-only. | M | |

### Onboarding & discovery

| # | Friction | Sev | Notes |
|---|----------|-----|-------|
| 56 | `SUGGESTED_PROMPTS` (4 items) are hardcoded in `ChatInterface.tsx:47-52`. They never adapt to project, past use, or active mode. | M | |
| 57 | Welcome animation plays once per tab-mount then fades. No "here's what's new" changelog surface at that moment. | L | |
| 58 | No spotlight for novel features (rave, chime, vortex, coffee, pulse, sparkline). | H | Root cause of the brief: dev team shipped delight components, nobody sees them. |

### Performance signals

| # | Friction | Sev | Notes |
|---|----------|-----|-------|
| 59 | `FPSCounter` component ships — is it dev-only or user-visible? If user-visible, it's naked dev-ergonomics leak. | L | Need to grep usages. |
| 60 | Tabs CSS-hidden but mounted (good for state-preservation) — nothing informs operator that 8 tabs = 8× memory cost. | L | `page.tsx:195-206`. |

### Accessibility & motion

| # | Friction | Sev | Notes |
|---|----------|-----|-------|
| 61 | `useReducedMotion` honoured in Sidebar and ChatInterface — good. But `WelcomeAnimation` + `grip-logo-heartbeat` likely not. | M | `Sidebar.tsx:67,140`. |
| 62 | Focus-visible styles not inspected. Tab-through experience unknown. | M | Defer to a11y pass. |

### Version & brand

| # | Friction | Sev | Notes |
|---|----------|-----|-------|
| 63 | `GRIP` label + `COMMANDER` subtitle in sidebar, `GRIP 0.1.0` in status bar. Brand naming inconsistent across the same screen. | L | `Sidebar.tsx:144-148`, `GripStatusBar.tsx:144`. |

---

## Top 15 friction items, ranked

1. **#1** — Status bar ambient signals are hardcoded, not wired. Core delight surface is fake.
2. **#19/#20** — Cmd+K slash commands and skill activation are unwired window-events. Best keyboard surface is a lie.
3. **#2** — v0.1.0 footer on a v0.4.3 app. Stale version visible every frame.
4. **#49/#50/#52** — Pulse, sparkline, fitness — all built, none rendered with real data.
5. **#53** — Sidebar shortcut hints aren't wired. Visual lies on every route.
6. **#9** — Active mode stack invisible outside `/modes` page.
7. **#35/#36** — Mode toggle failures silent. Silent 5-mode eviction.
8. **#45** — Systemic silent catches across hook, IPC, API paths.
9. **#58** — Novel features (rave, chime, vortex) have zero discovery path.
10. **#56** — Suggested prompts static, never adapt.
11. **#13** — Keyboard hints shown without handlers — trust hazard.
12. **#3** — Welcome animation replays every launch.
13. **#6** — No tab reorder/group/pin.
14. **#10** — FocusMode exit path unclear.
15. **#26** — Web build walls off agent features entirely.

## Open questions (defer to W2/W3)

- Which `Engine/*Indicator` components are currently mounted on the chat screen? (Need to scan `ChatInterface.tsx` past line 120 for the full render tree.)
- What does `ContextPanel` surface? Is it redundant with the status bar or complementary?
- `Vortex` and `coffee` — if we're cataloguing delight, they should be brought forward; are they good today or embryonic?

These inform W3 (ideation) more than W1 (audit) so they're parked here as lanes to pull on.
