import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  blockAnalytics,
  generateResumePdf,
  isAnalyticsRequest,
} from '../src/integrations/resume-pdf.mjs';

// The build renders real pages in headless Chromium (OG cards, the résumé
// PDF), and local dev/preview/e2e all serve the site from localhost. With the
// analytics env vars present, each of those used to count as a production
// visit — `/resume/` fires `resume_viewed` on load. Two independent guards
// keep them out: the build contexts abort analytics requests, and PostHog
// refuses to initialize on a local host.

describe('isAnalyticsRequest', () => {
  it.each([
    'https://d.nathanpayne.com/static/array.js',
    'https://d.nathanpayne.com/e/?ip=0',
    'https://us.i.posthog.com/e/',
    'https://www.googletagmanager.com/gtag/js?id=G-X',
    'https://region1.google-analytics.com/g/collect',
    'https://www.google-analytics.com/g/collect',
    'https://region1.analytics.google.com/g/collect',
  ])('matches %s', (url) => {
    expect(isAnalyticsRequest(new URL(url))).toBe(true);
  });

  it.each([
    'http://127.0.0.1:4321/resume/',
    'http://127.0.0.1:4321/_astro/global.css',
    'https://fonts.googleapis.com/css2?family=Inter',
    'https://fonts.gstatic.com/s/inter.woff2',
    'https://img.logo.dev/example.com',
    'https://nathanpayne.com/',
    // Suffix match is on a label boundary, not a substring.
    'https://notgoogle-analytics.com/',
    'https://d.nathanpayne.com.example.net/',
  ])('leaves %s alone', (url) => {
    expect(isAnalyticsRequest(new URL(url))).toBe(false);
  });
});

describe('build-time Chromium contexts', () => {
  it('blockAnalytics aborts matching routes', async () => {
    const context = { route: vi.fn() };
    await blockAnalytics(context);
    expect(context.route).toHaveBeenCalledTimes(1);
    const [matcher, handler] = context.route.mock.calls[0];
    expect(matcher).toBe(isAnalyticsRequest);
    const route = { abort: vi.fn() };
    await handler(route);
    expect(route.abort).toHaveBeenCalled();
  });

  it('the résumé PDF render installs the block before loading the page', async () => {
    const order = [];
    const page = {
      goto: vi.fn(async () => order.push('goto')),
      evaluate: vi.fn(async () => 0),
      emulateMedia: vi.fn(async () => {}),
      pdf: vi.fn(async () => {}),
      close: vi.fn(async () => {}),
    };
    const context = {
      route: vi.fn(async () => order.push('route')),
      newPage: vi.fn(async () => page),
      close: vi.fn(async () => {}),
    };
    const browser = { newContext: vi.fn(async () => context) };

    await generateResumePdf({
      browser,
      baseUrl: 'http://127.0.0.1:1',
      siteUrl: 'https://nathanpayne.com',
      outputPath: '/dev/null',
      logger: { info: () => {}, warn: () => {} },
    });

    expect(order).toEqual(['route', 'goto']);
    expect(context.route.mock.calls[0][0]).toBe(isAnalyticsRequest);
  });

  it('the OG render installs the block on its context', () => {
    const src = readFileSync(resolve(__dirname, '../src/integrations/og-images.mjs'), 'utf-8');
    const body = src.slice(src.indexOf('async function renderOgImages'));
    const blockAt = body.indexOf('await blockAnalytics(context)');
    expect(blockAt, 'renderOgImages does not call blockAnalytics').toBeGreaterThan(-1);
    expect(blockAt).toBeLessThan(body.indexOf('page.goto('));
  });
});

describe('PostHog on local hosts', () => {
  const component = readFileSync(resolve(__dirname, '../src/components/posthog.astro'), 'utf-8');
  const open = '<script is:inline define:vars={{ token }}>';
  const body = component.slice(
    component.indexOf(open) + open.length,
    component.indexOf('</script>', component.indexOf(open)),
  );

  /** Run the component's inline script as if served from `hostname`. */
  function runSnippet(hostname) {
    const anchor = document.createElement('script');
    document.head.appendChild(anchor);
    const fakeWindow = new Proxy(window, {
      get(target, prop) {
        if (prop === 'location') return { hostname };
        return Reflect.get(target, prop);
      },
    });
    new Function('window', 'token', body)(fakeWindow, 'phc_test');
  }

  afterEach(() => {
    delete window.posthog;
    document.head.innerHTML = '';
  });

  it.each(['localhost', '127.0.0.1', '[::1]', 'preview.localhost'])(
    'does not initialize on %s',
    (hostname) => {
      runSnippet(hostname);
      expect(window.posthog).toBeUndefined();
      expect(document.querySelector('script[src*="array.js"]')).toBeNull();
    },
  );

  it('initializes on the production host', () => {
    runSnippet('nathanpayne.com');
    expect(window.posthog).toBeDefined();
    expect(
      document.querySelector('script[src="https://d.nathanpayne.com/static/array.js"]'),
    ).not.toBeNull();
  });
});
