#!/usr/bin/env node
// verify-native-arch.mjs — post-build guard against wrong-arch native modules.
//
// Walks the packaged release/ directory and inspects every `.node` file
// inside `app.asar.unpacked/node_modules/**`. Compares the detected arch
// against the expected (target) arch and exits non-zero if any mismatch.
//
// This would have caught the v0.4.0 DMG regression where
// `better_sqlite3.node` shipped as a Windows PE32+ x64 DLL inside an
// arm64 macOS DMG, causing ERR_DLOPEN_FAILED at startup and the
// ipcMain.handle cascade to abort silently.
//
// Usage:
//   node scripts/verify-native-arch.mjs --platform mac --arch arm64
//   node scripts/verify-native-arch.mjs --platform win --arch x64 --dir release
//
// Exits 0 on success, 1 on mismatch, 2 on usage error.
//
// No native deps; works on any Node 18+ runner.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const out = { platform: null, arch: null, dir: 'release', strict: true, includePrebuilds: false };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    switch (k) {
      case '--platform': out.platform = v; i++; break;
      case '--arch':     out.arch = v; i++; break;
      case '--dir':      out.dir = v; i++; break;
      case '--no-strict': out.strict = false; break;
      case '--include-prebuilds': out.includePrebuilds = true; break;
      case '-h':
      case '--help':
        console.log('usage: verify-native-arch.mjs --platform <mac|win|linux> --arch <arm64|x64> [--dir release] [--include-prebuilds]');
        console.log('');
        console.log('  --include-prebuilds   also inspect files under /prebuilds/ subdirs.');
        console.log('                        Default: skip — packages like node-pty ship a');
        console.log('                        multi-platform prebuild bundle and pick the');
        console.log('                        matching one at runtime, so foreign-arch files');
        console.log('                        under prebuilds/ are expected and benign.');
        process.exit(0);
      default:
        if (k.startsWith('--')) {
          console.error(`unknown flag: ${k}`);
          process.exit(2);
        }
    }
  }
  return out;
}

/**
 * True when the path is inside a `prebuilds/<platform-arch>/` subdirectory.
 * Packages like node-pty ship multi-platform prebuilds so the same npm
 * tarball works on Windows / macOS / Linux; only the matching prebuild
 * is loaded at runtime. The verifier skips these by default.
 */
export function isPrebuildPath(p) {
  return /[\\/]prebuilds[\\/][^\\/]+[\\/]/.test(p);
}

// ---------------------------------------------------------------------------
// Header detection
// ---------------------------------------------------------------------------

// Mach-O magic constants
const MACHO_MAGIC_64 = 0xFEEDFACF;
const MACHO_CIGAM_64 = 0xCFFAEDFE;        // little-endian reversed
const MACHO_MAGIC_32 = 0xFEEDFACE;
const MACHO_CIGAM_32 = 0xCEFAEDFE;
const MACHO_FAT      = 0xCAFEBABE;        // universal binary
const MACHO_FAT_REV  = 0xBEBAFECA;

// Mach-O CPU types (per <mach/machine.h>)
const CPU_TYPE_X86_64 = 0x01000007;
const CPU_TYPE_ARM64  = 0x0100000C;

// ELF machine types
const EM_X86_64 = 0x3E;
const EM_AARCH64 = 0xB7;

// PE machine types
const IMAGE_FILE_MACHINE_AMD64 = 0x8664;
const IMAGE_FILE_MACHINE_I386  = 0x014C;
const IMAGE_FILE_MACHINE_ARM64 = 0xAA64;

/**
 * Inspect the first ~256 bytes of a file and return
 * {format: 'macho'|'pe'|'elf'|'unknown', arch: 'arm64'|'x64'|'x86'|'unknown'|'universal', platform: 'darwin'|'win32'|'linux'|'unknown'}.
 *
 * Pure header reading, no libmagic.
 */
export function detectNativeArch(filePath) {
  const buf = readFileSync(filePath);
  if (buf.length < 8) return { format: 'unknown', arch: 'unknown', platform: 'unknown' };

  // Mach-O (darwin)
  const magicBE = buf.readUInt32BE(0);
  const magicLE = buf.readUInt32LE(0);

  if (magicBE === MACHO_FAT || magicBE === MACHO_FAT_REV) {
    // Universal binary — inspect subfile headers to enumerate arches.
    const nfatArch = buf.readUInt32BE(4);
    const arches = [];
    for (let i = 0; i < nfatArch; i++) {
      const cpuType = buf.readInt32BE(8 + i * 20);
      if (cpuType === CPU_TYPE_X86_64) arches.push('x64');
      else if (cpuType === CPU_TYPE_ARM64) arches.push('arm64');
    }
    return { format: 'macho', arch: arches.length === 1 ? arches[0] : 'universal', platform: 'darwin', universal: arches };
  }

  if (magicBE === MACHO_MAGIC_64 || magicLE === MACHO_MAGIC_64) {
    // 64-bit Mach-O. cputype is at offset 4 (little-endian if MAGIC_64 LE).
    const le = (magicLE === MACHO_MAGIC_64);
    const cpuType = le ? buf.readInt32LE(4) : buf.readInt32BE(4);
    if (cpuType === CPU_TYPE_X86_64) return { format: 'macho', arch: 'x64', platform: 'darwin' };
    if (cpuType === CPU_TYPE_ARM64)  return { format: 'macho', arch: 'arm64', platform: 'darwin' };
    return { format: 'macho', arch: 'unknown', platform: 'darwin' };
  }

  if (magicBE === MACHO_MAGIC_32 || magicLE === MACHO_MAGIC_32) {
    return { format: 'macho', arch: 'x86', platform: 'darwin' };
  }

  // PE (Windows): MZ at offset 0, PE offset at 0x3C, machine type 4 bytes into PE header.
  if (buf[0] === 0x4D && buf[1] === 0x5A) {
    if (buf.length < 0x40) return { format: 'pe', arch: 'unknown', platform: 'win32' };
    const peOffset = buf.readUInt32LE(0x3C);
    if (peOffset + 6 > buf.length) return { format: 'pe', arch: 'unknown', platform: 'win32' };
    // 'PE\0\0' signature check.
    if (buf.readUInt32LE(peOffset) !== 0x00004550) {
      return { format: 'pe', arch: 'unknown', platform: 'win32' };
    }
    const machine = buf.readUInt16LE(peOffset + 4);
    switch (machine) {
      case IMAGE_FILE_MACHINE_AMD64: return { format: 'pe', arch: 'x64', platform: 'win32' };
      case IMAGE_FILE_MACHINE_I386:  return { format: 'pe', arch: 'x86', platform: 'win32' };
      case IMAGE_FILE_MACHINE_ARM64: return { format: 'pe', arch: 'arm64', platform: 'win32' };
      default: return { format: 'pe', arch: 'unknown', platform: 'win32' };
    }
  }

  // ELF (Linux): \x7fELF magic, machine at offset 18 (2 bytes LE for LE-encoded ELF).
  if (buf[0] === 0x7F && buf[1] === 0x45 && buf[2] === 0x4C && buf[3] === 0x46) {
    const eiData = buf[5]; // 1 = LE, 2 = BE
    if (buf.length < 20) return { format: 'elf', arch: 'unknown', platform: 'linux' };
    const machine = eiData === 1 ? buf.readUInt16LE(18) : buf.readUInt16BE(18);
    switch (machine) {
      case EM_X86_64:  return { format: 'elf', arch: 'x64', platform: 'linux' };
      case EM_AARCH64: return { format: 'elf', arch: 'arm64', platform: 'linux' };
      default: return { format: 'elf', arch: 'unknown', platform: 'linux' };
    }
  }

  return { format: 'unknown', arch: 'unknown', platform: 'unknown' };
}

// ---------------------------------------------------------------------------
// Directory walking
// ---------------------------------------------------------------------------

/**
 * Recursively walk `root` and yield every path ending in `.node`.
 * Skips symlinks and unreadable entries.
 */
export function* walkNativeModules(root) {
  if (!existsSync(root)) return;
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); }
    catch { continue; }
    for (const entry of entries) {
      const p = join(dir, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) { stack.push(p); continue; }
      if (entry.isFile() && entry.name.endsWith('.node')) yield p;
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function expectedPlatformToken(platform) {
  switch (platform) {
    case 'mac':   return 'darwin';
    case 'win':   return 'win32';
    case 'linux': return 'linux';
    default: throw new Error(`unknown --platform: ${platform}`);
  }
}

function isArchMatch(detected, expected, expectedPlatform) {
  // Universal binaries pass any arch the user asks for as long as it's included.
  if (detected.arch === 'universal' && detected.universal?.includes(expected)) return true;
  return detected.platform === expectedPlatform && detected.arch === expected;
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.platform || !args.arch) {
    console.error('error: both --platform and --arch are required');
    console.error('usage: verify-native-arch.mjs --platform <mac|win|linux> --arch <arm64|x64> [--dir release]');
    process.exit(2);
  }

  let expectedPlatform;
  try { expectedPlatform = expectedPlatformToken(args.platform); }
  catch (e) { console.error(e.message); process.exit(2); }

  if (!existsSync(args.dir)) {
    console.error(`error: --dir does not exist: ${args.dir}`);
    process.exit(2);
  }

  const allFiles = [...walkNativeModules(args.dir)];
  const skipped = args.includePrebuilds ? [] : allFiles.filter(isPrebuildPath);
  const nativeFiles = args.includePrebuilds ? allFiles : allFiles.filter(p => !isPrebuildPath(p));

  if (nativeFiles.length === 0) {
    console.warn(`! no .node files found under ${args.dir} — nothing to verify`);
    if (args.strict) {
      console.error('  (pass --no-strict to allow empty result)');
      process.exit(1);
    }
    return;
  }

  const rows = nativeFiles.map(p => {
    const det = detectNativeArch(p);
    const ok = isArchMatch(det, args.arch, expectedPlatform);
    return { path: p, det, ok };
  });

  const rel = (p) => relative(process.cwd(), p);
  const bad = rows.filter(r => !r.ok);

  console.log(`Native module verification — target=${expectedPlatform}-${args.arch} dir=${args.dir}`);
  console.log('-'.repeat(100));
  for (const r of rows) {
    const mark = r.ok ? 'OK ' : 'BAD';
    const archDesc = r.det.arch === 'universal'
      ? `universal(${r.det.universal?.join(',') ?? '?'})`
      : r.det.arch;
    console.log(`  [${mark}] ${r.det.platform}/${archDesc.padEnd(12)} ${rel(r.path)}`);
  }
  if (skipped.length > 0) {
    console.log(`  (skipped ${skipped.length} file(s) under /prebuilds/ subdirs — multi-platform bundles, use --include-prebuilds to inspect)`);
  }
  console.log('-'.repeat(100));
  console.log(`  ${rows.length} active native module(s) scanned, ${bad.length} mismatch(es)`);

  if (bad.length > 0) {
    console.error('');
    console.error(`FAIL: ${bad.length} native module(s) do not match target ${expectedPlatform}-${args.arch}:`);
    for (const r of bad) {
      console.error(`  ${rel(r.path)}`);
      console.error(`    expected: ${expectedPlatform}-${args.arch}`);
      console.error(`    detected: ${r.det.platform}-${r.det.arch} (${r.det.format})`);
    }
    console.error('');
    console.error('Fix: run `npx @electron/rebuild --arch ${args.arch} --platform ${expectedPlatform} --force`');
    console.error('     before `electron-builder`. In CI, use per-arch matrix jobs so node_modules never contains foreign-arch artefacts.');
    process.exit(1);
  }

  console.log('PASS: all native modules match target.');
}

// Run when invoked directly, not when imported by tests.
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
