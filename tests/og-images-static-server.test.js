/**
 * Unit tests for the local static file server in og-images.mjs.
 *
 * `serveStatic`'s request handler used to join `req.url` onto the dist
 * root with no normalization, so a request path (or its percent-encoded
 * form) containing `../` segments could escape the served root. See
 * CodeQL alert #1 (js/path-injection).
 *
 * The traversal tests below issue raw HTTP requests with an explicit
 * `path` string via node:http, not `fetch()` — `fetch`/`URL` normalize
 * dot-segments (including percent-encoded ones) on the client before the
 * request is ever sent, which would silently defeat these tests by
 * turning `/../secret.txt` into `/secret.txt` before it left the process.
 *
 * @see https://github.com/nathanjohnpayne/nathanpaynedotcom/security/code-scanning/1
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request as httpRequest } from 'node:http';

import { serveStatic } from '../src/integrations/og-images.mjs';

/** Issue a raw HTTP request with an unnormalized path string. */
function rawRequest(port, rawPath) {
  return new Promise((resolvePromise, reject) => {
    const req = httpRequest({ host: '127.0.0.1', port, path: rawPath, method: 'GET' }, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => resolvePromise({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

describe('og-images static server path containment', () => {
  let root;
  let secretDir;
  let server;
  let port;

  beforeAll(async () => {
    // Layout:
    //   <tmp>/root/index.html          (served root — reachable)
    //   <tmp>/secret.txt                (sibling of root — must stay unreachable)
    root = await mkdtemp(join(tmpdir(), 'og-images-root-'));
    secretDir = join(root, '..');
    await writeFile(join(root, 'index.html'), '<html>ok</html>', 'utf-8');
    await mkdir(join(root, 'blog', 'my-post'), { recursive: true });
    await writeFile(join(root, 'blog', 'my-post', 'index.html'), '<html>post</html>', 'utf-8');
    await writeFile(join(secretDir, 'secret.txt'), 'top secret', 'utf-8');

    const result = await serveStatic(root);
    server = result.server;
    port = result.port;
  });

  afterAll(async () => {
    await new Promise((resolvePromise) => server.close(resolvePromise));
    await rm(root, { recursive: true, force: true });
    await rm(join(secretDir, 'secret.txt'), { force: true });
  });

  it('serves a normal page request from inside root', async () => {
    const res = await rawRequest(port, '/');
    expect(res.status).toBe(200);
    expect(res.body).toBe('<html>ok</html>');
  });

  it('serves a nested extension-less route via index.html fallback', async () => {
    const res = await rawRequest(port, '/blog/my-post');
    expect(res.status).toBe(200);
    expect(res.body).toBe('<html>post</html>');
  });

  it('refuses a literal traversal path', async () => {
    // The URL-parsing step in resolveRequestPath collapses `/../secret.txt`
    // to `/secret.txt` (a location inside root that doesn't exist), so this
    // never reaches the resolve()/startsWith() containment check itself —
    // it 404s rather than 403s. Either way, the escape must not succeed.
    const res = await rawRequest(port, '/../secret.txt');
    expect(res.status).not.toBe(200);
    expect(res.body).not.toContain('top secret');
  });

  it('refuses a percent-encoded traversal path', async () => {
    const res = await rawRequest(port, '/%2e%2e/secret.txt');
    expect(res.status).not.toBe(200);
    expect(res.body).not.toContain('top secret');
  });

  it('refuses a deep traversal path reaching outside root', async () => {
    const res = await rawRequest(port, '/blog/../../secret.txt');
    expect(res.status).not.toBe(200);
    expect(res.body).not.toContain('top secret');
  });

  it('refuses a slash-smuggled traversal that only becomes ../ after decoding', async () => {
    // `%2f` is not decoded by the URL parser's own dot-segment
    // normalization, so `foo%2f..%2f..%2fsecret.txt` survives URL parsing
    // as a single opaque segment. Only this handler's own
    // decodeURIComponent() turns it into `foo/../../secret.txt` — which is
    // exactly why the resolve()/startsWith() containment check (not just
    // URL normalization) is load-bearing here: without it, node:path's
    // join() would collapse the `..` segments and escape root.
    const res = await rawRequest(port, '/foo%2f..%2f..%2fsecret.txt');
    expect(res.status).toBe(403);
    expect(res.body).not.toContain('top secret');
  });

  it('does not let a query string break normal serving', async () => {
    const res = await rawRequest(port, '/?cachebust=123');
    expect(res.status).toBe(200);
    expect(res.body).toBe('<html>ok</html>');
  });
});
