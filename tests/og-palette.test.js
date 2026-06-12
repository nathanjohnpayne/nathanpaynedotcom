import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, resolve } from 'path';

const ROOT = resolve(__dirname, '..');
const OG_TEMPLATES = resolve(ROOT, 'src/pages/og-templates');
const OG_CARD = resolve(ROOT, 'src/layouts/OgCard.astro');

function findAstroFiles(dir) {
  const files = [];

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      files.push(...findAstroFiles(fullPath));
    } else if (entry.endsWith('.astro')) {
      files.push(fullPath);
    }
  }

  return files;
}

describe('OG palette register boundary', () => {
  it('lets OgCard accept a 1930 register opt-in on the body element', () => {
    const source = readFileSync(OG_CARD, 'utf-8');

    expect(source).toMatch(/palette\?:\s*'1930';/);
    expect(source).toMatch(/data-palette=\{palette\}/);
  });

  it('opts only the homepage OG template into the 1930 register', () => {
    const templateSources = findAstroFiles(OG_TEMPLATES).map((file) => ({
      path: relative(OG_TEMPLATES, file),
      source: readFileSync(file, 'utf-8'),
    }));
    const paletteUsers = templateSources
      .filter(({ source }) => /palette="1930"/.test(source))
      .map(({ path }) => path)
      .sort();

    expect(paletteUsers).toEqual(['home.astro']);
  });
});
