# v0.5.0 Walkthrough — Recording Script

**Target length**: 60s. Format: MP4, 1080p, no audio narration required (text overlay optional in post).
**Output**: `docs/media/v0.5.0-walkthrough.mp4`.

## Pre-flight

1. `cd /Users/lauriescheepers/CodeTonight/GRIP-GUI`
2. `pnpm dev` (Electron) — or `pnpm dev:web` to record the web build
3. Wait for the Engine view to fully mount (status bar visible, sidebar rendered)
4. Open devtools (⌘⌥I) → Console tab → keep it open but off-camera for the recording
5. Start screen recording (QuickTime → File → New Screen Recording, or `cmd+shift+5`)

## Features demonstrated (in order)

| # | Feature | Screen | Event trigger |
|---|---|---|---|
| 1 | S3 ModeStackChip | Sidebar (collapsed + expanded) | Click chip → CommandPalette opens with MODES filter |
| 2 | S2-PR1 Status bar "CTX --" honest-blank | Bottom bar | Already rendered; zoom into the CTX gauge |
| 3 | S2-PR2 Active mode label | Bottom bar | Poll result from `/api/grip/modes` appears as e.g. `code` |
| 4 | S1 CommandPalette ⌘K handoff | Centre modal | ⌘K → type "save" → Enter → `/save` lands in chat input |
| 5 | S4 RetrievalTierChip | Above chat input | Paste harness snippet #1 → chip flips CACHED → SEARCHED |
| 6 | S5 ContextGateSlideUp | Fixed bottom strip | Paste harness snippet #2 → slide-up appears at 89% |

## Recording beats (60s target)

```
0:00–0:05   App opens. Linger on the plain status bar (establishes the "before" frame).
0:05–0:15   Click ModeStackChip → palette opens in MODES mode → select `code` → close.
0:15–0:20   Cursor over status bar. "GRIP v0.5.0" + active mode pill now visible.
0:20–0:30   ⌘K → type "save" → Enter → palette closes, chat input now reads "/save ".
0:30–0:40   Paste harness snippet #1 in devtools. Retrieval chip flips CACHED then SEARCHED.
0:40–0:55   Paste harness snippet #2 in devtools. Context-gate slide-up appears at 89%.
0:55–1:00   Click COMPACT → slide-up dismisses. End frame.
```

## Notes

- Keep devtools panel OFF-camera in the final recording; only the console prompt is needed to paste snippets. If you record full-screen, re-crop in post (Final Cut / ScreenFlow) to hide the console.
- All 5 Phase 2 feature flags default to enabled. No localStorage setup needed.
- The status bar context gauge stays "CTX --" because no emitter is wired for percent data yet (intentional honest-blank per council scope rider S2-PR1).

## Harness snippets

See `demo-harness.js` in this directory. Paste the contents of the `#retrieval`
and `#contextGate` snippets into devtools at the beats above.
