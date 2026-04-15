/**
 * migrate-default-partition.ts
 *
 * §13.4 Deliverable 5 (STRETCH) — Migration POC: default partition → workspace partition
 *
 * On first W8a-refactor launch, existing users have data in Electron's DEFAULT
 * partition (no `partition` key in webPreferences). This script copies that data
 * into a synthetic 'default' workspace partition (`persist:ws-<default-uuid>`) so
 * the Welcome screen shows their prior state rather than an empty slate.
 *
 * WHY THIS APPROACH:
 *   Electron does not expose a direct cross-partition copy API. The only supported
 *   path is:
 *     a) cookies: `ses.cookies.get({})` on source, `ses.cookies.set(...)` on target.
 *     b) localStorage: load a hidden BrowserWindow in the source partition,
 *        use `webContents.executeJavaScript` to serialise all keys, then load a
 *        hidden BrowserWindow in the target partition and write them back.
 *   IndexedDB has no JS-accessible bulk export API in Electron; it requires
 *   copying the LevelDB files on disk (fragile, platform-specific). Deferred
 *   to a follow-up spike — see SPIKE-FINDINGS.md Known Unknowns.
 *
 * MIGRATION-COMPLETED FLAG:
 *   Written to `~/.grip/migration-state.json` (outside both partitions) after
 *   a successful copy so the migration does not re-run on subsequent launches.
 *
 * NOTE: Cannot be executed in this environment (no display, no Electron runtime).
 *   Document in SPIKE-FINDINGS.md. V>> verifies manually or via E2E harness.
 */

import { session, BrowserWindow, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const MIGRATION_FLAG_PATH = path.join(os.homedir(), '.grip', 'migration-state.json');
const DEFAULT_WORKSPACE_ID = 'default';

/** Check whether the migration has already run. */
function isMigrationComplete(): boolean {
  if (!fs.existsSync(MIGRATION_FLAG_PATH)) return false;
  try {
    const state = JSON.parse(fs.readFileSync(MIGRATION_FLAG_PATH, 'utf8'));
    return state.defaultPartitionMigrated === true;
  } catch {
    return false;
  }
}

/** Persist the migration-completed flag. */
function markMigrationComplete(): void {
  const dir = path.dirname(MIGRATION_FLAG_PATH);
  fs.mkdirSync(dir, { recursive: true });
  const existing = fs.existsSync(MIGRATION_FLAG_PATH)
    ? JSON.parse(fs.readFileSync(MIGRATION_FLAG_PATH, 'utf8'))
    : {};
  fs.writeFileSync(
    MIGRATION_FLAG_PATH,
    JSON.stringify({ ...existing, defaultPartitionMigrated: true, migratedAt: new Date().toISOString() }, null, 2),
  );
}

/**
 * Copy all localStorage keys from the DEFAULT Electron partition into
 * `persist:ws-<workspaceId>` using hidden BrowserWindows.
 *
 * Strategy:
 *   1. Open a hidden window in the default partition, extract all localStorage.
 *   2. Open a hidden window in the target partition, write the extracted data.
 *   3. Close both hidden windows.
 *   4. Copy cookies via the session API directly (no window needed).
 */
async function migrateLocalStorage(targetWorkspaceId: string, appUrl: string): Promise<void> {
  // Step 1: extract from default partition
  const sourceWin = new BrowserWindow({
    show: false,
    webPreferences: { contextIsolation: false, nodeIntegration: true },
  });
  await sourceWin.loadURL(appUrl);
  const serialised: Record<string, string> = await sourceWin.webContents.executeJavaScript(`
    (function() {
      const out = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        out[k] = localStorage.getItem(k);
      }
      return out;
    })()
  `);
  sourceWin.destroy();

  if (Object.keys(serialised).length === 0) return; // Nothing to migrate.

  // Step 2: write into target partition
  const targetWin = new BrowserWindow({
    show: false,
    webPreferences: {
      partition: `persist:ws-${targetWorkspaceId}`,
      contextIsolation: false,
      nodeIntegration: true,
    },
  });
  await targetWin.loadURL(appUrl);
  await targetWin.webContents.executeJavaScript(`
    (function(data) {
      for (const [k, v] of Object.entries(data)) {
        localStorage.setItem(k, v);
      }
    })(${JSON.stringify(serialised)})
  `);
  targetWin.destroy();
}

/**
 * Copy all cookies from the default session into the target partition session.
 */
async function migrateCookies(targetWorkspaceId: string): Promise<void> {
  const sourceSes = session.defaultSession;
  const targetSes = session.fromPartition(`persist:ws-${targetWorkspaceId}`);
  const cookies = await sourceSes.cookies.get({});
  // Cast required: Electron's cookies.get() returns Cookie[], but cookies.set()
  // expects CookiesSetDetails. The shapes are compatible at runtime; the type
  // narrowing gap is a known Electron typing quirk. Cast is safe for POC purposes.
  await Promise.all(cookies.map((c) => targetSes.cookies.set(c as Electron.CookiesSetDetails)));
}

/**
 * Entry point: run the full migration if not already complete.
 * Call this from the main process before opening any workspace window.
 */
export async function runDefaultPartitionMigrationIfNeeded(appUrl: string): Promise<void> {
  if (isMigrationComplete()) return;

  await app.whenReady();
  await migrateLocalStorage(DEFAULT_WORKSPACE_ID, appUrl);
  await migrateCookies(DEFAULT_WORKSPACE_ID);
  markMigrationComplete();
  console.log('[W8-spike] Default partition migrated to persist:ws-default');
}
