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

  it('treats a 4-space-indented block as code, not prose', () => {
    const source = [
      '    spaced — inside an indented code block',
      '    still code',
    ].join('\n');

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(0);
    expect(closeUpSpacedEmDashesInText(source)).toBe(source);
  });

  it('skips fences nested in a block quote', () => {
    const source = [
      '> ```',
      '> spaced — inside quoted code',
      '> ```',
      '',
      'prose — outside the quote.',
    ].join('\n');

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
  });

  it('skips fences nested in a list item', () => {
    const source = [
      '- item',
      '',
      '  ```',
      '  spaced — inside list code',
      '  ```',
    ].join('\n');

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(0);
  });

  it('skips code spans that wrap across lines', () => {
    const source = [
      'prose with `a span that',
      'wraps — across lines` and then prose — here.',
    ].join('\n');

    const violations = findSpacedEmDashViolations('/tmp/test.md', source);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ line: 2 });
  });

  it('scans frontmatter prose, which is where most published copy lives', () => {
    const source = [
      '---',
      'title: "A title — with a spaced dash"',
      '---',
      '',
      'Body prose.',
    ].join('\n');

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
    expect(closeUpSpacedEmDashesInText(source)).toContain('title: "A title—with a spaced dash"');
  });

  it('does not treat frontmatter delimiters as Markdown structure', () => {
    const source = [
      '---',
      'title: "Plain"',
      '---',
      '',
      '```',
      'code — stays',
      '```',
      '',
      'prose — fixed.',
    ].join('\n');

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
  });

  it('catches one-sided spacing on either side of the dash', () => {
    expect(findSpacedEmDashViolations('/tmp/test.md', 'word —next')).toHaveLength(1);
    expect(findSpacedEmDashViolations('/tmp/test.md', 'word— next')).toHaveLength(1);
    expect(closeUpSpacedEmDashesInText('word —next')).toBe('word—next');
    expect(closeUpSpacedEmDashesInText('word— next')).toBe('word—next');
  });

  it('catches tab padding around the dash', () => {
    const source = 'word\t—\tnext';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
    expect(closeUpSpacedEmDashesInText(source)).toBe('word—next');
  });

  it('leaves an already-correct em dash alone', () => {
    const source = 'word—next, and a lone — is only flagged when padded.';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
    expect(closeUpSpacedEmDashesInText('word—next.')).toBe('word—next.');
  });

  it('preserves CRLF line endings through a fix pass', () => {
    const source = 'prose — one.\r\nprose — two.\r\n';

    expect(closeUpSpacedEmDashesInText(source)).toBe('prose—one.\r\nprose—two.\r\n');
  });
});
