/**
 * Single source of truth for the app version displayed in chrome (status bar,
 * about dialogs, telemetry). Reads from package.json at build time — Next.js
 * bundles the import statically, so the runtime never touches disk.
 *
 * Keeping this in a helper (rather than inlining `import pkg from ...`) means
 * the rest of the app depends on the `APP_VERSION` constant, not on
 * package.json's shape — a small DIP win.
 */
import pkg from '../../package.json';

export const APP_VERSION: string = typeof pkg.version === 'string' ? pkg.version : 'dev';

/**
 * Formats the version for status-bar display: `GRIP 0.4.3`.
 * Kept alongside the constant so every rendered version uses the same shape.
 */
export function formatStatusBarVersion(version: string = APP_VERSION): string {
  return `GRIP ${version}`;
}
