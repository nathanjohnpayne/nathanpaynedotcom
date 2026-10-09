/**
 * The network boundary for every browser run in the #1079 acceptance suite
 * (#1230). Contract: specs/analytics-privacy.md § Test Fixture, Egress.
 *
 * Layers, each sufficient on its own for the property it names:
 *   1. A Playwright route (see test.ts) aborts every request that is not on the
 *      explicit allowlist below. It cannot see requests sent while a page
 *      unloads (`sendBeacon`, `keepalive` fetch), which is why it is not enough.
 *   2. This proxy is Chromium's only network path (`--proxy-server`, loopback
 *      not bypassed). It serves the built site, the SDK fixtures, and a local
 *      sink, and refuses every other CONNECT and plain-HTTP request. It has no
 *      code path that opens an outbound socket.
 *   3. Chromium's resolver maps every hostname except the test host to
 *      NOTFOUND, so a request that somehow bypassed the proxy also fails.
 *   4. `--force-webrtc-ip-handling-policy=disable_non_proxied_udp` removes the
 *      UDP path WebRTC would otherwise use around the proxy.
 *
 * Collection endpoints (PostHog event, batch, and replay-snapshot paths on the
 * production proxy host or posthog.com; GA4 `collect` on google-analytics.com
 * and analytics.google.com) are answered by the sink: the body is recorded and
 * decoded here and never forwarded.
 */
import { readFileSync, statSync } from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import type { Duplex } from 'node:stream';
import { extname, join, normalize, resolve, sep } from 'node:path';
import {
  ASSET_HOST,
  DIST_DIR,
  EXCLUDED_PATH,
  FAKE_POSTHOG_TOKEN,
  GTAG_HOST,
  LOCAL_HOST_ALIAS,
  POSTHOG_PROXY_HOST,
  SINK_HOST_PATTERNS,
  TEST_HOST,
} from './constants';

const SITE_ORIGINS: readonly string[] = [TEST_HOST, LOCAL_HOST_ALIAS, ASSET_HOST].map(
  (h) => `https://${h}`,
);
const isSiteHost = (host: string): boolean =>
  host === TEST_HOST || host === LOCAL_HOST_ALIAS || host === ASSET_HOST;
import { decodeBody, ga4Events, postHogEvents, type Ga4Event, type PostHogEvent } from './payloads';
import { loadFixtureState, loadManifest, type FixtureState } from './fixtures';

export type Vendor = 'posthog' | 'ga4' | 'gtm' | 'harness' | 'site';
export type Disposition = 'site' | 'fixture' | 'sink' | 'deny';

/** Deny-by-default classification. The only function that decides what may be served. */
export function classify(
  url: URL,
  method: string,
  manifestPaths: ReadonlySet<string>,
): Disposition {
  if (url.protocol !== 'https:') return 'deny';
  const host = url.hostname.toLowerCase();
  if (isSiteHost(host)) return 'site';
  if (host === POSTHOG_PROXY_HOST) {
    const exactAsset =
      method === 'GET' &&
      (manifestPaths.has(url.pathname) ||
        url.pathname === `/array/${FAKE_POSTHOG_TOKEN}/config.js`);
    return exactAsset ? 'fixture' : 'sink';
  }
  if (host === GTAG_HOST && method === 'GET' && url.pathname === '/gtag/js') return 'fixture';
  if (SINK_HOST_PATTERNS.some((p) => p.test(host))) return 'sink';
  return 'deny';
}

export function vendorOf(host: string): Vendor {
  if (isSiteHost(host)) return 'site';
  if (host === POSTHOG_PROXY_HOST || /(^|\.)posthog\.com$/.test(host)) return 'posthog';
  if (host === GTAG_HOST) return 'gtm';
  if (
    /(^|\.)(google-analytics\.com|analytics\.google\.com|doubleclick\.net|googleadservices\.com)$/.test(
      host,
    )
  )
    return 'ga4';
  return 'harness';
}

export interface RecordedRequest {
  seq: number;
  /** Milliseconds since the Unix epoch when the request reached the sink. */
  at: number;
  host: string;
  method: string;
  path: string;
  url: string;
  disposition: Disposition;
  vendor: Vendor;
  status: number;
  headers: Record<string, string>;
  /** True for a request that carries collected data (not a script or config fetch). */
  isCollection: boolean;
  searchable: string;
  plain: string;
  undecoded: boolean;
  posthog: PostHogEvent[];
  ga4: Ga4Event[];
}

export interface Refusal {
  seq: number;
  at: number;
  kind: 'connect' | 'http';
  target: string;
}

export class Sink {
  requests: RecordedRequest[] = [];
  refusals: Refusal[] = [];
  private counter = 0;

  next(): number {
    this.counter += 1;
    return this.counter;
  }
  /** A cursor: pass it to `since` to read only what arrived afterwards. */
  mark(): number {
    return this.counter;
  }
  reset(): void {
    this.requests = [];
    this.refusals = [];
  }
  since(mark: number): RecordedRequest[] {
    return this.requests.filter((r) => r.seq > mark);
  }
  /** Every request to an analytics vendor (scripts, config, and collection). */
  vendorRequests(mark = 0): RecordedRequest[] {
    return this.since(mark).filter(
      (r) => r.vendor === 'posthog' || r.vendor === 'ga4' || r.vendor === 'gtm',
    );
  }
  collection(vendor: Vendor, mark = 0): RecordedRequest[] {
    return this.since(mark).filter((r) => r.vendor === vendor && r.isCollection);
  }
  posthogEvents(mark = 0): Array<{ req: RecordedRequest; event: PostHogEvent }> {
    return this.collection('posthog', mark).flatMap((req) =>
      req.posthog.map((event) => ({ req, event })),
    );
  }
  /** rrweb items from every `$snapshot` event. */
  snapshotEvents(mark = 0): Array<{ req: RecordedRequest; event: PostHogEvent }> {
    return this.posthogEvents(mark).filter(({ event }) => event.event === '$snapshot');
  }
  ga4Events(mark = 0): Array<{ req: RecordedRequest; event: Ga4Event }> {
    return this.collection('ga4', mark).flatMap((req) => req.ga4.map((event) => ({ req, event })));
  }
  /** Concatenated decoded text of every analytics collection request: what an absence check searches. */
  searchableText(vendor: Vendor | 'all', mark = 0): string {
    const reqs =
      vendor === 'all'
        ? this.since(mark).filter((r) => r.isCollection && r.vendor !== 'harness')
        : this.collection(vendor, mark);
    return reqs.map((r) => r.searchable).join('\n');
  }
  /** Decoded text without variants, for URL checks. */
  plainText(vendor: Vendor | 'all', mark = 0): string {
    const reqs =
      vendor === 'all'
        ? this.since(mark).filter((r) => r.isCollection && r.vendor !== 'harness')
        : this.collection(vendor, mark);
    return reqs.map((r) => r.plain).join('\n');
  }
  /** Bodies that could not be decoded: any such body makes an absence assertion unsound. */
  undecodedCollection(mark = 0): RecordedRequest[] {
    return this.since(mark).filter((r) => r.isCollection && r.undecoded);
  }
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.pdf': 'application/pdf',
  '.webmanifest': 'application/manifest+json',
};

/** A one-page PDF, served for the fixture's `.pdf` download link so the click has a real target. */
const TINY_PDF = Buffer.from(
  '%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 72 72]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
);

/**
 * The PostHog remote-config response the inventory captured from production on
 * 2026-10-08 (docs/privacy/capture-2026-10-08.md § PostHog Remote Config), with
 * the project token replaced by the fake test token. It keeps the project's
 * console-log, canvas, and network-timing capture ON, because that is the
 * production state the runtime has to cope with (PRIV-13).
 */
export const REMOTE_CONFIG = {
  analytics: { endpoint: '/i/v0/e/' },
  autocaptureExceptions: true,
  autocapture_opt_out: false,
  captureDeadClicks: false,
  capturePerformance: { network_timing: true, web_vitals: true, web_vitals_allowed_metrics: null },
  conversations: false,
  defaultIdentifiedOnly: true,
  elementsChainAsString: true,
  errorTracking: { autocaptureExceptions: true, suppressionRules: [] },
  hasFeatureFlags: false,
  heatmaps: { captureMode: 'all', urlAllowlist: [], urlAllowlistEnforced: false },
  logs: { captureConsoleLogs: false },
  productTours: false,
  push: { appIds: [] },
  sdkVersion: { requested: '1' },
  sessionRecording: {
    canvasFps: 3,
    canvasQuality: '0.4',
    consoleLogRecordingEnabled: true,
    endpoint: '/s/',
    eventTriggers: [],
    linkedFlag: null,
    masking: null,
    minimumDurationMilliseconds: null,
    networkPayloadCapture: null,
    recordCanvas: true,
    recorderVersion: 'v2',
    sampleRate: null,
    scriptConfig: { script: 'posthog-recorder' },
    triggerMatchType: null,
    urlBlocklist: [],
    urlTriggers: [],
    version: 1,
  },
  supportedCompression: ['gzip', 'gzip-js'],
  surveys: false,
};

/**
 * The remote-config script PostHog serves: it assigns `{config, siteApps}` under the project token. The
 * data is embedded as a JSON string literal that the script parses, with the characters that can end or
 * confuse a script context (`<`, `>`, `/`, U+2028, U+2029) written as escapes, so no data value can alter
 * the code around it.
 */
function escapeForScript(json: string): string {
  return json.replace(
    /[<>/\u2028\u2029]/g,
    (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`,
  );
}
const remoteConfigScript = (config: unknown): string => {
  const payload = escapeForScript(JSON.stringify(JSON.stringify({ config, siteApps: [] })));
  const token = escapeForScript(JSON.stringify(FAKE_POSTHOG_TOKEN));
  return `(function(){window._POSTHOG_REMOTE_CONFIG=window._POSTHOG_REMOTE_CONFIG||{};window._POSTHOG_REMOTE_CONFIG[${token}]=JSON.parse(${payload});})();`;
};

/**
 * The same remote config with the three capture features the inventory found
 * ON (console logs, canvas, network timing; Capture Conflicts C1 to C3) turned
 * OFF. The conflict-free control for PRIV-13: if the client turned any of them
 * on by itself, they would show up even under this config.
 */
export function neutralRemoteConfig(): typeof REMOTE_CONFIG {
  return {
    ...REMOTE_CONFIG,
    capturePerformance: {
      network_timing: false,
      web_vitals: true,
      web_vitals_allowed_metrics: null,
    },
    sessionRecording: {
      ...REMOTE_CONFIG.sessionRecording,
      consoleLogRecordingEnabled: false,
      recordCanvas: false,
    },
  };
}
const FLAGS_RESPONSE = {
  featureFlags: {},
  featureFlagPayloads: {},
  flags: {},
  errorsWhileComputingFlags: false,
  quotaLimited: [],
  supportedCompression: ['gzip', 'gzip-js'],
  config: { enable_collect_everything: true },
};

const BLANK_PAGE = '<!doctype html><meta charset="utf-8"><title>blank</title><p>blank</p>';

export interface EgressOptions {
  distDir?: string;
  state?: FixtureState;
  /** Extra HTML-document transform (the self-test UI stand-in uses it; production runs do not). */
  transformHtml?: (html: string, path: string) => string;
}

export class Egress {
  readonly sink = new Sink();
  readonly port: number;
  private readonly proxy: http.Server;
  private readonly tls: https.Server;
  private readonly sockets = new Set<Duplex>();
  private readonly manifestPaths: Set<string>;
  private readonly fixtureBodies = new Map<string, Buffer>();
  private readonly distDir: string;
  private readonly options: EgressOptions;
  /** A per-test replacement for the production remote config; cleared by `reset()`. */
  remoteConfig: unknown = REMOTE_CONFIG;

  private constructor(
    proxy: http.Server,
    tlsServer: https.Server,
    port: number,
    state: FixtureState,
    options: EgressOptions,
  ) {
    this.proxy = proxy;
    this.tls = tlsServer;
    this.port = port;
    this.options = options;
    this.distDir = options.distDir ?? DIST_DIR;
    const manifest = loadManifest();
    this.manifestPaths = new Set(Object.values(manifest.posthog.files).map((f) => f.servedAt));
    for (const file of Object.values(manifest.posthog.files)) {
      this.fixtureBodies.set(file.servedAt, readFileSync(join(state.posthogDir, file.tarballPath)));
    }
    if (state.gtag.available) this.fixtureBodies.set('/gtag/js', readFileSync(state.gtagPath));
  }

  static async start(options: EgressOptions = {}): Promise<Egress> {
    const state = options.state ?? loadFixtureState();
    const tlsServer = https.createServer({
      key: readFileSync(state.tlsKeyPath),
      cert: readFileSync(state.tlsCertPath),
    });
    const proxy = http.createServer();
    await new Promise<void>((res) => proxy.listen(0, '127.0.0.1', res));
    const port = (proxy.address() as net.AddressInfo).port;
    const egress = new Egress(proxy, tlsServer, port, state, options);
    egress.wire();
    return egress;
  }

  reset(): void {
    this.sink.reset();
    this.remoteConfig = REMOTE_CONFIG;
  }

  async close(): Promise<void> {
    for (const s of this.sockets) s.destroy();
    await new Promise<void>((res) => this.proxy.close(() => res()));
    await new Promise<void>((res) => this.tls.close(() => res()));
  }

  private refuse(kind: Refusal['kind'], target: string): void {
    this.sink.refusals.push({ seq: this.sink.next(), at: Date.now(), kind, target });
  }

  private wire(): void {
    // CONNECT: only the hosts the harness can answer are tunnelled, and the tunnel
    // ends inside this process (the TLS server below). Nothing is relayed outward.
    this.proxy.on('connect', (req, clientSocket, head) => {
      const target = req.url ?? '';
      const [rawHost, rawPort] = target.split(':');
      const host = (rawHost ?? '').toLowerCase();
      const port = Number(rawPort ?? '443');
      const probe = new URL(`https://${host}/`);
      const allowedHost = port === 443 && classify(probe, 'GET', this.manifestPaths) !== 'deny';
      this.sockets.add(clientSocket);
      clientSocket.on('close', () => this.sockets.delete(clientSocket));
      clientSocket.on('error', () => undefined);
      if (!allowedHost) {
        this.refuse('connect', target);
        clientSocket.end(
          'HTTP/1.1 403 Forbidden\r\nConnection: close\r\ncontent-length: 0\r\n\r\n',
        );
        return;
      }
      clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      if (head.length > 0) clientSocket.unshift(head);
      this.tls.emit('connection', clientSocket);
    });
    // Plain HTTP through the proxy (absolute-form request lines): never served.
    this.proxy.on('request', (req, res) => {
      this.refuse('http', req.url ?? '');
      res.writeHead(403, { 'content-length': '0', connection: 'close' });
      res.end();
    });
    this.tls.on('request', (req, res) => {
      void this.handle(req, res);
    });
    this.tls.on('secureConnection', (s) => {
      this.sockets.add(s);
      s.on('close', () => this.sockets.delete(s));
      s.on('error', () => undefined);
    });
    this.tls.on('tlsClientError', () => undefined);
  }

  private async handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const host = (req.headers.host ?? '').split(':')[0]?.toLowerCase() ?? '';
    const method = req.method ?? 'GET';
    const url = new URL(req.url ?? '/', `https://${host}`);
    const disposition = classify(url, method, this.manifestPaths);
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const body = Buffer.concat(chunks);

    // CORS: allow only the harness's own origins, chosen from a fixed list (never reflected from the request),
    // and no credentials. Every SDK request in this suite is anonymous.
    const allowedOrigin = SITE_ORIGINS.find((o) => o === req.headers.origin);
    const cors: Record<string, string> = {
      'access-control-allow-headers': 'content-type, x-requested-with',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      ...(allowedOrigin ? { 'access-control-allow-origin': allowedOrigin, vary: 'origin' } : {}),
    };
    if (method === 'OPTIONS') {
      res.writeHead(204, cors);
      res.end();
      return;
    }
    if (disposition === 'deny') {
      this.refuse('http', `${host}${url.pathname}`);
      res.writeHead(403, { 'content-length': '0' });
      res.end();
      return;
    }

    const send = (
      status: number,
      headers: Record<string, string>,
      payload: Buffer | string,
    ): void => {
      const buf = typeof payload === 'string' ? Buffer.from(payload) : payload;
      res.writeHead(status, { ...cors, ...headers, 'content-length': String(buf.length) });
      res.end(buf);
      this.record(req, host, method, url, disposition, status, body);
    };

    // Harness endpoints on the test host. They are not part of the built site.
    if (isSiteHost(host) && url.pathname.startsWith('/__np/')) {
      if (url.pathname === '/__np/blank')
        return send(200, { 'content-type': MIME['.html'] ?? 'text/html' }, BLANK_PAGE);
      if (url.pathname === '/__np/ping') return send(200, { 'content-type': 'text/plain' }, 'pong');
      // Local sink target for the unload-time beacon positive control.
      if (url.pathname === '/__np/sink') return send(204, {}, '');
      // A valid, empty service worker: lets the control context show registration works when not blocked.
      if (url.pathname === '/__np/sw.js') {
        const worker =
          'self.addEventListener("install",()=>self.skipWaiting());' +
          'self.addEventListener("activate",(e)=>e.waitUntil(self.clients.claim()));' +
          'self.addEventListener("fetch",(e)=>{if(new URL(e.request.url).pathname==="/__np/sw-probe")e.respondWith(new Response("from-sw"));});';
        return send(
          200,
          { 'content-type': MIME['.js'] ?? 'text/javascript', 'service-worker-allowed': '/' },
          worker,
        );
      }
      if (url.pathname === '/__np/sw-probe')
        return send(200, { 'content-type': 'text/plain' }, 'from-network');
      return send(404, { 'content-type': 'text/plain' }, 'not found');
    }

    if (isSiteHost(host)) return this.serveSite(url, send);

    if (disposition === 'fixture') {
      const key = host === GTAG_HOST ? '/gtag/js' : url.pathname;
      const bytes =
        key === `/array/${FAKE_POSTHOG_TOKEN}/config.js`
          ? Buffer.from(remoteConfigScript(this.remoteConfig))
          : this.fixtureBodies.get(key);
      if (!bytes) return send(404, { 'content-type': 'text/plain' }, 'fixture unavailable');
      return send(
        200,
        { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store' },
        bytes,
      );
    }

    // Everything else on an analytics host is recorded and answered locally.
    const vendor = vendorOf(host);
    if (vendor === 'posthog') {
      if (url.pathname.startsWith('/flags') || url.pathname.startsWith('/decide')) {
        return send(200, { 'content-type': 'application/json' }, JSON.stringify(FLAGS_RESPONSE));
      }
      if (method === 'GET') return send(404, { 'content-type': 'text/plain' }, 'not found');
      return send(200, { 'content-type': 'application/json' }, JSON.stringify({ status: 1 }));
    }
    if (vendor === 'gtm') return send(404, { 'content-type': 'text/plain' }, 'not found');
    return send(204, {}, '');
  }

  private serveSite(
    url: URL,
    send: (status: number, headers: Record<string, string>, payload: Buffer | string) => void,
  ): void {
    const root = resolve(this.distDir);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/test-fixtures/privacy/fixture-download.pdf') {
      return send(200, { 'content-type': MIME['.pdf'] ?? 'application/pdf' }, TINY_PDF);
    }
    if (pathname.endsWith('/')) pathname += 'index.html';
    const candidates = [pathname, `${pathname}/index.html`];
    for (const candidate of candidates) {
      const file = normalize(join(root, candidate));
      if (file !== root && !file.startsWith(root + sep)) continue;
      try {
        if (!statSync(file).isFile()) continue;
        const type = MIME[extname(file).toLowerCase()] ?? 'application/octet-stream';
        let payload: Buffer | string = readFileSync(file);
        if (type.startsWith('text/html') && this.options.transformHtml) {
          payload = this.options.transformHtml(payload.toString('utf8'), url.pathname);
        }
        // `no-cache`, not `no-store`: a no-store document is never eligible for the back/forward cache.
        return send(200, { 'content-type': type, 'cache-control': 'no-cache' }, payload);
      } catch {
        // try the next candidate
      }
    }
    // The site's own 404 page, served with a 404 status, like the production host. The one exception is the
    // replay-excluded path set: its exclusion is a property of the URL, and /privacy/ is built by a different
    // sub-issue (#1229), so where the build lacks a page there the harness serves the 404 document with a 200
    // status. That makes it an ordinary, back/forward-cache-eligible document at an excluded URL, with the
    // site's full layout, gate, and analytics, which is what the exclusion tests need.
    try {
      let notFound: Buffer | string = readFileSync(join(root, '404.html'));
      if (this.options.transformHtml)
        notFound = this.options.transformHtml(notFound.toString('utf8'), url.pathname);
      const excluded = url.pathname.startsWith(EXCLUDED_PATH);
      return send(excluded ? 200 : 404, { 'content-type': MIME['.html'] ?? 'text/html' }, notFound);
    } catch {
      return send(404, { 'content-type': 'text/plain' }, 'not found');
    }
  }

  private record(
    req: http.IncomingMessage,
    host: string,
    method: string,
    url: URL,
    disposition: Disposition,
    status: number,
    body: Buffer,
  ): void {
    const vendor = vendorOf(host);
    const isCollection =
      disposition === 'sink' &&
      ((vendor === 'posthog' && method === 'POST') ||
        (vendor === 'ga4' && (method === 'POST' || /collect/.test(url.pathname))));
    const contentType = req.headers['content-type'];
    const decoded = decodeBody(
      body,
      typeof contentType === 'string' ? contentType : undefined,
      url.toString(),
    );
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.headers))
      headers[k] = Array.isArray(v) ? v.join(', ') : (v ?? '');
    const bodyText = decoded.searchable;
    this.sink.requests.push({
      seq: this.sink.next(),
      at: Date.now(),
      host,
      method,
      path: url.pathname,
      url: url.toString(),
      disposition,
      vendor,
      status,
      headers,
      isCollection,
      searchable: bodyText,
      plain: decoded.plain,
      undecoded: decoded.undecoded,
      posthog: vendor === 'posthog' && isCollection ? postHogEvents(decoded.json) : [],
      ga4:
        vendor === 'ga4' && isCollection
          ? ga4Events(
              url.toString(),
              body.length
                ? body.subarray(0, 2).equals(Buffer.from([0x1f, 0x8b]))
                  ? ''
                  : body.toString('utf8')
                : '',
            )
          : [],
    });
  }
}

// ---------------------------------------------------------------------------
// Outbound guard

export const outboundGuard = {
  /** Connection attempts from this process to a non-loopback address. Must stay 0. */
  attempts: [] as string[],
  installed: false,
};

/**
 * Make the test process itself incapable of a non-loopback connection, so the
 * harness (not just the browser) cannot be the leak. The proxy never opens a
 * socket; this turns that property into something a test can check, and fails
 * loudly if a future edit adds one.
 */
export function installOutboundGuard(): void {
  if (outboundGuard.installed) return;
  outboundGuard.installed = true;
  const original = net.Socket.prototype.connect;
  net.Socket.prototype.connect = function patched(this: net.Socket, ...args: unknown[]) {
    // net.connect() hands Socket#connect a normalized `[options, callback]` array.
    const first = (Array.isArray(args[0]) ? args[0][0] : args[0]) as
      { host?: string; port?: number; path?: string } | number | string | undefined;
    let host: string | undefined;
    if (typeof first === 'object' && first !== null)
      host = first.host ?? (first.path ? 'ipc' : 'localhost');
    else if (typeof args[1] === 'string') host = args[1];
    else host = 'localhost';
    const local =
      host === 'ipc' ||
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host === '[::1]';
    if (!local) {
      outboundGuard.attempts.push(String(host));
      throw new Error(`privacy harness outbound guard: refused connection to ${String(host)}`);
    }
    return (original as (...a: unknown[]) => net.Socket).apply(this, args);
  } as typeof net.Socket.prototype.connect;
}
