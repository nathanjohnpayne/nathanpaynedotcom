import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { resolve } from 'path';

function collectHtmlFiles(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const full = resolve(dir, name);
    if (statSync(full).isDirectory()) {
      files.push(...collectHtmlFiles(full));
    } else if (name.endsWith('.html')) {
      files.push(full);
    }
  }
  return files;
}

const blogDir = resolve(__dirname, '../dist/blog');
const blogHtmlFiles = existsSync(blogDir) ? collectHtmlFiles(blogDir) : [];

describe('No External Images', () => {
  it('no blog HTML files reference raw.githubusercontent.com', () => {
    expect(blogHtmlFiles.length).toBeGreaterThan(0);
    for (const file of blogHtmlFiles) {
      const content = readFileSync(file, 'utf-8');
      expect(
        content.includes('raw.githubusercontent.com'),
        `${file} contains a raw.githubusercontent.com reference`,
      ).toBe(false);
    }
  });
});
