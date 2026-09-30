import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { JSDOM } from 'jsdom';

const root = resolve(__dirname, '..');
const canonical = 'https://nathanpayne.com/blog/the-product-did-not-travel/';
const html = readFileSync(resolve(root, 'dist/blog/the-product-did-not-travel/index.html'), 'utf8');
const document = new JSDOM(html).window.document;

describe('shared links survive the product article title revision', () => {
  it('serves the new title at the original canonical address across sharing metadata', () => {
    expect(document.querySelector('h1')?.textContent).toBe('The Product Did Not Travel');
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(canonical);
    expect(document.querySelector('meta[property="og:url"]')?.getAttribute('content')).toBe(
      canonical,
    );
    for (const selector of ['meta[property="og:title"]', 'meta[name="twitter:title"]']) {
      expect(document.querySelector(selector)?.getAttribute('content')).toBe(
        'The Product Did Not Travel | Nathan Payne',
      );
    }
  });

  it('retains the original section targets for links shared with fragments', () => {
    for (const id of [
      'built-for-one-event-then-generalized',
      'what-did-not-travel',
      'a-debrief-the-bugs-could-not-steer',
      'the-host-was-the-notification-system',
      'prompts-for-plans-that-did-not-exist',
      'rereading-the-success-case',
      'a-rationale-is-not-a-finding',
      'where-the-next-six-weeks-went',
      'the-stop-condition',
      'what-transfers',
    ]) {
      expect(document.getElementById(id), `Missing shared fragment #${id}`).not.toBeNull();
    }
  });
});
