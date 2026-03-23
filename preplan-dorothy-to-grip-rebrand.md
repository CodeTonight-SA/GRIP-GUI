# Preplan: Dorothy-to-GRIP Rebrand

## Goal

Rename all "Dorothy" references in GRIP-GUI to "GRIP", including the data directory migration from `~/.dorothy/` to `~/.grip/`.

## Current State

- `package.json` identity already GRIP: `grip-knowledge-engine`, `co.codetonight.grip`, productName `GRIP`
- ~74 source-level Dorothy references across 40+ files, 9 categories
- `~/.dorothy/` has live data on V>>'s machine (vault.db with active WAL journals, agents.json, api-token, worlds/)
- `electron/dist/` is gitignored (line 60) -- build artefacts, do not touch
- Existing migration precedent: `migrateFromClaudeManager()` in `electron/utils/index.ts`

## Architecture Decision (Council-Verified)

`~/.grip/` is the correct rename target. Architecturally distinct from `~/.claude/`:

| Directory | Owner | Contains |
|-----------|-------|----------|
| `~/.claude/` | Claude Code + GRIP engine | settings, rules, hooks, skills, modes, genome, KONO, MCP config |
| `~/.grip/` | GRIP-GUI Electron app | agents, vault, kanban, settings, worlds, scripts, logs |

Zero file overlap. Bridge: `claude --add-dir ~/.grip --mcp-config ~/.claude/mcp.json`. Industry standard pattern (VS Code, Cursor, GitHub Desktop all separate GUI state from CLI config).

## Gap Analysis (Broly Council: 4-agent, multi-model)

| Claim | Verdict | Key Risk |
|-------|---------|----------|
| C1: Find-and-replace sufficient | DEAD | 9 categories, 3 dangerous (launchd, format ID, keychain) |
| C2: Move without migration | DEAD | SQLite WAL corruption, running process file handles, launchd plist paths |
| C3: Rebrand compiled dist/ | DEAD | Build artefacts, gitignored, auto-rebuilt by tsc |
| C4: Single PR viable | WOUNDED | Technically possible but 3-PR layered approach gives rollback granularity |

## Reference Categories

| # | Category | Count | Risk | Strategy |
|---|----------|-------|------|----------|
| 1 | Data paths (`~/.dorothy`) | 11 | CRITICAL | Migration function + symlink bridge |
| 2 | LaunchD labels (`com.dorothy.*`) | 16 | HIGH | Dual-label support (read both old + new) |
| 3 | Env vars (`DOROTHY_*`) | 6 | HIGH | Rename + update all hook scripts simultaneously |
| 4 | MCP server names | 6 | HIGH | Rename + coordinated registration |
| 5 | User-facing strings | 20+ | MEDIUM | Safe find-and-replace |
| 6 | File format ID (`dorothy-world-v1`) | 6 | HIGH | Accept both on import, emit new on export |
| 7 | GitHub repo ref | 1 | CRITICAL | Change to CodeTonight-SA/GRIP-GUI |
| 8 | Keychain profile | 1 | MEDIUM | Keep as 'Dorothy' OR re-create as 'GRIP' |
| 9 | Function names | 1 | LOW | Safe rename |

## Execution Plan: 3 PRs

### PR 1: Infrastructure (low risk, no runtime changes)

- [ ] Centralise all hardcoded `'.dorothy'` paths to use `DATA_DIR` from constants
  - `automation-handlers.ts` (lines 14, 109, 155, 250)
  - `scheduler-handlers.ts` (line 25)
  - `mcp-kanban/src/index.ts` (lines 16-17)
  - `mcp-socialdata/src/utils/api.ts`
- [ ] Update `GITHUB_REPO` constant: `Charlie85270/dorothy` -> `CodeTonight-SA/GRIP-GUI`
- [ ] Update `README.md` (title, clone URL, download links)
- [ ] Update `manifest.json`: `"name": "Dorothy"` -> `"name": "GRIP"`
- [ ] Verify `electron/dist/` is in `.gitignore` (confirmed: line 60)
- [ ] Update user-facing strings in Settings, Slack bot, Telegram bot UI text

### PR 2: Migration (medium risk, testable independently)

- [ ] Clone `migrateFromClaudeManager()` -> `migrateFromDorothy()`
  - Chain: `~/.claude-manager` -> `~/.dorothy` -> `~/.grip`
  - SQLite safety: `PRAGMA wal_checkpoint(TRUNCATE)` before copy
  - Copy ALL items: agents, vault (db + wal + shm), worlds, api-token, CLAUDE.md, scripts, settings, kanban, automations, scheduler-metadata, logs, telegram-downloads
  - Verify vault.db integrity: `sqlite3 ~/.grip/vault.db "PRAGMA integrity_check"`
  - Symlink bridge: `~/.dorothy` -> `~/.grip` after migration
  - Keep `~/.dorothy` for one release cycle
- [ ] Update `DATA_DIR` in `electron/constants/index.ts`: `'.dorothy'` -> `'.grip'`
- [ ] Add `LEGACY_DATA_DIR = '.dorothy'` for fallback reads
- [ ] Dual launchd labels: scan both `com.dorothy.*` AND `com.grip.*`
  - `scheduler-handlers.ts` already handles dual format (com.claude + com.dorothy)
  - Extend to triple: com.claude + com.dorothy + com.grip
- [ ] Dual format acceptance: `dorothy-world-v1` || `grip-world-v1` on import
- [ ] Keychain: either keep `'Dorothy'` profile or create `'GRIP'` via `xcrun notarytool store-credentials GRIP`
- [ ] Call `migrateFromDorothy()` at startup in `electron/main.ts` before any data access

### PR 3: Cosmetic Rebrand (low risk, after PR 2 verified)

- [ ] Three-pass rename across source:
  - `dorothy` -> `grip` (paths, labels, identifiers)
  - `Dorothy` -> `GRIP` (user-facing, class names)
  - `DOROTHY_` -> `GRIP_` (env vars)
- [ ] Rename functions: `ensureDorothyClaudeMd()` -> `ensureGripClaudeMd()`
- [ ] Rename MCP servers: `dorothy-socialdata` -> `grip-socialdata`, `dorothy-x` -> `grip-x`, `dorothy-world` -> `grip-world`
- [ ] Rename env vars: `DOROTHY_SKILLS` -> `GRIP_SKILLS`, `DOROTHY_AGENT_ID` -> `GRIP_AGENT_ID`, `DOROTHY_PROJECT_PATH` -> `GRIP_PROJECT_PATH`
- [ ] Update ALL hook scripts in `hooks/gemini/` simultaneously
- [ ] Update bot messages: Slack `:crown: *Dorothy Bot*` -> `:crown: *GRIP Bot*`
- [ ] Update Telegram bot messages
- [ ] Update `src/app/projects/page.tsx`: `dorothy-favorite-projects` -> `grip-favorite-projects`, `dorothy-custom-projects` -> `grip-custom-projects`
- [ ] Update `src/app/icon.tsx`: `dorothy-without-text.png` reference
- [ ] Run `tsc -p electron/tsconfig.json` to regenerate `electron/dist/`
- [ ] Remove old `window-manager.js` from project root (stale build artefact)

### Post-Merge Manual Steps

- [ ] Create keychain profile: `xcrun notarytool store-credentials GRIP --apple-id ... --team-id ...`
- [ ] First GitHub release on CodeTonight-SA/GRIP-GUI
- [ ] Verify migration on machine with existing `~/.dorothy/` data
- [ ] Test launchd task creation + discovery of old com.dorothy.* tasks
- [ ] Test world file import with `dorothy-world-v1` format header

## Estimated Scope

| Metric | Value |
|--------|-------|
| Source files affected | ~74 |
| Lines changed | ~350+ |
| PRs | 3 |
| Risk level | Medium (migration is the hard part) |
| Estimated effort | 1-2 focused sessions |

## Council Sources

- 4-agent Broly council (engineering risk, migration strategy, scope audit, web research)
- 2-agent architecture council (codebase exploration, architectural evaluation)
- Real-world precedents: VSCodium (#109, #293), Brave, electron-builder (#5614), Cursor
