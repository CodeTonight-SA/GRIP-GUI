/**
 * create-two-windows.ts
 *
 * §13.4 — Partition isolation proof of concept
 *
 * This script demonstrates that two BrowserWindows with different
 * `persist:ws-*` partitions see isolated localStorage. Each window writes a
 * unique value under the same key and reads it back; the partitions ensure
 * neither window sees the other's value.
 *
 * HOW TO RUN (V>> inspection):
 *   This script cannot be executed in the CI / spike environment because
 *   Electron requires a real display. To verify manually:
 *
 *   1. Replace the main entry in package.json temporarily with this file
 *      (or import it from electron/main.ts after `app.whenReady()`).
 *   2. Run `npm run electron:dev` (or equivalent).
 *   3. Two windows open: "africus" writes 'africus-value', "nexus" writes 'nexus-value'.
 *   4. Each window alerts its own value — if partition isolation works, the
 *      africus window will NOT alert 'nexus-value' and vice versa.
 *   5. Open DevTools in each window > Application > Local Storage to confirm.
 *
 * NOTE: This file is NOT wired into the main entry point. It is a throwaway
 * proof of concept for V>> review only and will be deleted before W8a-refactor.
 *
 * See SPIKE-FINDINGS.md §13.4 for the proof narrative.
 */

import { app, BrowserWindow } from 'electron';
import { registerWorkspaceWindow } from '../core/broadcast';

/** Inline HTML that writes and reads a localStorage key, then alerts the result. */
function makeIsolationProbeHtml(workspaceId: string, value: string): string {
  return `data:text/html;charset=utf-8,<!DOCTYPE html>
<html>
<head><title>Partition probe: ${workspaceId}</title></head>
<body>
<h2>Workspace: ${workspaceId}</h2>
<p id="result">reading...</p>
<script>
  localStorage.setItem('spike-test', '${value}');
  const read = localStorage.getItem('spike-test');
  document.getElementById('result').textContent = 'Read: ' + read;
  console.log('[${workspaceId}] localStorage spike-test =', read);
</script>
</body>
</html>`;
}

function createWorkspaceWindow(workspaceId: string, probeValue: string): BrowserWindow {
  const win = new BrowserWindow({
    width: 600,
    height: 300,
    title: `Workspace: ${workspaceId}`,
    webPreferences: {
      // §13.4: each workspace gets its own Chromium session via persist:ws-<uuid>.
      // localStorage, IndexedDB, sessionStorage, cookies, and HTTP cache are all
      // isolated. No prefix migration needed at call sites.
      partition: `persist:ws-${workspaceId}`,
      // §13.3: workspace ID flows into the renderer via process.argv.
      additionalArguments: [`--grip-ws=${workspaceId}`],
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // §13.5 Pattern 1: register immediately after creation.
  registerWorkspaceWindow(workspaceId, win);

  win.loadURL(makeIsolationProbeHtml(workspaceId, probeValue));
  return win;
}

app.whenReady().then(() => {
  // Two windows, two partitions, two values under the same key.
  createWorkspaceWindow('africus', 'africus-value');
  createWorkspaceWindow('nexus', 'nexus-value');
});

app.on('window-all-closed', () => app.quit());
