/**
 * Third-party fixtures for the privacy acceptance suite (#1230).
 *
 * The suite serves real vendor code to the browser from a gitignored cache
 * (`node_modules/.cache/np-privacy-acceptance/`) and commits only `tests/privacy/manifest.json`.
 *
 * Why fetch instead of adding devDependencies: package.json and the lockfile
 * belong to no #1079 track (specs/analytics-privacy.md § File Ownership), and
 * the bundles are test oracles, not build inputs. Every fetched archive is
 * verified against the registry integrity recorded in the manifest, and every
 * served PostHog file against the production SHA-256 recorded in the
 * inventory, so a registry substitution or a version drift fails the run.
 *
 * Licences: posthog-js is Apache-2.0 AND MIT; axe-core is MPL-2.0. Both are
 * used unmodified, are not redistributed, and are not committed.
 */
import { createHash, X509Certificate } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { CACHE_DIR, CHROME_UA, FAKE_GA_ID } from './constants';

export interface ManifestFile {
  tarballPath: string;
  servedAt: string;
  sha256: string;
}

export interface Manifest {
  schema: number;
  posthog: {
    package: string;
    version: string;
    tarball: string;
    integrity: string;
    files: Record<string, ManifestFile>;
  };
  gtag: { productionSha256: string[]; fetchAttempts: number; source: string };
  axe: {
    package: string;
    version: string;
    tarball: string;
    integrity: string;
    file: { tarballPath: string };
  };
  inventory: { document: string; captureDocument: string };
}

export function loadManifest(): Manifest {
  return JSON.parse(
    readFileSync(resolve(import.meta.dirname, '../manifest.json'), 'utf8'),
  ) as Manifest;
}

export interface GtagState {
  /** True when a gtag.js body was obtained and is served by the harness. */
  available: boolean;
  /** SHA-256 of the bytes as Google served them, before the ID substitution. */
  rawSha256?: string;
  /** True only if the raw bytes are one of the production variants the inventory recorded. */
  matchesProduction: boolean;
  /** Where the measurement ID came from. The ID itself is never stored or printed. */
  idSource?: 'env' | 'production-html';
  /** Occurrences of the production ID replaced by the fake test ID. */
  substitutions?: number;
  /** Why it is unavailable, when it is. */
  reason?: string;
}

export interface FixtureState {
  schema: 1;
  posthogDir: string;
  axePath: string;
  tlsKeyPath: string;
  tlsCertPath: string;
  /** Base64 SHA-256 of the throwaway certificate's SPKI: the one certificate the test browsers accept. */
  spkiSha256: string;
  gtagPath: string;
  gtag: GtagState;
  preparedAt: string;
}

const STATE_PATH = join(CACHE_DIR, 'state.json');

export function loadFixtureState(): FixtureState {
  if (!existsSync(STATE_PATH)) {
    throw new Error(
      'node_modules/.cache/np-privacy-acceptance/state.json is missing: the suite must run through tests/privacy/playwright.config.ts, whose globalSetup prepares the fixtures.',
    );
  }
  return JSON.parse(readFileSync(STATE_PATH, 'utf8')) as FixtureState;
}

export const sha256Hex = (data: Buffer | string): string =>
  createHash('sha256').update(data).digest('hex');
const integrityOf = (data: Buffer): string =>
  `sha512-${createHash('sha512').update(data).digest('base64')}`;

async function download(url: string): Promise<Buffer> {
  const res = await fetch(url, { headers: { 'user-agent': CHROME_UA } });
  if (!res.ok) throw new Error(`GET ${url} returned ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Download an npm tarball once, verify the registry integrity, and extract the named paths. */
async function fetchTarball(
  label: string,
  tarballUrl: string,
  integrity: string,
  paths: string[],
  outDir: string,
): Promise<void> {
  if (paths.every((p) => existsSync(join(outDir, p)))) return;
  const archive = await download(tarballUrl);
  const actual = integrityOf(archive);
  if (actual !== integrity) {
    throw new Error(
      `${label}: tarball integrity ${actual} does not match the manifest's ${integrity}`,
    );
  }
  mkdirSync(outDir, { recursive: true });
  const archivePath = join(outDir, `${label}.tgz`);
  writeFileSync(archivePath, archive);
  execFileSync('tar', ['-xzf', archivePath, '-C', outDir, ...paths]);
  rmSync(archivePath);
}

async function prepareGtag(manifest: Manifest, gtagPath: string): Promise<GtagState> {
  if (process.env.NP_PRIVACY_OFFLINE === '1') {
    return { available: false, matchesProduction: false, reason: 'NP_PRIVACY_OFFLINE=1' };
  }
  let id = process.env.NP_GA_MEASUREMENT_ID;
  let idSource: GtagState['idSource'] = id ? 'env' : undefined;
  try {
    if (!id) {
      // The production measurement ID is public (it is in every page's HTML) but
      // it is a real identifier, so it is read at run time and never committed.
      const res = await fetch('https://nathanpayne.com/', { headers: { 'user-agent': CHROME_UA } });
      const html = await res.text();
      id = /googletagmanager\.com\/gtag\/js\?id=(G-[A-Z0-9]+)/.exec(html)?.[1];
      idSource = 'production-html';
    }
    if (!id) {
      return {
        available: false,
        matchesProduction: false,
        reason: 'no production measurement ID could be read',
      };
    }
    let body: Buffer | undefined;
    let rawSha: string | undefined;
    for (let attempt = 0; attempt < manifest.gtag.fetchAttempts; attempt += 1) {
      const candidate = await download(`https://www.googletagmanager.com/gtag/js?id=${id}`);
      const candidateSha = sha256Hex(candidate);
      body = candidate;
      rawSha = candidateSha;
      if (manifest.gtag.productionSha256.includes(candidateSha)) break;
    }
    if (!body || !rawSha)
      return {
        available: false,
        matchesProduction: false,
        reason: 'gtag.js fetch returned nothing',
      };
    const text = body.toString('utf8');
    const parts = text.split(id);
    writeFileSync(gtagPath, parts.join(FAKE_GA_ID));
    return {
      available: true,
      rawSha256: rawSha,
      matchesProduction: manifest.gtag.productionSha256.includes(rawSha),
      idSource,
      substitutions: parts.length - 1,
    };
  } catch (error) {
    return {
      available: false,
      matchesProduction: false,
      reason: `gtag.js fetch failed: ${(error as Error).message}`,
    };
  }
}

/** Create the throwaway TLS identity the harness proxy presents (certificate errors are ignored by the test browsers). */
function ensureTls(keyPath: string, certPath: string): void {
  if (existsSync(keyPath) && existsSync(certPath)) return;
  execFileSync(
    'openssl',
    [
      'req',
      '-x509',
      '-newkey',
      'rsa:2048',
      '-nodes',
      '-keyout',
      keyPath,
      '-out',
      certPath,
      '-days',
      '30',
      '-subj',
      '/CN=np-privacy-harness',
    ],
    { stdio: 'ignore' },
  );
}

/**
 * Obtain and verify every fixture. Called once from global setup. Throws if a
 * PostHog bundle does not match the production hash recorded in the manifest.
 */
export async function prepareFixtures(): Promise<FixtureState> {
  const manifest = loadManifest();
  mkdirSync(CACHE_DIR, { recursive: true });
  if (process.env.NP_PRIVACY_REFRESH === '1') {
    rmSync(join(CACHE_DIR, 'gtag.js'), { force: true });
  }

  const posthogDir = join(CACHE_DIR, `posthog-js-${manifest.posthog.version}`);
  await fetchTarball(
    'posthog-js',
    manifest.posthog.tarball,
    manifest.posthog.integrity,
    Object.values(manifest.posthog.files).map((f) => f.tarballPath),
    posthogDir,
  );
  for (const [name, file] of Object.entries(manifest.posthog.files)) {
    const actual = sha256Hex(readFileSync(join(posthogDir, file.tarballPath)));
    if (actual !== file.sha256) {
      throw new Error(
        `posthog-js ${manifest.posthog.version} ${name}: SHA-256 ${actual} does not match production ${file.sha256}`,
      );
    }
  }

  const axeDir = join(CACHE_DIR, `axe-core-${manifest.axe.version}`);
  await fetchTarball(
    'axe-core',
    manifest.axe.tarball,
    manifest.axe.integrity,
    [manifest.axe.file.tarballPath],
    axeDir,
  );

  const tlsKeyPath = join(CACHE_DIR, 'harness-key.pem');
  const tlsCertPath = join(CACHE_DIR, 'harness-cert.pem');
  ensureTls(tlsKeyPath, tlsCertPath);

  const spkiSha256 = createHash('sha256')
    .update(
      new X509Certificate(readFileSync(tlsCertPath)).publicKey.export({
        type: 'spki',
        format: 'der',
      }),
    )
    .digest('base64');

  const gtagPath = join(CACHE_DIR, 'gtag.js');
  let gtag: GtagState;
  const previous = existsSync(STATE_PATH)
    ? (JSON.parse(readFileSync(STATE_PATH, 'utf8')) as FixtureState)
    : undefined;
  if (
    existsSync(gtagPath) &&
    previous?.gtag.available &&
    process.env.NP_PRIVACY_REFRESH !== '1' &&
    !process.env.CI
  ) {
    gtag = previous.gtag;
  } else {
    gtag = await prepareGtag(manifest, gtagPath);
  }

  const state: FixtureState = {
    schema: 1,
    posthogDir,
    axePath: join(axeDir, manifest.axe.file.tarballPath),
    tlsKeyPath,
    tlsCertPath,
    spkiSha256,
    gtagPath,
    gtag,
    preparedAt: new Date().toISOString(),
  };
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
  return state;
}
