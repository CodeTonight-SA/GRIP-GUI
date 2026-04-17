# W4 Council Verdict — Top 10 → 5 Survivors

## Method

Four perspectives convened adversarially on the W3 post-W2 revised shortlist (#3, #1, #32, #7, #2, #8, #33, #29, #36, #21). Each perspective read W1 `inventory.md`, W2 `competitive.md`, and W3 `novel-ideas.md`, then rendered an independent verdict on ALL ten ideas — no log-rolling, no mutual reinforcement. The Analyst tested W1 problem-closure and leverage defensibility; the Devil's Advocate attempted a kill on every item; the Pragmatist re-priced cost and named a minimum viable slice; the Integrator looked for compose/cancel pairs across the portfolio. A verdict resolves to Survive iff >= 3 of 4 perspectives voted Survive (Survive-if-modified counts as Survive but carries a scope rider). Ties were broken by Integrator because portfolio coherence is the v0.5.0 scorecard, not per-feature polish.

---

## Perspective 1 — Analyst

Rigorous, evidence-driven. Verdict grid (all ten):

| # | Idea | Real problem closed? | Leverage defensible? |
|---|------|----------------------|----------------------|
| 3 | Cmd+K executes, not navigates | Yes — W1 #19, #20, #25, #48 directly. The palette comment admits the dispatch is a no-op. | Yes — best keyboard surface becomes workflow surface. 10/M is honest; no other idea closes 4 H-severity items at once. |
| 1 | Live-wire the status bar | Yes — W1 #1, #2, #49, #50, #52, #63. Six frictions in one move. | Yes — component exists; only the parent page needs to pass props. The 9-widget bar is already a ceiling; this is a floor-raise. |
| 32 | Plan + Execute two-column view | Partial — no specific W1 row. Most aligned to W1 #58 (delight discovery) and Gen-500 plan discipline, not a logged friction. | Overstated — Junie analog is real (W2 pattern 9.3), but "biggest GRIP-alignment win" is an internal narrative, not a user-facing friction. L-cost and no W1 anchor weakens the leverage score. |
| 7 | Rave on milestone | Yes — W1 #58 (novel features invisible). The `/rave` skill ships and nobody sees it. | Yes — but only if milestone detection is real; if we fire it on weak signals (any tab close) it degrades to spam. Leverage 9 is defensible *conditional on* honest triggers. |
| 2 | Sidebar mode-stack chip | Yes — W1 #9, #11. Mode is invisible outside /modes today. | Yes — XS cost, two W1 items, direct reuse of `/api/grip/modes`. Strongest leverage-per-cost in the list. |
| 8 | Two-tone chime on wave transition | Yes — W1 #58 (delight components unrendered). `lib/handoff_chime.py` (task #1063) ships today. | Partial — the infrastructure exists, but "wave transition" requires the wave boundary to be a semantically meaningful event in the product, which is true only in RSI/ultrado contexts. Leverage 8 is defensible for RSI users, weaker for ad-hoc chat. |
| 33 | Agent Following + file peek | Partial — W1 lists no explicit "where is the agent" friction, though #48 (no inline progress for slash commands) is adjacent. Zed pattern 4.2 is real but attacks an anxiety W1 did not measure. | Overstated — claim of 8/M pairs with an unevidenced friction. Without a friction row, leverage is speculative. |
| 29 | Retrieval-tier chip above input | Yes — W1 #51 (`RetrievalTierIndicator` exists, unwired). Also visualises Rule 0, the PARAMOUNT retrieval discipline. | Yes — component exists, telemetry emitted. S-cost is honest; delight is educational (operator sees Tier 0 hits). |
| 36 | Space-mode which-key | Partial — W1 #53 (shortcut lies) and #13 (hint without functionality) are real, but #36 is a *replacement* for #4 rather than a direct close. The 56 commands + 210 skills count is taxonomic pressure, not a logged friction. | Partial — Helix pattern 10.1 is real. Leverage 8/M defensible *if* it subsumes #4; standalone it competes with #3 for palette attention and might split the mental model. |
| 21 | Context-gate slide-up | Yes — W1 #1 follow-on (real `contextPercent`) and GRIP Rule 8 "action at point of fear". | Partial — leverage 8/M depends on #1 landing first (real contextPercent). If #1 slips, #21 cannot ship. Dependency is real; score should be conditional. |

**Analyst summary**: #3, #1, #2, #29 have the strongest W1 anchors. #32 and #33 lean on internal narrative / unmeasured anxiety. #7, #8, #36 are fine conditional on specific triggers / predecessor ideas.

---

## Perspective 2 — Devil's Advocate

Tries to kill each. Verdict grid (all ten):

| # | Idea | Kill argument | Does it land? |
|---|------|---------------|---------------|
| 3 | Cmd+K executes | "Intent-dispatch will break if `ChatInterface` is unmounted during palette open. The injected slash-command is lost silently — we've replaced one silent-failure (#19) with another." | Partial — the failure mode is real but fixable with a pending-intent queue keyed by tab ID. Survives if the scope includes the queue. |
| 1 | Live-wire status bar | "Wiring 9 widgets means 9 bugs. The current hardcoded 0.1.0 is embarrassing but at least honest about its disconnect. An incorrectly-wired 47% context gauge that is actually 83% is worse than a hardcoded 23%." | Partial — calibration is a risk, not a kill. The `/context` tool gives authoritative ground truth; the widget just has to read it. Risk mitigated with a "shows `--` until first reading" pattern. |
| 32 | Plan + Execute two-column | "GRIP has no stable plan schema. `plans/*.md` are freeform markdown. The two-column view would have to parse whatever structure each plan happens to use; the left column becomes a lint hazard. Also: real-estate cost on a laptop is brutal." | **Yes — this lands hard.** The Junie pattern (W2 9.3) works because IntelliJ owns the plan format. GRIP does not. Shipping this without a plan-schema first means building a fragile parser that will break on the first preplan a power-user writes. |
| 7 | Rave on milestone | "Rave is a gimmick the first time and noise the second. Italian brainrot narration in a professional context is a senior-engineer repellant. The 'delight' becomes 'please disable this'." | Partial — gimmick risk is real but scoped: Rave is already a skill; gating on opt-in (off by default, one-time "try it" prompt) neutralises the kill. Kill lands ONLY if opt-in is default-on. |
| 2 | Sidebar mode-stack chip | "The chip is a read-only affordance. The real friction is mode-activation silent-failure (W1 #35). Putting a chip on the sidebar without fixing the toggle path ships a lie surface." | Partial — the chip genuinely closes #9 and #11 (invisibility) even if #35 (silent failure) remains. The kill lands *only* if the chip reads from a cache that drifts; if it reads GET from `/api/grip/modes`, it's accurate. |
| 8 | Two-tone chime | "Every dev has hated every chime they've ever heard in a tool. The 'sparks joy' quote from Claude Code release notes is survivorship bias — the devs who hated it muted it and moved on." | Partial — chime is a textbook gimmick risk. Survives only if opt-in, off by default, volume-controlled, and tied to an event rare enough to not wear out (wave boundary, not tool-call). |
| 33 | Agent Following + file peek | "Zed owns the editor. Commander does not. A 'side peek' of a file the agent is editing means Commander re-reads the file from disk every N ms, or reads the tool-call result and renders it — which is what the transcript already shows. The 'peek' is a rename of existing behaviour." | **Yes — this lands.** Without editor-ownership, Commander's peek is a degraded echo of the transcript. The anxiety it claims to fix (is-it-still-working) is better served by the status-bar streaming indicator (already a widget in #1). Redundancy with #1. |
| 29 | Retrieval-tier chip | "Retrieval-tier is GRIP jargon. Rule 17 (plain language) says translate jargon. 'TIER 0 / TIER 4' is a lie-to-new-operators badge that celebrates an internal discipline over an external benefit." | Partial — jargon risk is real; labels need re-design ("memory hit / deep search" not "TIER 0 / TIER 4"). Kill softens to a scope change: relabel, don't drop. |
| 36 | Space-mode which-key | "Helix is a *modal* editor. Commander is not. Adding Space-mode means stealing a key that currently inserts a space in the chat input. The only safe place to put it is outside the chat input, which means operators need to focus-escape before invoking it — exactly the friction which-key tries to remove." | **Yes — this lands.** The modal/non-modal mismatch is fatal unless the prefix is a modifier combo (Cmd+Space). At that point it is just Cmd+K with a slower sub-menu. |
| 21 | Context-gate slide-up | "Slide-up at 85% is the sixth alarm operators see that hour. Rule 8 already has an AskUserQuestion. The slide-up is decoration on an existing halt gate, not a new capability." | Partial — the kill lands against *additional* alarm, not against the action-strip itself. Survives if the slide-up *replaces* the implicit red status-bar with a single unified action surface, not *augments* it. |

**Devil's Advocate summary**: Hard kills on #32 (no plan schema), #33 (editor-ownership absent, redundant with #1), #36 (modal/non-modal mismatch). Partial kills on the rest are fixable with scope riders.

---

## Perspective 3 — Pragmatist

Cares about ship-ability and rollback. Verdict grid (all ten):

| # | Idea | Honest cost | Smallest shippable slice + rollback |
|---|------|-------------|-------------------------------------|
| 3 | Cmd+K executes | **M** (W3 estimate is honest). Risk: ChatInterface tab-routing, unmount-during-dispatch edge case. | Slice: inject slash-command into ACTIVE tab's input box, set focus, do NOT auto-submit. Rollback: feature-flag the event listener. Ship behind `GRIP_PALETTE_EXECUTE=1` for one release. |
| 1 | Live-wire status bar | **S** (accurate). Hoist session state into `page.tsx`; wire 9 widgets one-by-one. | Slice: ship `contextPercent` + `version` in PR 1; `activeMode` + `model` in PR 2; metrics + timestamps in PR 3. Rollback: keep defaults as fallback — if the wiring fails, widget shows stale-but-honest value. |
| 32 | Plan + Execute two-column | **L++** — W3 admits L and flags the H-UX1 violation. Real cost is L+schema-design, call it 2-3 dev-days. | Slice: read-only plan pane on right panel (no edits). Rollback: panel-toggle; if it ships wrong, users collapse it. BUT the schema question is upstream of the slice — cannot honestly ship even the slice without deciding plan format. |
| 7 | Rave on milestone | **S** — wiring `/rave` skill to a milestone event is small. Milestone *detector* is the cost — arguably M once you enumerate what counts (PR merge, wave done, fitness peak, `/save`). | Slice: ship PR-merge trigger only; defer wave/fitness. Rollback: settings toggle (default off). Kill switch on first operator complaint. |
| 2 | Sidebar mode-stack chip | **XS** — accurate. One GET, one chip, one click-handler. | Slice: ship the chip as a read-only pill; "click → palette MODES" is free because palette already exists. Rollback: CSS-hide. |
| 8 | Two-tone chime | **XS** — accurate. `lib/handoff_chime.py` ships a WAV; IPC bridge + `new Audio()`. | Slice: fire on `GRIP_WAVE_COMPLETE` IPC event; default volume 0.3; off by default. Rollback: settings toggle. |
| 33 | Agent Following + file peek | **M** claimed, actually M-L once you decide what "file peek" means (diff? cursor? raw source?). | Slice: auto-scroll transcript to active tool call only — drop file peek entirely. The scroll is trivial; the peek is a feature in its own right. Rollback: scroll behaviour flag. |
| 29 | Retrieval-tier chip | **S** — accurate. Component exists, telemetry emitted. | Slice: ship with 2 labels (cached vs searched), not 5 tiers. Upgrade to tier detail in a follow-on. Rollback: hide the chip. |
| 36 | Space-mode which-key | **M** claimed, actually M-L because global keymap + input-escape logic is a cross-cutting concern. | Slice: ship as Cmd+Space-opened which-key only when focus is *outside* text inputs. Defer sticky mode to v2. Rollback: disable the binding. |
| 21 | Context-gate slide-up | **M** — accurate, but depends on #1 landing first for real `contextPercent`. Without #1, this is vaporware. | Slice: ship after #1 lands; the slide-up itself is a single sticky component with 3 buttons. Rollback: disable the 85%-threshold listener. |

**Pragmatist summary**: #32 is the only honest L; the rest are XS-M. #33 M claim needs the peek scoped out. #21 has a hard dependency on #1. Everything else has a sane slice and rollback path.

---

## Perspective 4 — Integrator

Portfolio view. One verdict per idea (composes-with / cancels / narrative fit):

| # | Idea | Composes with | Cancels with | Narrative fit |
|---|------|---------------|--------------|---------------|
| 3 | Cmd+K executes | #2 (chip→palette→execute chain), #29 (chip shows tier the just-run command used) | — | **Yes** — v0.5 story: "The palette is the keyboard." Unwired palette was the #1 inventory friction. |
| 1 | Live-wire status bar | #2 (chip is a status-bar adjacent), #29 (tier chip sits above status bar), #21 (needs real % from #1) | — | **Yes** — "honest ambient signal" is the v0.5 banner. |
| 32 | Plan + Execute two-column | #33 (same side-panel territory) | #1 right panel, #29 input-area real estate — three ideas fighting for pixels | Weak fit — requires a plan schema that doesn't exist; story "GRIP's plans are live objects" is aspirational, not shippable in v0.5. |
| 7 | Rave on milestone | #8 (chime + rave paired is "hand-off ceremony"); #10 (ticker, not in shortlist) would feed triggers | #8 if both fire on same event — double-spam | **Yes conditional** — if paired with #8 as one opt-in "ceremony" bundle, strong; solo it's decoration. |
| 2 | Sidebar mode-stack chip | #3 (chip→palette→MODES), #1 (chip reads from same session-state hoist) | — | **Yes** — micro-idea that amplifies the "ambient signals are honest" story for XS cost. |
| 8 | Two-tone chime | #7 (bundle); #1 (chime fires on state transitions wired by #1) | #7 if redundant triggers | **Yes conditional** — part of the "hand-off ceremony" bundle with #7. |
| 33 | Agent Following + file peek | #32 (same panel) | #1 streaming indicator (redundant "is-it-still-working" signals), #32 for real-estate | **No** — Commander doesn't own the editor. The "peek" is a rename of transcript content. Cuts against the honesty theme. |
| 29 | Retrieval-tier chip | #3 (chip updates on palette-run), #1 (chip is status-bar-adjacent), Rule 0 narrative | — | **Yes** — "GRIP-first thinking is visible." Uniquely productises a paramount rule. |
| 36 | Space-mode which-key | — | #3 (both are keyboard-first entry points; users will learn one, not both) | **No** — forks the keyboard story. v0.5 should have ONE keyboard primitive (Cmd+K), not two (Cmd+K + Space). |
| 21 | Context-gate slide-up | #1 (dependency), Rule 8 "action at point of fear" | — | **Yes** — completes the ambient-signal → action-strip arc. |

**Integrator verdict**: The coherent v0.5.0 narrative is **"honest ambient signals + working keyboard + one-off ceremony"**. Ideas #3 #1 #2 #29 #21 compose into that arc. #7 and #8 pair into a ceremony sub-bundle that sits alongside. #32 #33 #36 each break the narrative: #32 needs schema work upstream, #33 is editor-ownership theatre, #36 forks the keyboard.

---

## Vote matrix

Survive = S, Survive-if-modified = S*, Kill = K. Survive iff >= 3 Survives (S or S*).

| # | Idea | Analyst | Devil | Pragmatist | Integrator | Verdict |
|---|------|---------|-------|------------|------------|---------|
| 3 | Cmd+K executes | S | S* | S | S | **Survive** |
| 1 | Live-wire status bar | S | S* | S | S | **Survive** |
| 32 | Plan + Execute two-column | S* | K | K | K | **Kill** |
| 7 | Rave on milestone | S* | S* | S | S* | **Survive (modified)** |
| 2 | Sidebar mode-stack chip | S | S* | S | S | **Survive** |
| 8 | Two-tone chime | S* | S* | S | S* | **Survive (modified)** |
| 33 | Agent Following + file peek | S* | K | S* | K | **Kill** |
| 29 | Retrieval-tier chip | S | S* | S | S | **Survive** |
| 36 | Space-mode which-key | S* | K | S* | K | **Kill** |
| 21 | Context-gate slide-up | S* | S* | S | S | **Survive** |

Seven survive by the >= 3 rule. The brief demands prune-to-5. Tie-break reasoning below.

**Pruning 7 → 5.** #1, #3, #2, #29 are all unanimous S (not S*) from at least three perspectives with only the Devil's Advocate attaching scope riders. They anchor the "honest signals + working keyboard" narrative the Integrator identified. The remaining three — #7, #8, #21 — are all S*-heavy. #21 has a hard dependency on #1 landing, which is already in the 5; demoting #21 does not break the arc because #1 alone closes W1 #1. #7 and #8 together form the "ceremony bundle" — but the brief rewards "I can't go back" over "nice to have", and ceremony is the clearest gimmick risk in the council. Between them, **#8 chime** has the lower invasive footprint (XS, single IPC wire, off-by-default) and the Integrator pairing comment ("chime fires on state transitions wired by #1") gives it compose-leverage that #7 lacks solo. **#7 rave** is demoted: it's the single idea a senior engineer is most likely to call theatre, and the Devil's Advocate kill ("senior-engineer repellant") is the most defensible of the soft kills. **#21** stays ahead of both because it converts an existing halt into a single visible action surface — Rule 8 already halts, #21 makes the halt *productive*.

**Final 5 survivors**: #3, #1, #2, #29, #21. **Runners-up (ship if cheap slack in the wave)**: #8 (XS, bundle-with-#1), #7 (S, opt-in only).

---

## Survivors (5)

### 1. #3 — Cmd+K executes, not navigates
- **Why survived**: Unanimous S across Analyst (closes W1 #19/#20/#25/#48), Pragmatist (M cost honest, clean slice), Integrator ("the palette is the keyboard" is the v0.5 banner). Devil's Advocate S* with scope rider: pending-intent queue keyed by tab ID.
- **Pragmatic scope note**: Slice 1 ships intent injection into active tab's input with focus (no auto-submit). Slice 2 adds the pending-intent queue so unmounted ChatInterface does not lose the command. Behind `GRIP_PALETTE_EXECUTE=1` for one release.
- **Phase 2 hypothesis to register (H-UX-CMDK)**: "When Cmd+K actually executes, palette-open → slash-command-run rate rises from 0% (today, measured by `grip:run-command` landing on a listener) to >=35% within the first 10 sessions of a new operator." Falsifiable at 30-day mark.

### 2. #1 — Live-wire the status bar
- **Why survived**: Unanimous S. Closes 6 W1 items in one move (#1/#2/#49/#50/#52/#63). Pragmatist ships it in 3 split PRs. Integrator: honest-signals arc cornerstone.
- **Pragmatic scope note**: PR1 `contextPercent` + `version` (kills v0.1.0 lie); PR2 `activeMode` + `model`; PR3 `messageTimestamps` + `fitness` (pulse). If any widget fails wiring, it falls back to "--" not to stale hardcode.
- **Phase 2 hypothesis to register (H-UX-STATUSBAR)**: "After wiring, the v0.1.0 version string never re-appears in screenshots operators post; operator-recalled value of `contextPercent` within 10% of ground truth in 5 of 5 spot-checks." Falsifiable at 14-day mark.

### 3. #2 — Sidebar mode-stack chip
- **Why survived**: Triple S (Analyst + Pragmatist + Integrator), Devil's S* conditional on live GET not cached. Highest leverage-per-cost in the entire portfolio (XS / closes 2 W1 items / composes with #3 and #29).
- **Pragmatic scope note**: GET `/api/grip/modes` on chip mount + on visibility change. No cache. Click handler opens palette with MODES preset pre-filtered.
- **Phase 2 hypothesis to register (H-UX-CHIP)**: "With chip live, unprompted operator mentions of 'mode stack' in /save transcripts rise from baseline ~0 to >=3 per 20 sessions." Falsifiable at 30-day mark.

### 4. #29 — Retrieval-tier chip above input
- **Why survived**: Triple S (Analyst + Pragmatist + Integrator), Devil's S* with label-rewrite rider. Uniquely productises PARAMOUNT Rule 0.
- **Pragmatic scope note**: Devil's Advocate rider accepted — labels use plain English ("memory hit" / "searched" / "deep search") not "TIER 0 / TIER 4". Rule 17 (plain language) applies. Slice: 2-label v1 (cached vs searched), upgrade to 5-tier later.
- **Phase 2 hypothesis to register (H-UX-TIER)**: "With tier chip live, the session Explore-agent invocation rate drops by >=15% in 14-day window vs the 14-day preceding." Falsifiable with existing Gate A / retrieval-tier telemetry.

### 5. #21 — Context-gate slide-up
- **Why survived**: Triple S (Analyst + Pragmatist + Integrator). Devil's S* with "replace, don't augment" rider. Completes the ambient-signal → action-strip arc.
- **Pragmatic scope note**: Strict dependency on #1 — ship only after `contextPercent` is real. Slide-up *replaces* the red status-bar at 85% rather than overlaying it. Three buttons: Compact / Fresh Session / Checkpoint. Rollback via the listener flag.
- **Phase 2 hypothesis to register (H-UX-GATE)**: "Time-from-85%-threshold to user-action decision drops from baseline (today: unmeasured, anecdotally >60s) to <15s median across 10 context-gate fires." Falsifiable via hook telemetry + a new time-to-action counter.

---

## Killed (5)

### #32 — Plan + Execute two-column view
- **Killing argument** (Devil's Advocate): GRIP has no stable plan schema. The Junie pattern only works because IntelliJ owns the plan format. Building a parser against freeform `plans/*.md` ships a lint hazard, not a feature.
- **Supported by**: Pragmatist (L++ cost, schema question upstream of slice), Integrator (three ideas fighting for side-panel pixels), Analyst (no W1 anchor).
- **Revisit?**: **Post-v0.5.0, yes**, but only after a plan-schema wave. Write the schema, let preplans migrate to it, then build the two-column view on top. The idea is not bad; the sequencing is wrong.

### #33 — Agent Following + file peek
- **Killing argument** (Devil's Advocate + Integrator): Commander does not own the editor. The "peek" is a rename of transcript content. Redundant with #1 streaming indicator.
- **Supported by**: Pragmatist (M claim dishonest once peek is defined), Analyst (no W1 friction anchor).
- **Revisit?**: **Drop permanently in this shape**. The underlying anxiety (is-it-still-working?) is real and already addressed by #1's streaming widget. If a "follow the tool call" affordance is wanted later, scope it as "auto-scroll the transcript to active tool block" — that's half a dev-day and closes the same anxiety. Do not ship a side peek.

### #36 — Space-mode which-key
- **Killing argument** (Devil's Advocate + Integrator): Modal/non-modal mismatch. Commander's chat input is always active; Space is a literal character. Moving the prefix to Cmd+Space makes it a slower Cmd+K. Forks the keyboard story for v0.5.
- **Supported by**: Pragmatist (M-L actually, cross-cutting escape logic), Analyst (W1 #53 is real but #36 doesn't directly close it).
- **Revisit?**: **Revisit post-v0.5.0 only if #3 Cmd+K palette proves insufficient**. Which-key is a solution to "flat palette is overwhelming" — if #3 ships and the palette category-tabs land, which-key becomes redundant. The ad-hoc single-key shortcut handler (old #4) should be dropped entirely — Cmd+K subsumes it.

### #7 — Rave on milestone (demoted)
- **Killing argument** (Devil's Advocate): Gimmick the first time, noise the second. Senior-engineer repellant. Italian brainrot narration in a professional context is the clearest theatre risk in the list.
- **Support was partial**: Analyst S* (conditional on honest triggers), Pragmatist S (opt-in scoped well), Integrator S* (bundle with #8). No unanimous S.
- **Revisit?**: **Defer to v0.5.1 as opt-in ceremony bundle with #8**. Not killed permanently — the `/rave` skill is a shipped asset and surfacing it closes W1 #58 ("novel features invisible"). But the risk of pushing it into a default-on ambient surface is higher than the risk of shipping v0.5 without it. Default-off toggle on first launch, maybe `/rave-on` opt-in.

### #8 — Two-tone chime (demoted)
- **Killing argument** (Devil's Advocate): Every dev has muted every chime. The "sparks joy" quote is survivorship bias.
- **Support was partial**: Analyst S* (conditional on RSI context), Pragmatist S (XS, opt-in), Integrator S* (only as bundle with #7). No unanimous S.
- **Revisit?**: **Defer to v0.5.1 bundled with #7** (same rationale). The XS cost and single-IPC-wire slice mean it can slip into any later wave with near-zero risk. If slack appears in the Phase 2 Wave 1 scope, promote #8 back (not #7) because its footprint is smaller and it does not risk the "professional tool" positioning.

---

## H-UX1 falsification check

**H-UX1** claim: ">= 3 of the 5 survivors are <= 1 dev-day implementable."

Per-idea days-estimate (Pragmatist reprice, honest not optimistic):

| # | Idea | Pragmatist cost | Days | <= 1 day? |
|---|------|-----------------|------|-----------|
| 3 | Cmd+K executes (slice 1 only) | M | 1.0-1.5 | Borderline — slice 1 (inject into active tab) is 0.75 day; slice 2 (pending-intent queue) adds 0.5 day |
| 1 | Live-wire status bar (PR1 only: contextPercent + version) | S | 0.5 | Yes |
| 2 | Sidebar mode-stack chip | XS | 0.25 | Yes |
| 29 | Retrieval-tier chip (2-label v1) | S | 0.5 | Yes |
| 21 | Context-gate slide-up | M (post-#1) | 1.0 | Borderline — action strip itself is 0.75 day; 85% listener wire is 0.25 day, assumes #1 shipped |

**Verdict**: **H-UX1 is CONFIRMED conditional on slice discipline.**

- Unambiguous <= 1 day: #1 (PR1 slice), #2, #29 → 3 of 5. **Threshold met.**
- Borderline: #3 (slice 1 is 0.75 day, slice 2 pushes to 1.25), #21 (exactly 1 day assuming #1 shipped).
- Honest addition: the *full-scope* ships of #3 (with queue) and #21 (with #1 dependency) push each to 1-1.5 days. If the H-UX1 test is applied to the full-scope ship, only 3 of 5 still qualify (#1 PR1, #2, #29).

**Falsification condition recorded**: if any of #1-PR1, #2, or #29 actually takes > 1 dev-day when implemented, H-UX1 is refuted. Register H-UX1 with deadline = end of Phase 2 Wave 1. Metric = per-PR clock time from branch-create to merge, measured from commit history.
