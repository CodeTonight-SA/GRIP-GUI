# ADR: Per-session mode persistence + cross-window state sync

**Status**: PROPOSED — generated 2026-04-30 by broly mesh agent during /ultrado RSI loop on GRIP Commander prod-readiness sprint.
**Author**: GRIP autonomous loop (V>> session)
**Scope**: Implementation deferred to next sprint after surface-level UI/UX bugs (tab click, LEARN scroll, right-navbar removal) ship in PR sprint/grip-commander-prodready → main.

---

## 1. Current architecture

**Sessions today.** Chat sessions live entirely in renderer-process `localStorage` (`src/lib/chat-storage.ts:25-30`). Keys: `grip-chats` (array of `ChatSession` metadata), `grip-chat-{id}` (messages), `grip-active-chat`, `grip-open-tabs`. `getChatSessions()` and friends are pure renderer reads. There is no IPC bridge for sessions — each `BrowserWindow` is an isolated Chromium process with its own `localStorage`.

**Modes today.** Modes are stored OUTSIDE the renderer at `~/.claude/.active-modes` — a newline-separated text file shared by every Claude CLI process. The renderer reads/writes via the Next.js route at `src/app/api/grip/modes/route.ts:6` which directly `readFile`/`writeFile`s that path. `ModeStackChip` (`src/components/ModeStackChip.tsx:64`) fetches `/api/grip/modes` on mount/pathname-change. There is no awareness of which session is active — the chip always reflects the global file.

**Cross-window state today.** Each `BrowserWindow` is registered in a workspace registry (`electron/core/broadcast.ts:29`). Main → renderer broadcasts already exist via `broadcastToAllWorkspaces(channel, payload)` (used for agents). But Zustand store, `localStorage` (sessions), and the modes file are not synced — `Cmd+N` opens a window with the same global modes but no awareness of session lists, active session, or tab state from the originating window.

## 2. Decision

Move the source of truth for **sessions + per-session modes** from renderer `localStorage` and the `~/.claude/.active-modes` global file into the **main process**, persisted to JSON on disk (`~/.grip/sessions.json`), and broadcast every mutation through Electron IPC. The renderer keeps a thin reactive cache hydrated via IPC on window-create and refreshed via `broadcastToAllWorkspaces` events.

Modes become a field on `ChatSession`. The `~/.claude/.active-modes` file is rewritten as a "projection" of the active session's modes whenever the active session changes — the CLI's contract is preserved unchanged. Last-write-wins for race resolution; no DB schema change required.

## 3. Components touched

| File | Change | LOC |
|---|---|---|
| `electron/services/session-store.ts` (new) | JSON-backed store: load/save/mutate sessions, modes, active, tabs | ~140 |
| `electron/handlers/session-handlers.ts` (new) | IPC handlers: `session:list`, `session:setActive`, `session:setModes`, `session:create`, `session:close`, `session:setOpenTabs`. Broadcasts `session:changed` after every mutation | ~110 |
| `electron/preload.ts` | Expose `electronAPI.session.*` bridge | ~25 |
| `electron/main.ts` | Register `registerSessionHandlers()` near `registerGripEngineHandlers()`; on every `setActive`, write `~/.claude/.active-modes` as projection | ~10 |
| `src/lib/chat-storage.ts` | Replace `localStorage` calls with IPC when `isElectronEnv()`; keep `localStorage` as browser fallback. Add `modes: string[]` to `ChatSession` | ~60 |
| `src/store/index.ts` | Add `sessionsSlice` (sessions, activeSessionId, openTabIds, modesBySession). Listen for `session:changed`, hydrate on mount | ~70 |
| `src/components/ModeStackChip.tsx` | Read modes from store (`modesBySession[activeId]`) instead of fetching `/api/grip/modes` | ~20 |
| `src/components/Engine/ChatTabBar.tsx` | Pull modes from store; render compact mode dot/initials per tab tooltip | ~25 |
| `src/app/api/grip/modes/route.ts` | Keep for browser-only fallback; in Electron path, route reads/writes through new IPC | ~10 |

**Total: ~470 LOC.**

## 4. Storage layer

**Location.** `~/.grip/sessions.json` (next to existing `agents.json`/`APP_SETTINGS_FILE`). Keep `localStorage` only as the browser-mode fallback. Do NOT touch `vault.db`. The CLI continues to read `~/.claude/.active-modes`; we only write to it as a projection.

**Schema.**

```ts
interface PersistedSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  model: string;
  sessionId?: string;   // Claude --resume id
  modes: string[];      // NEW — per-session mode stack (max 3)
}

interface SessionStoreFile {
  version: 1;
  sessions: PersistedSession[];
  activeSessionId: string | null;
  openTabIds: string[];
}
```

Messages stay in `localStorage` for now (large, per-window OK for v1). Migrate later if desired.

**Migration.** On first main-process boot of new build: read existing `~/.claude/.active-modes` (the global file), read `localStorage`-backed sessions on first renderer attach via a one-shot `session:importLegacy` IPC. For each existing session, `modes` defaults to a clone of the current global modes (so user keeps their stack on every existing tab). New sessions get `modes: []`. `version: 1` lets us bump later.

## 5. IPC contract

**Renderer → main (commands, async, return ok/error):**

- `session:list` → `PersistedSession[]`
- `session:create({ model })` → `PersistedSession`
- `session:setActive(id)` → projects `modes` to `~/.claude/.active-modes`
- `session:setModes(id, modes[])` → if `id === activeId`, also rewrites `.active-modes`
- `session:setOpenTabs(ids[])`
- `session:close(id)`
- `session:rename(id, title)`

**Main → renderer (broadcast on every mutation):**

- `session:changed` with full `SessionStoreFile` payload (small, simple, last-write-wins).

**Race resolution.** Single writer = main process. Renderers send commands; main mutates the in-memory object, persists, then broadcasts. Two windows mutating "simultaneously" serialise through the main-process event loop — last command wins. This is sufficient because session edits are user-initiated and rare; the simpler model beats optimistic locking.

## 6. UI surface changes

**ChatTabBar** (`src/components/Engine/ChatTabBar.tsx:62`): add a 3-dot mode indicator before `<MessageSquare>` showing up to 3 colored dots (one per active mode in that session); tooltip lists names. No layout change beyond ~12px width per dot row.

**ModeStackChip** (`src/components/ModeStackChip.tsx:55`): replace `fetch('/api/grip/modes')` (line 64) with a Zustand selector `useStore(s => s.modesBySession[s.activeSessionId] ?? [])`. Drop the pathname-trigger refresh — store updates handle it.

## 7. Falsifiable hypotheses

**H303** Per-session modes are feasible without a `vault.db` schema change. **Falsified if**: write contention against `~/.grip/sessions.json` exceeds 50ms p99 with 4 windows mutating, OR JSON corruption observed under SIGKILL of main process. Mitigation triggers a move to SQLite (`vault.db` migration adds a `sessions` table).

**H304** Cross-window sync is feasible without swapping Zustand for a state library that supports cross-process replication. **Falsified if**: round-trip latency `setActive` → other window UI repaint exceeds 200ms, OR if any renderer slice depends on mid-mutation atomic reads that IPC broadcast can't satisfy. Mitigation: introduce `electron-store` + `valtio` shared proxy.

## 8. Migration path (PR sequence)

1. **PR-1 — Add `session-store.ts` + `session-handlers.ts`** (main only). Persist to `~/.grip/sessions.json`. No renderer changes; tests confirm IPC reads/writes. Shippable; renderer still uses `localStorage`.
2. **PR-2 — Renderer hydrates from IPC**, falls back to `localStorage`. Migrate existing localStorage sessions on first run (one-shot import). UI unchanged. Shippable.
3. **PR-3 — Add `modes` field**, project to `~/.claude/.active-modes` on `setActive`. `ModeStackChip` switches to store selector. Shippable; legacy global file still works for CLI.
4. **PR-4 — Wire `session:changed` broadcast** to keep multiple windows in sync. Validate with two-window manual test. Shippable.
5. **PR-5 — `ChatTabBar` mode dots**. Pure visual; safe.
6. **PR-6 — Cleanup**: remove `localStorage` fallback in Electron path, deprecate `/api/grip/modes` route in Electron (browser-only).

## 9. Risks

1. **Concurrent writes to `~/.grip/sessions.json`** — main process is single-threaded JS, so this is theoretical, but FS atomicity matters. Mitigation: write to `sessions.json.tmp` then `rename()` (atomic on POSIX).
2. **Stale `localStorage` in Electron** — old data shadows new IPC data after upgrade. Mitigation: bump `CURRENT_STORAGE_VERSION` (currently 4 in `chat-storage.ts:30`) to 5, nuke `grip-*` keys on first run.
3. **CLI reads `~/.claude/.active-modes` mid-projection** — if user switches tab while CLI is launching, the file might be stale. Mitigation: write file synchronously inside the `setActive` IPC handler before returning.
4. **Broadcast storms** — every keystroke editing a tab title shouldn't broadcast. Mitigation: debounce non-critical mutations (rename, messageCount) at 250ms; mode/active are immediate.
5. **Per-session messages still per-window** — opening a new window does NOT show message history (only metadata + modes). Acceptable for v1; surface as known limitation in UI.

## 10. Out of scope

- Migrating chat **messages** to main process / SQLite (large data, per-window cache acceptable).
- Schema changes to `vault.db`.
- Replacing Zustand or adopting `electron-store`/`electron-redux`.
- Cross-machine sync (this is local-process-only).
- Real-time message streaming sync between windows (each window streams its own session independently).
- Conflict resolution beyond last-write-wins (no operational transforms, no CRDTs).

## 11. Implementation cost estimate

- PR-1: 4 hours (main-process store + handlers + tests)
- PR-2: 6 hours (renderer hydration, legacy migration, edge cases)
- PR-3: 3 hours (modes field + projection + chip wiring)
- PR-4: 3 hours (broadcast wiring + two-window manual verification)
- PR-5: 2 hours (mode-dot UI)
- PR-6: 2 hours (cleanup + deprecation)
- **Total: ~20 hours engineering** (1 sprint week)

## 12. Why not in the current loop

The 1-hour /ultrado RSI loop that produced this ADR cannot ship 470 LOC across 9 files with adequate testing. Trying would produce a fragile half-implementation. The loop ships 3 visible UI/UX bugs cleanly + this ADR; the architecture work is queued for a focused second sprint with proper PR sequencing.
