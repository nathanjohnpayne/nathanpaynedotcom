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
import { productionGaId } from './ga4-measurement-id.js';

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
  gtag: {
    production: { capturedOn: string; configSha256: string };
    fetchAttempts: number;
    source: string;
  };
  axe: {
    package: string;
    version: string;
    tarball: string;
    integrity: string;
    file: { tarballPath: string; sha256: string };
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
  /** SHA-256 of the bytes as Google served them, before the ID substitution. Evidence for this run, not a pin. */
  rawSha256?: string;
  /** Byte length of the bytes as Google served them. Reported with `rawSha256`; not compared with anything recorded. */
  rawBytes?: number;
  /** Configuration fingerprint of the embedded `resource` as Google served it; undefined if it could not be read. */
  configSha256?: string;
  /** `gtagConfigFindings` of the embedded configuration; undefined if it could not be read. */
  configFindings?: string[];
  /** SHA-256 of the bytes the harness serves: the raw bytes with the production ID replaced by the fake test ID. */
  servedSha256?: string;
  /** True only if the embedded configuration matches the fingerprint recorded in the manifest and has no findings. */
  matchesProduction: boolean;
  /**
   * 'fetched' when this run read the bytes from Google; 'cache' when a cached copy was reused without a fetch. Only a
   * fetch shows that production still serves the recorded configuration, so only 'fetched' can pass the provenance test.
   */
  source?: 'fetched' | 'cache';
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

/** Finite deadlines for every setup request: a stalled connection must reach the caller's fallback, not the CI step timeout. */
const REQUIRED_DOWNLOAD_MS = 60_000;
const OPTIONAL_DOWNLOAD_MS = 15_000;

const offline = (): boolean => process.env.NP_PRIVACY_OFFLINE === '1';

async function download(url: string, timeoutMs = REQUIRED_DOWNLOAD_MS): Promise<Buffer> {
  if (offline()) throw new Error(`NP_PRIVACY_OFFLINE=1: refusing to fetch ${url}`);
  // The signal covers connecting, the headers, and reading the body.
  const res = await fetch(url, {
    headers: { 'user-agent': CHROME_UA },
    signal: AbortSignal.timeout(timeoutMs),
  });
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

/** The verdict on gtag.js provenance: the tested configuration either is the recorded production one or it must be redone. */
export type GtagProvenance = { status: 'verified' } | { status: 're-record'; reason: string };

/**
 * Compares the configuration fingerprint of the gtag.js the suite serves with the one recorded in the manifest, and
 * requires the configuration to have no findings. The bytes are not compared: Google rotates them often with the
 * configuration unchanged, so a byte hash is per-run evidence, not a pin. A mismatch is never a pass: the property
 * configuration changed, and it goes to Nathan before anything is recorded (docs/agents/testing-requirements.md, GA4
 * tag refresh).
 */
export function gtagProvenance(
  configSha256: string | undefined,
  recordedConfigSha256: string,
  findings: readonly string[] | undefined,
): GtagProvenance {
  if (configSha256 === undefined)
    return {
      status: 're-record',
      reason:
        'no embedded configuration could be read from the gtag.js (none was fetched, or Google changed its format), so none can be matched to the fingerprint recorded in tests/privacy/manifest.json: take it to Nathan once the fetch works',
    };
  if (configSha256 !== recordedConfigSha256)
    return {
      status: 're-record',
      reason: `the configuration of the gtag.js served (fingerprint ${configSha256.slice(0, 12)}...) is not the one recorded in tests/privacy/manifest.json (${recordedConfigSha256.slice(0, 12)}...), so the property configuration changed: take it to Nathan before recording anything (docs/agents/testing-requirements.md, GA4 tag refresh)`,
    };
  if (findings === undefined || findings.length > 0)
    return {
      status: 're-record',
      reason: `the configuration matches the recorded fingerprint but ${findings === undefined ? 'its findings were not read' : `has findings (${findings.join('; ')})`}: take it to Nathan`,
    };
  return { status: 'verified' };
}

export interface GtagTag {
  function: string;
  [key: string]: unknown;
}

/** The container's `resource` object: `version`, `macros`, `tags`, `predicates`, and `rules` as of 2026-10-11. */
export interface GtagResource {
  tags: GtagTag[];
  [key: string]: unknown;
}

/**
 * The property configuration embedded in gtag.js: the container's `resource` object, which holds everything the
 * container uses to decide what fires and with what parameters (tags, rules, predicates, macros). Returns undefined
 * if the file does not have that shape (Google changed the format), so a caller can say so rather than read "no
 * tags" as "nothing enabled".
 */
export function gtagEmbeddedResource(js: string): GtagResource | undefined {
  const match = /"resource":\s*(\{[\s\S]*?\n\})\s*,\s*"runtime"/.exec(js);
  if (!match) return undefined;
  try {
    const resource = JSON.parse(match[1]!) as { tags?: unknown };
    return Array.isArray(resource.tags) ? (resource as GtagResource) : undefined;
  } catch {
    return undefined;
  }
}

/** The `tags` list of the embedded `resource`, which the configuration findings read. */
export function gtagEmbeddedTags(js: string): GtagTag[] | undefined {
  return gtagEmbeddedResource(js)?.tags;
}

/** Canonical JSON: object keys sorted at every depth, array order kept, no whitespace. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .filter((k) => record[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson(record[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

/**
 * The configuration fingerprint: SHA-256 of the canonical JSON of the whole embedded `resource` as served, before
 * the ID substitution. It covers the rules, predicates, and macros as well as the tags: a change to when a tag fires
 * is a change to what the property collects. Nothing is excluded: across 180 loads and four byte variants (2026-10-11)
 * every top-level field was identical, so no build stamp or version needs masking. The resource carries the
 * property's own measurement ID, so the hash is of that property's configuration; it is a hash and does not reveal
 * the ID. Key order and whitespace do not change it; a changed, added, removed, or reordered setting does. It is the
 * committed pin; the bytes around the resource rotate and are not.
 */
export function gtagConfigFingerprint(resource: GtagResource): string {
  return sha256Hex(canonicalJson(resource));
}

/** The enhanced-measurement tags that stay on after the 2026-10-10 property changes: page views and scrolls. */
export const ENHANCED_TAGS_ON = ['__ccd_em_page_view', '__ccd_em_scroll'];

/**
 * Departures of the embedded configuration from the property settings Nathan set on 2026-10-10: enhanced
 * measurement limited to page views (with history events) and scrolls, and user-provided data off. An empty list
 * means the served configuration reflects the changes.
 */
export function gtagConfigFindings(tags: GtagTag[]): string[] {
  const findings: string[] = [];
  const enhanced = tags.map((t) => t.function).filter((f) => f.startsWith('__ccd_em_'));
  // Exactly one of each enhanced-measurement tag that stays on: a missing tag is off, and a duplicate is an unknown
  // (possibly double-firing) configuration, never read as the expected one.
  for (const wanted of ENHANCED_TAGS_ON) {
    const count = enhanced.filter((f) => f === wanted).length;
    if (count === 0) findings.push(`${wanted} is missing (it must stay on)`);
    else if (count > 1) findings.push(`expected exactly one ${wanted}, found ${count}`);
  }
  for (const extra of enhanced.filter((f) => !ENHANCED_TAGS_ON.includes(f)))
    findings.push(`${extra} is present (that enhanced-measurement event must be off)`);
  if (tags.some((t) => t.function === '__ccd_em_page_view' && t.vtp_historyEvents !== true))
    findings.push('page views lost their history events');
  // Exactly one user-provided-data tag, explicitly disabled. A missing, renamed, or duplicated tag is a finding:
  // an unknown configuration is never read as "off".
  const userData = tags.filter((t) => t.function === '__ogt_1p_data_v2');
  if (userData.length !== 1)
    findings.push(
      `expected exactly one __ogt_1p_data_v2 (user-provided data) tag, found ${userData.length}`,
    );
  else if (userData[0]!.vtp_isEnabled !== false)
    findings.push('__ogt_1p_data_v2 (user-provided data) is not disabled');
  return findings;
}

/**
 * NP_PRIVACY_REQUIRE_GA4=1: GA4 provenance must pass. A missing gtag.js, an unrecorded configuration, or a cached copy then fail
 * instead of skipping, and the cache is never reused. The release run (#1233) sets it.
 */
export function requireGa4(): boolean {
  return process.env.NP_PRIVACY_REQUIRE_GA4 === '1';
}

async function prepareGtag(manifest: Manifest, gtagPath: string): Promise<GtagState> {
  if (offline()) {
    return { available: false, matchesProduction: false, reason: 'NP_PRIVACY_OFFLINE=1' };
  }
  let id = process.env.NP_GA_MEASUREMENT_ID;
  let idSource: GtagState['idSource'] = id ? 'env' : undefined;
  try {
    if (!id) {
      // The production measurement ID is public (it is in every page's HTML) but
      // it is a real identifier, so it is read at run time and never committed.
      const res = await fetch('https://nathanpayne.com/', {
        headers: { 'user-agent': CHROME_UA },
        signal: AbortSignal.timeout(OPTIONAL_DOWNLOAD_MS),
      });
      const html = await res.text();
      id = productionGaId(html);
      idSource = 'production-html';
    }
    if (!id) {
      return {
        available: false,
        matchesProduction: false,
        reason: 'no production measurement ID could be read',
      };
    }
    // One fetch. Google rotates the bytes with the configuration unchanged, so there is no variant to wait for;
    // attempts are only for a transient failure.
    let body: Buffer | undefined;
    for (let attempt = 0; attempt < manifest.gtag.fetchAttempts && !body; attempt += 1) {
      try {
        body = await download(
          `https://www.googletagmanager.com/gtag/js?id=${id}`,
          OPTIONAL_DOWNLOAD_MS,
        );
      } catch {
        // retry
      }
    }
    if (!body)
      return {
        available: false,
        matchesProduction: false,
        reason: 'gtag.js fetch returned nothing',
      };
    const text = body.toString('utf8');
    const parts = text.split(id);
    const served = parts.join(FAKE_GA_ID);
    writeFileSync(gtagPath, served);
    // The configuration is read from the bytes as Google served them. An unreadable one is not "nothing enabled":
    // it leaves the fingerprint undefined, which reads as re-record.
    const resource = gtagEmbeddedResource(text);
    const configSha256 = resource ? gtagConfigFingerprint(resource) : undefined;
    const configFindings = resource ? gtagConfigFindings(resource.tags) : undefined;
    return {
      available: true,
      rawSha256: sha256Hex(body),
      rawBytes: body.length,
      configSha256,
      configFindings,
      servedSha256: sha256Hex(served),
      matchesProduction:
        gtagProvenance(configSha256, manifest.gtag.production.configSha256, configFindings)
          .status === 'verified',
      source: 'fetched',
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
 * The cached gtag.js state to reuse on a local run, or undefined when it must be rebuilt. Reuse needs all of:
 * the state says it is available and its configuration fingerprint is the recorded one, it carries the metadata the
 * provenance test compares against (`servedSha256`, `substitutions`; a cache written by an older harness lacks
 * them, and one written before #1280 lacks the fingerprint), and the file on disk hashes to `servedSha256` right
 * now. The last check is the one that matters: state.json only says what was cached, not what is in the file, so
 * an edited, truncated, or replaced file is never taken for the verified capture. The verdict is recomputed here,
 * never trusted from disk. A reused copy is marked `source: 'cache'`: it has the recorded configuration, but this
 * run did not see production serve it.
 */
export function reusableGtag(
  previous: GtagState | undefined,
  gtagPath: string,
  recordedConfigSha256: string,
): GtagState | undefined {
  if (!previous?.available) return undefined;
  if (previous.configSha256 !== recordedConfigSha256) return undefined;
  if (previous.servedSha256 === undefined || previous.substitutions === undefined) return undefined;
  if (!existsSync(gtagPath)) return undefined;
  if (sha256Hex(readFileSync(gtagPath)) !== previous.servedSha256) return undefined;
  return {
    ...previous,
    source: 'cache',
    matchesProduction:
      gtagProvenance(previous.configSha256, recordedConfigSha256, previous.configFindings)
        .status === 'verified',
  };
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
  // fetchTarball skips the download when the file already exists, so check the
  // extracted copy itself, as for posthog-js: an interrupted extraction or an
  // edited cache file must not be used as a verified axe-core.
  const axeActual = sha256Hex(readFileSync(join(axeDir, manifest.axe.file.tarballPath)));
  if (axeActual !== manifest.axe.file.sha256) {
    throw new Error(
      `axe-core ${manifest.axe.version} ${manifest.axe.file.tarballPath}: SHA-256 ${axeActual} does not match the manifest's ${manifest.axe.file.sha256}`,
    );
  }

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
  const previous = existsSync(STATE_PATH)
    ? (JSON.parse(readFileSync(STATE_PATH, 'utf8')) as FixtureState)
    : undefined;
  // Offline mode wins over the cache: a cached gtag.js would make the GA4 tests run as if it were available.
  // Only a cached copy with the recorded configuration is reused, and only after its actual bytes are hashed
  // again (see reusableGtag). Anything else is fetched again. CI and NP_PRIVACY_REQUIRE_GA4=1 always fetch.
  const reused =
    !offline() && process.env.NP_PRIVACY_REFRESH !== '1' && !process.env.CI && !requireGa4()
      ? reusableGtag(previous?.gtag, gtagPath, manifest.gtag.production.configSha256)
      : undefined;
  const gtag: GtagState = reused ?? (await prepareGtag(manifest, gtagPath));

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
