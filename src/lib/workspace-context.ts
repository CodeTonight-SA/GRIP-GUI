/**
 * workspace-context.ts
 *
 * §13.3 — Workspace ID transport via webPreferences.additionalArguments
 *
 * The Electron main process injects `--grip-ws=<uuid>` into the BrowserWindow
 * via `webPreferences.additionalArguments`. Electron merges these into the
 * renderer's `process.argv` array before any renderer code runs, so this
 * module resolves the ID synchronously at import time — no async, no race.
 *
 * The custom `app://` protocol handler strips query strings
 * (window-manager.ts:187-189), so `?ws=<uuid>` would silently drop.
 * `additionalArguments` survives the protocol handler because it is injected
 * at the Chromium layer, not the URL layer. This is the locked mechanism
 * per §13.3 of W8-MULTI-SESSION.md.
 *
 * Null case: if the flag is absent (e.g. dev mode without workspace support
 * enabled, or a unit test context), WORKSPACE_ID falls back to 'default'.
 * Callers must treat 'default' as a valid workspace ID, not as an error.
 */

const FLAG_PREFIX = '--grip-ws=';

const arg = process.argv.find((a) => a.startsWith(FLAG_PREFIX));

/**
 * The workspace ID for this BrowserWindow, resolved from additionalArguments.
 * Guaranteed to be a non-empty string; 'default' when no flag is present.
 */
export const WORKSPACE_ID: string = arg?.slice(FLAG_PREFIX.length) ?? 'default';
