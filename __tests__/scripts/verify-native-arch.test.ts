// Tests for scripts/verify-native-arch.mjs — the post-build guard that would
// have caught the v0.4.0 DMG regression (Windows PE32+ better_sqlite3.node
// shipped inside an arm64 macOS DMG).
//
// Strategy: write minimal valid native-module headers to temp files and assert
// the detector returns the right (platform, arch) tuple. Also covers the
// cross-platform mismatch case that is the actual bug we're protecting against.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// The verifier is an ES module (.mjs). Vitest's esbuild transform handles the
// cross-extension import transparently.
// @ts-expect-error - .mjs import without declaration file
import { detectNativeArch, walkNativeModules, isPrebuildPath } from '../../scripts/verify-native-arch.mjs';

// ---------------------------------------------------------------------------
// Header builders — minimum valid bytes for each format we care about.
// ---------------------------------------------------------------------------

function machoArm64(): Buffer {
  // MH_MAGIC_64 = 0xFEEDFACF. Header layout: magic, cputype, cpusubtype, filetype, ncmds, sizeofcmds, flags, reserved.
  const buf = Buffer.alloc(32);
  buf.writeUInt32LE(0xFEEDFACF, 0);      // magic (little-endian encoding)
  buf.writeInt32LE(0x0100000C, 4);       // CPU_TYPE_ARM64
  return buf;
}

function machoX64(): Buffer {
  const buf = Buffer.alloc(32);
  buf.writeUInt32LE(0xFEEDFACF, 0);
  buf.writeInt32LE(0x01000007, 4);       // CPU_TYPE_X86_64
  return buf;
}

function machoUniversal(): Buffer {
  // Fat header: magic (BE), nfat_arch, then N × fat_arch_64 entries (20 bytes each).
  const buf = Buffer.alloc(8 + 20 * 2);
  buf.writeUInt32BE(0xCAFEBABE, 0);      // MACHO_FAT magic
  buf.writeUInt32BE(2, 4);               // 2 sub-architectures
  buf.writeInt32BE(0x01000007, 8);       // arch 0: x86_64
  buf.writeInt32BE(0x0100000C, 28);      // arch 1: arm64
  return buf;
}

function peX64(): Buffer {
  // Minimum PE: MZ header at 0, PE offset at 0x3C, PE signature + machine type.
  const buf = Buffer.alloc(0x80);
  buf[0] = 0x4D; buf[1] = 0x5A;          // 'MZ'
  buf.writeUInt32LE(0x40, 0x3C);         // PE header offset
  buf.writeUInt32LE(0x00004550, 0x40);   // 'PE\0\0'
  buf.writeUInt16LE(0x8664, 0x44);       // IMAGE_FILE_MACHINE_AMD64
  return buf;
}

function peArm64(): Buffer {
  const buf = Buffer.alloc(0x80);
  buf[0] = 0x4D; buf[1] = 0x5A;
  buf.writeUInt32LE(0x40, 0x3C);
  buf.writeUInt32LE(0x00004550, 0x40);
  buf.writeUInt16LE(0xAA64, 0x44);       // IMAGE_FILE_MACHINE_ARM64
  return buf;
}

function elfX64(): Buffer {
  // ELF header: \x7fELF, class, data, ..., machine at offset 18.
  const buf = Buffer.alloc(64);
  buf[0] = 0x7F; buf[1] = 0x45; buf[2] = 0x4C; buf[3] = 0x46;
  buf[4] = 0x02;                          // EI_CLASS = 64-bit
  buf[5] = 0x01;                          // EI_DATA = little-endian
  buf.writeUInt16LE(0x3E, 18);           // EM_X86_64
  return buf;
}

function elfArm64(): Buffer {
  const buf = Buffer.alloc(64);
  buf[0] = 0x7F; buf[1] = 0x45; buf[2] = 0x4C; buf[3] = 0x46;
  buf[4] = 0x02; buf[5] = 0x01;
  buf.writeUInt16LE(0xB7, 18);           // EM_AARCH64
  return buf;
}

// ---------------------------------------------------------------------------
// Temp fixture
// ---------------------------------------------------------------------------

let tmpRoot: string;
beforeAll(() => { tmpRoot = mkdtempSync(join(tmpdir(), 'verify-arch-')); });
afterAll(() => { rmSync(tmpRoot, { recursive: true, force: true }); });

function writeTemp(name: string, data: Buffer): string {
  const p = join(tmpRoot, name);
  mkdirSync(join(p, '..'), { recursive: true });
  writeFileSync(p, data);
  return p;
}

// ---------------------------------------------------------------------------
// detectNativeArch
// ---------------------------------------------------------------------------

describe('detectNativeArch', () => {
  it('identifies Mach-O arm64', () => {
    const p = writeTemp('macho-arm64.node', machoArm64());
    expect(detectNativeArch(p)).toMatchObject({ format: 'macho', platform: 'darwin', arch: 'arm64' });
  });

  it('identifies Mach-O x86_64', () => {
    const p = writeTemp('macho-x64.node', machoX64());
    expect(detectNativeArch(p)).toMatchObject({ format: 'macho', platform: 'darwin', arch: 'x64' });
  });

  it('identifies Mach-O universal binary and enumerates contained arches', () => {
    const p = writeTemp('macho-universal.node', machoUniversal());
    const r = detectNativeArch(p);
    expect(r.format).toBe('macho');
    expect(r.platform).toBe('darwin');
    expect(r.arch).toBe('universal');
    expect(r.universal).toEqual(expect.arrayContaining(['x64', 'arm64']));
  });

  it('identifies PE32+ x64 (the v0.4.0 regression case)', () => {
    const p = writeTemp('win32-x64.node', peX64());
    expect(detectNativeArch(p)).toMatchObject({ format: 'pe', platform: 'win32', arch: 'x64' });
  });

  it('identifies PE arm64', () => {
    const p = writeTemp('win32-arm64.node', peArm64());
    expect(detectNativeArch(p)).toMatchObject({ format: 'pe', platform: 'win32', arch: 'arm64' });
  });

  it('identifies ELF x86_64', () => {
    const p = writeTemp('elf-x64.node', elfX64());
    expect(detectNativeArch(p)).toMatchObject({ format: 'elf', platform: 'linux', arch: 'x64' });
  });

  it('identifies ELF aarch64', () => {
    const p = writeTemp('elf-arm64.node', elfArm64());
    expect(detectNativeArch(p)).toMatchObject({ format: 'elf', platform: 'linux', arch: 'arm64' });
  });

  it('returns unknown for files that are not native modules', () => {
    const p = writeTemp('garbage.node', Buffer.from('hello world, not a binary'));
    expect(detectNativeArch(p)).toMatchObject({ format: 'unknown', arch: 'unknown' });
  });

  it('returns unknown for truncated files without crashing', () => {
    const p = writeTemp('tiny.node', Buffer.from([0x7F, 0x45])); // 2 bytes
    const r = detectNativeArch(p);
    expect(r.format).toBe('unknown');
  });
});

// ---------------------------------------------------------------------------
// walkNativeModules
// ---------------------------------------------------------------------------

describe('walkNativeModules', () => {
  it('finds all .node files recursively under a release-like tree', () => {
    // Simulate: release/mac-arm64/GRIP Commander.app/Contents/.../better-sqlite3.node
    //          release/mac-arm64/GRIP Commander.app/Contents/.../node-pty.node
    //          release/ignored.txt (should be ignored)
    const base = join(tmpRoot, 'walk-fixture');
    const deep = join(base, 'mac-arm64', 'app', 'Contents', 'Resources', 'app.asar.unpacked',
                      'node_modules', 'better-sqlite3', 'build', 'Release');
    mkdirSync(deep, { recursive: true });
    writeFileSync(join(deep, 'better_sqlite3.node'), machoArm64());

    const ptyDir = join(base, 'mac-arm64', 'app', 'Contents', 'Resources', 'app.asar.unpacked',
                        'node_modules', 'node-pty', 'build', 'Release');
    mkdirSync(ptyDir, { recursive: true });
    writeFileSync(join(ptyDir, 'pty.node'), machoArm64());

    writeFileSync(join(base, 'ignored.txt'), 'not a native module');

    const found = [...walkNativeModules(base)];
    expect(found).toHaveLength(2);
    expect(found.every(p => p.endsWith('.node'))).toBe(true);
  });

  it('yields nothing when the root directory does not exist', () => {
    const nonexistent = join(tmpRoot, 'does-not-exist');
    const found = [...walkNativeModules(nonexistent)];
    expect(found).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// isPrebuildPath — node-pty-style multi-platform prebuild bundles
// ---------------------------------------------------------------------------

describe('isPrebuildPath', () => {
  it('recognises node-pty prebuilds/<platform-arch>/ paths', () => {
    expect(isPrebuildPath('release/mac-arm64/app.asar.unpacked/node_modules/node-pty/prebuilds/win32-x64/pty.node')).toBe(true);
    expect(isPrebuildPath('release/mac-arm64/app.asar.unpacked/node_modules/node-pty/prebuilds/darwin-arm64/pty.node')).toBe(true);
    expect(isPrebuildPath('release/mac-arm64/app.asar.unpacked/node_modules/node-pty/prebuilds/linux-x64/conpty.node')).toBe(true);
  });

  it('does NOT match active native module paths', () => {
    expect(isPrebuildPath('release/mac-arm64/app.asar.unpacked/node_modules/better-sqlite3/build/Release/better_sqlite3.node')).toBe(false);
    expect(isPrebuildPath('release/mac-arm64/app.asar.unpacked/node_modules/node-pty/build/Release/pty.node')).toBe(false);
    expect(isPrebuildPath('release/mac-arm64/app.asar.unpacked/node_modules/node-pty/bin/darwin-arm64-130/node-pty.node')).toBe(false);
  });

  it('handles Windows-style path separators', () => {
    expect(isPrebuildPath('release\\mac-arm64\\node_modules\\node-pty\\prebuilds\\win32-x64\\pty.node')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Regression: the bug that motivated this file
// ---------------------------------------------------------------------------

describe('v0.4.0 regression: Windows DLL in macOS DMG', () => {
  it('flags a Windows PE32+ binary as NOT matching darwin-arm64', () => {
    const p = writeTemp('regression-better-sqlite3.node', peX64());
    const det = detectNativeArch(p);

    // The exact state we saw in the field: native module detected as win32-x64,
    // expected darwin-arm64. This is the failure mode the verifier exists to catch.
    expect(det.platform).toBe('win32');
    expect(det.arch).toBe('x64');

    // Cross-platform mismatch — verifier must fail the build.
    const matchesTarget = (det.platform === 'darwin' && det.arch === 'arm64');
    expect(matchesTarget).toBe(false);
  });
});
