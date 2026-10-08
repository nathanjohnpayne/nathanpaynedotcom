// #1079 flag-off regression helpers, shared by scripts/build-flag-off.mjs and
// tests/analytics-privacy.test.js (specs/analytics-privacy.md § Feature Flag).
//
// The "analytics region" is the run of <head> that BaseLayout emits for the
// analytics tools: from the `<!-- PostHog -->` comment up to (not including)
// `<!-- Google Fonts -->`. With the privacy flag off it must be byte-identical
// to the region captured from the contract's base commit.

import { spawn } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

export const REGION_START = '<!-- PostHog -->';
export const REGION_END = '<!-- Google Fonts -->';

/** Fixed fake tokens: the fixture was captured with exactly these. */
export const FLAG_OFF_ENV = {
  PUBLIC_POSTHOG_PROJECT_TOKEN: 'phc_flag_off_fixture',
  PUBLIC_GA_MEASUREMENT_ID: 'G-FLAGOFF000',
  PUBLIC_LOGODEV_KEY: '',
};

/** Strings every privacy implementation carries and a flag-off build must not. */
export const RUNTIME_MARKERS = ['npPrivacy', 'np:privacy-change', 'data-np-privacy', 'np-privacy'];

/** Returns the analytics region of one HTML document, or null if absent. */
export function analyticsRegion(html) {
  const start = html.indexOf(REGION_START);
  if (start < 0) return null;
  const end = html.indexOf(REGION_END, start);
  if (end < 0) return null;
  return html.slice(start, end);
}

export async function listFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listFiles(full)));
    else out.push(full);
  }
  return out;
}

/** Text files in a build, keyed by path relative to the build root. */
export async function readTextFiles(
  dir,
  exts = ['.html', '.js', '.mjs', '.css', '.json', '.xml', '.txt'],
) {
  const files = (await listFiles(dir)).filter((f) => exts.some((e) => f.endsWith(e)));
  return Promise.all(
    files.map(async (f) => ({ path: relative(dir, f), text: await readFile(f, 'utf8') })),
  );
}

/** Runs `astro build` in production mode with the fixed fake tokens. */
export function buildFlagOff(outDir, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        join(cwd, 'node_modules/astro/bin/astro.mjs'),
        'build',
        '--mode',
        'production',
        '--outDir',
        outDir,
      ],
      { cwd, env: { ...process.env, ...FLAG_OFF_ENV }, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let log = '';
    child.stdout.on('data', (d) => (log += d));
    child.stderr.on('data', (d) => (log += d));
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0
        ? resolve(log)
        : reject(new Error(`flag-off build exited ${code}\n${log.slice(-4000)}`)),
    );
  });
}
