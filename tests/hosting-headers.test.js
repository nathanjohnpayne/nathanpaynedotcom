import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { builtPages } from './helpers/dom.js';

// Firebase Hosting response headers (firebase.json). Nothing here is visible
// in `dist/`, so a header that drifts or disappears is otherwise only caught
// by someone opening DevTools on production after a deploy.

const firebaseConfig = JSON.parse(readFileSync(resolve(__dirname, '../firebase.json'), 'utf-8'));
const headerRules = firebaseConfig.hosting.headers;

function rule(source) {
  const found = headerRules.find((r) => r.source === source);
  expect(found, `no header rule for ${source}`).toBeTruthy();
  return found;
}

function headerValue(source, key) {
  const entry = rule(source).headers.find((h) => h.key.toLowerCase() === key.toLowerCase());
  return entry?.value;
}

const globalCsp = headerValue('**', 'Content-Security-Policy-Report-Only') ?? '';

/**
 * Parse a policy string into a map of directive → source list. Browsers honour
 * the first occurrence of a directive and ignore repeats, so a repeat is
 * recorded rather than allowed to overwrite what the browser would enforce.
 */
function parseCsp(policy) {
  const directives = new Map();
  const duplicates = [];
  for (const part of policy.split(';')) {
    const [name, ...sources] = part.trim().split(/\s+/);
    if (!name) continue;
    const key = name.toLowerCase();
    if (directives.has(key)) duplicates.push(key);
    else directives.set(key, sources);
  }
  return { directives, duplicates };
}

const { directives: csp, duplicates: duplicateDirectives } = parseCsp(globalCsp);
const PAGE_ORIGIN = 'https://nathanpayne.com';

/**
 * Whether `url` is allowed by a directive's source list (falling back to
 * default-src), for the host-source forms this policy uses: 'self', exact
 * https origins, and `https://*.example.com` wildcards. Keywords that do not
 * name a host ('unsafe-inline', data:, blob:) never match an https URL.
 */
function allows(directive, url) {
  const sources = csp.get(directive) ?? csp.get('default-src') ?? [];
  const { protocol, host, origin } = new URL(url);
  return sources.some((source) => {
    // 'self' is the page's origin — scheme included, so http:// never passes.
    if (source === "'self'") return origin === PAGE_ORIGIN;
    const match = source.match(/^(https?:)\/\/(\*\.)?([^/]+)$/);
    if (!match || match[1] !== protocol) return false;
    return match[2] ? host.endsWith(`.${match[3]}`) : host === match[3];
  });
}

describe('Hosting security headers', () => {
  it('applies the security headers to every path', () => {
    expect(headerValue('**', 'X-Content-Type-Options')).toBe('nosniff');
    expect(headerValue('**', 'X-Frame-Options')).toBe('SAMEORIGIN');
    expect(headerValue('**', 'Referrer-Policy')).toBe('strict-origin-when-cross-origin');
  });

  it('disables the legacy XSS auditor instead of opting into block mode', () => {
    // `1; mode=block` drives a filter modern browsers have removed and older
    // ones could be abused through; `0` is the current OWASP recommendation.
    expect(headerValue('**', 'X-XSS-Protection')).toBe('0');
  });

  it('denies powerful browser features the site never uses', () => {
    const policy = headerValue('**', 'Permissions-Policy') ?? '';
    for (const feature of ['camera', 'microphone', 'geolocation', 'payment', 'usb']) {
      expect(policy, `${feature} is not denied`).toContain(`${feature}=()`);
    }
  });

  it('ships the CSP report-only until the inline scripts are hashed', () => {
    // Enforcing would need every is:inline script hashed or moved first; the
    // report-only header records violations without breaking the page.
    expect(globalCsp).not.toBe('');
    expect(headerValue('**', 'Content-Security-Policy')).toBeUndefined();
  });

  it('declares each directive once', () => {
    expect(duplicateDirectives).toEqual([]);
  });

  it('locks the structural directives down', () => {
    expect(csp.get('default-src')).toEqual(["'self'"]);
    expect(csp.get('object-src')).toEqual(["'none'"]);
    expect(csp.get('base-uri')).toEqual(["'self'"]);
    expect(csp.get('frame-ancestors')).toEqual(["'self'"]);
  });

  it('does not allow a third-party script CDN', () => {
    // mux-embed is bundled rather than fetched from jsDelivr, and Mermaid
    // renders at build time, so no public CDN belongs in script-src.
    expect(csp.get('script-src').join(' ')).not.toMatch(/jsdelivr|unpkg|cdnjs/);
  });

  it('allows the hosts the source loads at runtime', () => {
    // Hosts that only appear when an env-gated integration is configured
    // (PostHog, GA, Logo.dev), so a token-less build cannot surface them.
    const posthog = readFileSync(resolve(__dirname, '../src/components/posthog.astro'), 'utf-8');
    const apiHost = posthog.match(/api_host:\s*'([^']+)'/)?.[1];
    expect(apiHost, 'PostHog api_host not found').toBeTruthy();
    expect(allows('script-src', `${apiHost}/static/array.js`)).toBe(true);
    expect(allows('connect-src', `${apiHost}/e/`)).toBe(true);

    expect(allows('script-src', 'https://www.googletagmanager.com/gtag/js?id=G-X')).toBe(true);
    expect(allows('connect-src', 'https://region1.google-analytics.com/g/collect')).toBe(true);

    const logo = readFileSync(
      resolve(__dirname, '../src/components/resume/CompanyLogo.astro'),
      'utf-8',
    );
    const logoOrigin = logo.match(/`(https:\/\/[^/`]+)\//)?.[1];
    expect(logoOrigin, 'Logo.dev origin not found').toBeTruthy();
    expect(allows('img-src', `${logoOrigin}/example.com`)).toBe(true);

    // Mux: HLS renditions and segments come from per-region *.mux.com hosts.
    expect(allows('media-src', 'https://stream.mux.com/x.m3u8')).toBe(true);
    expect(allows('connect-src', 'https://manifest-a-b.fastly.mux.com/r.m3u8')).toBe(true);
    expect(allows('img-src', 'https://image.mux.com/x/thumbnail.jpg')).toBe(true);
    expect(allows('connect-src', 'https://img.litix.io/')).toBe(true);
  });

  it('allows every external resource the built pages reference', () => {
    const kinds = [
      { directive: 'script-src', pattern: /<script\b[^>]*\bsrc="(https?:[^"]+)"/g },
      { directive: 'img-src', pattern: /<img\b[^>]*\bsrc="(https?:[^"]+)"/g },
      {
        directive: 'style-src',
        pattern: /<link\b(?=[^>]*\brel="stylesheet")[^>]*\bhref="(https?:[^"]+)"/g,
      },
    ];
    const denied = [];
    for (const { route, html } of builtPages()) {
      for (const { directive, pattern } of kinds) {
        for (const [, url] of html.matchAll(pattern)) {
          if (!allows(directive, url)) denied.push(`${route}: ${directive} ${url}`);
        }
      }
    }
    expect(denied).toEqual([]);
  });
});

describe('Hosting cache headers', () => {
  it('caches fingerprinted /_astro/ assets for a year as immutable', () => {
    expect(headerValue('/_astro/**', 'Cache-Control')).toBe('public, max-age=31536000, immutable');
  });

  it('caches the self-hosted fonts for 30 days, not as immutable (#1250)', () => {
    // Paths are not content-hashed, so a font changed in place must still expire.
    expect(headerValue('/fonts/**', 'Cache-Control')).toBe('public, max-age=2592000');
  });

  it('keeps the one-hour policy for JS/CSS outside /_astro/', () => {
    expect(headerValue('**/*.@(js|css)', 'Cache-Control')).toBe('public, max-age=3600');
  });

  it('orders the /_astro/ rule after the generic JS/CSS rule', () => {
    // Firebase applies every matching rule, and for a repeated header the later
    // rule wins. If the order were ever reversed, hashed assets would fall back
    // to the one-hour policy rather than anything unsafe.
    const sources = headerRules.map((r) => r.source);
    const generic = sources.indexOf('**/*.@(js|css)');
    expect(generic, 'generic JS/CSS rule missing').toBeGreaterThan(-1);
    expect(sources.indexOf('/_astro/**')).toBeGreaterThan(generic);
  });

  it('keeps immutable caching off everything that is not content-hashed', () => {
    for (const r of headerRules) {
      if (r.source === '/_astro/**') continue;
      const cacheControl = r.headers.find((h) => h.key === 'Cache-Control')?.value ?? '';
      expect(cacheControl, `${r.source} must not be immutable`).not.toContain('immutable');
    }
    expect(headerValue('**/*.html', 'Cache-Control')).toBe('public, max-age=3600');
  });
});
