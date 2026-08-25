import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

import ogImages from '../src/integrations/og-images.mjs';

describe('OG route capture lifecycle', () => {
  it('invalidates stale captures before build compilation', async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'og-capture-'));
    const captureDir = join(projectRoot, '.astro', 'test-artifacts', 'og-templates');

    try {
      mkdirSync(captureDir, { recursive: true });
      writeFileSync(join(captureDir, 'stale.html'), 'stale');

      const integration = ogImages();
      integration.hooks['astro:config:done']({
        config: {
          root: pathToFileURL(`${projectRoot}/`),
          site: new URL('https://example.com'),
        },
      });
      await integration.hooks['astro:build:start']();

      expect(existsSync(captureDir)).toBe(false);
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });
});
