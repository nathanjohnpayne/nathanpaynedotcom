import { describe, it, expect } from 'vitest';
import { serializeJsonLd } from '../src/lib/json-ld';
import { builtPages } from './helpers/dom.js';

describe('serializeJsonLd', () => {
  it('cannot close the script element it is inlined into', () => {
    const out = serializeJsonLd({ headline: 'a </script><script>alert(1)</script> b' });
    expect(out).not.toContain('<');
    expect(out).not.toContain('>');
    expect(out).toContain('\\u003c/script\\u003e');
  });

  it('escapes ampersands and the JS line separators', () => {
    const out = serializeJsonLd({ a: 'x & y', b: 'p\u2028q\u2029r' });
    expect(out).toBe('{"a":"x \\u0026 y","b":"p\\u2028q\\u2029r"}');
  });

  it('round-trips to the identical value', () => {
    const data = {
      '@context': 'https://schema.org',
      name: 'Tom & Jerry <script>',
      nested: [{ text: '</script>\u2028' }],
    };
    expect(JSON.parse(serializeJsonLd(data))).toEqual(data);
  });

  it('leaves no raw angle bracket inside any built JSON-LD block', () => {
    for (const { route, html } of builtPages()) {
      for (const [, body] of html.matchAll(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
      )) {
        expect(body, route).not.toMatch(/[<>]/);
        expect(() => JSON.parse(body), route).not.toThrow();
      }
    }
  });
});
