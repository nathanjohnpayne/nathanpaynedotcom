import { describe, it, expect } from 'vitest';
import {
  closeUpSpacedEmDashesInText,
  findSpacedEmDashViolations,
} from '../scripts/lint-content-em-dash.mjs';

describe('content em-dash lint', () => {
  it('reports spaced em dashes in prose', () => {
    const source = 'a short sentence — with a spaced em dash.';
    const violations = findSpacedEmDashViolations('/tmp/test.md', source);

    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ line: 1, column: 17 });
  });

  it('allows identifier-label link exceptions', () => {
    const source = '[DST-047 — Questionnaire Intake & AI Extraction Pipeline](https://example.test/)';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(0);
  });

  it('skips fenced code blocks', () => {
    const source = [
      '```',
      'spaced — em dash inside code',
      '```',
    ].join('\n');

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(0);
  });

  it('skips tildes code blocks and matching-length rules', () => {
    const source = [
      '~~~~',
      'spaced — em dash inside code',
      '~~~~',
    ].join('\n');

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(0);
  });

  it('skips inline code spans in fix and detect steps', () => {
    const source = '`inline code — keeps spaced dashes` and prose — gets fixed.';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
    expect(closeUpSpacedEmDashesInText(source)).toBe(
      '`inline code — keeps spaced dashes` and prose—gets fixed.',
    );
  });

  it('preserves multiple identifier-label exceptions on one line', () => {
    const source = [
      '[DST-047 — Questionnaire Intake](/tmp/whatever.md) [DST-048 — Prompt Safety](/tmp/whatever-2.md)',
      'text with spaced — issue.',
    ].join('\n');

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
    expect(closeUpSpacedEmDashesInText(source)).toBe(
      '[DST-047 — Questionnaire Intake](/tmp/whatever.md) [DST-048 — Prompt Safety](/tmp/whatever-2.md)\ntext with spaced—issue.',
    );
  });

  it('only exempts the ID-title separator and not additional em dashes in labels', () => {
    const source = '[DST-047 — Title — extra prose](https://example.test/)';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
  });

  it('does not treat mixed-marker fence runs as code fences', () => {
    const source = [
      '```~```',
      'spaced — in malformed code fence line',
      '```~```',
    ].join('\n');

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
  });

  it('keeps unmatched backtick text as prose', () => {
    const source = '`unfinished code — still prose';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
    expect(closeUpSpacedEmDashesInText(source)).toBe('`unfinished code—still prose');
  });

  it('does not open a backtick fence whose info string contains a backtick', () => {
    const source = [
      '``` js `inline` ```',
      'spaced — after a line that is not a fence',
    ].join('\n');

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
  });

  it('does not close a fence on a line carrying an info string', () => {
    const source = [
      '```',
      'spaced — inside code',
      '``` js',
      'spaced — still inside code',
      '```',
    ].join('\n');

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(0);
  });

  it('closes up em dashes padded with more than one space', () => {
    const source = 'a sentence  —  with wide padding.';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
    expect(closeUpSpacedEmDashesInText(source)).toBe('a sentence—with wide padding.');
  });

  it('fixes prose-only spacing while preserving ID-title exceptions', () => {
    const source = [
      'A spaced — em dash.',
      '[DST-047 — Questionnaire Intake](/tmp/whatever.md)',
      '```',
      'code — block',
      '```',
    ].join('\n');

    const fixed = closeUpSpacedEmDashesInText(source);
    expect(fixed).toBe('A spaced—em dash.\n[DST-047 — Questionnaire Intake](/tmp/whatever.md)\n```\ncode — block\n```');
  });

  it('does not treat 4-space-indented fences as code fences', () => {
    const source = [
      '    ```',
      '    spaced — inside indented code',
      '    ```',
    ].join('\n');

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
  });
});
