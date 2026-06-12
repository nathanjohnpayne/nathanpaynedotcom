import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const css = readFileSync(resolve(__dirname, '../src/styles/global.css'), 'utf-8');

describe('Contrast token cleanup', () => {
  it('routes invariant ink and contrast colors through tokens instead of alpha-baked literals', () => {
    expect(css).not.toMatch(/rgba\(17,\s*16,\s*13/i);
    expect(css).not.toMatch(/rgba\(23,\s*18,\s*8/i);
    expect(css).not.toMatch(/rgba\(240,\s*244,\s*255/i);
    expect(css).not.toMatch(/rgba\(242,\s*237,\s*225/i);
    expect(css).not.toMatch(/rgba\(239,\s*232,\s*216/i);
  });

  it('keeps the tuned mobile panel veil colors as named token definitions only', () => {
    const veilHexes = css.match(/#(?:f2ede1|efe8d8)\b/gi) ?? [];

    expect(veilHexes.map((hex) => hex.toLowerCase()).sort()).toEqual(['#efe8d8', '#f2ede1']);
    expect(css).toMatch(/--veil-on-red:\s*#f2ede1;/);
    expect(css).toMatch(/--veil-on-black:\s*#efe8d8;/);
  });

  it('keeps the exact 6% ink code-block background on the existing ramp token', () => {
    expect(css).toMatch(/--ink-06:\s*color-mix\(in srgb,\s*var\(--ink\)\s*6%,\s*transparent\);/);
    expect(css).toMatch(/--astro-code-background:\s*var\(--ink-06\);/);
  });
});
