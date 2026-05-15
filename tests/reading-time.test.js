import { describe, it, expect } from 'vitest';
import { estimateReadingMinutes } from '../src/lib/reading-time';

describe('estimateReadingMinutes (src/lib/reading-time.ts)', () => {
  it('returns 1 for empty / nullish input', () => {
    expect(estimateReadingMinutes('')).toBe(1);
    expect(estimateReadingMinutes(undefined)).toBe(1);
    expect(estimateReadingMinutes(null)).toBe(1);
  });

  it('returns 1 for very short bodies (sub-225-word floor)', () => {
    // "hello world" is 2 words → 2/225 ≈ 0.009 → ceil = 1 → clamp to 1.
    expect(estimateReadingMinutes('hello world')).toBe(1);
  });

  it('rounds up: 226 prose words is 2 min', () => {
    // Generate exactly 226 single-letter words separated by spaces.
    const body = Array.from({ length: 226 }, () => 'a').join(' ');
    expect(estimateReadingMinutes(body)).toBe(2);
  });

  it('weights code blocks at 0.3 of their word count', () => {
    // 200 prose words + a fenced block of 200 "words" should count as
    // 200 + 60 = 260 weighted words → 260/225 = 1.155 → ceil = 2.
    const prose = Array.from({ length: 200 }, () => 'p').join(' ');
    const code = '```\n' + Array.from({ length: 200 }, () => 'x').join(' ') + '\n```';
    expect(estimateReadingMinutes(`${prose}\n\n${code}`)).toBe(2);
  });

  it('treats multiple fenced blocks separately, still at 0.3', () => {
    const prose = Array.from({ length: 100 }, () => 'p').join(' ');
    const c1 = '```\n' + Array.from({ length: 300 }, () => 'a').join(' ') + '\n```';
    const c2 = '```\n' + Array.from({ length: 300 }, () => 'b').join(' ') + '\n```';
    // 100 prose + (300 + 300) × 0.3 = 100 + 180 = 280 → 280/225 = 1.244 → ceil = 2.
    expect(estimateReadingMinutes(`${prose}\n${c1}\n${c2}`)).toBe(2);
  });

  it('handles a body that is entirely a code block', () => {
    const code = '```\n' + Array.from({ length: 1000 }, () => 'z').join(' ') + '\n```';
    // 0 prose + 1000 × 0.3 = 300 → 300/225 = 1.33 → ceil = 2.
    expect(estimateReadingMinutes(code)).toBe(2);
  });

  it('does not count fence ``` delimiters as code words', () => {
    // Exactly 225 prose words sits right on the 1-minute boundary
    // (ceil(225/225) = 1). Appending an empty fenced block must not push
    // the result to 2 min — the ``` tokens are syntax, not content.
    const prose = Array.from({ length: 225 }, () => 'w').join(' ');
    const emptyFence = '```\n```';
    expect(estimateReadingMinutes(`${prose}\n\n${emptyFence}`)).toBe(1);
  });

  it('does not count a fence language tag as a code word', () => {
    // Same boundary case, with a language-tagged empty block. The opening
    // ```js token (with its language hint) is also syntax and must be
    // stripped before counting.
    const prose = Array.from({ length: 225 }, () => 'w').join(' ');
    const taggedFence = '```js\n```';
    expect(estimateReadingMinutes(`${prose}\n\n${taggedFence}`)).toBe(1);
  });
});
