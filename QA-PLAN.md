# GRIP-GUI QA Plan

## Overview

15 pages, 24+ IPC channels, 40+ components, 7 MCP servers, 30 modes, ~150 skills.
Existing coverage: unit tests (handlers, utils, MCP, security). Gap: E2E and integration.

---

## Phase 1: Smoke Test (Critical Path)

Must pass before any release. Run manually after each build.

### 1.1 App Launch

- [ ] `npm run electron:dev` starts without errors
- [ ] Welcome animation plays on first launch
- [ ] Main chat interface renders (Engine page)
- [ ] Status bar visible at bottom with mode, health, token count
- [ ] Context panel visible on right (desktop)
- [ ] Sidebar navigation works — all 15 pages load without crash

### 1.2 Chat Flow

- [ ] Type message → send → streaming response appears
- [ ] Model selector switches between Sonnet/Opus/Haiku
- [ ] New chat session creates via button
- [ ] Chat history sidebar shows previous sessions
- [ ] Click previous session → messages reload
- [ ] Focus mode toggle → full-screen chat → toggle back
- [ ] Long message renders markdown correctly (code blocks, lists, headings)

### 1.3 Data Migration (Post-Rebrand)

- [ ] First launch after update: `~/.dorothy/` migrated to `~/.grip/`
- [ ] Symlink `~/.dorothy` → `~/.grip` created
- [ ] vault.db integrity preserved (open vault → documents visible)
- [ ] agents.json preserved (agents list → previous agents visible)
- [ ] App settings preserved (settings page → previous config intact)

---

## Phase 2: Feature Testing

### 2.1 Agent Lifecycle

- [ ] Create agent via New Chat modal (5-step: Model → Project → Task → Tools → Review)
- [ ] Agent appears in sidebar agent list
- [ ] Start agent → status changes to Running → terminal output streams
- [ ] Send input to waiting agent → agent continues
- [ ] Stop agent (Ctrl+C) → status changes to Stopped
- [ ] Remove agent → disappears from list and disk
- [ ] Agent persists across app restart (agents.json)

### 2.2 Kanban Board

- [ ] Navigate to `/kanban` → board renders with 4 columns
- [ ] Create task → appears in Backlog
- [ ] Click task → detail modal opens → edit title/description
- [ ] Move task between columns (Backlog → Planned → Ongoing → Done)
- [ ] Delete task → removed from board
- [ ] Tasks persist across app restart (kanban-tasks.json)

### 2.3 Vault

- [ ] Navigate to `/vault` → document list renders
- [ ] Create document → markdown editor opens
- [ ] Type content → save → document appears in list
- [ ] Search documents → results filtered
- [ ] Create folder → appears in folder tree
- [ ] Attach file to document → attachment visible
- [ ] Delete document → removed from list
- [ ] Documents persist across restart (vault.db)

### 2.4 Scheduler

- [ ] Navigate to `/recurring-tasks` → task list renders
- [ ] Create task → cron schedule picker → prompt input → save
- [ ] Task appears in list with next run time
- [ ] Manual trigger → task executes → log appears
- [ ] View logs → real-time log streaming
- [ ] Edit task schedule → task rescheduled
- [ ] Delete task → removed from list + launchd/cron cleaned up
- [ ] Verify launchd plist created: `ls ~/Library/LaunchAgents/com.grip.scheduler.*`

### 2.5 Automations

- [ ] Navigate to `/automations` → automation list renders
- [ ] Create automation with GitHub source → schedule → save
- [ ] Automation appears in list with enabled toggle
- [ ] Manual trigger → automation runs → log appears
- [ ] Disable automation → toggle off → no further runs
- [ ] Delete automation → removed + plist cleaned up

### 2.6 Modes & Skills

- [ ] Navigate to `/modes` → 30 modes visible in 6 categories
- [ ] Select mode → skills list shows associated skills
- [ ] Multi-select up to 3 modes → combined view
- [ ] Navigate to `/skills` → ~150 skills in 14 categories
- [ ] Mode quick-switch in context panel works

### 2.7 Settings

- [ ] Navigate to `/settings` → 10+ sections render
- [ ] CLI Paths: Auto-detect finds `claude` binary
- [ ] Slack: Enter token → test connection → success/failure feedback
- [ ] Telegram: Enter token → test connection → success/failure feedback
- [ ] Notifications: Toggle on/off → persists
- [ ] All settings persist across restart (app-settings.json)

### 2.8 Vortex 3D

- [ ] Navigate to `/vortex` → 3D canvas renders
- [ ] Double-helix animation plays
- [ ] Pan (drag) and zoom (scroll) work
- [ ] No WebGL errors in console

---

## Phase 3: Integration Testing

### 3.1 Agent → Scheduler Integration

- [ ] Create scheduled task with agent prompt
- [ ] Wait for schedule trigger (or manual trigger)
- [ ] Verify agent spawns and executes
- [ ] Verify log captures output

### 3.2 Automation → Agent Integration

- [ ] Create automation with agent execution enabled
- [ ] Trigger automation
- [ ] Verify agent spawns with automation context
- [ ] Verify output routed to configured destination

### 3.3 MCP Server Integration

- [ ] Kanban MCP tools accessible from Claude Code session
- [ ] Vault MCP tools accessible from Claude Code session
- [ ] Orchestrator MCP tools list/create/stop agents

### 3.4 Backward Compatibility

- [ ] Old `com.dorothy.scheduler.*` launchd plists discovered by app
- [ ] Old `com.dorothy.automation.*` launchd plists discovered by app
- [ ] World import with `dorothy-world-v1` format header succeeds
- [ ] World export uses `grip-world-v1` format
- [ ] Cron entries with `# dorothy-*` comments cleaned up on task deletion

---

## Phase 4: Edge Cases & Error Handling

### 4.1 Chat

- [ ] Empty message → not sent
- [ ] Very long message (10k+ chars) → handles gracefully
- [ ] Network failure mid-stream → error shown, no crash
- [ ] Rapid model switching mid-conversation → no race condition

### 4.2 Agent

- [ ] Start agent with invalid project path → error shown
- [ ] Start agent when CLI binary not found → error with guidance
- [ ] Two agents on same project → no file lock conflicts
- [ ] Agent output with ANSI escape codes → stripped or rendered correctly

### 4.3 Storage

- [ ] localStorage full (5MB limit) → graceful degradation
- [ ] Corrupted vault.db → app still launches, error logged
- [ ] Missing `~/.grip/` directory → auto-created on launch
- [ ] Concurrent writes to kanban-tasks.json → no data loss

### 4.4 Platform

- [ ] macOS: launchd plist creation/removal works
- [ ] macOS: Gatekeeper allows launch (with SKIP_NOTARIZE for dev)
- [ ] Linux: cron job creation/removal works
- [ ] Windows: scheduled task creation works (if supported)

---

## Phase 5: Performance

- [ ] App launch to usable: < 3 seconds
- [ ] Chat response first token: < 2 seconds
- [ ] Kanban with 100+ tasks: renders without lag
- [ ] Vault with 500+ documents: search returns < 1 second
- [ ] Memory usage after 30 minutes: < 500MB
- [ ] No memory leaks from terminal instances (check with DevTools)

---

## Phase 6: Security

Existing test coverage: IPC sandboxing, MCP sandboxing, markdown XSS.

- [ ] No `nodeIntegration: true` in BrowserWindow
- [ ] `contextIsolation: true` enforced
- [ ] IPC channels validate input types
- [ ] Markdown renderer sanitises HTML (no script injection)
- [ ] API tokens stored in `~/.grip/` (not in localStorage or git)
- [ ] `app://` protocol does not serve files outside app directory
- [ ] `local-file://` protocol validates file existence before serving

---

## Test Infrastructure

| Layer | Tool | Status |
|-------|------|--------|
| Unit | Vitest | Active (20+ test files) |
| Integration | Vitest + IPC mocks | Partial |
| E2E | Not implemented | Recommended: Playwright + Electron |
| Visual regression | Not implemented | Recommended: Percy or Chromatic |

### Run Tests

```bash
npm run test              # Unit tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report
```

---

## QA Checklist per Release

Before any distributable build:

1. [ ] All unit tests pass (`npm run test`)
2. [ ] Phase 1 smoke test (manual, ~15 min)
3. [ ] Phase 2 features affected by changes (targeted, ~30 min)
4. [ ] Phase 3 integration if scheduler/automation/MCP changed
5. [ ] Phase 6 security if IPC or protocol handlers changed
6. [ ] Build succeeds: `SKIP_NOTARIZE=1 npm run electron:build`
7. [ ] Built app launches and passes Phase 1 smoke test
