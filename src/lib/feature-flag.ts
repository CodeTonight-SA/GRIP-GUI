/**
 * Feature-flag helper — Phase 2 delight surfaces ship behind localStorage flags
 * so operators can disable any chip/strip without a rebuild.
 *
 * The contract is opt-out, not opt-in: absence of the key means "enabled".
 * That matches the Phase 2 council's "ship on by default, give the escape
 * hatch" posture. Only the literal string "false" disables the feature —
 * any other value (or a missing key) keeps it on. This keeps localStorage
 * inspection obvious to operators ("why is my chip gone? the value is
 * literally 'false'") and avoids boolean-string edge cases.
 *
 * SSR safety: when `window` is undefined (Next.js server render), the helper
 * defaults to enabled. The component then re-runs on the client with the
 * real flag value. If a component needs to avoid the SSR flash, it should
 * gate its own rendering, not rely on this helper to know the difference.
 *
 * Extracted from the inline `isEnabled()` helpers that lived in S3
 * ModeStackChip, S4 RetrievalTierChip, and S5 ContextGateSlideUp. Three
 * proven instances = YSH trigger per CLAUDE.md (dialectical inverse of
 * YAGNI — abstract NOW, not later).
 */

export function isFeatureEnabled(flagKey: string): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(flagKey) !== 'false';
  } catch {
    return true;
  }
}
