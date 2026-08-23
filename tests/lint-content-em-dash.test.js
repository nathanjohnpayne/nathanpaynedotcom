import { describe, it, expect } from 'vitest';
import { findSpacedEmDashViolations } from '../scripts/lint-content-em-dash.mjs';

describe('content em-dash lint', () => {
  it('reports spaced em dashes in prose', () => {
    const source = 'a short sentence — with a spaced em dash.';
    const violations = findSpacedEmDashViolations('/tmp/test.md', source);

    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ line: 1, column: 17 });
  });

  it('allows identifier-label link exceptions', () => {
    const source =
      '[DST-047 — Questionnaire Intake & AI Extraction Pipeline](https://example.test/)';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(0);
  });

  it('skips fenced code blocks', () => {
    const source = ['```', 'spaced — em dash inside code', '```'].join('\n');

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(0);
  });

  it('skips tildes code blocks and matching-length rules', () => {
    const source = ['~~~~', 'spaced — em dash inside code', '~~~~'].join('\n');

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(0);
  });

  it('skips inline code spans in fix and detect steps', () => {
    const source = '`inline code — keeps spaced dashes` and prose — gets fixed.';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
  });

  it('preserves multiple identifier-label exceptions on one line', () => {
    const source = [
      '[DST-047 — Questionnaire Intake](/tmp/whatever.md) [DST-048 — Prompt Safety](/tmp/whatever-2.md)',
      'text with spaced — issue.',
    ].join('\n');

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
  });

  it('only exempts the ID-title separator and not additional em dashes in labels', () => {
    const source = '[DST-047 — Title — extra prose](https://example.test/)';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
  });

  it('does not treat mixed-marker fence runs as code fences', () => {
    const source = ['```~```', 'spaced — in malformed code fence line', '```~```'].join('\n');

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
  });

  it('keeps unmatched backtick text as prose', () => {
    const source = '`unfinished code — still prose';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
  });

  it('does not open a backtick fence whose info string contains a backtick', () => {
    const source = ['``` js `inline` ```', 'spaced — after a line that is not a fence'].join('\n');

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
  });

  it('fixes prose-only spacing while preserving ID-title exceptions', () => {
    const source = [
      'A spaced — em dash.',
      '[DST-047 — Questionnaire Intake](/tmp/whatever.md)',
      '```',
      'code — block',
      '```',
    ].join('\n');

    // The prose dash is reported; the ID-title separator and the fenced code
    // block are not.
    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
  });

  it('treats a 4-space-indented block as code, not prose', () => {
    const source = ['    spaced — inside an indented code block', '    still code'].join('\n');

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(0);
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
    const source = ['- item', '', '  ```', '  spaced — inside list code', '  ```'].join('\n');

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(0);
  });

  it('skips code spans that wrap across lines', () => {
    const source = ['prose with `a span that', 'wraps — across lines` and then prose — here.'].join(
      '\n',
    );

    const violations = findSpacedEmDashViolations('/tmp/test.md', source);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ line: 2 });
  });

  it('scans frontmatter prose, which is where most published copy lives', () => {
    const source = ['---', 'title: "A title — with a spaced dash"', '---', '', 'Body prose.'].join(
      '\n',
    );

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
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
  });

  it('catches tab padding around the dash', () => {
    const source = 'word\t—\tnext';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
  });

  it('leaves an already-correct em dash alone', () => {
    const source = 'word—next, and a lone — is only flagged when padded.';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
  });

  it('treats no-break spaces as padding', () => {
    const source = 'word\u00a0—\u00a0next and word\u202f—\u202fnext';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(2);
  });

  it('does not rewrite the YAML space separating a key from a dash value', () => {
    const source = ['---', 'title: —', 'blurb: — leading dash', '---', ''].join('\n');

    const violations = findSpacedEmDashViolations('/tmp/test.md', source);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ line: 3 });
  });


  it('scans visible prose inside a raw HTML block but not its markup', () => {
    const source = ['<div class="note">', 'visible — prose', '</div>'].join('\n');

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
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



  it('does not treat a paragraph break as padding', () => {
    const source = 'a paragraph ending in a dash—\n\nA new paragraph.';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(0);
  });

  it('reports but does not structurally rewrite a dash padded through inline markup', () => {
    const source = 'word **—** next';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
  });

  it('sees a dash written as a character reference', () => {
    const source = 'word &mdash; next';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
  });

  it('sees padding written as a character reference', () => {
    const source = 'word&nbsp;—&nbsp;next';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
  });

  it('treats a thin space as padding', () => {
    const source = 'word\u2009—\u2009next';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
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
    expect(findSpacedEmDashViolations('/tmp/test.md', pre)).toHaveLength(0);
  });

  it('ignores a YAML comment but not a hash inside a quoted scalar', () => {
    const commented = ['---', 'title: Plain # note — for editors', '---', ''].join('\n');
    const quoted = ['---', 'title: "a # b — c"', '---', ''].join('\n');

    expect(findSpacedEmDashViolations('/tmp/test.md', commented)).toHaveLength(0);
    expect(findSpacedEmDashViolations('/tmp/test.md', quoted)).toHaveLength(1);
  });


  it('reads GFM table cells as cells, not as padded prose', () => {
    const table = ['| a | b |', '| --- | --- |', '| word | — |'].join('\n');

    expect(findSpacedEmDashViolations('/tmp/test.md', table)).toHaveLength(0);
  });

  it('lints prose inside a GFM table cell', () => {
    const table = ['| a | b |', '| --- | --- |', '| word — next | b |'].join('\n');

    expect(findSpacedEmDashViolations('/tmp/test.md', table)).toHaveLength(1);
  });

  it('scans standalone YAML content collections', () => {
    const source = ['label: Strategy', 'skills:', '  - "Strategy — Operations"', ''].join('\n');

    expect(findSpacedEmDashViolations('/tmp/skills.yaml', source)).toHaveLength(1);
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
    expect(findSpacedEmDashViolations('/tmp/test.md', pre)).toHaveLength(0);
  });

  it('honours an explicit block scalar indentation indicator', () => {
    // Tracking keys off the opener line's indentation, so content indented
    // past it stays in the scalar whatever the explicit indicator says.
    const cases = [
      'description: |2\n  visible # topic — explanation\n',
      'a:\n  description: |2\n    visible # topic — explanation\n',
      'a:\n  description: |1\n   visible # topic — explanation\n',
      'items:\n  - |2\n    visible # topic — explanation\n',
    ];

    for (const source of cases) {
      expect(findSpacedEmDashViolations('/tmp/skills.yaml', source)).toHaveLength(1);
    }
  });

  it('never eats the whitespace a YAML comment needs as its separator', () => {
    // Removing it would fold `# editorial note` into the published value.
    const source = 'title: foo— # editorial note';

    expect(findSpacedEmDashViolations('/tmp/skills.yaml', source)).toHaveLength(0);

    // Padding that is genuinely rendered is still closed, comment intact.
  });

  it('ignores trailing whitespace YAML would strip anyway', () => {
    const source = 'title: foo— ';

    expect(findSpacedEmDashViolations('/tmp/skills.yaml', source)).toHaveLength(0);
  });

  it('sees a dash padded through inline HTML', () => {
    // Omitting inline tags must not break adjacency.
    const source = 'word <em>—</em> next';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
  });

  it('decodes character references inside an HTML block', () => {
    const source = '<div>word &mdash; next</div>';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
  });

  it('finds a link title that contains a character reference', () => {
    // The decoded title never appears verbatim in the source, so locating it
    // by value search silently skipped it.
    const source = '[x](/ "word &mdash; next")';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
  });


  it('does not break a tag on a > inside a quoted attribute', () => {
    const source = '<div title="a > b — c">text</div>';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(0);
  });

  it('folds a YAML > scalar, so a line-end dash counts as padded', () => {
    // The fold renders the break as a space: `word— continuation`.
    const trailing = 'description: >\n  word—\n  continuation\n';
    const padded = 'description: >\n  word —\n  continuation\n';

    expect(findSpacedEmDashViolations('/tmp/skills.yaml', trailing)).toHaveLength(1);
    // Padding before the dash plus the fold after it is still one violation.
    expect(findSpacedEmDashViolations('/tmp/skills.yaml', padded)).toHaveLength(1);
  });

  it('does not fold a literal | scalar or across a blank line', () => {
    // `|` keeps breaks literal, and a blank line folds to a break, not a space.
    const literal = 'description: |\n  word—\n  continuation\n';
    const blank = 'description: >\n  word—\n\n  continuation\n';

    expect(findSpacedEmDashViolations('/tmp/skills.yaml', literal)).toHaveLength(0);
    expect(findSpacedEmDashViolations('/tmp/skills.yaml', blank)).toHaveLength(0);
  });

  it('protects a raw-text element split across sibling nodes', () => {
    // mdast represents inline HTML as separate opener, text, and closer nodes,
    // so the code sample arrives as a bare text node in the middle.
    const source = 'text <code>a — b</code>';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(0);
  });

  it('honours an explicit indentation indicator on a folded scalar', () => {
    // `>2` fixes content indentation at 2, so the four-space line is a
    // more-indented literal line and YAML keeps a newline after it.
    const literalFirst = 'description: >2\n    code—\n  continuation\n';

    expect(findSpacedEmDashViolations('/tmp/skills.yaml', literalFirst)).toHaveLength(0);

    // At the declared indentation the lines do fold, so the break is padding.
    const folded = 'description: >2\n  word—\n  continuation\n';
    expect(findSpacedEmDashViolations('/tmp/skills.yaml', folded)).toHaveLength(1);
  });

  it('does not fold into a more-indented literal line', () => {
    const source = 'description: >\n  word—\n    literal line\n';

    expect(findSpacedEmDashViolations('/tmp/skills.yaml', source)).toHaveLength(0);
  });

  it('scans a reference definition title', () => {
    // The title publishes wherever the reference is used (#676).
    const source = '[ref]: /url "word — next"\n\nUse [ref].\n';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
  });

  it('scans every reference definition title delimiter', () => {
    for (const [open, close] of [
      ["'", "'"],
      ['(', ')'],
    ]) {
      const source = `[ref]: /url ${open}word — next${close}\n\nUse [ref].\n`;

      expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
    }
  });

  it('leaves a reference definition URL alone', () => {
    const source = '[ref]: <https://example.test/a — b>\n\nUse [ref].\n';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(0);
  });

  it('folds a multiline quoted YAML scalar', () => {
    // YAML renders the break as a space, so this publishes `word— continuation`
    // even though neither line holds padding next to the dash (#677).
    const double = 'title: "word—\n  continuation"\n';
    const single = "title: 'word—\n  continuation'\n";

    expect(findSpacedEmDashViolations('/tmp/skills.yaml', double)).toHaveLength(1);
    expect(findSpacedEmDashViolations('/tmp/skills.yaml', single)).toHaveLength(1);
  });

  it('keeps quote state across lines of a multiline scalar', () => {
    // Quoting used to reset each line, so this `#` read as a comment and the
    // padded dash after it was skipped.
    const source = 'title: "a # b —\n  continuation"\n';

    expect(findSpacedEmDashViolations('/tmp/skills.yaml', source)).toHaveLength(1);
  });

  it('still treats a real end-of-line comment as a comment', () => {
    const source = 'title: plain # note — here\n';

    expect(findSpacedEmDashViolations('/tmp/skills.yaml', source)).toHaveLength(0);
  });

  it('reports but does not rewrite an invalid unterminated YAML quote', () => {
    const source = 'title: "word — next\n';

    expect(findSpacedEmDashViolations('/tmp/skills.yaml', source)).toHaveLength(1);
  });

  it('does not treat a quote inside a plain scalar as a scalar opener', () => {
    // These are two mapping entries; joining them would destroy `description`.
    const source = 'title: He said "word—\ndescription: next"\n';

    expect(findSpacedEmDashViolations('/tmp/skills.yaml', source)).toHaveLength(0);
  });

  it('reads a doubled apostrophe as an escape, not a closing quote', () => {
    const source = "title: 'first\n  it''s — next'\n";

    expect(findSpacedEmDashViolations('/tmp/skills.yaml', source)).toHaveLength(1);
  });

  it('folds a multiline scalar under a sequence item', () => {
    const source = 'items:\n  - "word—\n    continuation"\n';

    expect(findSpacedEmDashViolations('/tmp/skills.yaml', source)).toHaveLength(1);
  });

  it('ignores a definition title nothing references', () => {
    // An unreferenced definition renders nothing, so its title never publishes.
    const source = '[ref]: /u "word — next"\n\nNo usage here.\n';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(0);
  });

  it('scans only the definition a reference actually resolves to', () => {
    // CommonMark resolves to the FIRST definition; the second is shadowed and
    // never publishes.
    const source = '[ref]: /a "first — one"\n[ref]: /b "second — two"\n\nUse [ref].\n';

    const violations = findSpacedEmDashViolations('/tmp/test.md', source);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ line: 1 });
  });

  it('counts an image reference as a use of its definition', () => {
    const source = '[ref]: /u "word — next"\n\n![alt][ref]\n';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
  });





  it('never deletes a line break inside raw HTML, whatever the CSS says', () => {
    // Deciding whether a break inside HTML renders as a space needs HTML tree
    // construction and the CSS cascade. The fixer does not attempt it: every
    // break inside raw HTML is a boundary. Each case below was a reported way
    // of deleting a rendered break.
    const cases = [
      '<div style="white-space: normal; /* n */ white-space: pre">word\n— next</div>',
      '<div style="white-space: pre"><table style="white-space: normal">word\n— next</table></div>',
      '<style>#x{white-space:pre !important}</style>\n<div id="x" style="white-space: normal">word\n— next</div>',
      '<svg style="white-space: normal"><foreignObject><div style="white-space: pre"/>word\n— next</foreignObject></svg>',
      '<div style="white-space: pre"><a style="white-space: normal">x<a>word\n— next</div>',
      '<div style="white-space: pre"><p style="white-space: normal"><center>word\n— next</center></div>',
      '<div style="white-space: normal"><span style="white-space&#58; pre">word\n— next</span></div>',
      '<div style="white-space: normal">word\r\n— next</div>',
    ];

    // Each reports exactly one violation — the space AFTER the dash. The break
    // before it contributes nothing, which is the whole point: no CSS context
    // is consulted, so a break inside raw HTML is never counted as padding.
    for (const source of cases) {
      expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
    }

    // Drop the same-line space and the break alone reports nothing.
    expect(
      findSpacedEmDashViolations('/tmp/test.md', '<div style="white-space: pre">word\n—next</div>'),
    ).toHaveLength(0);
  });





  it('reports a dash padded across a soft break, CRLF or LF', () => {
    // The continuation begins in a sibling `strong` node; the omitted
    // blockquote marker must be absorbed for the break to count as padding.
    expect(findSpacedEmDashViolations('/tmp/test.md', '> word—\r\n> **next**')).toHaveLength(1);
    expect(findSpacedEmDashViolations('/tmp/test.md', '> word—\n> **next**')).toHaveLength(1);
    // A list item's continuation indentation is absorbed the same way.
    expect(findSpacedEmDashViolations('/tmp/test.md', '- word—\n  <em>next</em>')).toHaveLength(1);
  });

  it('maps every code point a character reference produces', () => {
    // `&NotEqualTilde;` decodes to two code points and `&#x1F600;` occupies
    // two UTF-16 units; both used to desynchronize the source-span map.
    expect(findSpacedEmDashViolations('/tmp/test.md', 'word &NotEqualTilde; — next')).toHaveLength(1);
    expect(findSpacedEmDashViolations('/tmp/test.md', 'word &#x1F600; — next')).toHaveLength(1);
    expect(findSpacedEmDashViolations('/tmp/test.md', 'a \u{1F600} — b')).toHaveLength(1);
  });

  it('reports same-line padding inside raw HTML', () => {
    // Same-line spacing needs no layout knowledge, so it is still reported,
    // including when the dash arrives as a character reference.
    expect(findSpacedEmDashViolations('/tmp/test.md', '<div>word — next</div>')).toHaveLength(1);
    expect(findSpacedEmDashViolations('/tmp/test.md', '<div>word &mdash; next</div>')).toHaveLength(1);
    expect(
      findSpacedEmDashViolations('/tmp/test.md', '<div style="white-space: pre">word\r\n— next</div>'),
    ).toHaveLength(1);
  });

  it('does not count a break as padding when inline HTML is open', () => {
    // An end tag that closes nothing, and a misnested one that HTML would
    // reconstruct, both leave the element open, so the break is a boundary.
    expect(
      findSpacedEmDashViolations('/tmp/test.md', '<span style="white-space: pre">word</bogus>—\nnext'),
    ).toHaveLength(0);
    expect(
      findSpacedEmDashViolations('/tmp/test.md', '<b><i style="white-space: pre"></b>word—\nnext'),
    ).toHaveLength(0);
    // A void end tag opens and closes nothing, so `<em>` stays open.
    for (const voidName of ['br', 'hr', 'img', 'input']) {
      expect(
        findSpacedEmDashViolations('/tmp/test.md', `word <em>a</${voidName}>b—\nc</em>`),
      ).toHaveLength(0);
    }
  });

  it('reports a padded dash even where an automatic fix would be unsafe', () => {
    // Closing `[foo — bar]` would retarget the link to the other definition,
    // and `word **—** next` would break the `strong` node. Reporting surfaces
    // both for a human rather than rewriting them.
    const retarget = '[foo — bar]\n\n[foo — bar]: /one\n[foo—bar]: /two\n';
    expect(findSpacedEmDashViolations('/tmp/test.md', retarget)).toHaveLength(1);
    expect(findSpacedEmDashViolations('/tmp/test.md', 'word **—** next')).toHaveLength(1);
    // A GFM autolink node carries no source position; still reported.
    expect(findSpacedEmDashViolations('/tmp/test.md', 'plain — www.example.com')).toHaveLength(1);
  });

  it('reports YAML values while leaving structural whitespace out of scope', () => {
    const yaml = (source) => findSpacedEmDashViolations('/tmp/skills.yaml', source);

    // A sequence dash and a mapping colon are syntax, not padding — but the
    // value beside them is prose.
    expect(yaml('---\nquotes:\n  - — leading dash\n---\n')).toHaveLength(1);
    expect(yaml('"a:b": — leading')).toHaveLength(1);
    expect(yaml('x: [k: — leading]')).toHaveLength(1);
    expect(yaml('- "a — b: c"')).toHaveLength(1);
    // Block scalar headers may carry an anchor, a tag, or a comment.
    for (const header of ['&a |2', '!!str |2', '|2 # note']) {
      expect(yaml(`description: ${header}\n    — leading\n`)).toHaveLength(1);
    }
    // A root scalar's indicator is relative to a parent indentation of -1.
    expect(yaml('|1\n — leading\n')).toHaveLength(1);
  });

  it('does not scan a YAML mapping key', () => {
    // A key is an identifier, not prose. Rewriting one changes the document
    // shape, so the structural check rejects the whole write — and because a
    // write is all-or-nothing, one dash in a key used to leave every unrelated
    // violation in the file unfixed too.
    expect(findSpacedEmDashViolations('/tmp/skills.yaml', '"Release — Notes": ok\n')).toHaveLength(0);
    expect(findSpacedEmDashViolations('/tmp/skills.yaml', 'Release — Notes: ok\n')).toHaveLength(0);

    // The unrelated value in the same file is fixed rather than held hostage.
    const mixed = '"Release — Notes": ok\nblurb: a — b\n';
    expect(findSpacedEmDashViolations('/tmp/skills.yaml', mixed)).toHaveLength(1);
  });


  it('does not treat a colon inside a URL as a mapping separator', () => {
    // YAML requires whitespace after a separator colon. Without that rule the
    // colon in `https:` split the line and the padded dash was skipped.

    // A key followed by a URL value is still a key.
    expect(
      findSpacedEmDashViolations('/tmp/skills.yaml', '"Release — Notes": https://x.test\n'),
    ).toHaveLength(0);

    // A colon ending the line is still a separator.
  });





  it('skips an explicit YAML key without stranding the rest of the file', () => {
    // `? key` / `: value` puts the separator on the next line.
    const source = '? Release — Notes\n: ok\nblurb: a — b\n';

    expect(findSpacedEmDashViolations('/tmp/skills.yaml', source)).toHaveLength(1);
  });



  it('excludes mapping keys nested inside a flow collection', () => {
    // Only the flow key is out of scope; the value beside it is still fixed,
    // rather than the whole write being rejected and stranding it.
    const source = 'x: {Release — Notes: ok, blurb: word — next}\n';

    expect(findSpacedEmDashViolations('/tmp/skills.yaml', source)).toHaveLength(1);

    // A flow collection inside a sequence item behaves the same way.
  });


  it('treats a CRLF soft break as rendered padding', () => {
    const source = 'word—\r\ncontinuation';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
  });

  it('removes Markdown continuation prefixes with a CRLF soft break', () => {
    const source = '> word—\r\n> continuation';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
  });

  it('disambiguates a continuation prefix from the next rendered character', () => {
    const source = '> word—\r\n> \\> continuation';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
  });

  it('does not corrupt a character reference before a padded dash', () => {
    const source = 'word &amp; — next';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
  });

  it('does not corrupt a normalized numeric character reference', () => {
    const source = 'word &#0; — next';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
  });

  it('rewrites YAML safely when an alias is recursive', () => {
    const source = 'a: &a [*a]\ntitle: word — next\n';

    expect(findSpacedEmDashViolations('/tmp/skills.yaml', source)).toHaveLength(1);
  });

  it('preserves a flow-mapping value separator before a leading dash', () => {
    const source = 'x: {k: — leading}\n';

    expect(findSpacedEmDashViolations('/tmp/skills.yaml', source)).toHaveLength(1);
  });

  it('preserves block-scalar indentation when content starts with a dash', () => {
    const source = 'description: |\n  — leading\n';

    expect(findSpacedEmDashViolations('/tmp/skills.yaml', source)).toHaveLength(1);
  });

  it('removes only visible padding beyond explicit block-scalar indentation', () => {
    const source = 'description: |2\n    — leading\n';

    expect(findSpacedEmDashViolations('/tmp/skills.yaml', source)).toHaveLength(1);
  });

  it('accounts for an inline sequence mapping in explicit block-scalar indentation', () => {
    const source = '- description: |2\n    — leading\n';

    expect(findSpacedEmDashViolations('/tmp/skills.yaml', source)).toHaveLength(1);
  });

  it('accounts for nested sequence prefixes in explicit block-scalar indentation', () => {
    const source = '- - |2\n    — leading\n';

    expect(findSpacedEmDashViolations('/tmp/skills.yaml', source)).toHaveLength(1);
  });

  it('derives direct sequence scalar indentation from the final sequence parent', () => {
    const source = '- - |1\n     — leading\n';

    expect(findSpacedEmDashViolations('/tmp/skills.yaml', source)).toHaveLength(1);
  });

  it('removes visible padding from a later more-indented block-scalar line', () => {
    const source = 'description: |2\n  first\n    — leading\n';

    expect(findSpacedEmDashViolations('/tmp/skills.yaml', source)).toHaveLength(1);
  });

  it('does not let a raw-text opener inside code suppress later prose', () => {
    const source = '`sample <pre>` prose — here';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
  });

  it('preserves an unclassified raw HTML newline while applying the prose rule', () => {
    const source = '<div>word\n— next</div>';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
  });

  it('preserves raw HTML newlines when an inline style preserves whitespace', () => {
    const source = '<div style="white-space: pre">word\n— next</div>';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
  });

  it('preserves raw HTML newlines when a class may preserve inherited whitespace', () => {
    const source = '<div class="preserve-whitespace">word\n— next</div>';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
  });

  it('preserves raw HTML newlines when an ID may select whitespace-preserving CSS', () => {
    const source = '<div id="pre">word\n— next</div>';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
  });

  it('tracks whitespace handling independently for sibling raw HTML elements', () => {
    const source =
      '<div style="white-space: normal">a</div>\n' +
      '<div style="white-space: pre">word\n— next</div>';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
  });

  it('uses the last effective inline white-space declaration', () => {
    const source = '<div style="white-space: normal; white-space: pre">word\n— next</div>';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
  });

  it('honours a CSS-wide whitespace declaration that overrides an earlier value', () => {
    const source =
      '<div style="white-space: pre"><span style="white-space: normal; white-space: inherit">' +
      'word\n— next</span></div>';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
  });

  it('does not read white-space declarations from non-style attributes', () => {
    const source = '<div data-example="white-space: normal">word\n— next</div>';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
  });

  it('does not treat an attribute name ending in style as inline CSS', () => {
    const source = '<div class="pre" data-style="white-space: normal">word\n— next</div>';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
  });

  it('honours implicit HTML end tags when tracking whitespace contexts', () => {
    const source =
      '<div style="white-space: pre"><p style="white-space: normal">a<p>word\n— next</div>';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
  });

  it('keeps an outer list item open across a nested list-item scope', () => {
    const source =
      '<ul style="white-space: normal"><li style="white-space: pre">a' +
      '<ul><li>word\n— next</ul></ul>';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
  });

  it('carries a blockquote continuation prefix across inline Markdown nodes', () => {
    const source = '> word—\n> <em>continuation</em>';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
  });

  it('consumes extra continuation indentation before an inline Markdown node', () => {
    const source = '> word—\n>   <em>continuation</em>';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
  });

  it('preserves whitespace state across split inline HTML nodes', () => {
    const source = '<span style="white-space: pre">word\n— next</span>';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
  });

  it('resets an unclosed inline whitespace context at a block boundary', () => {
    const source = '<span style="white-space: pre">first\n\nword—\nnext';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(1);
  });

  it('fails closed when a Markdown construct moves to different source delimiters', () => {
    const source = 'word **—** next / x ** — ** y';

    expect(findSpacedEmDashViolations('/tmp/test.md', source)).toHaveLength(2);
  });
});
