import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Assert that the server Playwright connected to is serving THIS checkout's
 * build (#875).
 *
 * `playwright.config.ts` now owns its own preview server on a port it pins, so
 * a foreign server should be impossible: with `reuseExistingServer: false`,
 * Playwright refuses to start when something already holds the port instead of
 * quietly adopting it. This check is the assertion behind that arrangement —
 * it fails loudly if the guarantee ever stops holding, which is the failure
 * #875 reported and could not see.
 *
 * The failure mode it catches: worktrees under `.claude/worktrees/` are
 * separate checkouts with separate `dist/` trees, and more than one session can
 * have a preview up at once. A suite that connects to the wrong one runs green
 * or red against a build that has nothing to do with the branch under test. On
 * #873 that produced two reported findings that were simply false.
 *
 * ## Why the identity signal is the hashed asset name
 *
 * Astro emits its stylesheet into `dist/_astro/` under a content hash, so the
 * name is a fingerprint of the build that produced it. Two checkouts at the
 * same commit hash identically — correctly, because then they are the same
 * build and there is no fiction to catch. Two checkouts on different branches
 * do not.
 *
 * Byte length is reported alongside it because that is the tell that exposed
 * the original incident (21,744 bytes served against 54,230 on disk), but it
 * is not the assertion: it is sensitive to transfer encoding in a way the
 * asset name is not.
 */

/** Hashed `/_astro/*` asset paths referenced by a page, as a sorted list. */
function assetFingerprint(html: string): string[] {
  return [...html.matchAll(/\/_astro\/[A-Za-z0-9._-]+\.(?:css|js)/g)]
    .map((match) => match[0])
    .filter((path, index, all) => all.indexOf(path) === index)
    .sort();
}

export default async function globalSetup(): Promise<void> {
  const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${process.env.E2E_PORT ?? 4321}`;
  const here = dirname(fileURLToPath(import.meta.url));
  const distIndex = resolve(here, '../../dist/index.html');

  let onDisk: string;
  try {
    onDisk = readFileSync(distIndex, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    throw new Error(
      `No build at ${distIndex}. The e2e suite asserts against a built site; ` +
        'run `npm run build` (the Playwright webServer does this for you).',
      { cause: error },
    );
  }

  const response = await fetch(`${baseURL}/`);
  if (!response.ok) {
    throw new Error(`${baseURL}/ responded ${response.status}; expected the built homepage.`);
  }
  const served = await response.text();

  const expected = assetFingerprint(onDisk);
  const actual = assetFingerprint(served);

  if (expected.length === 0) {
    throw new Error(
      `dist/index.html references no hashed /_astro/ asset, so the build serving ` +
        `${baseURL} cannot be identified. Rebuild, or update this check if the ` +
        'asset naming changed.',
    );
  }

  if (expected.join('|') !== actual.join('|')) {
    throw new Error(
      [
        `${baseURL} is serving a DIFFERENT build than ${distIndex}.`,
        '',
        `  on disk: ${expected.join(', ')} (${Buffer.byteLength(onDisk)} bytes)`,
        `  served:  ${actual.join(', ') || '(none)'} (${Buffer.byteLength(served)} bytes)`,
        '',
        'Almost always another checkout — a `.claude/worktrees/` sibling —',
        'serving that URL. Find it with:',
        '',
        `  lsof -nP -iTCP:${new URL(baseURL).port || '4321'} -sTCP:LISTEN`,
        '',
        'Then either stop it and rerun, or rebuild this checkout (`npm run build`)',
        'if the server is one you started here from a stale build.',
      ].join('\n'),
    );
  }
}
