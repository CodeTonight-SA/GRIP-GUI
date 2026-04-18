/**
 * Demo harness — pastes directly into devtools console during the v0.5.0
 * walkthrough recording. Fires the synthetic CustomEvents that S4
 * RetrievalTierChip and S5 ContextGateSlideUp listen for. Neither has an
 * emitter wired yet (see Phase 3 retrospective open items), so the harness
 * is the only way to exercise them until the session-control server pipes
 * real telemetry.
 *
 * Usage: paste one block at a time at the cue in walkthrough-script.md.
 */

// --------------------------------------------------------------------------
// #retrieval — flips the chip CACHED -> SEARCHED with realistic timing.
// Run at beat 0:30 during the recording.
// --------------------------------------------------------------------------
(() => {
  const EVENT = 'grip:retrieval-tier';
  const dispatch = (tier) =>
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { tier } }));

  // Session context hit (Tier 0) — chip shows CACHED.
  dispatch(0);
  // 2s later: an Explore-agent fallback (Tier 4) — chip flips to SEARCHED.
  setTimeout(() => dispatch(4), 2000);
  // 3s later: back to KONO (Tier 1) — CACHED again. This sells the point
  // that the chip tracks the *last* retrieval, not a cumulative average.
  setTimeout(() => dispatch(1), 5000);
})();

// --------------------------------------------------------------------------
// #contextGate — shows the slide-up at 89%, pauses, then stages the COMPACT
// click so the dismiss animation lands in the recording.
// Run at beat 0:40 during the recording.
// --------------------------------------------------------------------------
(() => {
  const WARN_EVENT = 'grip:context-gate-warning';
  const dispatch = (percent) =>
    window.dispatchEvent(new CustomEvent(WARN_EVENT, { detail: { percent } }));

  // Trigger the slide-up at 89% — above the 85% threshold, below the red
  // "PANIC" band that the real gate fires at 92%.
  dispatch(89);

  // Optional: 10s later, dispatch a below-threshold reading to re-arm the
  // state without clicking a button. Useful for re-takes.
  setTimeout(() => dispatch(42), 10000);
})();

// --------------------------------------------------------------------------
// #reset — one-liner to hard-reset both chips between takes.
// --------------------------------------------------------------------------
window.dispatchEvent(new CustomEvent('grip:retrieval-tier', { detail: { tier: 0 } }));
window.dispatchEvent(new CustomEvent('grip:context-gate-warning', { detail: { percent: 0 } }));
