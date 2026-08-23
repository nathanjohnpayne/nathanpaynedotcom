/**
 * Unit tests for the local static file server in og-images.mjs.
 *
 * `startStaticServer`'s request handler joins `req.url` onto the dist
 * root with no normalization, so a request whose path (or its
 * percent-encoded form) contains `../` segments could previously escape
 * the served root. See CodeQL alert #1 (js/path-injection).
 *
 * @see https://github.com/nathanjohnpayne/nathanpaynedotcom/security/code-scanning/1
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { serveStatic } from '../src/integrations/og-images.mjs';

describe('og-images static server path containment', () => {
  let root;
  let secretDir;
  let server;
  let baseUrl;

  beforeAll(async () => {
    // Layout:
    //   <tmp>/root/index.html         (served root — this is what the
    //                                  headless browser should be able to reach)
    //   <tmp>/secret.txt               (sibling of root — must stay unreachable)
    root = await mkdtemp(join(tmpdir(), 'og-images-root-'));
    secretDir = join(root, '..');
    await writeFile(join(root, 'index.html'), '<html>ok</html>', 'utf-8');
    await mkdir(join(root, 'blog', 'my-post'), { recursive: true });
    await writeFile(join(root, 'blog', 'my-post', 'index.html'), '<html>post</html>', 'utf-8');
    await writeFile(join(secretDir, 'secret.txt'), 'top secret', 'utf-8');

    ({ server, port: baseUrl } = await withPort(root));
  });

  afterAll(async () => {
    await new Promise((resolvePromise) => server.close(resolvePromise));
    await rm(root, { recursive: true, force: true });
    await rm(join(secretDir, 'secret.txt'), { force: true });
  });

  async function withPort(dir) {
    const result = await serveStatic(dir);
    return { server: result.server, port: `http://127.0.0.1:${result.port}` };
  }

  it('serves a normal page request from inside root', async () => {
    const res = await fetch(`${baseUrl}/`);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('<html>ok</html>');
  });

  it('serves a nested extension-less route via index.html fallback', async () => {
    const res = await fetch(`${baseUrl}/blog/my-post`);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('<html>post</html>');
  });

  it('refuses a literal traversal path', async () => {
    const res = await fetch(`${baseUrl}/../secret.txt`);
    expect(res.status).not.toBe(200);
  });

  it('refuses a percent-encoded traversal path', async () => {
    const res = await fetch(`${baseUrl}/%2e%2e/secret.txt`);
    expect(res.status).not.toBe(200);
  });

  it('refuses a deep traversal path reaching outside root', async () => {
    const res = await fetch(`${baseUrl}/blog/../../secret.txt`);
    expect(res.status).not.toBe(200);
  });

  it('does not let a query string break normal serving', async () => {
    const res = await fetch(`${baseUrl}/?cachebust=123`);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('<html>ok</html>');
  });
});
