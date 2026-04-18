# GRIP Commander — Changelog

## v0.6.0 (2026-04-18)

**Theme**: QA-driven bug-fix + architecture hardening release. Shipped
autonomously via `/rsi-optimal` sprint after the v0.5.0 QA walk surfaced
6 real issues in the packaged build.

### Fixed

- **Version-string mismatch** (#131): `package.json` bumped 0.4.3 → 0.6.0.
  v0.5.0 binaries were mislabelled as 0.4.3 because the version wasn't
  bumped pre-tag. This release fixes the version string so CI artefact
  filenames match the tag.
- **Packaged-build API 404** (#133): `/api/grip/modes` returned 404 in
  the packaged Electron build because the Next.js static export strips
  server-side API routes. Migrated to IPC via preload bridge
  (`window.electronAPI.grip.getModes()` / `setModes()`). Dev mode still
  uses the fetch path; the new `grip-modes-client` helper picks the
  right transport per surface. Mode selection via the palette now works
  in the packaged build; sidebar `ModeStackChip` and status-bar active-
  mode label populate correctly.
- **Palette ⌘K handoff focus race** (#132): `/save` lands in the chat
  input even when the textarea wasn't focused pre-invocation. RAF retry
  until `inputRef.current` is populated, plus `focus({ preventScroll: true })`
  to stop the transcript from jumping to the bottom when operators were
  reading history.
- **Context-gate slide-up clipping** (#134): Moved the S5 strip from a
  `fixed left-0 right-0` root-level element into the chat column, scoped
  via `absolute bottom-4 left-4 right-4`. No longer clipped behind the
  left sidebar; the "Context gate XX% —" title is fully visible.
- **Window drag broken**: `titleBarStyle: 'hiddenInset'` needed an
  explicit `-webkit-app-region: drag` zone. Added body-wide drag region
  with `no-drag` carved out for interactive elements. Matches Slack /
  Linear / Notion behaviour.
- **Right sidebar cropped in windowed mode**: Changed from
  `sticky top-0 h-screen self-start` (100vh counted from window top) to
  flex-native `h-full self-stretch` (respects the parent row). Full
  height in both windowed and fullscreen now.

### Refactored (DRY)

- **CommandPalette `executeCommand`** (#126): Enter handler and onClick
  handler both ran `saveRecentCommand + action + maybe-close`. Extracted
  to one closure. Keep-open-for-MODES logic now in one place.
- **ContextGateSlideUp `ContextGateActionButton`** (#127): Three
  near-identical button blocks (COMPACT / FRESH SESSION / CHECKPOINT)
  collapsed into a single subcomponent. 50 LOC → 15 LOC, zero behaviour
  change, all 14 test cases still pass.

### Known pre-existing (not addressed in this release)

- `__tests__/mcp/mcp-socialdata.test.ts` — 2 failing tests around tweet
  formatter output expecting `'500'` / `'2,000'` strings. Unrelated to
  this sprint. Tracked for v0.6.1.

### Sprint mechanics

- 7 commits on `feat/v0.6.0-sprint` (6 waves + 1 test-fix follow-up)
- 979/981 tests pass (2 pre-existing failures noted above)
- TypeScript clean on electron + renderer
- Built locally + QA'd via `/rsi-optimal` autonomous loop after v0.5.0
  manual QA walk filed issues #131-#134 + the 2 window-mode bugs

Primary Author: Laurie Scheepers
