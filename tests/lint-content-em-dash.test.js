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

  it('treats no-break spaces as padding', () => {
    const source = 'word\u00a0—\u00a0next and word\u202f—\u202fnext';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(2);
    expect(closeUpSpacedEmDashesInText(source)).toBe('word—next and word—next');
  });

  it('does not rewrite the YAML space separating a key from a dash value', () => {
    const source = ['---', 'title: —', 'blurb: — leading dash', '---', ''].join('\n');

    const violations = findSpacedEmDashViolations('/tmp/test.md', source);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ line: 3 });
    expect(closeUpSpacedEmDashesInText(source)).toBe(
      ['---', 'title: —', 'blurb: —leading dash', '---', ''].join('\n'),
    );
  });

  it('does not rewrite the YAML space after a sequence dash', () => {
    const source = ['---', 'quotes:', '  - — leading dash', '---', ''].join('\n');

    expect(closeUpSpacedEmDashesInText(source)).toBe(
      ['---', 'quotes:', '  - —leading dash', '---', ''].join('\n'),
    );
  });

  it('scans visible prose inside a raw HTML block but not its markup', () => {
    const source = ['<div class="note">', 'visible — prose', '</div>'].join('\n');

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
    expect(closeUpSpacedEmDashesInText(source)).toBe(
      ['<div class="note">', 'visible—prose', '</div>'].join('\n'),
    );
  });

  it('leaves an HTML comment alone', () => {
    const source = ['<div>', '<!-- note — for editors -->', 'prose — here', '</div>'].join('\n');

    const violations = findSpacedEmDashViolations('/tmp/test.md', source);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ line: 3 });
  });

  it('ignores an em dash inside a link destination', () => {
    const source = '[label](<https://example.test/a — b>) and prose — here.';

    const violations = findSpacedEmDashViolations('/tmp/test.md', source);
    expect(violations).toHaveLength(1);
    expect(closeUpSpacedEmDashesInText(source)).toBe(
      '[label](<https://example.test/a — b>) and prose—here.',
    );
  });

  it('still lints the label and title around a link destination', () => {
    const source = '[a label — here](https://example.test/ "a title — here")';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(2);
  });

  it('ignores an em dash in a link reference definition URL', () => {
    const source = '[ref]: <https://example.test/a — b>\n\nprose — here.';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
  });

  it('catches an em dash padded across a soft line break', () => {
    const source = 'a line ending in a dash —\ncontinuation of the paragraph.';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
  });

  it('does not reflow across a block boundary', () => {
    // The newline between two list items is a block boundary, not padding, so
    // only the space is removed and the items stay separate.
    expect(closeUpSpacedEmDashesInText('- one —\n- two')).toBe('- one—\n- two');
  });

  it('closes a soft-break gap by joining the one paragraph it spans', () => {
    // Both sides sit in a single text node, so removing the newline cannot
    // glue two blocks together, and it is the only way to close the gap.
    expect(closeUpSpacedEmDashesInText('word —\ncontinuation')).toBe('word—continuation');
    expect(closeUpSpacedEmDashesInText('word—\ncontinuation')).toBe('word—continuation');
  });

  it('does not treat a paragraph break as padding', () => {
    const source = 'a paragraph ending in a dash—\n\nA new paragraph.';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(0);
  });

  it('sees a dash padded through inline markup', () => {
    const source = 'word **—** next';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
    expect(closeUpSpacedEmDashesInText(source)).toBe('word**—**next');
  });

  it('sees a dash written as a character reference', () => {
    const source = 'word &mdash; next';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
    expect(closeUpSpacedEmDashesInText(source)).toBe('word&mdash;next');
  });

  it('sees padding written as a character reference', () => {
    const source = 'word&nbsp;—&nbsp;next';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
    expect(closeUpSpacedEmDashesInText(source)).toBe('word—next');
  });

  it('treats a thin space as padding', () => {
    const source = 'word\u2009—\u2009next';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
    expect(closeUpSpacedEmDashesInText(source)).toBe('word—next');
  });

  it('does not flag an unpadded dash before a block boundary', () => {
    expect(findSpacedEmDashViolations('/tmp/test.md', 'word—\n# Heading')).toHaveLength(0);
    expect(findSpacedEmDashViolations('/tmp/test.md', 'word—  \ncontinuation')).toHaveLength(0);
    expect(findSpacedEmDashViolations('/tmp/test.md', 'word—\n')).toHaveLength(0);
  });

  it('leaves raw-text element bodies alone', () => {
    const script = '<script>\nconst x = "a — b";\n</script>';
    const pre = '<pre>code — sample</pre>';

    expect(findSpacedEmDashViolations('/tmp/test.md', script)).toHaveLength(0);
    expect(closeUpSpacedEmDashesInText(script)).toBe(script);
    expect(findSpacedEmDashViolations('/tmp/test.md', pre)).toHaveLength(0);
    expect(closeUpSpacedEmDashesInText(pre)).toBe(pre);
  });

  it('ignores a YAML comment but not a hash inside a quoted scalar', () => {
    const commented = ['---', 'title: Plain # note — for editors', '---', ''].join('\n');
    const quoted = ['---', 'title: "a # b — c"', '---', ''].join('\n');

    expect(findSpacedEmDashViolations('/tmp/test.md', commented)).toHaveLength(0);
    expect(closeUpSpacedEmDashesInText(commented)).toBe(commented);
    expect(findSpacedEmDashViolations('/tmp/test.md', quoted)).toHaveLength(1);
  });

  it('maps every code point a character reference produces', () => {
    // `&NotEqualTilde;` decodes to two code points. Assigning the whole entity
    // span to only the first desynchronizes every span after it.
    const multi = 'word &NotEqualTilde; — next';
    expect(closeUpSpacedEmDashesInText(multi)).toBe('word &NotEqualTilde;—next');

    // `&#x1F600;` is one code point but two UTF-16 units.
    const supplementary = 'word &#x1F600; — next';
    expect(closeUpSpacedEmDashesInText(supplementary)).toBe('word &#x1F600;—next');

    // A literal supplementary character, with no entity involved.
    expect(closeUpSpacedEmDashesInText('a \u{1F600} — b')).toBe('a \u{1F600}—b');
  });

  it('reads GFM table cells as cells, not as padded prose', () => {
    const table = ['| a | b |', '| --- | --- |', '| word | — |'].join('\n');

    expect(findSpacedEmDashViolations('/tmp/test.md', table)).toHaveLength(0);
    expect(closeUpSpacedEmDashesInText(table)).toBe(table);
  });

  it('lints prose inside a GFM table cell', () => {
    const table = ['| a | b |', '| --- | --- |', '| word — next | b |'].join('\n');

    expect(findSpacedEmDashViolations('/tmp/test.md', table)).toHaveLength(1);
    expect(closeUpSpacedEmDashesInText(table)).toBe(
      ['| a | b |', '| --- | --- |', '| word—next | b |'].join('\n'),
    );
  });

  it('scans standalone YAML content collections', () => {
    const source = ['label: Strategy', 'skills:', '  - "Strategy — Operations"', ''].join('\n');

    expect(findSpacedEmDashViolations('/tmp/skills.yaml', source)).toHaveLength(1);
    expect(closeUpSpacedEmDashesInText(source, '/tmp/skills.yaml')).toBe(
      ['label: Strategy', 'skills:', '  - "Strategy—Operations"', ''].join('\n'),
    );
  });

  it('does not parse a YAML collection file as Markdown', () => {
    const source = ['note: |', '  a fenced-looking line ```', '  text — here', ''].join('\n');

    expect(findSpacedEmDashViolations('/tmp/skills.yml', source)).toHaveLength(1);
  });

  it('maps a link title by UTF-16 unit, not code point', () => {
    // The emoji occupies two units; walking code points would shift every
    // span after it and delete prose instead of the padding.
    const source = '[x](https://example.test/ "\u{1F600} a — b")';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
    expect(closeUpSpacedEmDashesInText(source)).toBe(
      '[x](https://example.test/ "\u{1F600} a—b")',
    );
  });

  it('reads a literal block scalar as content, not as a comment', () => {
    const source = [
      'description: |',
      '  prose # topic — explanation',
      '  more — here',
      'other: plain # real — comment',
      '',
    ].join('\n');

    // Both dashes in the block scalar count; the one in the real comment does not.
    expect(findSpacedEmDashViolations('/tmp/skills.yaml', source)).toHaveLength(2);
    expect(closeUpSpacedEmDashesInText(source, '/tmp/skills.yaml')).toBe(
      [
        'description: |',
        '  prose # topic—explanation',
        '  more—here',
        'other: plain # real — comment',
        '',
      ].join('\n'),
    );
  });

  it('reads a folded block scalar and closes it on dedent', () => {
    const source = [
      'blurb: >-',
      '  folded # not a comment — here',
      'label: after # real — comment',
      '',
    ].join('\n');

    const violations = findSpacedEmDashViolations('/tmp/skills.yaml', source);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ line: 2 });
  });

  it('handles a block scalar under a sequence item', () => {
    const source = ['items:', '  - |', '    text # x — y', ''].join('\n');

    expect(findSpacedEmDashViolations('/tmp/skills.yaml', source)).toHaveLength(1);
  });

  it('accepts YAML block scalar indicators in either order', () => {
    for (const header of ['|2-', '|-2', '>2+', '>+2', '|2', '|']) {
      const source = [`description: ${header}`, '  prose # topic — explanation', ''].join('\n');

      expect(findSpacedEmDashViolations('/tmp/skills.yaml', source)).toHaveLength(1);
    }
  });

  it('protects an unclosed raw-text element through the end of the block', () => {
    // CommonMark lets an HTML block run to EOF, so the closing tag may be absent.
    const script = '<script>\nconst label = "a — b";';
    const pre = '<pre>\ncode — sample';

    expect(findSpacedEmDashViolations('/tmp/test.md', script)).toHaveLength(0);
    expect(closeUpSpacedEmDashesInText(script)).toBe(script);
    expect(findSpacedEmDashViolations('/tmp/test.md', pre)).toHaveLength(0);
    expect(closeUpSpacedEmDashesInText(pre)).toBe(pre);
  });

  it('preserves CRLF line endings through a fix pass', () => {
    const source = 'prose — one.\r\nprose — two.\r\n';

    expect(closeUpSpacedEmDashesInText(source)).toBe('prose—one.\r\nprose—two.\r\n');
  });
});
