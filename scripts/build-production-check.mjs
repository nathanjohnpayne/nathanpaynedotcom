#!/usr/bin/env node
// Builds the #1079 production-mode check site into dist-production-check/:
// mode `production` (the mode the deploy build runs in) with fixed fake
// tokens, so the analytics blocks render. `npm test` runs this BEFORE the
// main `astro build`, so the build's writes to the checkout's `.astro/`
// directory (og-cards.json, read at import time by several suites) can never
// race a running test, and the main build's output is what `.astro/` holds
// when vitest starts. tests/analytics-privacy.test.js reads the result through
// NP_PRODUCTION_CHECK_DIST. See specs/analytics-privacy.md § Feature Flag.
import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildProductionCheck } from './lib/analytics-region.mjs';

const root = resolve(import.meta.dirname, '..');
// Fixed, not configurable: the directory is deleted before each build, so it
// must never be one an operator could point at the checkout or anything else.
const outDir = resolve(root, 'dist-production-check');
if (process.argv.length > 2) {
  console.error(
    'build-production-check.mjs takes no arguments; it always writes dist-production-check/.',
  );
  process.exit(2);
}
await rm(outDir, { recursive: true, force: true });
await buildProductionCheck(outDir, root);
console.log(`production-mode check build written to ${outDir}`);
