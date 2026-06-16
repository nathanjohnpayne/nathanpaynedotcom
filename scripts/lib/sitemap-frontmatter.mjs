import { readFileSync } from 'node:fs';
import { load as parseYaml } from 'js-yaml';

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/;

/**
 * @param {string} markdown
 * @returns {Record<string, unknown>}
 */
export function parseSitemapFrontmatter(markdown) {
  const match = markdown.match(FRONTMATTER_RE);
  if (!match) return {};
  const parsed = parseYaml(match[1]);
  return parsed && typeof parsed === 'object' ? parsed : {};
}

/**
 * @param {string} filePath
 * @returns {Record<string, unknown>}
 */
export function readSitemapFrontmatter(filePath) {
  return parseSitemapFrontmatter(readFileSync(filePath, 'utf-8'));
}
