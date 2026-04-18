#!/usr/bin/env node
/**
 * refresh-mux-gifs.mjs — Prebuild step that writes Mux-generated
 * animated GIFs for any project with a `muxPlaybackId` in its
 * frontmatter.
 *
 * Each project gets a GIF pulled from image.mux.com at a fixed width,
 * frame rate, and duration. Output path is the same `screenshotSrc`
 * the content schema already points at — typically
 * `public/images/projects/<slug>-hero.gif` — so the OG template and
 * the `<img slot="poster">` fallback keep working without any
 * downstream changes.
 *
 * Failure semantics are strict by design: any network error, non-200
 * response, or I/O failure exits non-zero and halts the build. The
 * paired `refresh-hero-images.mjs` fails softly (keeps the existing
 * image) because its source — GitHub's social preview — can rate-limit
 * and isn't load-bearing for new projects. Mux GIFs are the opposite:
 * they're the authoritative source for the fallback frame on projects
 * that have a video, so a silent miss would serve stale content
 * indefinitely. Better to fail the build loudly and let the operator
 * investigate.
 *
 * Skipped projects: anything without `muxPlaybackId`, or without an
 * absolute `screenshotSrc`. Those are noops, not failures.
 */

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const projectsDir = join(repoRoot, 'src/content/projects');
const publicDir = join(repoRoot, 'public');

const USER_AGENT = 'nathanpaynedotcom-build/1.0 (+https://nathanpayne.com)';
const FETCH_TIMEOUT_MS = 30_000;

// Rendering knobs. 320px matches the narrow project-screenshot inner
// wrapper's max-width; 15 fps is smooth enough for phone UI demos
// without bloating the file; 8s captures a full swipe cycle on the
// Swipe Watch asset. Adjust per-project via URL params if a future
// project needs different framing.
const GIF_WIDTH = 320;
const GIF_FPS = 15;
const GIF_END = 8;

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const body = match[1];
  const data = {};
  for (const line of body.split('\n')) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (!m) continue;
    const [, key, rawValue] = m;
    let value = rawValue.trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    data[key] = value;
  }
  return data;
}

function muxGifUrl(playbackId) {
  const params = new URLSearchParams({
    width: String(GIF_WIDTH),
    fps: String(GIF_FPS),
    end: String(GIF_END),
  });
  return `https://image.mux.com/${playbackId}/animated.gif?${params.toString()}`;
}

async function downloadGif(url, destPath) {
  const res = await fetchWithTimeout(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) {
    throw new Error(`Mux image API returned ${res.status} ${res.statusText} for ${url}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  await writeFile(destPath, buffer);
  return buffer.byteLength;
}

async function main() {
  const entries = await readdir(projectsDir);
  const projects = [];
  for (const entry of entries) {
    if (!entry.endsWith('.md')) continue;
    const markdown = await readFile(join(projectsDir, entry), 'utf8');
    const data = parseFrontmatter(markdown);
    if (data?.muxPlaybackId) projects.push({ file: entry, data });
  }

  if (projects.length === 0) {
    console.log('[refresh-mux-gifs] no projects have muxPlaybackId — skipping');
    return;
  }

  for (const { file, data } of projects) {
    const { muxPlaybackId, screenshotSrc, slug } = data;
    if (!screenshotSrc?.startsWith('/')) {
      throw new Error(
        `[refresh-mux-gifs] ${file}: screenshotSrc must be an absolute path (got "${screenshotSrc}")`,
      );
    }
    const destPath = join(publicDir, screenshotSrc);
    const url = muxGifUrl(muxPlaybackId);
    const bytes = await downloadGif(url, destPath);
    console.log(
      `[refresh-mux-gifs] ${slug || file}: wrote ${screenshotSrc} (${bytes} bytes, ${GIF_WIDTH}px @ ${GIF_FPS}fps, ${GIF_END}s)`,
    );
  }
}

main().catch((err) => {
  console.error(`[refresh-mux-gifs] ${err.message}`);
  process.exit(1);
});
