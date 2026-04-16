#!/usr/bin/env node
/**
 * refresh-hero-images.mjs — Prebuild step that refreshes opt-in project
 * hero images from external sources.
 *
 * Today the only supported source is `github-social`: the 1200×600 social
 * preview card GitHub generates for every public repo. The URL contains a
 * content-hash that changes when the repo changes, so we resolve it fresh
 * from the repo's `og:image` meta tag on each build.
 *
 * Projects opt in via frontmatter:
 *
 *     heroRefresh: "github-social"
 *     githubUrl: "https://github.com/owner/repo"
 *     screenshotSrc: "/images/projects/<slug>-hero.png"
 *
 * If the fetch fails (network, rate limit, auth, etc.), the script logs a
 * warning and leaves the existing on-disk image in place so the build
 * does not break. Rate limit on opengraph.githubassets.com is generous
 * enough for the handful of projects on this site; aggressive backoff
 * would only matter if that changes.
 */

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const projectsDir = join(repoRoot, 'src/content/projects');
const publicDir = join(repoRoot, 'public');

const USER_AGENT = 'nathanpaynedotcom-build/1.0 (+https://nathanpayne.com)';
const FETCH_TIMEOUT_MS = 10_000;

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
  const match = markdown.match(/^---\n([\s\S]*?)\n---/);
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

function parseGithubRepo(url) {
  const m = url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/#?]+)/);
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/, '') };
}

async function fetchGithubSocialImageUrl(owner, repo) {
  const res = await fetchWithTimeout(`https://github.com/${owner}/${repo}`, {
    headers: { 'User-Agent': USER_AGENT, 'Accept': 'text/html' },
  });
  if (!res.ok) throw new Error(`GitHub repo page returned ${res.status}`);
  const html = await res.text();
  const m = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/);
  if (!m) throw new Error('og:image meta tag not found');
  return m[1];
}

async function downloadImage(url, destPath) {
  const res = await fetchWithTimeout(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`image fetch returned ${res.status}`);
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
    if (data?.heroRefresh === 'github-social') projects.push({ file: entry, data });
  }

  if (projects.length === 0) {
    console.log('[refresh-hero-images] no projects opted in — skipping');
    return;
  }

  for (const { file, data } of projects) {
    const { githubUrl, screenshotSrc, slug } = data;
    const repo = githubUrl ? parseGithubRepo(githubUrl) : null;
    if (!repo) {
      console.warn(`[refresh-hero-images] ${file}: githubUrl missing or not a GitHub URL — skipping`);
      continue;
    }
    if (!screenshotSrc?.startsWith('/')) {
      console.warn(`[refresh-hero-images] ${file}: screenshotSrc must be an absolute path — skipping`);
      continue;
    }
    const destPath = join(publicDir, screenshotSrc);
    try {
      const imageUrl = await fetchGithubSocialImageUrl(repo.owner, repo.repo);
      const bytes = await downloadImage(imageUrl, destPath);
      console.log(`[refresh-hero-images] ${slug || file}: refreshed ${screenshotSrc} (${bytes} bytes)`);
    } catch (err) {
      console.warn(`[refresh-hero-images] ${slug || file}: ${err.message} — keeping existing image`);
    }
  }
}

main().catch((err) => {
  console.warn(`[refresh-hero-images] unexpected error: ${err.message} — continuing build`);
});
