/**
 * The egress boundary (specs/analytics-privacy.md § Test Fixture, Egress) and
 * the fixtures it serves. These tests prove the harness can refuse, and that
 * it can also receive, before any opt-out test is allowed to mean anything.
 * They support PRIV-4 and PRIV-5 (zero analytics requests) and every other
 * criterion that asserts an absence.
 */
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import net from 'node:net';
import type { AddressInfo } from 'node:net';
import { SITE_ORIGIN } from './harness/constants';
import { outboundGuard, parseConnectTarget } from './harness/egress';
import { loadManifest } from './harness/fixtures';
import { expect, launchBrowser, test } from './harness/test';

test.describe('egress boundary', () => {
  test('PRIV-4 PRIV-5 (egress) the default-deny route aborts an unlisted request, it does not merely flag it', async ({
    open,
    egress,
  }) => {
    const s = await open();
    await s.goto('/__np/blank');
    const outcome = await s.page.evaluate(async () => {
      const results: Record<string, string> = {};
      for (const [name, url] of [
        ['host', 'https://unlisted.example.test/probe'],
        ['ip-literal', 'https://192.0.2.1/probe'],
        ['plain-http', 'http://unlisted.example.test/probe'],
      ] as const) {
        try {
          await fetch(url, { mode: 'no-cors' });
          results[name] = 'delivered';
        } catch (error) {
          results[name] = `aborted: ${String(error)}`;
        }
      }
      return results;
    });
    for (const [name, result] of Object.entries(outcome))
      expect(result, `${name} was refused`).toMatch(/^aborted/);
    // The plain-http probe from an https page is stopped by the browser's mixed-content block before
    // the route sees it; either way it did not leave. The other two reached the route and were aborted there.
    expect(s.denied).toEqual(
      expect.arrayContaining([
        'GET https://unlisted.example.test/probe',
        'GET https://192.0.2.1/probe',
      ]),
    );
    // Aborted at the route: not one of them reached the proxy, let alone beyond it.
    expect(egress.sink.refusals).toEqual([]);
    expect(egress.sink.requests.filter((r) => /unlisted|192\.0\.2\.1/.test(r.host))).toEqual([]);
    // Positive control: an allowed request through the same route does succeed.
    const ping = await s.page.evaluate(async () => (await fetch('/__np/ping')).text());
    expect(ping).toBe('pong');
  });

  test('PRIV-4 PRIV-5 (egress) an unload-time beacon reaches the local sink, and the same beacon to an unlisted host is refused', async ({
    open,
    egress,
  }) => {
    const s = await open();
    await s.goto('/__np/blank');
    await s.page.evaluate(() => {
      addEventListener('pagehide', () => {
        navigator.sendBeacon('https://nathanpayne.test/__np/sink?control=unload', 'control');
        navigator.sendBeacon('https://unlisted.example.test/beacon', 'x');
        navigator.sendBeacon('https://192.0.2.1/ip-literal-beacon', 'x');
        void fetch('https://unlisted-keepalive.example.test/k', {
          method: 'POST',
          body: 'x',
          keepalive: true,
        }).catch(() => undefined);
      });
    });
    await s.page.goto(`${SITE_ORIGIN}/__np/ping`); // unloads the first document

    // Positive control: the unload-time beacon to the local sink was sent and received.
    // Without this a page that sends no beacon at all would pass the refusal checks below.
    await expect
      .poll(
        () =>
          egress.sink.requests.some(
            (r) => r.path === '/__np/sink' && r.url.includes('control=unload'),
          ),
        {
          message: 'the unload beacon to the local sink was received (positive control)',
        },
      )
      .toBe(true);

    // The refusals: each unlisted destination was stopped by the route or by the proxy.
    const stopped = (needle: string): boolean =>
      egress.sink.refusals.some((r) => r.target.includes(needle)) ||
      s.denied.some((d) => d.includes(needle));
    for (const needle of [
      'unlisted.example.test',
      '192.0.2.1',
      'unlisted-keepalive.example.test',
    ]) {
      await expect.poll(() => stopped(needle), { message: `${needle} was refused` }).toBe(true);
    }
    // And none of them was answered.
    expect(egress.sink.requests.filter((r) => /unlisted|192\.0\.2\.1/.test(r.host))).toEqual([]);
    // Record which layer caught them (route, or proxy for requests the route cannot see).
    test.info().annotations.push({
      type: 'layers',
      description: `route aborted ${s.denied.length}; proxy refused ${egress.sink.refusals.length}`,
    });
    expect(outboundGuard.attempts).toEqual([]);
  });

  test('PRIV-4 PRIV-5 (egress) the resolver rules make an ordinary hostname unresolvable, with a control that resolves it', async () => {
    const server = createServer((_req, res) => {
      res.end('ok');
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as AddressInfo).port;
    const denyBrowser = await launchBrowser({ webrtcPolicy: true });
    const controlBrowser = await (
      await import('@playwright/test')
    ).chromium.launch({
      args: ['--host-resolver-rules=MAP np-resolver-probe.test 127.0.0.1'],
    });
    try {
      const url = `http://np-resolver-probe.test:${port}/`;
      // Control: with a rule that maps the name, the very same request is answered.
      const controlPage = await controlBrowser.newPage();
      const controlResponse = await controlPage.goto(url);
      expect(await controlResponse?.text()).toBe('ok');
      // Under the harness rules (no proxy, so the resolver is the only barrier) it cannot resolve.
      const denyPage = await denyBrowser.newPage();
      await expect(denyPage.goto(url)).rejects.toThrow(/ERR_NAME_NOT_RESOLVED/);
    } finally {
      await controlBrowser.close();
      await denyBrowser.close();
      server.close();
    }
  });

  test('PRIV-4 PRIV-5 (egress) WebRTC gathers no ICE candidate, and the same page without the policy flag sees a host candidate', async ({
    open,
    egress,
  }) => {
    const gather = (): Promise<{ candidates: string[]; state: string }> =>
      new Promise((resolve) => {
        // 192.0.2.1 is in a documentation range (RFC 5737): never routable, never a real server.
        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:192.0.2.1:3478' }] });
        const candidates: string[] = [];
        pc.onicecandidate = (e) => {
          if (e.candidate) candidates.push(e.candidate.candidate);
        };
        pc.createDataChannel('probe');
        const finish = (): void => {
          const state = pc.iceGatheringState;
          pc.close();
          resolve({ candidates, state });
        };
        const timer = setTimeout(finish, 10_000);
        pc.addEventListener('icegatheringstatechange', () => {
          if (pc.iceGatheringState === 'complete') {
            clearTimeout(timer);
            finish();
          }
        });
        void pc.createOffer().then((offer) => pc.setLocalDescription(offer));
      });

    const guarded = await open();
    await guarded.goto('/__np/blank');
    const withPolicy = await guarded.page.evaluate(gather);
    expect(
      withPolicy.candidates,
      'no ICE candidate of any type under disable_non_proxied_udp',
    ).toEqual([]);
    expect(withPolicy.state, 'gathering finished rather than timing out').toBe('complete');

    // Negative control: the same page in a browser launched WITHOUT the WebRTC flag.
    const control = await launchBrowser({ proxyPort: egress.port, webrtcPolicy: false });
    try {
      const context = await control.newContext();
      const page = await context.newPage();
      await page.goto(`${SITE_ORIGIN}/__np/blank`);
      const without = await page.evaluate(gather);
      test.info().annotations.push({
        type: 'webrtc-control',
        description: `${without.candidates.length} candidate(s) without the flag`,
      });
      // A runner with no usable network interface gathers nothing even unguarded; then the control cannot
      // show that the assertion above can fail, and the criterion is reported not verified rather than passed.
      test.skip(
        !without.candidates.some((c) => / typ host/.test(c)),
        'not verified: the unguarded control browser gathered no host candidate in this environment',
      );
      expect(without.candidates.some((c) => / typ host/.test(c))).toBe(true);
    } finally {
      await control.close();
    }
  });

  test('PRIV-4 PRIV-5 (egress) a service worker cannot intercept the page under the default context, with a control where it does', async ({
    open,
  }) => {
    // Playwright's `serviceWorkers: 'block'` bypasses service workers in Chromium (requests skip them)
    // rather than rejecting registration, so the observable property is interception, with a control.
    const probe = async (session: Awaited<ReturnType<typeof open>>): Promise<string> => {
      await session.goto('/__np/blank');
      return session.page.evaluate(async () => {
        try {
          const reg = await navigator.serviceWorker.register('/__np/sw.js');
          const start = Date.now();
          while (!reg.active && Date.now() - start < 3000)
            await new Promise((r) => setTimeout(r, 100));
        } catch {
          // blocked registration is an acceptable way for the default context to refuse
        }
        return (await fetch('/__np/sw-probe')).text();
      });
    };
    expect(
      await probe(await open({ serviceWorkers: 'allow' })),
      'control: an allowed service worker answers the fetch',
    ).toBe('from-sw');
    expect(
      await probe(await open()),
      'default context: the fetch goes to the network, not to the service worker',
    ).toBe('from-network');
  });

  test('PRIV-4 PRIV-5 (egress) collection endpoints are answered by the local sink and decoded there, never forwarded', async ({
    open,
    egress,
  }) => {
    const s = await open();
    await s.goto('/__np/blank');
    const statuses = await s.page.evaluate(async () => {
      const ph = await fetch('https://d.nathanpayne.com/e/', {
        method: 'POST',
        body: JSON.stringify({ event: 'np_harness_probe', properties: { probe: 'np-sink-probe' } }),
      });
      const ga = await fetch(
        'https://www.google-analytics.com/g/collect?v=2&tid=G-PRIVACYTEST&en=np_harness_probe',
        {
          method: 'POST',
          mode: 'no-cors',
          body: 'en=np_harness_probe&ep.probe=np-sink-probe',
        },
      );
      return { ph: ph.status, ga: ga.type };
    });
    expect(statuses.ph).toBe(200);
    const ph = egress.sink.posthogEvents().find(({ event }) => event.event === 'np_harness_probe');
    expect(ph?.event.properties.probe).toBe('np-sink-probe');
    expect(
      egress.sink.ga4Events().find(({ event }) => event.name === 'np_harness_probe')?.event.params[
        'ep.probe'
      ],
    ).toBe('np-sink-probe');
    expect(egress.sink.refusals).toEqual([]);
    expect(egress.sink.undecodedCollection()).toEqual([]);
    expect(outboundGuard.attempts).toEqual([]);
  });

  test('PRIV-4 PRIV-5 (egress) CONNECT authorities are parsed strictly: IPv6 and malformed ones parse or fail cleanly', () => {
    expect(parseConnectTarget('nathanpayne.test:443')).toEqual({
      host: 'nathanpayne.test',
      port: 443,
    });
    expect(parseConnectTarget('D.Nathanpayne.com')).toEqual({
      host: 'd.nathanpayne.com',
      port: 443,
    });
    expect(parseConnectTarget('[::1]:443')).toEqual({ host: '::1', port: 443 });
    expect(parseConnectTarget('[2001:db8::1]:8443')).toEqual({ host: '2001:db8::1', port: 8443 });
    for (const bad of [
      '[',
      '[::1',
      '[::1]x',
      '::1:443',
      ':443',
      'host:abc',
      'host:0',
      'host:99999',
      '',
    ]) {
      expect(parseConnectTarget(bad), `${JSON.stringify(bad)} is malformed`).toBeNull();
    }
  });

  test('PRIV-4 PRIV-5 (egress) the live proxy refuses every unlisted or malformed CONNECT without crashing, and still serves a listed one', async ({
    egress,
  }) => {
    egress.reset();
    const connect = (authority: string): Promise<string> =>
      new Promise((resolve) => {
        const socket = net.connect(egress.port, '127.0.0.1');
        let reply = '';
        socket.on('data', (d) => {
          reply += d.toString('latin1');
          if (reply.includes('\r\n\r\n')) socket.destroy();
        });
        socket.on('close', () => resolve(reply.split('\r\n')[0] ?? ''));
        socket.on('error', () => resolve(reply.split('\r\n')[0] ?? 'error'));
        socket.write(`CONNECT ${authority} HTTP/1.1\r\nHost: ${authority}\r\n\r\n`);
        setTimeout(() => socket.destroy(), 3000);
      });
    for (const authority of [
      '[::1]:443',
      '[2001:db8::1]:443',
      '[::1',
      'host:abc',
      'unlisted.example.test:443',
      'nathanpayne.test:80',
    ]) {
      expect(await connect(authority), `CONNECT ${authority}`).toMatch(/^HTTP\/1\.1 403/);
    }
    // The proxy survived all of that and still tunnels a listed host (positive control).
    expect(await connect('nathanpayne.test:443')).toMatch(/^HTTP\/1\.1 200/);
    expect(egress.sink.refusals.length).toBe(6);
  });

  test('PRIV-4 PRIV-5 (egress) the test process itself cannot open a non-loopback connection (guard control)', async ({
    egress: _egress,
  }) => {
    const before = outboundGuard.attempts.length;
    expect(() => net.connect({ host: '192.0.2.1', port: 9 })).toThrow(/outbound guard/);
    expect(outboundGuard.attempts.length).toBe(before + 1);
    outboundGuard.attempts.length = before; // the refusal was the point of the test
  });

  test('PRIV-1 (fixtures) the SDK bytes served to the browser are the production bytes the manifest pins', async ({
    open,
    fixtureState,
  }) => {
    const manifest = loadManifest();
    const s = await open();
    await s.goto('/__np/blank');
    for (const [name, file] of Object.entries(manifest.posthog.files)) {
      const digest = await s.page.evaluate(async (path) => {
        const bytes = await (await fetch(`https://d.nathanpayne.com${path}`)).arrayBuffer();
        const hash = await crypto.subtle.digest('SHA-256', bytes);
        return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
      }, file.servedAt);
      expect(digest, `${name} served bytes`).toBe(file.sha256);
    }
    const array = await s.page.evaluate(async () =>
      (await fetch('https://d.nathanpayne.com/static/array.js')).text(),
    );
    expect(array).toContain(`LIB_VERSION="${manifest.posthog.version}"`);
    if (fixtureState.gtag.available) {
      const served = await s.page.evaluate(async () =>
        (await fetch('https://www.googletagmanager.com/gtag/js?id=G-PRIVACYTEST')).text(),
      );
      expect(served.length).toBeGreaterThan(100_000);
      expect(createHash('sha256').update(served).digest('hex')).not.toBe(
        fixtureState.gtag.rawSha256,
      );
      test.info().annotations.push({
        type: 'gtag',
        description: `matches a recorded production variant: ${fixtureState.gtag.matchesProduction}; ID substitutions: ${fixtureState.gtag.substitutions}`,
      });
    }
  });

  test('PRIV-4 (egress) the site is served on a non-local hostname, so PostHog does not skip initialization', async ({
    open,
  }) => {
    const s = await open();
    await s.goto('/');
    expect(await s.page.evaluate(() => location.hostname)).toBe('nathanpayne.test');
    expect(await s.page.evaluate(() => navigator.webdriver)).toBe(false);
    expect(
      await s.page.evaluate(() =>
        (
          navigator as unknown as { userAgentData?: { brands: Array<{ brand: string }> } }
        ).userAgentData?.brands.some((b) => /headless/i.test(b.brand)),
      ),
    ).toBe(false);
  });
});
