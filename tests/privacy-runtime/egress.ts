/**
 * Egress control and the local collection sink for the #1228 browser check.
 *
 * Two independent layers, so nothing a page does can leave the machine:
 *
 * 1. `startEgressProxy` is the browser's ONLY network path. Chromium is
 *    launched with `--proxy-server` pointing here, `--proxy-bypass-list=<-loopback>`
 *    so even loopback goes through it, and host-resolver rules that fail every
 *    other name. The proxy serves the site under test (`nathanpayne.test`)
 *    from `dist-privacy-test/` and records and refuses everything else,
 *    including every CONNECT tunnel. It has no code path that opens an
 *    outbound connection; `runtime.pw.ts` asserts that statically.
 *    Playwright routes do not see requests sent while a page unloads
 *    (`sendBeacon`, `fetch` with `keepalive`), which is why this layer exists.
 *
 * 2. `installDefaultDenyRoute` is a Playwright route installed before the first
 *    navigation. It serves the vendor SDK bundles from local files, answers
 *    every analytics collection request itself (recording it in the sink,
 *    never forwarding it), lets the site under test through to the proxy, and
 *    aborts everything else.
 */
import { createServer, type Server } from 'node:http';
import type { Socket } from 'node:net';
import { readFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';
import { gunzipSync } from 'node:zlib';
import type { BrowserContext, Route } from '@playwright/test';

export const SITE_HOST = 'nathanpayne.test';
/** The token `npm run build:privacy-test` bakes in. Fake by construction. */
export const POSTHOG_TOKEN = 'phc_privacy_test_fake';
export const POSTHOG_HOST = 'd.nathanpayne.com';

export interface ProxyRecord {
  kind: 'served' | 'refused';
  method: string;
  target: string;
  at: number;
  body: string;
}

export interface EgressProxy {
  port: number;
  log: ProxyRecord[];
  close(): Promise<void>;
}

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf',
  '.webmanifest': 'application/manifest+json',
};

async function siteFile(root: string, pathname: string) {
  let path = decodeURIComponent(pathname);
  if (path.endsWith('/')) path += 'index.html';
  else if (!extname(path)) path += '/index.html';
  const full = normalize(join(root, path));
  if (full.startsWith(root + sep) && existsSync(full) && statSync(full).isFile()) {
    return {
      status: 200,
      type: TYPES[extname(full)] ?? 'application/octet-stream',
      body: await readFile(full),
    };
  }
  return { status: 404, type: TYPES['.html'], body: await readFile(join(root, '404.html')) };
}

export async function startEgressProxy(siteRoot: string): Promise<EgressProxy> {
  const root = normalize(siteRoot);
  const log: ProxyRecord[] = [];
  const server: Server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const body = Buffer.concat(chunks).toString('utf8').slice(0, 4000);
    const target = req.url ?? '';
    let url: URL | null;
    try {
      url = new URL(target);
    } catch {
      url = null;
    }
    if (url && url.hostname === SITE_HOST && (req.method === 'GET' || req.method === 'HEAD')) {
      log.push({ kind: 'served', method: req.method, target, at: Date.now(), body });
      const file = await siteFile(root, url.pathname);
      res.writeHead(file.status, { 'content-type': file.type, 'cache-control': 'no-store' });
      res.end(req.method === 'HEAD' ? undefined : file.body);
      return;
    }
    log.push({ kind: 'refused', method: req.method ?? '', target, at: Date.now(), body });
    res.writeHead(403, { 'content-type': 'text/plain', connection: 'close' });
    res.end('refused by the #1228 test egress proxy');
  });
  // HTTPS goes through CONNECT. Every tunnel is refused, so no TLS request
  // can leave; the payload is unreadable here, but its host is recorded.
  server.on('connect', (req, socket: Socket) => {
    log.push({
      kind: 'refused',
      method: 'CONNECT',
      target: req.url ?? '',
      at: Date.now(),
      body: '',
    });
    socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
  });
  server.on('upgrade', (req, socket: Socket) => {
    log.push({
      kind: 'refused',
      method: 'UPGRADE',
      target: req.url ?? '',
      at: Date.now(),
      body: '',
    });
    socket.destroy();
  });
  await new Promise<void>((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  return {
    port,
    log,
    close: () => new Promise<void>((resolveClose) => server.close(() => resolveClose())),
  };
}

/**
 * Chromium flags that make the proxy the only network path. The resolver rule
 * fails every hostname, `nathanpayne.test` included: the proxy serves that
 * host itself and is addressed by IP literal, so a request that somehow
 * bypassed the proxy could not resolve anything at all.
 */
export function egressArgs(proxyPort: number): string[] {
  return [
    `--proxy-server=http://127.0.0.1:${proxyPort}`,
    '--proxy-bypass-list=<-loopback>',
    '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1',
    '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
  ];
}

export interface SinkRecord {
  at: number;
  method: string;
  url: string;
  /** Request URL and body, decoded and decompressed, for content checks. */
  text: string;
  /** Request body, decompressed but otherwise as sent (GA4 hits stay URL-encoded). */
  body: string;
  /** Parsed JSON payload when the body was JSON (PostHog). */
  json: unknown;
}

export interface Sink {
  records: SinkRecord[];
  blocked: string[];
  served: string[];
}

function decompressDeep(value: unknown): unknown {
  if (typeof value === 'string') {
    const bytes = Buffer.from(value, 'latin1');
    if (bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
      try {
        const text = gunzipSync(bytes).toString('utf8');
        try {
          return decompressDeep(JSON.parse(text));
        } catch {
          return text;
        }
      } catch {
        return value;
      }
    }
    return value;
  }
  if (Array.isArray(value)) return value.map(decompressDeep);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, decompressDeep(v)]));
  }
  return value;
}

function decodeBody(buffer: Buffer | null): { text: string; body: string; json: unknown } {
  if (!buffer || buffer.length === 0) return { text: '', body: '', json: null };
  let text: string;
  if (buffer[0] === 0x1f && buffer[1] === 0x8b) text = gunzipSync(buffer).toString('utf8');
  else text = buffer.toString('utf8');
  const body = text;
  if (text.startsWith('data=')) {
    text = Buffer.from(decodeURIComponent(text.slice(5)), 'base64').toString('utf8');
  }
  try {
    const json = decompressDeep(JSON.parse(text));
    return { text: JSON.stringify(json), body, json };
  } catch {
    return { text, body, json: null };
  }
}

/** True when `host` is `domain` or a subdomain of it (label boundary, never a substring). */
export function isHostOrSubdomain(host: string, domain: string): boolean {
  const h = host.toLowerCase().replace(/\.$/, '');
  const d = domain.toLowerCase();
  return h === d || h.endsWith(`.${d}`);
}

const ANALYTICS = [
  POSTHOG_HOST,
  'posthog.com',
  'googletagmanager.com',
  'google-analytics.com',
  'analytics.google.com',
  'doubleclick.net',
];

/** `host` may carry a port (a CONNECT target or URL.host); it is ignored. */
export function isAnalyticsHost(host: string): boolean {
  const h = host.replace(/:\d+$/, '');
  return ANALYTICS.some((a) => isHostOrSubdomain(h, a));
}

/** The remote config this check serves, mirroring project 469428 as read on 2026-10-08 (C1–C3 on). */
export const REMOTE_CONFIG = {
  supportedCompression: ['gzip', 'gzip-js'],
  analytics: { endpoint: '/i/v0/e/' },
  autocapture_opt_out: false,
  autocaptureExceptions: true,
  capturePerformance: { network_timing: true, web_vitals: true },
  elementsChainAsString: true,
  heatmaps: true,
  captureDeadClicks: false,
  surveys: false,
  hasFeatureFlags: false,
  defaultIdentifiedOnly: true,
  isAuthenticated: false,
  siteApps: [],
  toolbarParams: {},
  sessionRecording: {
    endpoint: '/s/',
    consoleLogRecordingEnabled: true,
    recordCanvas: true,
    canvasFps: 3,
    canvasQuality: '0.4',
    sampleRate: null,
    minimumDurationMilliseconds: null,
    linkedFlag: null,
    networkPayloadCapture: null,
    masking: null,
    urlTriggers: [],
    urlBlocklist: [],
    eventTriggers: [],
    scriptConfig: { script: 'posthog-recorder' },
  },
};

/**
 * Default-deny route, installed before the first navigation. `posthogDist`
 * is posthog-js@1.438.3's `dist/` directory and `gtagFile` a local copy of
 * gtag.js; both live outside the repository.
 */
export async function installDefaultDenyRoute(
  context: BrowserContext,
  vendor: { posthogDist: string; gtagFile: string },
): Promise<Sink> {
  const sink: Sink = { records: [], blocked: [], served: [] };
  await context.route('**/*', async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.hostname === SITE_HOST) {
      await route.continue();
      return;
    }
    if (!isAnalyticsHost(url.hostname)) {
      sink.blocked.push(request.url());
      await route.abort('blockedbyclient');
      return;
    }
    // Vendor scripts: served from local files, never fetched.
    const posthogScript = url.pathname.match(
      /^\/static\/(?:[\d.]+\/)?([a-z0-9-]+(?:\.[a-z0-9-]+)*)\.js$/,
    );
    if (url.hostname === POSTHOG_HOST && posthogScript) {
      const file = join(vendor.posthogDist, `${posthogScript[1]}.js`);
      if (existsSync(file)) {
        sink.served.push(request.url());
        await route.fulfill({
          status: 200,
          contentType: 'text/javascript',
          body: await readFile(file),
        });
        return;
      }
    }
    if (url.hostname === POSTHOG_HOST && url.pathname === `/array/${POSTHOG_TOKEN}/config.js`) {
      sink.served.push(request.url());
      const js =
        'window._POSTHOG_REMOTE_CONFIG = window._POSTHOG_REMOTE_CONFIG || {};' +
        `window._POSTHOG_REMOTE_CONFIG[${JSON.stringify(POSTHOG_TOKEN)}] = ` +
        `{ config: ${JSON.stringify(REMOTE_CONFIG)}, siteApps: [] };`;
      await route.fulfill({ status: 200, contentType: 'text/javascript', body: js });
      return;
    }
    if (url.hostname === POSTHOG_HOST && url.pathname === `/array/${POSTHOG_TOKEN}/config`) {
      sink.served.push(request.url());
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(REMOTE_CONFIG),
      });
      return;
    }
    if (url.hostname === 'www.googletagmanager.com' && url.pathname === '/gtag/js') {
      sink.served.push(request.url());
      await route.fulfill({
        status: 200,
        contentType: 'text/javascript',
        body: await readFile(vendor.gtagFile),
      });
      return;
    }
    // Everything else to an analytics host is collection: recorded, answered
    // locally, never forwarded.
    const decoded = decodeBody(request.postDataBuffer());
    let decodedUrl = request.url();
    try {
      decodedUrl = decodeURIComponent(request.url());
    } catch {
      // keep the raw URL
    }
    sink.records.push({
      at: Date.now(),
      method: request.method(),
      url: request.url(),
      text: `${decodedUrl}\n${decoded.text}`,
      body: decoded.body,
      json: decoded.json,
    });
    if (isGaHost(url.hostname)) {
      await route.fulfill({ status: 204, body: '' });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"status":1}' });
    }
  });
  return sink;
}

function isGaHost(hostname: string): boolean {
  return (
    isHostOrSubdomain(hostname, 'google-analytics.com') ||
    isHostOrSubdomain(hostname, 'analytics.google.com')
  );
}

/** Every PostHog event in the sink, flattened from batches. */
export function posthogEvents(sink: Sink, since = 0): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  for (const record of sink.records) {
    if (record.at < since || new URL(record.url).hostname.toLowerCase() !== POSTHOG_HOST) continue;
    const json = record.json as { batch?: unknown[] } | unknown[] | null;
    const items = Array.isArray(json)
      ? json
      : json && Array.isArray(json.batch)
        ? json.batch
        : json
          ? [json]
          : [];
    for (const item of items)
      if (item && typeof item === 'object') out.push(item as Record<string, unknown>);
  }
  return out;
}

export function gaHits(sink: Sink, since = 0): SinkRecord[] {
  return sink.records.filter((r) => {
    if (r.at < since) return false;
    const url = new URL(r.url);
    return isGaHost(url.hostname) && url.pathname === '/g/collect';
  });
}

/**
 * The parameters of every GA4 hit in a collect request, parsed rather than
 * pattern-matched. Shared parameters ride on the URL; a batched request adds
 * one line of hit-specific parameters per hit in the body.
 */
export function gaHitParams(record: SinkRecord): URLSearchParams[] {
  const shared = new URL(record.url).searchParams;
  const lines = record.body.split(/\r?\n/).filter((line) => line.length > 0);
  if (lines.length === 0) return [new URLSearchParams(shared)];
  return lines.map((line) => {
    const hit = new URLSearchParams(shared);
    for (const [key, value] of new URLSearchParams(line)) hit.set(key, value);
    return hit;
  });
}

/** True when some GA4 hit since `since` has parameter `name` exactly equal to `value`. */
export function gaHasParam(sink: Sink, name: string, value: string, since = 0): boolean {
  return gaHits(sink, since).some((r) => gaHitParams(r).some((hit) => hit.get(name) === value));
}
