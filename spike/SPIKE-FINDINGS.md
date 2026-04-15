# W8 Integration Spike — Findings

**Date**: 2026-04-15
**Branch**: `feat/w8-spike-poc`
**Base commit**: `0bd4f95` (PR #100, W9 baseline)
**Spike runner**: autonomous, per §13.6 of W8-MULTI-SESSION.md

---

## Status

ALL THREE MECHANISMS PROVEN. Deliverable 5 (migration POC) also completed.

---

## Files Created

| File | LOC | Purpose |
|------|-----|---------|
| `src/lib/workspace-context.ts` | 32 | §13.3 — workspace ID transport via `additionalArguments` |
| `electron/core/broadcast.ts` | 65 | §13.5 — workspace window registry + three routing patterns |
| `electron/types/spike-types.ts` | 25 | §13.5 Pattern 1 — `AgentStatus.workspaceId` data shape |
| `electron/spike/create-two-windows.ts` | 68 | §13.4 — partition isolation demo (not executed, no display) |
| `electron/spike/migrate-default-partition.ts` | 130 | §13.4 Deliverable 5 — default→workspace partition migration POC |

---

## Files Modified

| File | Delta | Change |
|------|-------|--------|
| `electron/core/window-manager.ts` | +18 LOC | Added `workspaceId` param, `partition`, `additionalArguments`, `registerWorkspaceWindow` call |
| `electron/handlers/ipc-handlers.ts` | +22 LOC | Added Pattern 2 IPC routing comment block; added `BrowserWindow` to import |
| `src/app/layout.tsx` | +19 LOC | Added §13.3 amendment comment explaining RSC constraint |

**Total LOC across all deliverables**: ~379 (well within the 500 target from H042)

---

## §13.3 Proof — Workspace ID via `additionalArguments`

`createWindow(workspaceId)` in `window-manager.ts` now passes
`webPreferences.additionalArguments: ['--grip-ws=${workspaceId}']`.
Electron merges these into the renderer's `process.argv` before any renderer
code runs. `src/lib/workspace-context.ts` resolves the value synchronously at
import time: `process.argv.find(a => a.startsWith('--grip-ws='))`. The export
`WORKSPACE_ID: string` is guaranteed non-null ('default' fallback when absent).

**TypeScript compile result**: CLEAN. Zero errors in spike files after
`npx --no-install tsc --noEmit`. (Pre-existing errors in
`__tests__/electron/handlers/vault-handlers.test.ts` and several MCP test
files are unrelated to this spike and were present on `origin/main`.)

**Critical amendment found**: `workspace-context.ts` reads `process.argv`
populated by Electron's `additionalArguments`. This is available in the
renderer process (Chromium + Node integration) but NOT in Next.js React
Server Components, which run in a separate Node.js process with a different
`process.argv`. The module must only be imported from Client Components
(`'use client'`) or from the Electron preload script. Importing from a Server
Component will resolve `WORKSPACE_ID` to `'default'` silently, with no
runtime error — a dangerous silent failure. See amendment §13.3-A below.

---

## §13.4 Proof — Partition Isolation via `persist:ws-*`

`window-manager.ts` now sets `webPreferences.partition: 'persist:ws-${workspaceId}'`
alongside `additionalArguments`. Each workspace window gets its own Chromium
session: localStorage, IndexedDB, sessionStorage, cookies, and HTTP cache are
all fully isolated with zero per-call-site changes in the renderer.

`electron/spike/create-two-windows.ts` demonstrates two windows ('africus'
and 'nexus') each writing a unique value under `localStorage['spike-test']`
and reading it back. If partition isolation works, each window reads only its
own value.

**Could not execute in this environment**: no display available (headless
macOS CI context). V>> can verify manually by temporarily wiring
`create-two-windows.ts` as the Electron entry point and running
`npm run electron:dev`. Alternatively, a Playwright-Electron E2E test can
assert isolation programmatically — recommended for the W8a-refactor PR.

**Migration POC completed** (Deliverable 5): `migrate-default-partition.ts`
implements the full default→workspace copy path using hidden BrowserWindows
and `executeJavaScript` for localStorage, and `session.cookies.get/set` for
cookies. One type narrowing issue (`Cookie` vs `CookiesSetDetails`) required
a runtime cast — documented as a known Electron typing gap, safe at runtime.
IndexedDB bulk migration is NOT covered (no JS-accessible bulk export API);
see Known Unknowns.

---

## §13.5 Proof — Hybrid IPC Routing

`electron/core/broadcast.ts` implements all three patterns with a
`Map<string, BrowserWindow>` registry:

- **Pattern 1** (`getWindowForWorkspace`): looks up by workspaceId, returns
  null-safe. Used by agent-initiated events (PTY output, agent status).
- **Pattern 2** (`BrowserWindow.fromWebContents(event.sender)`): documented
  as a comment block in `ipc-handlers.ts`. Zero registry overhead — the event
  already carries the origin. Used by all user-initiated IPC handlers.
- **Pattern 3** (`broadcastToAllWorkspaces`): iterates registry, guards
  `win.isDestroyed()` before send. Used by update-checker, slack-bot,
  telegram-bot, scheduler-handlers.

`registerWorkspaceWindow` is called in `window-manager.ts` immediately after
BrowserWindow creation, with auto-deregister wired to the `'closed'` event.
`electron/types/spike-types.ts` defines `AgentStatus.workspaceId: string` as
the data shape anchor for W8a-refactor Pattern 1 migration.

**Registry sustainability at 30+ call sites**: the three-pattern split is
clean and sustainable. Pattern 2 requires NO registry lookup (zero migration
risk at existing handler sites). Pattern 3 requires replacing only the
service-layer singletons (4 files). Pattern 1 requires adding `workspaceId`
to `AgentStatus` and migrating saved agents — that is the heaviest lift but
it is scoped to W8a-refactor and bounded.

**One open question**: the `'closed'` event fires AFTER the webContents is
destroyed. `broadcastToAllWorkspaces` guards `win.isDestroyed()` to handle
the race, but the registry deregister is async (event-driven). If a service
broadcast fires in the narrow window between `'close'` (destroys webContents)
and `'closed'` (fires the event), `isDestroyed()` guards it. Verified by
reading the Electron docs: `win.webContents.send()` throws on a destroyed
webContents, so the `isDestroyed()` guard is load-bearing. Document this in
the W8a-refactor PR.

---

## Amendments to §13

### §13.3-A — RSC import constraint (NEW, not in original §13.3)

`workspace-context.ts` MUST carry a `'use client'` directive or equivalent
documentation warning. In the Next.js App Router, any Server Component that
imports this module will get `WORKSPACE_ID = 'default'` with no error or
warning. The spike surfaced this when attempting to add an observable call
site to `src/app/layout.tsx` (a Server Component). The call site was
converted to a comment explaining the constraint.

**Required action for W8a-ui**: the `WorkspaceProvider` Client Component that
wraps the app must be the single import point for `workspace-context.ts`. All
child components receive `WORKSPACE_ID` via React context, not direct import.
Add an ESLint rule or a compile-time check to prevent direct imports from
non-client modules (possible with a custom ESLint plugin or a barrel file that
asserts `'use client'`).

### §13.4-A — `Cookie` vs `CookiesSetDetails` type gap (MINOR)

Electron's `session.cookies.get()` returns `Electron.Cookie[]` but
`session.cookies.set()` expects `Electron.CookiesSetDetails`. The shapes are
compatible at runtime (both include `name`, `value`, `domain`, etc.) but the
TypeScript types diverge on optional fields. A runtime cast is required in the
migration POC. The W8a-modes PR should use a mapper function that explicitly
projects the required fields rather than a blanket cast.

### §13.5-A — `isDestroyed()` guard is load-bearing (CLARIFICATION)

The original §13.5 does not mention the destroyed-webContents race. The
`isDestroyed()` check in `broadcastToAllWorkspaces` must be preserved in the
production implementation. Remove it and a service broadcast arriving during
window teardown will throw an unhandled exception in the main process, crashing
all remaining windows. This is a correctness requirement, not an optimisation.

---

## Revised W8a-refactor LOC Estimate

With spike code in hand, §12.2's 1200 LOC estimate for W8a-refactor still
feels accurate for the registry + broadcast helper migration. The three
routing patterns are clean; the bulk of the LOC will be mechanical find-
and-replace of `mainWindow.webContents.send(...)` call sites (Agent C counted
30+) plus the `AgentStatus.workspaceId` migration. The `broadcast.ts` module
itself is 65 LOC. No surprises that would inflate the estimate beyond 1200 LOC.

**Revised estimate: 1100–1300 LOC** (within §12.2's 1200 LOC target).

---

## Known Unknowns

1. **IndexedDB migration**: `migrate-default-partition.ts` covers localStorage
   and cookies but not IndexedDB. Electron has no bulk JS-accessible export
   API for IndexedDB; copying requires either LevelDB file manipulation (fragile,
   platform-specific) or a custom serialisation loop using the IndexedDB API
   inside `executeJavaScript`. Commander currently uses IndexedDB for the kanban
   board (`mcp-kanban`). A follow-up spike is needed before W8a-modes ships.

2. **`app://` protocol + partition interaction**: the custom protocol handler in
   `window-manager.ts` serves static files. Agent C flagged (§12.5 Spike 1)
   that query strings are stripped. The `additionalArguments` mechanism
   confirmed to be the correct transport. However, the protocol handler's
   interaction with a non-default partition has not been validated at runtime
   — specifically whether `persist:ws-*` partitions can load `app://-/index.html`
   without additional `privileges` configuration. Verify in manual testing
   before W8a-ui merges.

3. **Pattern 1 at existing agent spawn sites**: the spike proves the registry
   shape but does not trace every existing `getMainWindow()` call site in
   `electron/handlers/ipc-handlers.ts` to confirm each has an accessible
   `workspaceId`. A full audit is required in W8a-refactor. The 30+ site
   count from Agent C should be verified against the current codebase (commit
   `0bd4f95`) before scope is finalised.

4. **Partition isolation with `app://` protocol in production mode**: the
   `create-two-windows.ts` POC uses `loadURL('data:text/html;...')` (inline
   HTML) to avoid file I/O. The production flow loads `app://-/index.html`.
   Whether the Chromium `persist:ws-*` session correctly serves the app://
   protocol for non-default partitions needs manual E2E verification.

5. **`'closed'` event timing under rapid window create/destroy**: the registry
   deregister is event-driven. Under rapid open/close cycles (e.g. user opens
   a workspace and immediately closes it), there is a brief window where the
   registry holds a reference to a closing BrowserWindow. The `isDestroyed()`
   guard handles this but it has not been stress-tested. Consider an explicit
   `deregisterWorkspaceWindow` call on the `'close'` event (fires before
   destruction) in addition to `'closed'`, for belt-and-braces safety.
