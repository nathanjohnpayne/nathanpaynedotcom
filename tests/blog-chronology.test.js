import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { writeSanitizedDOM } from './helpers/dom.js';

const DIST = resolve(__dirname, '../dist');

describe('blog chronology-only surfaces', () => {
  beforeEach(() => {
    writeSanitizedDOM(
      readFileSync(resolve(DIST, 'blog/six-prs-one-bug-agent-failure-modes/index.html'), 'utf-8'),
    );
  });

  it('keeps in-post navigation chronological when the featured post moves on the index', () => {
    expect(document.querySelector('[data-postnav="previous"]')).toBeNull();
    expect(document.querySelector('[data-postnav="next"]')?.getAttribute('href')).toBe(
      '/blog/agent-approval-workflow-genesis-of-mergepath/',
    );
  });

  it('keeps RSS newest-first instead of applying editorial order', () => {
    const rss = readFileSync(resolve(DIST, 'rss.xml'), 'utf-8');
    const links = [...rss.matchAll(/<link>(https:\/\/nathanpayne\.com\/blog\/[^<]+)<\/link>/g)].map(
      (match) => match[1],
    );

    expect(links).toEqual([
      'https://nathanpayne.com/blog/every-reviewer-was-right/',
      'https://nathanpayne.com/blog/autofix-was-the-whole-cost/',
      'https://nathanpayne.com/blog/perfect-score-wrong-axis/',
      'https://nathanpayne.com/blog/two-blues-one-composition/',
      'https://nathanpayne.com/blog/html-mockups-as-spec/',
      'https://nathanpayne.com/blog/how-a-responsive-fix-became-an-astro-migration/',
      'https://nathanpayne.com/blog/agent-approval-workflow-genesis-of-mergepath/',
      'https://nathanpayne.com/blog/six-prs-one-bug-agent-failure-modes/',
    ]);
  });
});
