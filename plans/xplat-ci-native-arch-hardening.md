# GRIP Commander Cross-Platform CI + Native-Arch Hardening

## Context

v0.4.0 DMG shipped a **Windows PE32+ DLL** as `better_sqlite3.node` on arm64
macOS. Runtime impact: `ERR_DLOPEN_FAILED` at startup → `registerIpcHandlers`
cascade fails → every `grip:*` / `vault:*` IPC channel reports "No handler
registered". Symptom the user sees: "GRIP Error: Electron IPC error: Error
invoking remote method 'grip:prompt': Error: No handler registered for
'grip:prompt'".

Root cause: v0.4.0 was built locally via `commander:dmg` from a dev tree whose
root `node_modules/better-sqlite3/build/Release/` had been contaminated by a
prior Windows build. `commander:dmg` does not clean `node_modules`, does not
run `@electron/rebuild`, and has no post-build arch verification.

The freshly-added `.github/workflows/build.yml` (commit fbd4071) was intended
to fix this but has three distinct defects that would produce broken DMGs if
anyone tagged `v0.4.1` today:

1. **Missing electron main compilation.** The CI step runs `npm run build`,
   which is `next build` — it does NOT run `tsc -p electron/tsconfig.json`
   (main process) or build the 7 MCP submodules. Packaged DMGs would be
   missing `electron/dist/**` entirely.
2. **No native rebuild step.** electron-builder relies on its implicit
   `install-app-deps`, but there is no explicit guarantee that native
   modules are rebuilt for the target platform/arch — and no failure signal
   if they are not.
3. **Sequential arm64/x64 in one job.** `npx electron-builder --mac dmg --arm64`
   followed by `--x64` share a single `node_modules`. The second run
   overwrites `better_sqlite3.node` with x64 artefacts; if it fails silently,
   the "x64" DMG ships arm64 binaries.

## Hypotheses

| ID | Claim | Metric | Prediction | Verification |
|----|-------|--------|------------|--------------|
| H-XP1 | The current `build.yml` would produce a non-launching DMG because `electron/dist/` would be empty | packaged app has electron main | absent on `v0.4.1` CI run | Fixed before any tag is pushed |
| H-XP2 | Per-arch matrix jobs with explicit `@electron/rebuild` produce DMGs where every `.node` inside `app.asar.unpacked/node_modules/**/build/Release/` matches the target arch | verifier exit code | 0 for all 4 platforms (darwin-arm64, darwin-x64, win32-x64, linux-x64) | `scripts/verify-native-arch.mjs` as CI step |
| H-XP3 | Refactoring the 20-line bash one-liner in `commander:dmg` into `scripts/build-electron.sh` reduces the chance of silent step-failure and makes the build reproducible | set -euo pipefail + individual step exit | any failing step aborts the build, surfaces in stderr | Test locally on arm64 |
| H-XP4 | The verifier, if it had existed at v0.4.0, would have caught the Windows DLL before release | test case: Windows PE32+ in darwin-arm64 build | test fails with non-zero exit | Unit test in Vitest |

## Fibonacci Waves

### W1 — FAST (depth=1): CI workflow rewrite (`.github/workflows/build.yml`)

Target: a workflow that actually produces working, arch-correct DMGs.

- Use per-platform, per-arch matrix jobs instead of sequential steps within one job.
- Each job: fresh checkout → `npm ci` → `bash scripts/build-electron.sh <platform> <arch>` (which handles tsc + mcp submodules + electron-rebuild) → `npx electron-builder --$platform --$arch` → `node scripts/verify-native-arch.mjs` → upload artefact.
- Tag-triggered release job gated on all matrix entries succeeding + verifier passing.

### W2 — FAST (depth=1): Build script extraction (`scripts/build-electron.sh`)

Target: single source of truth for local and CI builds.

- Replace the bash one-liner embedded in `commander:dmg` / `commander:pack` / `electron:build` with `scripts/build-electron.sh`.
- Script accepts `--platform` and `--arch` flags; defaults to host.
- `set -euo pipefail`. Each step (next build / tsc / mcp submodules / electron-rebuild / electron-builder) is its own function with explicit error handling.
- New npm scripts `build:electron:mac`, `build:electron:win`, `build:electron:linux` wrap it.

### W3 — CAREFUL (depth=2): Native-arch verifier (`scripts/verify-native-arch.mjs`)

Target: catch any wrong-arch native module before shipping.

- Walks every `.node` file in `release/**/app.asar.unpacked/node_modules/**/build/Release/` after electron-builder packages the app.
- For each, computes arch via Mach-O magic bytes (darwin) / PE32 signature (win32) / ELF header (linux) — pure JS, no native deps, works on any CI runner.
- Compares against the expected target (read from package.json build config or CLI args).
- Exits non-zero with a readable diff if any file is wrong-arch.
- Covered by Vitest unit tests in `scripts/__tests__/verify-native-arch.test.mjs`.

### W4 — SHIP (commit → PR → merge → tag)

- Commits granular per wave so bisect works.
- PR to `main` with this plan linked.
- Admin merge (protected branch pattern consistent with other CodeTonight repos).
- User decides when to tag `v0.4.1` — the new CI will produce the correct artefacts.

## Local unblock (for the user right now, not part of CI fix)

Two options to get v0.4.0 working on the user's installed copy while the CI
fix is pending:

**A. In-place native rebuild** (fast, fragile if /Applications is locked):

```bash
cd "/Applications/GRIP Commander.app/Contents/Resources/app.asar.unpacked/node_modules/better-sqlite3"
sudo npx @electron/rebuild -v 35.7.5 -m . -t prod -w better-sqlite3
file build/Release/better_sqlite3.node  # expect: Mach-O 64-bit bundle arm64
```

**B. Local clean rebuild + DMG** (matches what v0.4.1 CI will produce):

```bash
cd ~/CodeTonight/GRIP-GUI
rm -rf node_modules package-lock.json
npm install
npx @electron/rebuild
npm run commander:dmg
open release/*.dmg
```

## Falsification criteria

This plan is wrong if:

- The verifier misidentifies the arch of a valid prebuild (false positive blocks a correct release).
- `@electron/rebuild` fails on CI runners for one of the 4 targets (platform-specific breakage we didn't anticipate).
- The matrix spread inflates CI minute cost beyond what CodeTonight is willing to spend per release.
- electron-builder already handles everything correctly and the v0.4.0 contamination was entirely a local-build issue that won't recur in CI. (If so: the verifier is still cheap insurance.)
