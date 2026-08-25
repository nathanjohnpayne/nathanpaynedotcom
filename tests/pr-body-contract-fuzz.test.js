import { JSDOM } from 'jsdom';
import { micromark } from 'micromark';
import { gfmFootnote, gfmFootnoteHtml } from 'micromark-extension-gfm-footnote';
import { describe, expect, it } from 'vitest';

import { parsePrBodyContract } from '../scripts/lib/pr-body-contract.mjs';

const AUTHOR = 'Authoring-Agent: codex';
const SELF_REVIEW = '## Self-Review';
const sharedDocument = new JSDOM('').window.document;

function mulberry32(seed) {
  return () => {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(random, values) {
  return values[Math.floor(random() * values.length)];
}

function renderedContract(body) {
  sharedDocument.body.innerHTML = micromark(body, {
    extensions: [gfmFootnote()],
    htmlExtensions: [gfmFootnoteHtml()],
  });
  const plainTopLevelText = [...sharedDocument.body.children]
    .filter((element) => element.tagName === 'P')
    .flatMap((paragraph) => [...paragraph.childNodes])
    .filter((node) => node.nodeType === 3)
    .map((node) => node.textContent)
    .join('\n');

  return {
    hasAuthor: plainTopLevelText.includes(AUTHOR),
    // Only direct H2 children satisfy the top-level contract.
    hasSelfReview: [...sharedDocument.body.children].some(
      (heading) => heading.tagName === 'H2' && heading.textContent.trim() === 'Self-Review',
    ),
  };
}

function hiddenMarker(random, marker) {
  const fenceLength = 3 + Math.floor(random() * 5);
  const fenceMarker = pick(random, ['`', '~']).repeat(fenceLength);
  const rawTag = pick(random, ['script', 'pre', 'style', 'textarea']);
  const blockTag = pick(random, ['article', 'blockquote', 'details', 'div', 'table']);
  const completeTag = pick(random, [
    '<span>',
    '<span disabled class=generated>',
    '<span a b>',
    '<span data-generated="true">',
  ]);
  const construction = pick(random, [
    'comment',
    'fence',
    'fake-fence-closer',
    'fake-fence-whitespace',
    'fake-fence-comment-suffix',
    'invalid-backtick-info',
    'invalid-fence-inline-suffix',
    'invalid-fence-competing-delimiters',
    'fake-fence-container-prefix',
    'under-indented-list-fence',
    'under-indented-tab-list-fence',
    'indented',
    'inline-code',
    'inline-code-blank-boundary',
    'raw-tag',
    'raw-tag-invalid-closer',
    'raw-tag-invalid-opener',
    'processing',
    'declaration',
    'cdata',
    'block-tag',
    'complete-tag',
    'html-attribute-backtick',
    'inline-html-attribute-backtick',
    'multiline-inline-html-attribute-backtick',
    'inline-html-special-backtick',
    'autolink-backtick',
    'invalid-autolink-control',
    'active-code-html-backtick',
    'active-code-html-multiple-backticks',
    'link-target-backtick',
    'link-reference-backtick',
    'ended-container-fence',
    'indented-code-before-html',
    'ordered-list-before-html',
    'invalid-slash-attribute',
    'html-fake-blank',
    'html-comment-fake-blank',
    'list-lazy-html-boundary',
    'raw-tag-shared-closer',
    'lazy-blockquote',
    'empty-list-in-code-span',
    'lazy-blockquote-after-leaf',
    'lazy-blockquote-empty-marker',
    'lazy-blockquote-tab',
    'lazy-blockquote-reference-marker',
    'lazy-nested-blockquote-marker',
    'lazy-wide-list-blockquote',
  ]);

  switch (construction) {
    case 'comment':
      return `<!-- generated ${Math.floor(random() * 1000)}\n${marker}\n-->`;
    case 'fence':
      return `${fenceMarker}${pick(random, ['', 'markdown', ' text'])}\n${marker}\n${fenceMarker}`;
    case 'fake-fence-closer':
      return `${fenceMarker}\n    ${fenceMarker}\n${marker}`;
    case 'fake-fence-whitespace':
      return `${fenceMarker}\n${fenceMarker}${pick(random, ['\f', '\v', '\u00a0'])}\n${marker}`;
    case 'fake-fence-comment-suffix':
      return `${fenceMarker}\n${fenceMarker}<!-- generated -->\n${marker}`;
    case 'invalid-backtick-info': {
      const invalidFence = '`'.repeat(fenceLength);
      return `${invalidFence} generated\`\n${invalidFence}\n${marker}`;
    }
    case 'invalid-fence-inline-suffix': {
      const invalidFence = '`'.repeat(fenceLength);
      const inlineDelimiter = '`'.repeat(1 + Math.floor(random() * 2));
      return `${invalidFence} ${inlineDelimiter}\n${marker}\n${inlineDelimiter}`;
    }
    case 'invalid-fence-competing-delimiters': {
      const invalidFence = '`'.repeat(fenceLength);
      const shorterDelimiter = '`'.repeat(1 + Math.floor(random() * 2));
      const competingCloser = pick(random, [
        `x${invalidFence}`,
        `${pick(random, ['2.', '3)', '10.'])} ${invalidFence}`,
      ]);
      return `${invalidFence} ${shorterDelimiter}\n${shorterDelimiter}\n${marker}\n${competingCloser}`;
    }
    case 'fake-fence-container-prefix':
      return `${fenceMarker}\n${pick(random, ['- ', '> ', '1. '])}${fenceMarker}\n${marker}`;
    case 'under-indented-list-fence': {
      const listPrefix = pick(random, ['- ', '1. ']);
      const underIndent = ' '.repeat(Math.floor(random() * listPrefix.length));
      return `${listPrefix}${fenceMarker}\n${underIndent}${fenceMarker}\n${marker}`;
    }
    case 'under-indented-tab-list-fence':
      return `${pick(random, ['-\t', '1.\t'])}${fenceMarker}\n${' '.repeat(Math.floor(random() * 4))}${fenceMarker}\n${marker}`;
    case 'indented':
      return `    ${marker}`;
    case 'inline-code': {
      const delimiter = '`'.repeat(1 + Math.floor(random() * 5));
      return `${delimiter}\n${marker}\n${delimiter}`;
    }
    case 'inline-code-blank-boundary': {
      const delimiter = '`'.repeat(1 + Math.floor(random() * 5));
      return `${delimiter}\n\n${delimiter}\n${marker}\n${delimiter}`;
    }
    case 'raw-tag':
      return `<${rawTag}>\n${marker}\n</${rawTag}>`;
    case 'raw-tag-invalid-closer':
      return `<${rawTag}>\n</${rawTag}${pick(random, [' ', '\t'])}>\n${marker}\n</${rawTag}>`;
    case 'raw-tag-invalid-opener':
      return `<${rawTag}${pick(random, ['\f', '\v', '\u00a0'])}>\n\n</${rawTag}>\n${marker}`;
    case 'processing':
      return `<?generated\n${marker}\n?>`;
    case 'declaration':
      return `<!GENERATED\n${marker}\n>`;
    case 'cdata':
      return `<![CDATA[\n${marker}\n]]>`;
    case 'block-tag':
      return `<${blockTag}>\n${marker}\n</${blockTag}>`;
    case 'complete-tag':
      return `${completeTag}\n${marker}`;
    case 'html-attribute-backtick':
      return `${pick(random, ['<span', '<div'])} title="\`">\n\`\n${marker}`;
    case 'inline-html-attribute-backtick':
      return `Intro\n<span title="\`">\n\`\n${marker}\n\``;
    case 'multiline-inline-html-attribute-backtick':
      return `Intro\n<span\n title="\`">\n\`\n${marker}\n\``;
    case 'inline-html-special-backtick':
      return `Intro ${pick(random, ['<?x ` ?>', '<!X ` >', '<![CDATA[`]]>', '<!-- ` -->'])}\n\`\n${marker}\n\``;
    case 'autolink-backtick':
      return `Intro ${pick(random, [
        '<http://example.com/`>',
        '<foo`bar@example.com>',
        '<foo`bar@example>',
        '<foo`bar@localhost>',
        '<foo`bar@a>',
      ])}\n\`\n${marker}\n\``;
    case 'invalid-autolink-control':
      return `Intro <http://example.com/\`${pick(random, ['\u001f', '\u007f'])}>\n${marker}\n\``;
    case 'active-code-html-backtick':
      return `\`\n${pick(random, ['<span title="`">', '<http://example.com/`>'])}\n\`\n${marker}\n\``;
    case 'active-code-html-multiple-backticks':
      return `\`\n${pick(random, ['<span title="`x`">', '<http://example.com/`x`>'])}\n${marker}\n\``;
    case 'link-target-backtick':
      return `Intro ${pick(random, [
        '[x](http://example.com/`)',
        '[x](http://example.com "title `")',
        '![x](http://example.com/`)',
        '[x](http://example.com\n "title `")',
      ])}\n\`\n${marker}\n\``;
    case 'link-reference-backtick':
      return `${pick(random, [
        '[x]: http://example.com/`',
        '[x\\]]: http://example.com/`',
        '[x]: http://example.com "title `"',
        '[x]: http://example.com\n "title `"',
        '[x]: http://example.com\n "title\n continued `"',
        '[x]: http://example.com\n (title\n continued `)',
        '[x]: http://example.com "title\n continued `"',
        '[x]: http://example.com (title\n continued `)',
      ])}\n\`\n${marker}\n\``;
    case 'ended-container-fence':
      return `> ${fenceMarker}\n  ${fenceMarker}\n> ${fenceMarker}\n${marker}`;
    case 'indented-code-before-html':
      return `    \`x\`\n<span hidden>\n${marker}`;
    case 'ordered-list-before-html':
      return `${pick(random, ['2)', '3.', '10)'])} x\n<span>\n<span hidden>\n${marker}`;
    case 'invalid-slash-attribute':
      return `<span a=/generated>\n${fenceMarker}\n\n${marker}`;
    case 'html-fake-blank':
      return `${pick(random, [`<${blockTag}>`, completeTag])}\n${pick(random, ['\f', '\v', '\u00a0'])}\n${marker}`;
    case 'html-comment-fake-blank':
      return `${pick(random, [`<${blockTag}>`, completeTag])}\n${pick(random, ['    ', '\t'])}<!-- generated -->\n${marker}`;
    case 'list-lazy-html-boundary':
      return `- \n  generated\n<span>\n</script>\n${marker}`;
    case 'raw-tag-shared-closer':
      return `<${pick(random, ['pre', 'style', 'textarea'])}>\n</script>\n</pre>\n${marker}`;
    case 'lazy-blockquote':
      return `> generated\n${marker}`;
    case 'empty-list-in-code-span':
      return `text\n<span>\n\`\n${pick(random, ['- ', '+ ', '* ', '1. '])}\n${marker}\n\``;
    case 'lazy-blockquote-after-leaf':
      return `>     generated\n> ${pick(random, ['-', '+', '*', '1.'])}\n${marker}`;
    case 'lazy-blockquote-empty-marker':
      return `> generated\n> ${pick(random, ['+', '*', '1.', '2.'])}\n${marker}`;
    case 'lazy-blockquote-tab':
      return `${pick(random, ['>\tgenerated', '> \tgenerated', ' >\t  generated'])}\n${marker}`;
    case 'lazy-blockquote-reference-marker':
      return `> [generated]: /url\n> -\n${marker}`;
    case 'lazy-nested-blockquote-marker':
      return `> generated\n> > ${pick(random, ['-', '+', '*', '1.', '2.'])}\n${marker}`;
    case 'lazy-wide-list-blockquote':
      return `${pick(random, ['> -   >     generated', '> -\t>     generated'])}\n>     > -\n${marker}`;
    default:
      throw new Error(`Unknown generated construction: ${construction}`);
  }
}

describe('PR body contract differential fuzzing', () => {
  it('requires Self-Review headings to render at the document root', () => {
    expect(renderedContract('## Self-Review').hasSelfReview).toBe(true);
    expect(renderedContract('> ## Self-Review').hasSelfReview).toBe(false);
    expect(renderedContract('- ## Self-Review').hasSelfReview).toBe(false);
  });

  it('never accepts generated hidden markers that a maintained CommonMark renderer hides', () => {
    const random = mulberry32(0x765767);
    let hiddenAuthorCases = 0;
    let hiddenSelfReviewCases = 0;

    for (let index = 0; index < 512; index += 1) {
      const hideAuthor = random() < 0.5;
      const prefix = pick(random, ['', '# Generated heading\n', 'Intro paragraph\n']);
      const body = hideAuthor
        ? prefix + [hiddenMarker(random, AUTHOR), '', SELF_REVIEW].join('\n')
        : prefix + [AUTHOR, '', hiddenMarker(random, SELF_REVIEW)].join('\n');
      const parsed = parsePrBodyContract(body);
      const rendered = renderedContract(body);
      if (!rendered.hasAuthor) hiddenAuthorCases += 1;
      if (!rendered.hasSelfReview) hiddenSelfReviewCases += 1;

      if (parsed.author === 'codex') {
        expect(rendered.hasAuthor, `generated case ${index}:\n${body}`).toBe(true);
      }
      if (parsed.hasSelfReview) {
        expect(rendered.hasSelfReview, `generated case ${index}:\n${body}`).toBe(true);
      }
    }

    expect(hiddenAuthorCases).toBeGreaterThan(100);
    expect(hiddenSelfReviewCases).toBeGreaterThan(100);
  }, 15_000);
});
