#!/usr/bin/env node
// Builds the #1079 flag-off comparison site into dist-flag-off/:
// mode `production`, fixed fake tokens. `npm test` runs this BEFORE the main
// `astro build`, so the build's writes to the checkout's `.astro/` directory
// (og-cards.json, read at import time by several suites) can never race a
// running test, and the main build's output is what `.astro/` holds when
// vitest starts. tests/analytics-privacy.test.js reads the result through
// NP_FLAG_OFF_DIST. See specs/analytics-privacy.md § Feature Flag.
import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildFlagOff } from './lib/analytics-region.mjs';

const root = resolve(import.meta.dirname, '..');
// Fixed, not configurable: the directory is deleted before each build, so it
// must never be one an operator could point at the checkout or anything else.
const outDir = resolve(root, 'dist-flag-off');
if (process.argv.length > 2) {
  console.error('build-flag-off.mjs takes no arguments; it always writes dist-flag-off/.');
  process.exit(2);
}
await rm(outDir, { recursive: true, force: true });
await buildFlagOff(outDir, root);
console.log(`flag-off build written to ${outDir}`);
