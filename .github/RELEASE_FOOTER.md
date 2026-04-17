---

## First-time launch

GRIP Commander is distributed as an unsigned build (no Apple Developer certificate, no Microsoft Authenticode signature). Your OS will quarantine the download and refuse to open it until you explicitly allow it. Pick the path for your platform.

### macOS (Apple Silicon or Intel)

When you double-click the app the first time you will see:

> **"GRIP Commander" is damaged and can't be opened. You should move it to the Trash.**

The app is not damaged — macOS Gatekeeper is blocking an unsigned download. Two ways to unblock:

**Option A — Terminal (fastest)**

```bash
xattr -cr "/Applications/GRIP Commander.app"
```

Then re-launch. This strips the `com.apple.quarantine` flag so Gatekeeper stops blocking.

**Option B — System Settings (no Terminal)**

1. Double-click the app — it will fail with the "damaged" message.
2. Open **System Settings → Privacy & Security**.
3. Scroll to the bottom. You will see a line: *"GRIP Commander was blocked from use because it is not from an identified developer."*
4. Click **Open Anyway** and confirm.
5. The next launch will prompt once more, then work from then on.

### Windows

When you run `GRIP-Commander-<version>-x64-setup.exe`, SmartScreen will show:

> **Windows protected your PC** — Microsoft Defender SmartScreen prevented an unrecognised app from starting.

Click **More info** → **Run anyway**. This happens once per version.

### Linux

The AppImage needs to be made executable before the first run:

```bash
chmod +x GRIP-Commander-<version>-x86_64.AppImage
./GRIP-Commander-<version>-x86_64.AppImage
```

Some distributions also require `libfuse2` to be installed for AppImages to run:

```bash
sudo apt install libfuse2         # Ubuntu/Debian
sudo dnf install fuse-libs        # Fedora/RHEL
```

---

### Why unsigned?

Code signing requires paid developer accounts on each platform (Apple Developer Program $99/year, Microsoft Authenticode cert ~$300+/year). We will move to signed + notarised builds before the 1.0 release. Until then, the steps above are the one-time friction.

If you are uncomfortable with unsigned builds, you can verify the artefacts yourself: every release is built in GitHub Actions from the `v<version>` tag. The workflow run linked from each release page shows the full build log, a pre-publish verifier step that inspects every native binary for correct architecture, and the exact commit SHA that was packaged.
