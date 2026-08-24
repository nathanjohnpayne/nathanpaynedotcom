#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fixSpacedEmDashes } from './lint-content-em-dash.mjs';

const listed = spawnSync(process.execPath, ['scripts/lint-prose.mjs', '--list-files'], {
  encoding: 'utf8',
});
if (listed.status !== 0) {
  console.error(listed.stderr || listed.stdout);
  process.exit(2);
}

let changed = 0;
for (const file of listed.stdout.trim().split('\n').filter(Boolean)) {
  const source = readFileSync(file, 'utf8');
  const fixed = fixSpacedEmDashes(file, source);
  if (fixed !== source) {
    writeFileSync(file, fixed);
    changed += 1;
  }
}

console.log(`fixed spaced em dashes in ${changed} files`);
