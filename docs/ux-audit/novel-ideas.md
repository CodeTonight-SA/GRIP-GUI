# Novel Delight Ideas — GRIP Commander

**Phase 1 / W3 — CAREFUL, depth 2.**
Source: W1 inventory (`inventory.md`) + domain knowledge + plan seed examples.
Competitive research (W2) running in parallel and will be merged before W4 council.

## Method

Each idea is grounded in one of three signals:

1. **W1 friction closure** — fixes a specific `#N` friction item.
2. **Infrastructure reuse** — unlocks capability that *already exists* in the codebase
   but is unrendered, undiscovered, or unwired.
3. **New surface** — genuinely new pattern not present in the current app.

Cost scale: **XS** (≤2h), **S** (half-day), **M** (1 dev-day), **L** (2+ dev-days).
Delight-leverage: 1–10, subjective estimate calibrated to operator reaction. Anchored
by the plan's primary metric (session retention + novel-feature adoption + unprompted
mentions).

---

## Ideas

### 1. Live-wire the status bar

**Hook**: Connect `GripStatusBar`'s 9 signal widgets to real session state (context %,
active mode, streaming flag, metrics, timestamps, safety) instead of hardcoded defaults.
The bar is built — it's just disconnected.

- Cost: **S**
- Leverage: **9**
- Prereq: hoist session state into `/` page; already-polled `health` adds `contextPercent` lane.
- Closes W1 #1, #2, #49, #50, #52, #63.

### 2. Sidebar mode-stack chip

**Hook**: Above the nav list, a one-line chip showing the active mode stack
(`code · architect · ultrathink`). Click → palette opens to MODES preset. Now the
operator *sees* which compose they're in without routing to `/modes`.

- Cost: **XS**
- Leverage: **8**
- Prereq: `/api/grip/modes` GET already exists (see `CommandPalette.tsx:351-354`).
- Closes W1 #9, #11.

### 3. Cmd+K actually executes

**Hook**: Wire `grip:run-command` → inject the slash-command into the ChatInterface
input + auto-focus + optional one-key confirm. Replace the "dispatched-into-the-void"
pattern (confirmed at `CommandPalette.tsx:49`). The best keyboard surface becomes the
best workflow surface.

- Cost: **M**
- Leverage: **10**
- Prereq: ChatInterface listener for `grip:run-command`; inject logic around input state.
- Closes W1 #19, #20, #25, #48. This is the single highest-impact fix in the app.

### 4. Sidebar shortcut handler

**Hook**: Wire global `1`–`9`, `M`, `I`, `R`, `?`, `N`, `T` keys to the routes the
sidebar claims they open. Stop visually lying.

- Cost: **XS**
- Leverage: **7**
- Prereq: global keydown listener in `ClientLayout` (scoped to exclude inputs).
- Closes W1 #13, #53.

### 5. GripPulse driven by fitness

**Hook**: The ornamental pulse in the status bar drives its tempo + hue from
`genome.fitness` (today's 0.467 → slow amber breath; 0.8+ → crisp green heartbeat;
< 0.3 → slow red). Peripheral-vision signal of system vitality.

- Cost: **S**
- Leverage: **7**
- Prereq: fitness lifted into page state (already fetched, ignored at render).
- Closes W1 #49, #52.

### 6. Session activity sparkline

**Hook**: Pass `messageTimestamps` into the status bar sparkline. Operators see the
tempo of the current session at a glance — rising line = burst, flat = idle, spike = rescue.

- Cost: **XS**
- Leverage: **6**
- Prereq: collect message timestamps from `GripMessage[]` (already tracked).
- Closes W1 #50.

### 7. Rave-mode milestone fireworks

**Hook**: On PR merge, wave completion, or genome-fitness peak, the existing `/rave`
skill fires: a brief 3-second full-width celebration strip across the top with
Italian-brainrot narration. Auto-dismisses. The skill exists (task #1062) — this wires
it into UI events.

- Cost: **S**
- Leverage: **9**
- Prereq: milestone detector in main process; IPC event to renderer; skill invocation.
- Closes W1 #58. Uncorks the "nobody sees our delight features" problem.

### 8. Two-tone chime on wave transition

**Hook**: `lib/handoff_chime.py` (task #1063) generates a two-tone WAV. Play it
in-renderer at Fibonacci-wave boundaries. Audio delight is instant, cheap, deniable.

- Cost: **XS**
- Leverage: **8**
- Prereq: IPC bridge exposes WAV path; renderer `new Audio()` call.
- Closes W1 #58.

### 9. ANSI-art phase transitions

**Hook**: When `/ultrado` begins a new phase, a terminal-art block (4–6 lines)
injects into the chat marking the boundary. Steals from helix/lazygit ceremony.
Different art per phase type (DISCOVER / DESIGN / MEASURE).

- Cost: **S**
- Leverage: **7**
- Prereq: phase-change detector; art library (can be hand-authored, ~6 variants).

### 10. Hypothesis verdict ticker

**Hook**: Thin horizontal strip above the chat showing live hypothesis states
(`H-UX1 pending · H046 confirmed · H089 filed · H090 pending`). Makes the falsification
engine *visible*. Scrolls on new verdicts.

- Cost: **M**
- Leverage: **8**
- Prereq: tail `learning/hypotheses.jsonl` via main-process watcher + IPC.
- Closes W1 #58 (falsification is invisible today).

### 11. Typography two-column craft

**Hook**: Zed-style proportional/mono mix — Inter or SF Pro for prose, JetBrains Mono
for code + system labels. Today's all-mono Swiss Nihilism reads telnet. Retain the
mono for status chrome (it's the aesthetic), soften the prose.

- Cost: **M**
- Leverage: **8**
- Prereq: font loader + tailwind config + conditional class in `MarkdownContent`.
- Closes W1 #11.

### 12. Palette preview pane

**Hook**: 40% right pane of the palette shows hovered row's full description + doc
URL + "last run" timestamp. Steals from Raycast. Turns the palette from index into
reference surface.

- Cost: **M**
- Leverage: **7**
- Prereq: extend `CommandPalette` layout; description sources already exist.
- Closes W1 #21.

### 13. Recent-session thumbnails

**Hook**: Right-panel HISTORY shows 3-line preview per session (title + first-message
snippet + last-tool icon). Re-entry speed doubles. Replaces today's title-only list.

- Cost: **S**
- Leverage: **7**
- Prereq: reuse persisted message arrays.

### 14. Tab hover-peek

**Hook**: Hovering a tab for 300ms shows the current message head (2 lines) +
streaming status. Zero-click context. Steals from Arc's tab-hover.

- Cost: **S**
- Leverage: **6**
- Prereq: `ChatTabBar` onMouseEnter + portal.

### 15. Mode-stack Venn visualiser

**Hook**: The `/modes` page shows which *skills* the current stack activates as a
Venn diagram. Operators *see composition* rather than memorise it.

- Cost: **L**
- Leverage: **7**
- Prereq: skills-per-mode registry; D3 or simple SVG.

### 16. /save-exit session postcard

**Hook**: At session end, generate a shareable 1200×630 PNG: time, PRs merged, waves,
fitness delta, top insights. Copied to clipboard. Operators tweet/slack their days
without friction.

- Cost: **M**
- Leverage: **8**
- Prereq: existing session-summary data; canvas renderer.
- Closes W1 #58.

### 17. DELIGHT-driven ambient hue

**Hook**: Sidebar border colour + status-bar accent modulate by DELIGHT v2 score
(green → amber → red). Never interruptive — peripheral only. Flow state is visible
in the chrome.

- Cost: **M**
- Leverage: **6**
- Prereq: expose DELIGHT score via IPC.
- Closes W1 #51.

### 18. Timeline scrubber

**Hook**: Horizontal timeline strip under the chat. Drag to rewind. Each message is
a tick; tool calls are denser ticks; gate fires are coloured. Scrub-review of the
session like a video.

- Cost: **L**
- Leverage: **8**
- Prereq: render immutable message array with virtual scroll; no rewrite of store.

### 19. Tool-use summary badge

**Hook**: After every tool call, a one-line 5-word summary badge trails it ("Read
3 files", "Grep for `toUserId`"). Scan-readable history. Today tool results need click-expand.

- Cost: **S**
- Leverage: **7**
- Prereq: LLM or heuristic summariser; already have `ToolUseBlock`.

### 20. @project / @agent / #tag autocomplete

**Hook**: Type `@` in chat input → popover of known projects; `@@` → agents; `#` →
tags. Cursor's approach applied to orchestration. Grounds prompts in state.

- Cost: **L**
- Leverage: **8**
- Prereq: enumerate projects/agents/tags from Electron IPC.

### 21. Context-gate slide-up

**Hook**: At 85% context, the status bar doesn't just turn red — it slides up into a
full-width action strip offering `Compact | Fresh Session | Checkpoint`. Action at the
point of fear, not buried in settings.

- Cost: **M**
- Leverage: **8**
- Prereq: real `contextPercent` (idea #1) + action routing.
- Closes W1 #1 (follow-on).

### 22. Welcome-once + changelog card

**Hook**: Persist welcome dismissal in localStorage. On version-bump (detect via
package.json + stored-last-seen), inject a 3-line changelog card with "Tour new features".

- Cost: **S**
- Leverage: **6**
- Prereq: version-stamp storage.
- Closes W1 #3, #57.

### 23. Vortex hint teaser

**Hook**: First 10s of a fresh install, a subtle ghost-text under the logo whispers
"triple-click to enter Vortex". Discovery without sacrificing mystique.

- Cost: **XS**
- Leverage: **6**
- Prereq: first-run localStorage flag.
- Closes W1 #44.

### 24. Multi-model compare overlay

**Hook**: Hold `⌘` on a streamed assistant message → overlay showing the same prompt's
last response from other providers (cost, latency, content diff). Cursor/JetBrains diff
pane applied to LLM output.

- Cost: **L**
- Leverage: **6**
- Prereq: multi-provider run pipeline; deferred unless Fleet already supports this.

### 25. Genome diff panel at session end

**Hook**: At `/save`, small SVG showing which genome genes moved, by how much, with
fitness delta. Puts the recursive self-improvement claim in front of the operator.

- Cost: **L**
- Leverage: **7**
- Prereq: genome snapshot at session start; diff at end.

### 26. Conversation minimap

**Hook**: Right-edge 16px column renders tool-use density per minute as a Sublime-style
minimap. Long chats become navigable.

- Cost: **M**
- Leverage: **6**
- Prereq: message array → density bins.

### 27. Smart copy-as-markdown

**Hook**: Copy any tool result → paste into blog/doc as rich markdown + citation.
Nicety for sharing findings.

- Cost: **S**
- Leverage: **5**
- Prereq: clipboard formatting helper; markdown already rendered.

### 28. Dock-icon heartbeat (macOS)

**Hook**: Electron dock icon pulses while a session is active — heartbeat slower at
idle, faster during streaming, red when gate fires. Ambient status that outlives the
window focus.

- Cost: **M**
- Leverage: **6**
- Prereq: Electron native-image API; tray/dock.

### 29. Retrieval-tier chip above input

**Hook**: Small chip above chat input lights up on last retrieval:
`🧠 TIER 0` (memory hit), `🔍 TIER 3` (Grep), `🚀 TIER 4` (Explore agent). Makes
GRIP Rule 0 tangible — operators *feel* the cost.

- Cost: **S**
- Leverage: **8**
- Prereq: retrieval-tier telemetry from hooks (already emitted).
- `RetrievalTierIndicator` component exists — just needs wiring.

### 30. Gate-fire log strip

**Hook**: Collapsible right-edge strip of recent gate fires with timestamp + gate ID +
verdict chip. Operators see *what the gates are doing* in real time, not in logs
post-hoc.

- Cost: **S**
- Leverage: **7**
- Prereq: IPC event stream from context-gate hook; `GateIndicator` component exists.
- Closes W1 #51.

---

## Ranked by leverage-per-cost

Cost numeric: XS=1, S=2, M=3, L=4. Score = `leverage / cost_numeric`.

| Rank | # | Idea | Leverage | Cost | Score | W1 closes |
|------|---|------|----------|------|-------|-----------|
| 1 | 2 | Sidebar mode-stack chip | 8 | XS | 8.0 | #9, #11 |
| 2 | 8 | Two-tone chime on wave transition | 8 | XS | 8.0 | #58 |
| 3 | 4 | Sidebar shortcut handler | 7 | XS | 7.0 | #13, #53 |
| 4 | 6 | Session activity sparkline | 6 | XS | 6.0 | #50 |
| 5 | 23 | Vortex hint teaser | 6 | XS | 6.0 | #44 |
| 6 | 1 | Live-wire the status bar | 9 | S | 4.5 | #1,2,49,50,52,63 |
| 7 | 7 | Rave-mode milestone fireworks | 9 | S | 4.5 | #58 |
| 8 | 29 | Retrieval-tier chip | 8 | S | 4.0 | #51 |
| 9 | 5 | GripPulse driven by fitness | 7 | S | 3.5 | #49, #52 |
| 10 | 9 | ANSI-art phase transitions | 7 | S | 3.5 | — |
| 11 | 13 | Recent-session thumbnails | 7 | S | 3.5 | — |
| 12 | 19 | Tool-use summary badge | 7 | S | 3.5 | — |
| 13 | 30 | Gate-fire log strip | 7 | S | 3.5 | #51 |
| 14 | 3 | Cmd+K executes, not navigates | 10 | M | 3.3 | #19, #20, #25, #48 |
| 15 | 11 | Typography two-column craft | 8 | M | 2.7 | #11 |
| 16 | 10 | Hypothesis verdict ticker | 8 | M | 2.7 | #58 |
| 17 | 16 | Session postcard at /save-exit | 8 | M | 2.7 | #58 |
| 18 | 21 | Context-gate slide-up | 8 | M | 2.7 | #1 follow-on |
| 19 | 14 | Tab hover-peek | 6 | S | 3.0 | — |
| 20 | 22 | Welcome-once + changelog card | 6 | S | 3.0 | #3, #57 |
| 21 | 27 | Smart copy-as-markdown | 5 | S | 2.5 | — |
| 22 | 12 | Palette preview pane | 7 | M | 2.3 | #21 |
| 23 | 17 | DELIGHT-driven ambient hue | 6 | M | 2.0 | #51 |
| 24 | 26 | Conversation minimap | 6 | M | 2.0 | — |
| 25 | 28 | Dock-icon heartbeat | 6 | M | 2.0 | — |
| 26 | 18 | Timeline scrubber | 8 | L | 2.0 | — |
| 27 | 20 | @project / @agent / #tag | 8 | L | 2.0 | — |
| 28 | 15 | Mode-stack Venn | 7 | L | 1.75 | — |
| 29 | 25 | Genome diff panel | 7 | L | 1.75 | — |
| 30 | 24 | Multi-model compare overlay | 6 | L | 1.5 | — |

---

## Top 10 shortlist for W4 council

Cherry-picked: high leverage-per-cost **AND** at least one of {closes multiple W1 items,
unlocks existing infra, advances the "delight engine behind plain dashboard" thesis}.

1. **#3 — Cmd+K executes** (10/M, closes 4 frictions, *the* highest-impact fix)
2. **#1 — Live-wire the status bar** (9/S, closes 6 frictions, unlocks existing component)
3. **#2 — Sidebar mode-stack chip** (8/XS, closes 2 frictions)
4. **#7 — Rave on milestone** (9/S, surfaces existing skill)
5. **#8 — Two-tone chime** (8/XS, surfaces existing lib)
6. **#10 — Hypothesis verdict ticker** (8/M, surfaces existing falsification engine)
7. **#29 — Retrieval-tier chip** (8/S, surfaces existing component + Rule 0 visible)
8. **#11 — Typography craft** (8/M, aesthetic uplift)
9. **#4 — Sidebar shortcut handler** (7/XS, fixes visual-lie trust hazard)
10. **#21 — Context-gate slide-up** (8/M, action-at-point-of-fear)

Five of ten unlock *existing infra that ships but isn't rendered* — the plan's thesis
made concrete.

---

## W2 enrichment (added after competitive research)

Six additional ideas surface from `competitive.md`. All merit W4 consideration; two
(#31, #32) are deep shape-changes and may reshape the Phase 2 backlog priority rather
than sit alongside it.

### 31. Block-based transcript (Warp pattern)

**Hook**: Each user turn, tool call, and agent reply becomes a structured block with
metadata (exit code, duration, cost, model), filterable by type, permalinkable,
exportable as markdown. Replaces today's free-flowing stream with a navigable ledger.

- Cost: **L**
- Leverage: **9**
- Prereq: render refactor in `ChatInterface` + block metadata schema.
- Note: Warp calls this "Blocks" — Commander's equivalent would be the single largest
  shape change in v0.5. Caution: L-cost violates the H-UX1 "≤1 dev-day each" test.
  Recommended: Phase 2 Wave 1 scope expansion OR split into `block-shell` (S) +
  `block-metadata` (M) + `block-actions` (S) sub-waves.

### 32. Plan + Execute two-column view (Junie pattern)

**Hook**: Split the active chat pane: left column = plan tree (ticked steps from
`plans/*.md`), right = live action stream, bottom = files-touched panel with per-file
revert. Productises GRIP's existing plan workflow.

- Cost: **L**
- Leverage: **9**
- Prereq: plan-file parser; tool-result file-touch extractor (both already exist in
  session-state libs).
- This is the biggest **GRIP-alignment** win — the plan doc becomes a live object
  alongside execution, not a disposable input.

### 33. Agent Following + file peek (Zed pattern)

**Hook**: Auto-scroll transcript to the active tool call; show the file being edited
in a side peek with live cursor highlight. Kills "is it still working?" anxiety in
long RSI loops.

- Cost: **M**
- Leverage: **8**
- Prereq: file-activity signal from Edit/Write tool events; side-panel layout.
- Pairs cleanly with #32 (same side-panel real estate).

### 34. `/recap` card on tab return (Claude Code pattern)

**Hook**: When a tab becomes active after being idle-waiting-on-user, show a 3–4 line
recap ("last action: ran Vitest, 47/47 pass · waiting on you to approve migration").
Fights forgotten-blocked-tab syndrome.

- Cost: **S**
- Leverage: **7**
- Prereq: visibilitychange listener; summariser hook.

### 35. Hover preview on in-transcript links (Obsidian pattern)

**Hook**: Hover any filepath, skill name, PR reference, or plan link in the chat
transcript → floating preview showing the target's first 20 lines. No click, no tab
pollution.

- Cost: **S**
- Leverage: **7**
- Prereq: link detection already partial in `MarkdownContent`; add popover component.

### 36. Space-mode which-key (Helix + Obsidian pattern)

**Hook**: Press a prefix (Space or `,`), a sticky picker shows labelled next-keys
(`g` git, `s` skills, `m` mode, `w` worktree). Solves discoverability for
56 commands + 210 skills + 39 agents without rote memorisation.

- Cost: **M**
- Leverage: **8**
- Prereq: prefix keymap; reusable which-key picker component.
- Synergy with #3 and #4 — this *replaces* ad-hoc single-key shortcuts with a
  structured prefix tree and makes #4 largely redundant if adopted together.

---

## Revised Top 10 shortlist for W4 council (post-W2)

Re-weighted to incorporate the six competitive-research additions. Keeps the
"unlock existing infra" bias while making room for the two shape-changers.

| Rank | # | Idea | Leverage | Cost | Notes |
|------|---|------|----------|------|-------|
| 1 | 3 | Cmd+K executes, not navigates | 10 | M | Highest-impact fix; blocks removal of other palette ideas |
| 2 | 1 | Live-wire the status bar | 9 | S | Closes 6 W1 frictions |
| 3 | 32 | Plan + Execute two-column view | 9 | L | Biggest GRIP-alignment win; L-cost → split-wave candidate |
| 4 | 7 | Rave on milestone | 9 | S | Surfaces existing `/rave` skill |
| 5 | 2 | Sidebar mode-stack chip | 8 | XS | Biggest leverage-per-XS |
| 6 | 8 | Two-tone chime on wave transition | 8 | XS | Surfaces existing `handoff_chime` lib |
| 7 | 33 | Agent Following + file peek | 8 | M | Pairs with #32; kills wait-anxiety |
| 8 | 29 | Retrieval-tier chip above input | 8 | S | Surfaces Rule 0 + existing component |
| 9 | 36 | Space-mode which-key | 8 | M | Replaces/unifies #4 keyboard shortcut work |
| 10 | 21 | Context-gate slide-up | 8 | M | Action at point of fear |

**Bumped out of top 10 vs initial list**: #10 hypothesis ticker (still compelling —
moved to "stretch"); #11 typography (polish layer, not phase-1); #4 sidebar shortcut
handler (subsumed by #36).

**Stretch candidates (not in top 10 but cheap-enough to slip)**:
- #4 (XS) and #6 session-sparkline (XS) — tiny; can ride a larger wave.
- #23 Vortex hint teaser (XS) — zero-risk delight.
- #34 `/recap` card (S) — pairs with tab UX work.

---

## Out of scope for Phase 2

These survive ideation but defer:

- **#15 Mode Venn** — worth doing but needs skills-per-mode registry first (Phase 3+).
- **#18 Timeline scrubber** — L cost; test hunger for it after Phase 2 ships.
- **#24 Multi-model overlay** — depends on Fleet pipeline maturity (HAL #116).
- **#28 Dock heartbeat** — cross-platform complexity not justified yet.

Deferring is explicit — YAGNI applied. Next session's Phase 2 focuses on the Top 10.
