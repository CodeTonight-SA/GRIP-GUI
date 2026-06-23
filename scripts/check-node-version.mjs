#!/usr/bin/env node
// Preinstall guard: hard-fail `npm install` / `npm ci` on an unsupported Node.
//
// WHY THIS EXISTS
// Some machines default to a bleeding-edge Node (e.g. an M-series Mac whose
// `node` is v25). Against Node 23+ the better-sqlite3 ^11 native module has no
// prebuilt binary and node-gyp fails compiling against the newer V8 headers, so
// `npm install` breaks before anything downstream can run. A bare `engines`
// field is only a WARNING — easy to miss — so the wrong Node gets silently used.
// This guard turns that into a fast, clear, actionable failure.
//
// SOURCE OF TRUTH: package.json "engines.node" (read below, never duplicated).
// CI uses Node 20 and .nvmrc pins Node 22 — both satisfy the declared range.
//
// Built-ins only: this runs BEFORE dependencies are installed, so it must not
// import anything from node_modules (no `semver`). A tiny tuple-compare covers
// the simple ">=A <B" comparator form the range uses.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf8'));
const range = (pkg.engines && pkg.engines.node) ? String(pkg.engines.node) : '';
const current = process.versions.node;

// Compare two "major.minor.patch" strings: -1 / 0 / 1.
function cmp(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d > 0 ? 1 : -1;
  }
  return 0;
}

// True if `version` satisfies a space-separated AND-range of simple comparators.
// Unknown tokens are ignored (fail-open) so a guard bug can never block a
// legitimate install; the npm-native engines warning remains a backstop.
function satisfies(version, rangeStr) {
  return rangeStr
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => {
      const m = token.match(/^(>=|<=|>|<|=)?\s*(\d+(?:\.\d+){0,2})$/);
      if (!m) return true;
      const op = m[1] || '=';
      const base = m[2].split('.').concat(['0', '0']).slice(0, 3).join('.');
      const c = cmp(version, base);
      if (op === '>=') return c >= 0;
      if (op === '>') return c > 0;
      if (op === '<=') return c <= 0;
      if (op === '<') return c < 0;
      return c === 0;
    });
}

if (range && !satisfies(current, range)) {
  console.error(`\n[GRIP Commander] Unsupported Node ${process.version}.`);
  console.error(`  Required: engines.node "${range}" (see .nvmrc -> 22; CI uses Node 20).`);
  console.error(`  Why: better-sqlite3 ^11 has no prebuilt binary for Node 23+, and`);
  console.error(`       node-gyp then fails compiling against newer V8 headers.`);
  console.error(`  Fix (macOS): brew install node@22 && \\`);
  console.error(`       PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm install\n`);
  process.exit(1);
}
