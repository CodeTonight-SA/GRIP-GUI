/**
 * Server-side HAL routing helpers for the GRIP chat API route.
 *
 * The browser caller (`src/lib/grip-session.ts`) decides HAL-vs-CLI routing
 * client-side; this module is the SERVER-side counterpart used by the Next API
 * route `route.ts`, which has no `window`/`localStorage` and so resolves the
 * HAL backend from environment variables only.
 *
 * Why this exists: the chat route used to spawn `claude -p --model sonnet`
 * unconditionally, so the GUI's default surface never reached HAL's
 * multi-provider cascade (CCH → Kimi → cheap → local) nor reflected the live
 * session-model choice. Routing through HAL when reachable — with the CLI
 * spawn as the fallback — closes that gap.
 *
 * Kept dependency-free and free of Next.js path aliases so it is unit-testable
 * in vitest the same way `__tests__/lib/hal-integration.test.ts` tests the
 * client mapping.
 */

/** Default model alias (mirrors `src/lib/happi-envelope.ts::DEFAULT_MODEL`). */
export const DEFAULT_MODEL = 'sonnet' as const;

/**
 * Canonical HAL endpoints (mirrors `src/lib/grip-session.ts::HAL_DEFAULTS`).
 * `inferBase` (hal-server :3850) serves the canonical AI syscall `/api/infer`.
 */
export const HAL_DEFAULTS = {
  inferBase: 'http://127.0.0.1:3850',
  gateway: 'http://127.0.0.1:4010',
} as const;

/** A flag env value is "on" unless it is unset, empty, '0', or 'false'. */
export function isFlagEnabled(value: string | undefined): boolean {
  return !!value && value !== '0' && value !== 'false';
}

/**
 * Resolve the HAL backend URL for the server route, env-only.
 *
 * Order (first match wins):
 *  1. NEXT_PUBLIC_HAL_URL              — explicit override
 *  2. HAL_DEFAULTS.inferBase          — ONLY when NEXT_PUBLIC_HAL_DEFAULT is
 *     truthy (the opt-in "HAL is the default backend" switch)
 *
 * Returns null when neither applies, so the route falls through to the
 * `claude` CLI spawn and default behaviour stays byte-identical until an
 * operator opts in. The trailing slash, if any, is trimmed so callers can
 * always append `/api/infer`.
 */
export function resolveServerHalUrl(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const explicit = env.NEXT_PUBLIC_HAL_URL;
  if (explicit) return explicit.replace(/\/+$/, '');
  if (isFlagEnabled(env.NEXT_PUBLIC_HAL_DEFAULT)) return HAL_DEFAULTS.inferBase;
  return null;
}
