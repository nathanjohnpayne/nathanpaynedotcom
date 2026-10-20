/**
 * The hash-based script-src meta policy (#1080).
 *
 * The enforcing `Content-Security-Policy` header in firebase.json keeps
 * `'unsafe-inline'` because it is one value for every path; each built page
 * carries a meta policy, added by src/integrations/inline-script-csp.mjs, that
 * allows only the inline scripts the page was built with. The meta names no
 * host (`'self' https:`): the header's host list still limits external
 * scripts, and the markup names no analytics host outside the gated scripts
 * (tests/analytics-privacy.test.js). These tests cover the integration on
 * small inputs, then every page in `dist/`.
 */

import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  addInlineScriptCsp,
  BASE_SOURCES,
  sha256Source,
} from '../src/integrations/inline-script-csp.mjs';
import { builtPages } from './helpers/dom.js';

/** The `script-src` sources of the page's meta policy; [] when it has none. */
function metaScriptSources(html) {
  const doc = new JSDOM(html).window.document;
  const metas = doc.querySelectorAll('meta[http-equiv="Content-Security-Policy" i]');
  expect(metas.length, 'meta policies on the page').toBe(1);
  const directive = metas[0]
    .getAttribute('content')
    .split(';')
    .map((part) => part.trim().split(/\s+/))
    .find(([name]) => name === 'script-src');
  return directive ? directive.slice(1) : [];
}

/** The hash sources the page needs: its executable inline scripts and handlers. */
function requiredHashes(html) {
  const doc = new JSDOM(html).window.document;
  // Independent of the integration's classifier: every inline script needs a
  // hash except the site's one kind of data block, JSON-LD. A new data-block
  // type shows up here as a missing hash rather than passing unexamined.
  const scripts = [...doc.querySelectorAll('script:not([src])')].filter(
    (s) => s.getAttribute('type') !== 'application/ld+json',
  );
  const handlers = [...doc.querySelectorAll('*')].flatMap((el) =>
    [...el.attributes].filter((a) => /^on/i.test(a.name)).map((a) => a.value),
  );
  return {
    scripts: scripts.map((s) => sha256Source(s.textContent)),
    handlers: handlers.map((value) => sha256Source(value)),
  };
}

describe('addInlineScriptCsp', () => {
  const page = (head, body = '') =>
    `<!doctype html><html><head><meta charset="utf-8">${head}</head><body>${body}</body></html>`;

  it("hashes each inline script, with no 'unsafe-inline' and no host", () => {
    const script = 'console.log("a")';
    const out = addInlineScriptCsp(page(`<script>${script}</script>`));
    expect(metaScriptSources(out)).toEqual(["'self'", 'https:', sha256Source(script)]);
  });

  it('matches the hash a browser computes for a known script', () => {
    // CSP Level 3 § 8.4 worked example: the hash of `alert('Hello, world.');`.
    expect(sha256Source("alert('Hello, world.');")).toBe(
      "'sha256-qznLcsROx4GACP2dm0UCKCzCG+HiZ1guq6ZZDob/Tng='",
    );
  });

  it('puts the meta right after <meta charset>, ahead of every script', () => {
    const out = addInlineScriptCsp(page('<title>t</title><script>1</script>'));
    expect(out).toMatch(
      /<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="script-src /,
    );
  });

  it('leaves the rest of the page byte-for-byte unchanged', () => {
    const input = page('<script>x = 1 &amp;&amp; 2</script>', '<p class=a>  hi &mdash; </p>');
    const out = addInlineScriptCsp(input);
    expect(out.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, '')).toBe(input);
  });

  it('skips external scripts and data blocks, keeps modules', () => {
    const out = addInlineScriptCsp(
      page(
        '<script src="/a.js"></script><script type="application/ld+json">{"a":1}</script>' +
          '<script type="module">import "/b.js"</script>',
      ),
    );
    const hashes = metaScriptSources(out).filter((s) => s.startsWith("'sha256-"));
    expect(hashes).toEqual([sha256Source('import "/b.js"')]);
  });

  it('hashes every script type script-src governs, and no data block', () => {
    const policed = [
      ['', 'a()'],
      ['text/JavaScript', 'b()'],
      ['text/jscript', 'c()'],
      ['text/javascript1.5', 'd()'],
      ['application/x-ecmascript', 'e()'],
      ['module', 'f()'],
      ['importmap', '{"imports":{}}'],
      ['speculationrules', '{"prefetch":[]}'],
    ];
    const dataBlocks = [
      ['application/ld+json', '{"x":1}'],
      ['text/plain', 'g()'],
      ['text/template', '<p>h</p>'],
    ];
    const tag = ([type, body]) =>
      type ? `<script type="${type}">${body}</script>` : `<script>${body}</script>`;
    const out = addInlineScriptCsp(
      page(
        [...policed, ...dataBlocks].map(tag).join('') +
          '<script language="javascript">i()</script>',
      ),
    );
    const hashes = metaScriptSources(out).filter((s) => s.startsWith("'sha256-"));
    // Expected hashes are computed from the bodies directly, not from the classifier.
    expect(hashes).toEqual([...policed.map(([, body]) => body), 'i()'].map(sha256Source));
  });

  it("allows inline event handlers by hash with 'unsafe-hashes'", () => {
    const handler = 'this.hidden=true';
    const out = addInlineScriptCsp(page('', `<img src="/x.png" onerror="${handler}">`));
    const sources = metaScriptSources(out);
    expect(sources).toContain("'unsafe-hashes'");
    expect(sources).toContain(sha256Source(handler));
  });

  it("adds no 'unsafe-hashes' to a page without handlers", () => {
    expect(metaScriptSources(addInlineScriptCsp(page('')))).not.toContain("'unsafe-hashes'");
  });

  it('fails on a script ahead of the insertion point', () => {
    const html =
      '<!doctype html><html><head><script>1</script><meta charset="utf-8"></head></html>';
    expect(() => addInlineScriptCsp(html)).toThrow(/precedes/);
  });

  it('fails on a javascript: URL, which no hash can allow', () => {
    expect(() => addInlineScriptCsp(page('', '<a href="javascript:void 0">x</a>'))).toThrow(
      /javascript: URL/,
    );
  });
});

describe('Built pages', () => {
  const pages = builtPages();

  it('found built pages to check', () => {
    expect(pages.length).toBeGreaterThan(10);
  });

  it('carry a meta policy as the first element after <meta charset>', () => {
    const misplaced = pages
      .filter(
        ({ html }) =>
          !/<head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy"/i.test(html),
      )
      .map(({ route }) => route);
    expect(misplaced).toEqual([]);
  });

  it('allow every inline script and handler they contain, and nothing inline beyond that', () => {
    const problems = [];
    for (const { route, html } of pages) {
      const sources = metaScriptSources(html);
      const { scripts, handlers } = requiredHashes(html);
      const required = new Set([...scripts, ...handlers]);
      for (const hash of required)
        if (!sources.includes(hash)) problems.push(`${route}: missing ${hash}`);
      for (const source of sources.filter((s) => s.startsWith("'sha256-"))) {
        if (!required.has(source)) problems.push(`${route}: extra ${source}`);
      }
      if (sources.includes("'unsafe-inline'")) problems.push(`${route}: 'unsafe-inline'`);
      if (sources.includes("'unsafe-hashes'") !== handlers.length > 0) {
        problems.push(`${route}: 'unsafe-hashes' does not match ${handlers.length} handler(s)`);
      }
      const hosts = sources.filter((s) => !s.startsWith("'sha256-") && s !== "'unsafe-hashes'");
      if (hosts.join(' ') !== BASE_SOURCES.join(' '))
        problems.push(`${route}: hosts ${hosts.join(' ')}`);
    }
    expect(problems).toEqual([]);
  });
});
