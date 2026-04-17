# Phase 2 Backlog — GRIP Commander v0.5.0 Delight Sprint

**Prepared by**: Phase 1 / W4 Broly council (2026-04-18).
**Source docs**: `docs/ux-audit/{inventory,competitive,novel-ideas,council-verdict}.md`.
**For**: Phase 2 executor — follow the `/mode code,architect,ui-complete` entrypoint from
`~/.claude/plans/grip-commander-tui-delight-rsi.md`.

## Shortlist — 5 survivors of the council

Ranked by leverage per cost. Each item includes: the hook, the W1 friction it closes,
the scope rider the council imposed, a falsifiable hypothesis, and the smallest
shippable slice.

---

### S1 — `#3` Cmd+K executes, not navigates

**Hook**: Wire the `grip:run-command` / `grip:activate-skill` window events that
today dispatch into the void. Injecting a chosen slash-command into the active
`ChatInterface` tab's input turns the best keyboard surface into the best workflow
surface.

- **Closes W1**: #19, #20, #25, #48 (4 H-severity items — the largest single fix).
- **Council scope rider (Devil's Advocate)**: must include a **pending-intent
  queue keyed by tab ID** so an unmount-during-dispatch doesn't drop the injection
  silently. Don't trade one silent failure for another.
- **Pragmatist slice**: PR1 ships *injection + focus only*, no auto-submit. Feature
  flag `GRIP_PALETTE_EXECUTE=1` for one release before default-on.
- **Rollback**: flip the env flag; event listeners become no-op.
- **Hypothesis H-UX1a** (falsifies this feature):
  > Post-ship, `>= 60%` of Cmd+K invocations that select a `COMMANDS` or `PARAMOUNT`
  > category item result in a message submission within 30s (i.e. the injected
  > command is used, not abandoned). Falsified if < 60% or if abandonment rate
  > exceeds 40%.
- **Telemetry needed**: palette-pick event + following message-submit event, both
  timestamped.
- **Cost**: M (1 dev-day). Council verdict borderline on "≤ 1 day" clause of H-UX1;
  time the slice tightly.

### S2 — `#1` Live-wire the status bar

**Hook**: The `GripStatusBar` component already renders nine widgets (mode, skills,
context %, streaming, model, duration, turns, sparkline, gates, elapsed, version).
The parent passes only `skillCount`. Wire the rest to real session state.

- **Closes W1**: #1, #2 (stale v0.1.0), #49 (ornamental pulse), #50 (hidden sparkline),
  #52 (ignored fitness), #63 (inconsistent branding). 6 frictions in one move.
- **Council scope rider (Devil's Advocate)**: until first authoritative reading,
  render `--` for each widget rather than a placeholder number. An *honestly blank*
  gauge is safer than a calibration error.
- **Pragmatist slice**:
  - PR1 (XS): `contextPercent` + correct `version` from `package.json`.
  - PR2 (S): `activeMode` + `model`.
  - PR3 (S): metrics, timestamps, sparkline.
- **Rollback per PR**: keep defaulted prop fallback; widget falls back to stale.
- **Hypothesis H-UX1b**:
  > In a 7-day A/B (wired vs hardcoded), operators glance at the status bar >= 2×
  > more often (measured by mouse hover-dwell > 200ms over the bar region). Falsified
  > if hover-dwell ratio < 1.5×.
- **Telemetry**: pointer-dwell listener on `GripStatusBar` region, opt-in analytics.
- **Cost**: S (≤ 1 dev-day for PR1 alone — the ≤ 1-day H-UX1 anchor).

### S3 — `#2` Sidebar mode-stack chip

**Hook**: Thin chip above the nav list shows the active stack (`code · architect ·
ultrathink`). Click → palette opens to `MODES` preset. Mode is visible from anywhere.

- **Closes W1**: #9, #11 (active mode invisible outside `/modes`; 12-item sidebar
  undifferentiated).
- **Council scope rider (Devil's Advocate)**: read GET `/api/grip/modes` fresh on
  every nav change. No cached state — if the toggle silently fails (W1 #35), the
  chip reflects reality rather than intent.
- **Pragmatist slice**: ship as read-only pill; click-handler opens palette MODES
  preset using the existing `grip:open-palette` window event.
- **Rollback**: CSS-hide via `sidebarShowModeChip` flag.
- **Hypothesis H-UX1c**:
  > Post-ship, `/modes` page-view rate drops by >= 30% (visits fall because the
  > chip answers the common question). Falsified if `/modes` page-view rate
  > unchanged or increases.
- **Telemetry**: route-visit counter (already present via Next.js telemetry hook).
- **Cost**: XS (< half-day). The cleanest ≤ 1-day anchor for H-UX1.

### S4 — `#29` Retrieval-tier chip above the chat input

**Hook**: A small chip appears above the input after each retrieval, lighting up the
tier that fired. Today's tier telemetry is emitted by GRIP hooks but discarded by the UI.
Makes Rule 0 (GRIP-First Thinking) *felt*.

- **Closes W1**: #51 (indicator component exists, unwired).
- **Council scope rider (Devil's Advocate)**: replace jargon. Labels become "memory
  hit / quick lookup / file search / deep search" — NOT "TIER 0 / TIER 1 / TIER 3 /
  TIER 4". Rule 17 (plain language) is binding.
- **Pragmatist slice**: ship with 2 labels ("cached" vs "searched") in PR1, upgrade
  to 4-way detail in a follow-on.
- **Rollback**: hide the chip via `RETRIEVAL_CHIP=off`.
- **Hypothesis H-UX1d**:
  > In a 14-day window, operator self-report (single in-app "did this help" Y/N)
  > on retrievals with a visible chip beats no-chip baseline by `>= 20 percentage
  > points` positive. Falsified if no difference or worse.
- **Telemetry**: chip-render count + tiny thumbs Y/N prompt (opt-in, once per
  session).
- **Cost**: S (≤ 1 dev-day). Component `RetrievalTierIndicator.tsx` exists.

### S5 — `#21` Context-gate slide-up

**Hook**: At 85% context, the status bar doesn't just turn red — it animates up into
a full-width action strip offering `Compact | Fresh Session | Checkpoint`. Action at
the point of fear, not buried in settings.

- **Closes W1**: #1 follow-on (needs real `contextPercent` from S2). Reifies GRIP
  Rule 8's "HALT at 85%" with a one-click path.
- **Council scope rider (Devil's Advocate)**: the slide-up must **replace** the
  implicit red status-bar, not add an additional alarm. Operators must not see
  double-warnings. On dismiss, return to red status bar for the rest of the session.
- **Dependency**: blocked by S2 PR1 (real `contextPercent`). Cannot ship first.
- **Pragmatist slice**: a single sticky component at `z-30`, three buttons wired to
  existing IPC endpoints. One component, three handlers.
- **Rollback**: disable the 85%-threshold listener via `CTX_SLIDE_UP=off`.
- **Hypothesis H-UX1e**:
  > Post-ship, time-from-85%-trigger to operator action (any of the 3 buttons)
  > drops by >= 50% vs the baseline (operators reading logs and typing `/save`
  > manually). Falsified if < 50% drop or if action rate drops (operators ignore
  > the strip).
- **Telemetry**: 85%-trigger timestamp + next action-event timestamp.
- **Cost**: M (1–1.5 dev-days). Council called this **borderline** on H-UX1's
  "≤ 1 day" test.

---

## Stretch candidate (surprise promotion from the 26 non-shortlisted)

### T1 — Auto-scroll transcript to active tool call

Both Pragmatist and Integrator promoted this as a **sub-slice of the killed #33**
(Agent Following). It closes the "is it still working" anxiety without the
editor-ownership problem that sank #33.

- **Cost**: XS (≤ half-day). Simple `scrollIntoView({ behaviour: 'smooth' })` on each
  tool-call render.
- **Ship if**: Phase 2 surfaces any free budget after S1-S5. Does NOT replace any
  survivor.

---

## Killed — do NOT revisit in Phase 2

| # | Idea | Why killed | Revisit? |
|---|------|-----------|----------|
| 32 | Plan + Execute two-column view | No plan schema exists in GRIP; parser would be fragile on freeform `plans/*.md`. Junie owns the format — Commander does not. | Defer to v0.6.0 *after* a `plans/` schema is ratified. |
| 33 | Agent Following + file peek | Editor ownership absent; "peek" is a degraded echo of the existing transcript. Redundant with S2 streaming indicator. | Replace with stretch T1 (scroll-to-tool). |
| 36 | Space-mode which-key | Modal/non-modal mismatch — Space is a literal character in the chat input. Safe prefix would be Cmd+Space, at which point it's a slower Cmd+K sub-menu. | Drop permanently; upgrade S1 palette instead. |
| 7 | Rave on milestone | Gimmick risk — noise on the second fire. Italian-brainrot narration in a pro context is a senior-engineer repellant. | Hold for v0.5.1 as an opt-in "ceremony bundle" with S8. |
| 8 | Two-tone chime | Every dev has muted every chime they've heard. Survivorship bias on positive reactions. | Hold for v0.5.1 in the ceremony bundle, off-by-default. |

---

## Wave mapping for Phase 2 execution

Per `~/.claude/plans/grip-commander-tui-delight-rsi.md` Phase 2, each feature gets
the sub-wave pattern **FAST → CAREFUL → VERIFY → auto-ship**.

| Wave | Feature | Depth | Notes |
|------|---------|-------|-------|
| W1 | **S3** Sidebar mode-stack chip | 1 | Smallest, highest leverage-per-cost. Ships first as morale + validation of the wiring layer. |
| W2 | **S2** Live-wire status bar PR1 (`contextPercent` + `version`) | 1 | Unblocks S5. Ship as its own PR. |
| W3 | **S4** Retrieval-tier chip | 1 | Uses `RetrievalTierIndicator` infra; pairs clean with S1's palette polish. |
| W4 | **S1** Cmd+K executes | 2 | Largest surface change; scope rider (pending-intent queue) requires careful review. |
| W5 | **S2** status-bar PR2+PR3 (mode, metrics, sparkline) | 2 | Finishes the status-bar wiring after S1 lands. |
| W6 | **S5** Context-gate slide-up | 3 | Depends on S2 PR1. Runs as `/auto-ship` candidate once `contextPercent` is real. |
| W7 | **T1** auto-scroll to active tool (if budget allows) | 1 | Stretch. Lands only with slack. |
| W8 | Phase 2 close-out + tag v0.5.0 | — | Tag, release notes, Guild post. Hand off to Phase 3. |

Features ship in dependency order (S3 → S2-PR1 → S4 → S1 → S2-PR2/3 → S5), so the
session can exit cleanly even if partial.

---

## H-UX1 verdict — conditional CONFIRM

**Claim**: At least 3 of the 5 surviving novel ideas are implementable in `<= 1
dev-day` each AND pass the Broly devil's-advocate test without dilution.

**Council result**:

| Feature | Council verdict | ≤ 1 dev-day? |
|---------|-----------------|--------------|
| S3 mode-stack chip (XS) | Survive unanimously | **Yes** (unambiguous) |
| S2 live-wire status bar (S, PR1 only) | Survive unanimously | **Yes** for PR1 |
| S4 retrieval-tier chip (S) | Survive with label rename | **Yes** |
| S1 Cmd+K executes (M) | Survive with pending-intent queue | **Borderline** (1-1.5 days) |
| S5 context-gate slide-up (M) | Survive with "replace not augment" rider | **Borderline** (1-1.5 days) |

3 of 5 are unambiguously ≤ 1 dev-day. 2 are borderline.

**Conclusion: H-UX1 is CONDITIONALLY CONFIRMED** — conditional on slice discipline
during Phase 2 execution. The falsification condition, binding during Phase 2:

> If any of S3, S2-PR1, or S4 takes > 1 dev-day from branch-open to merge, H-UX1 is
> REFUTED. Record branch-open + merge timestamps on every PR.

---

## Register H-UX1 in the hypothesis engine

At Phase 2 entry:

```bash
PYTHONPATH=$HOME/.claude python3 $HOME/.claude/lib/hypothesis_engine.py register \
  --pr 0 \
  --claim "At least 3 of the 5 Phase-2 survivors ship in <=1 dev-day each" \
  --metric "branch_open_to_merge_hours" \
  --prediction "<=8 wall-clock hours for S3, S2-PR1, S4" \
  --deadline "2026-05-15"
```

(`--pr 0` because the hypothesis is scope-wide, not PR-specific. Each individual
feature also registers its own H-UX1a–e via the engine on PR creation.)

---

## Next-session entry point

```bash
cd /Users/lauriescheepers/CodeTonight/GRIP-GUI
git checkout feat/ux-delight-phase1   # Phase 1 worktree
git pull --rebase origin main
/save                                  # checkpoint, then fresh session
/mode code,architect,ui-complete
/ultrado "Phase 2 — build 5 delight features, W1 first"
```

Phase 2 reads this backlog and executes the W1–W8 wave map above.
