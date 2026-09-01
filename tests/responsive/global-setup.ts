import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Assert that the server Playwright connected to is serving THIS checkout's
 * build (#875).
 *
 * `playwright.config.ts` owns its own preview server on a port it pins, so a
 * foreign server should be impossible: with `reuseExistingServer: false`,
 * Playwright refuses to start when something already holds the port instead of
 * quietly adopting it. This check is the assertion behind that arrangement —
 * it fails loudly if the guarantee stops holding, which is the failure #875
 * reported and could not see. `E2E_BASE_URL` is the one path that deliberately
 * adopts a server it did not start, and this is what polices it.
 *
 * The failure mode: worktrees under `.claude/worktrees/` are separate
 * checkouts with separate `dist/` trees, and more than one session can have a
 * preview up at once. A suite that connects to the wrong one runs green or red
 * against a build that has nothing to do with the branch under test. On #873
 * that produced two reported findings that were simply false.
 *
 * ## Why every built FILE is compared, not one fingerprint
 *
 * This has been narrowed twice, both times by review.
 *
 * The first revision compared only the hashed `/_astro/` asset names on the
 * homepage. Too weak in exactly the case this suite cares about: a sibling
 * checkout differing only in Markdown ships identical CSS and JS, so the names
 * match while every route the specs exercise comes from the wrong build.
 *
 * The second compared every built HTML page, which still discarded every
 * non-HTML output. A checkout differing only in a `public/` asset produces
 * byte-identical HTML, because the asset URL is stable — and
 * `swipe-watch-mux-fallback.spec.ts` loads exactly such a URL
 * (`/images/projects/swipe-watch-hero.gif`). So the binary could still come
 * from the wrong checkout.
 *
 * Every file under `dist/` is now compared, by SHA-256 of its bytes.
 * `astro preview` serves `dist/` as static files, so a served path is
 * byte-identical to its file and any difference at all is caught.
 *
 * ## What this does NOT establish
 *
 * It proves the server is serving *this* `dist/`. It cannot prove `dist/`
 * reflects the current sources. On the managed path that is covered, because
 * `webServer` builds before serving. Under `E2E_BASE_URL` there is no build in
 * the loop, so a stale `dist/` and a server started from it agree with each
 * other and the suite runs against pre-change code (Codex P2, PR #914). Build
 * before you point this at an external preview.
 */

/** Absolute paths of every file under `dist/`, HTML and otherwise. */
function builtFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...builtFiles(full));
    else found.push(full);
  }
  return found;
}

/** SHA-256 of a buffer, so a large PDF or GIF is compared without a diff. */
function digest(bytes: Buffer | Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * `dist/blog/x/index.html` → `/blog/x/`; `dist/index.html` → `/`; every other
 * file keeps its own path (`dist/images/a.gif` → `/images/a.gif`).
 */
function routeOf(dist: string, file: string): string {
  const rel = relative(dist, file).split(sep).join('/');
  return `/${rel.replace(/(^|\/)index\.html$/, '$1')}`;
}

/**
 * Fetch with a deadline.
 *
 * A wedged server that accepts the connection and never answers would
 * otherwise hang the whole run: Playwright's `globalTimeout` defaults to 0 and
 * per-test timeouts do not cover `globalSetup`, so nothing else would ever
 * interrupt it (Codex P2, PR #914).
 */
async function fetchWithDeadline(url: string, ms: number): Promise<Response> {
  try {
    return await fetch(url, { signal: AbortSignal.timeout(ms) });
  } catch (error) {
    const reason =
      error instanceof Error && error.name === 'TimeoutError'
        ? `did not answer within ${ms}ms`
        : `could not be reached (${String(error)})`;
    throw new Error(`${url} ${reason}. Is the preview server up and serving this checkout?`, {
      cause: error,
    });
  }
}

export default async function globalSetup(): Promise<void> {
  const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${process.env.E2E_PORT ?? 4321}`;
  const dist = resolve(dirname(fileURLToPath(import.meta.url)), '../../dist');

  let files: string[];
  try {
    files = builtFiles(dist);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    throw new Error(
      `No build at ${dist}. The e2e suite asserts against a built site; run ` +
        '`npx astro build` (the Playwright webServer does this for you).',
      { cause: error },
    );
  }

  if (files.length === 0) {
    throw new Error(`${dist} is empty. Rebuild before running the e2e suite.`);
  }

  const mismatches: string[] = [];
  for (const file of files) {
    const route = routeOf(dist, file);
    const onDisk = readFileSync(file);
    const response = await fetchWithDeadline(`${baseURL}${route}`, 15_000);
    if (!response.ok) {
      mismatches.push(`  ${route}: served ${response.status}, but this build has it`);
      continue;
    }
    const served = Buffer.from(await response.arrayBuffer());
    if (digest(served) !== digest(onDisk)) {
      // Equal lengths with unequal bytes is the common case for a content
      // edit, and reporting only sizes there reads as a false positive.
      const detail =
        served.byteLength === onDisk.byteLength
          ? `same length (${onDisk.byteLength} bytes), different content`
          : `${served.byteLength} bytes served, ${onDisk.byteLength} on disk`;
      mismatches.push(`  ${route}: ${detail}`);
    }
  }

  if (mismatches.length > 0) {
    const port = new URL(baseURL).port || '4321';
    throw new Error(
      [
        `${baseURL} is serving a DIFFERENT build than ${dist}.`,
        `${mismatches.length} of ${files.length} built files do not match:`,
        '',
        ...mismatches.slice(0, 10),
        mismatches.length > 10 ? `  ...and ${mismatches.length - 10} more` : '',
        '',
        'Almost always another checkout — a `.claude/worktrees/` sibling —',
        'serving that URL. Find it with:',
        '',
        `  lsof -nP -iTCP:${port} -sTCP:LISTEN`,
        '',
        'Then either stop it and rerun, or rebuild this checkout (`npx astro build`)',
        'if the server is one you started here from a stale build.',
        '',
        'Note: this proves the server is serving THIS dist/. It cannot prove dist/',
        'matches your current sources — under E2E_BASE_URL nothing rebuilds, so',
        'build before pointing the suite at an external preview.',
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }
}
