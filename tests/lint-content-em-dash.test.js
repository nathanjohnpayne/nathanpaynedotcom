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
    expect(violations[0]).toMatchObject({ line: 1, column: 16 });
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
});
