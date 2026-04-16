/**
 * workspace-context.ts — §13.3 Workspace ID transport via additionalArguments
 *
 * The Electron main process injects `--grip-ws=<uuid>` into the BrowserWindow
 * via `webPreferences.additionalArguments`. Electron merges these into the
 * renderer's `process.argv` before any renderer code runs, so this module
 * resolves the workspace ID synchronously at import time — no async, no race.
 *
 * The custom `app://` protocol handler (window-manager.ts) strips query strings,
 * so `?ws=<uuid>` would silently drop. `additionalArguments` survives because it
 * is injected at the Chromium layer, not the URL layer (§13.3 of W8-MULTI-SESSION.md).
 *
 * CRITICAL — RSC footgun (§14.2): this file reads `process.argv` which is only
 * populated by Electron in the RENDERER process. React Server Components run in
 * a separate Node.js process where `additionalArguments` is absent. If an RSC
 * imports WORKSPACE_ID directly, it silently resolves to 'default' with no error.
 *
 * Rule: this file MUST only be imported from Client Components ('use client').
 * The WorkspaceProvider in W8a-ui will wrap the app root and distribute the
 * value via React context so Server Components never need to import this directly.
 *
 * Null case: if the flag is absent (dev mode without workspace support, unit
 * tests), WORKSPACE_ID falls back to 'default'. Callers must treat 'default'
 * as a valid workspace ID, not an error.
 */

'use client';

const FLAG_PREFIX = '--grip-ws=';

const arg = typeof process !== 'undefined'
  ? process.argv?.find((a) => a.startsWith(FLAG_PREFIX))
  : undefined;

/**
 * The workspace ID for this BrowserWindow, resolved from additionalArguments.
 * Guaranteed to be a non-empty string; 'default' when no flag is present.
 */
export const WORKSPACE_ID: string = arg?.slice(FLAG_PREFIX.length) ?? 'default';
