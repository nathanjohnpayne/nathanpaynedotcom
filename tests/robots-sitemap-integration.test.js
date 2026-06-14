/**
 * Unit tests for the robots-sitemap Astro integration.
 *
 * These tests exercise the integration's hook directly against a fake
 * dist/ directory on disk, so we cover the full file I/O path and the
 * sitemap-resolution order without paying for a full Astro build each
 * time. The post-build integration tests in tests/robots-sitemap.test.js
 * pair with these to assert the real dist/robots.txt after `npm run build`.
 *
 * @see Issue #164 — Prevent robots.txt sitemap drift from Astro output
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtemp, writeFile, readFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import robotsSitemap from '../src/integrations/robots-sitemap.mjs';

const SITE = 'https://nathanpayne.com';
const silentLogger = { info: () => {}, warn: () => {}, error: () => {} };

/**
 * Helper: invoke the integration's config:done and build:done hooks
 * against a fake dist directory populated with the given files.
 */
async function runIntegration(files, { site = SITE } = {}) {
  const distDir = await mkdtemp(join(tmpdir(), 'robots-sitemap-test-'));

  // try/finally so the temp dir is cleaned up even if an unexpected
  // exception (mkdir, writeFile, assertion in the config hook) fires
  // before the normal return path.
  try {
    for (const [name, content] of Object.entries(files)) {
      const full = join(distDir, name);
      await mkdir(join(full, '..'), { recursive: true });
      await writeFile(full, content, 'utf-8');
    }

    const integration = robotsSitemap();
    integration.hooks['astro:config:done']({ config: { site } });

    let error;
    try {
      await integration.hooks['astro:build:done']({
        dir: pathToFileURL(distDir + '/'),
        logger: silentLogger,
      });
    } catch (err) {
      error = err;
    }

    const robotsPath = join(distDir, 'robots.txt');
    let robotsTxt;
    try {
      robotsTxt = await readFile(robotsPath, 'utf-8');
    } catch {
      robotsTxt = null;
    }

    return { robotsTxt, error };
  } finally {
    await rm(distDir, { recursive: true, force: true });
  }
}

describe('robots-sitemap integration', () => {
  describe('happy path — sitemap-index.xml present', () => {
    let result;

    beforeEach(async () => {
      result = await runIntegration({
        'robots.txt': 'User-agent: *\nAllow: /\n\nSitemap: https://nathanpayne.com/WRONG.xml\n',
        'sitemap-index.xml': '<?xml version="1.0"?><sitemapindex/>',
        'sitemap-0.xml': '<?xml version="1.0"?><urlset/>',
      });
    });

    it('does not throw', () => {
      expect(result.error).toBeUndefined();
    });

    it('rewrites the Sitemap: line to point at sitemap-index.xml', () => {
      expect(result.robotsTxt).toContain('Sitemap: https://nathanpayne.com/sitemap-index.xml');
    });

    it('removes the wrong Sitemap: line', () => {
      expect(result.robotsTxt).not.toContain('WRONG.xml');
    });

    it('preserves the User-agent and Allow rules from public/robots.txt', () => {
      expect(result.robotsTxt).toContain('User-agent: *');
      expect(result.robotsTxt).toContain('Allow: /');
    });

    it('has exactly one Sitemap: line', () => {
      const matches = result.robotsTxt.match(/^Sitemap:/gim) || [];
      expect(matches).toHaveLength(1);
    });
  });

  describe('fallback — only sitemap.xml present', () => {
    it('rewrites the Sitemap: line to point at sitemap.xml', async () => {
      const result = await runIntegration({
        'robots.txt': 'User-agent: *\nAllow: /\n',
        'sitemap.xml': '<?xml version="1.0"?><urlset/>',
      });
      expect(result.error).toBeUndefined();
      expect(result.robotsTxt).toContain('Sitemap: https://nathanpayne.com/sitemap.xml');
    });
  });

  describe('fallback — unusual sitemap filename', () => {
    it('picks up any sitemap*.xml at the dist root', async () => {
      const result = await runIntegration({
        'robots.txt': 'User-agent: *\nAllow: /\n',
        'sitemap-custom.xml': '<?xml version="1.0"?><urlset/>',
      });
      expect(result.error).toBeUndefined();
      expect(result.robotsTxt).toContain('Sitemap: https://nathanpayne.com/sitemap-custom.xml');
    });
  });

  describe('no sitemap present', () => {
    it('throws a clear error and does not silently ship a broken robots.txt', async () => {
      const result = await runIntegration({
        'robots.txt': 'User-agent: *\nAllow: /\n',
      });
      expect(result.error).toBeDefined();
      expect(result.error.message).toMatch(/no sitemap file found/i);
    });
  });

  describe('no robots.txt in dist', () => {
    it('throws — robots.txt must exist in dist/', async () => {
      const result = await runIntegration({
        'sitemap-index.xml': '<?xml version="1.0"?><sitemapindex/>',
      });
      expect(result.error).toBeDefined();
      expect(result.error.message).toMatch(/dist\/robots\.txt not found/);
    });
  });

  describe('site URL handling', () => {
    it('strips a trailing slash from site before joining', async () => {
      const result = await runIntegration(
        {
          'robots.txt': 'User-agent: *\nAllow: /\n',
          'sitemap-index.xml': '<?xml version="1.0"?><sitemapindex/>',
        },
        { site: 'https://nathanpayne.com/' },
      );
      expect(result.error).toBeUndefined();
      expect(result.robotsTxt).toContain('Sitemap: https://nathanpayne.com/sitemap-index.xml');
      expect(result.robotsTxt).not.toContain('https://nathanpayne.com//sitemap');
    });

    it('throws if astro.config.mjs has no `site` declared', async () => {
      const integration = robotsSitemap();
      expect(() => integration.hooks['astro:config:done']({ config: {} })).toThrow(
        /must declare a `site` URL/i,
      );
    });
  });

  describe('idempotence', () => {
    it('leaves a correct robots.txt unchanged on a second run', async () => {
      // First run: from a wrong declaration
      const first = await runIntegration({
        'robots.txt': 'User-agent: *\nAllow: /\n\nSitemap: https://nathanpayne.com/WRONG.xml\n',
        'sitemap-index.xml': '<?xml version="1.0"?><sitemapindex/>',
      });
      expect(first.error).toBeUndefined();

      // Second run: feeding the first run's output back in
      const second = await runIntegration({
        'robots.txt': first.robotsTxt,
        'sitemap-index.xml': '<?xml version="1.0"?><sitemapindex/>',
      });
      expect(second.error).toBeUndefined();
      expect(second.robotsTxt).toBe(first.robotsTxt);
    });
  });

  describe('formatting', () => {
    it('separates the Sitemap directive from the rules with a blank line', async () => {
      const result = await runIntegration({
        'robots.txt': 'User-agent: *\nAllow: /\n',
        'sitemap-index.xml': '<?xml version="1.0"?><sitemapindex/>',
      });
      expect(result.error).toBeUndefined();
      expect(result.robotsTxt).toMatch(
        /User-agent: \*\nAllow: \/\n\nSitemap: https:\/\/nathanpayne\.com\/sitemap-index\.xml\n$/,
      );
    });

    it('collapses extra blank lines left after stripping old Sitemap: lines', async () => {
      const result = await runIntegration({
        'robots.txt':
          'User-agent: *\nAllow: /\n\n\n\nSitemap: https://nathanpayne.com/OLD.xml\n\n\n',
        'sitemap-index.xml': '<?xml version="1.0"?><sitemapindex/>',
      });
      expect(result.error).toBeUndefined();
      // No runs of three or more newlines
      expect(result.robotsTxt).not.toMatch(/\n{3,}/);
    });
  });
});
