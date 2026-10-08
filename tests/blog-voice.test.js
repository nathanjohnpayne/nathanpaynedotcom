// @vitest-environment node
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  existsSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, it, expect } from 'vitest';
import { checkVoice, parseArticle, hash, readableReport } from '../scripts/lib/blog-voice.mjs';

const file = 'src/content/blog/nested/test.md';
const excerpts = JSON.parse(readFileSync('tests/fixtures/blog-voice/batch-excerpts.json', 'utf8'));
const errors = (r) => r.findings.filter((f) => f.severity === 'error');
const rules = (r) => r.findings.map((f) => f.rule);
const check = (source, options = {}) => checkVoice({ source, file, ...options });
function cli(args, options = {}) {
  return spawnSync(process.execPath, [resolve('scripts/check-blog-voice.mjs'), ...args], {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    ...options,
  });
}

// Minimal synthetic inputs test syntax; public excerpts alone carry approval provenance.
describe('authored surfaces, Markdown/YAML semantics and source locations', () => {
  it('checks headings, body, tables, captions and visible metadata while protecting code and diagrams', async () => {
    const source = `---
title: "Pinned Title In Its Original Case"
description: "We organised the colour."
sidebar:
  - type: mermaid
    title: "A diagram"
    caption: "Our colour."
    content: |
      graph TD
        A["We organised colour"]
---

## A Heading With Incorrect Case

I chose the colour. My agent’s code changed.

| Actor | Action |
| --- | --- |
| We | organised it |

![Our colour](/image.png)

\`We organised colour\`

~~~text
We organised colour.
~~~
`;
    const report = await check(source);
    expect(report.exitCode).toBe(1);
    expect(rules(report)).toEqual(
      expect.arrayContaining([
        'voice.heading-sentence-case',
        'voice.source-apostrophe',
        'voice.narrator-plural',
        'voice.american-spelling',
      ]),
    );
    const errorLines = errors(report).map((f) => f.location.start.line);
    expect(errorLines).toContain(3);
    expect(errorLines).toContain(13);
    expect(errorLines).not.toContain(10);
    expect(errorLines).not.toContain(25);
    expect(errorLines).not.toContain(28);
    expect(report.packet.after.source).toBe(source);
    expect(report.packet.protectedMaterial.after.map((p) => p.excerpt).join('\n')).toContain(
      'graph TD',
    );
  });

  it('preserves attributed quoted we, prompts, inline code and fences', async () => {
    const source = `Claude wrote: "We organised the colour."

Claude said: ‘We can’t organise colour.’

The prompt was:

> We organised colour and don't change it.

I read \`We organised colour.\` and \`we\`.

\`\`\`\`text
\`\`\`
We organised the colour.
\`\`\`\`
`;
    const report = await check(source);
    expect(errors(report)).toEqual([]);
    expect(rules(report)).not.toContain('review.quotation-attribution');
  });

  it.each(['<code>', '<pre>', '<script>', '<style>'])(
    'does not let a literal %s inside Markdown code hide the later authored prose',
    async (tag) => {
      const report = await check(`Use \`${tag}\` here. We organised colour.\n`);
      expect(rules(report)).toEqual(
        expect.arrayContaining(['voice.narrator-plural', 'voice.american-spelling']),
      );
    },
  );

  it('surfaces ambiguous inline and blockquote attribution without silently passing it', async () => {
    const report = await check('"We chose it."\n\n> Our colour changed.\n');
    expect(report.exitCode).toBe(0);
    expect(rules(report)).toContain('review.quotation-attribution');
    expect(report.packet.warnings[0].excerpt).toContain('We chose');
  });

  it.each(['"', '“'])('preserves attributed soft-wrapped double quotations (%s)', async (open) => {
    const close = open === '“' ? '”' : open;
    const report = await check(`Claude wrote: ${open}We\norganised colour.${close}\n`);
    expect(errors(report)).toEqual([]);
    expect(rules(report)).not.toContain('review.quotation-attribution');
    const ambiguous = await check(`I called it ${open}Our\ncolour.${close}\n`);
    expect(errors(ambiguous)).toEqual([]);
    expect(rules(ambiguous)).toContain('review.quotation-attribution');
  });

  it.each(["'", '‘'])(
    'preserves soft-wrapped single quotations and internal apostrophes (%s)',
    async (open) => {
      const close = open === '‘' ? '’' : open;
      const apostrophe = open === '‘' ? '’' : "'";
      const report = await check(
        `Claude wrote: ${open}We can${apostrophe}t\norganise colour.${close}\n`,
      );
      expect(errors(report)).toEqual([]);
      expect(rules(report)).not.toContain('review.quotation-attribution');
      const ambiguous = await check(`I called it ${open}Our\ncolour.${close}\n`);
      expect(errors(ambiguous)).toEqual([]);
      expect(rules(ambiguous)).toContain('review.quotation-attribution');
    },
  );

  it.each(['“We organised colour,” Claude wrote.\n', '"We organised colour," she replied.\n'])(
    'recognizes direct trailing attribution without borrowing a later sentence (%s)',
    async (source) => {
      const report = await check(source);
      expect(errors(report)).toEqual([]);
      expect(rules(report)).not.toContain('review.quotation-attribution');
      expect(
        rules(await check('“Our colour.” The release ended. Claude wrote a report.\n')),
      ).toContain('review.quotation-attribution');
    },
  );

  it.each([
    '<div>Our colour will not ship.</div>',
    'I read <q>Our colour.</q> and chose color.',
    '<custom-note></custom-note>',
  ])('flags raw HTML for manual review without reconstructing it (%s)', async (html) => {
    const source = `I chose it.\n\n${html}\n`;
    const report = await check(source);
    const warning = report.findings.find((f) => f.rule === 'review.html');
    expect(warning).toMatchObject({
      severity: 'warning',
      file,
      reason: expect.stringContaining('by hand'),
    });
    expect(warning.location.start.line).toBe(3);
    expect(source.slice(warning.location.start.offset, warning.location.end.offset)).toBe(
      warning.excerpt,
    );
    expect(warning.excerpt).toBe(html);
    expect(report.packet.warnings).toContainEqual(warning);
    expect(readableReport(report, true)).toContain(html);
    expect(report.packet.after.source).toBe(source);
    expect(errors(report)).toEqual([]);
    expect(report.packet.protectedMaterial.after.some((p) => p.kind === 'html')).toBe(true);
  });

  it('keeps unrelated Markdown prose checked beside an inline fragment anchor', async () => {
    const source = '<span id="original-anchor"></span>\n\nWe organised colour.\n';
    const report = await check(source);
    expect(rules(report)).toEqual(
      expect.arrayContaining(['voice.narrator-plural', 'voice.american-spelling']),
    );
    expect(rules(report)).not.toContain('review.html');
    expect(report.packet.after.source).toBe(source);
  });

  it('keeps the exact site conventions transparent and their Markdown prose checked', async () => {
    const source = readFileSync('tests/fixtures/blog-voice/site-conventions.md', 'utf8');
    const article = await parseArticle(source, file);
    expect(article.opaqueHtml).toBe(false);
    expect(article.manualBody).toBe(false);
    const report = await check(source);
    expect(rules(report)).not.toContain('review.html');
    expect(errors(report)).toEqual([]);
    expect(
      rules(await check(source.replace('The **chosen** result.', 'The different result.'))),
    ).toContain('voice.pullquote-verbatim');
    expect(
      rules(await check(source.replace('The **chosen** result.', 'We chose colour.'))),
    ).toContain('voice.narrator-plural');
  });

  it.each([
    '<span id="anchor">Content</span>',
    '<span id="anchor" hidden></span>',
    '<span class="anchor" id="anchor"></span>',
    '<span id="anchor">',
    '<div class="figure-pair" hidden>\n\nI chose it.\n\n</div>',
    '<div class="figure-pair">\n\n<custom-note>Text</custom-note>\n\n</div>',
    '<div class="figure-pair">\n\nI chose it.',
    '<custom-note></custom-note>',
  ])(
    'leaves non-convention HTML manual instead of parsing tags or attributes (%s)',
    async (source) => {
      expect(rules(await check(source))).toContain('review.html');
    },
  );

  it('keeps analyzed Markdown pullquote matches active even beside opaque block HTML', async () => {
    const source =
      '---\npullquotes:\n  - text: "The chosen result."\n---\n\n<custom-note></custom-note>\n\nThe chosen result.\n';
    expect(rules(await check(source))).not.toContain('voice.pullquote-verbatim');
    const report = await check(source.replace('\nThe chosen result.', '\nThe different result.'));
    expect(report.findings.find((f) => f.rule === 'voice.pullquote-verbatim')).toMatchObject({
      severity: 'warning',
      reason: expect.stringContaining('may be inside opaque HTML'),
    });
    expect(report.exitCode).toBe(0);
  });

  it('checks the live corpus without disabling body surfaces or downgrading pullquotes', async () => {
    const posts = readdirSync('src/content/blog', { recursive: true }).filter((name) =>
      name.endsWith('.md'),
    );
    expect(posts.length).toBeGreaterThan(0);
    for (const path of posts) {
      const article = await parseArticle(
        readFileSync(join('src/content/blog', path), 'utf8'),
        path,
      );
      expect(
        article.surfaces.filter((surface) => !surface.field && surface.text.trim()).length,
        path,
      ).toBeGreaterThan(0);
      expect(article.opaqueHtml, path).toBe(false);
      expect(article.manualBody, path).toBe(false);
      expect(
        article.findings.filter((f) => f.rule === 'review.html'),
        path,
      ).toEqual([]);
    }
  });

  it('rejects the invented-burden mutation in the real Autofix post', async () => {
    const fixture = JSON.parse(
      readFileSync('tests/fixtures/blog-voice/autofix-pullquote-mutation.json', 'utf8'),
    );
    const original = readFileSync(fixture.path, 'utf8');
    const mutation = original.replace(fixture.before, fixture.after);
    expect(mutation).not.toBe(original);
    expect(mutation.replace(fixture.after, fixture.before)).toBe(original);
    const report = await check(mutation);
    expect(report.exitCode).toBe(1);
    expect(report.findings).toContainEqual(
      expect.objectContaining({
        rule: 'voice.pullquote-verbatim',
        severity: 'error',
        surface: 'pullquotes.0.text',
      }),
    );
    expect(report.packet.after.source).toBe(mutation);
  });

  it('does not duplicate an unchanged HTML surface between complete before/after articles', async () => {
    const beforeSource = '<custom-note></custom-note>\n\nI chose it.\n';
    const report = await check(beforeSource.replace('chose', 'kept'), { beforeSource });
    expect(report.findings.filter((f) => f.rule === 'review.html')).toHaveLength(1);
    expect(report.packet.before.source).toBe(beforeSource);
  });

  it.each([
    ['I <span>will not</span> ship.\n', 'I will not ship.\n'],
    ['I will not ship.\n', 'I <span>will not</span> ship.\n'],
  ])(
    'skips partial semantic-token comparisons when HTML changes eligibility',
    async (beforeSource, source) => {
      const report = await check(source, { beforeSource });
      expect(rules(report)).not.toContain('review.negation-modal-change');
      expect(
        report.findings.filter((f) => f.rule === 'review.semantic-inventory-incomplete'),
      ).toHaveLength(1);
      expect(report.exitCode).toBe(0);
    },
  );

  it('compares focused quotation text without treating neighboring prose as a protected-source edit', async () => {
    const beforeSource = 'Claude wrote: "I can ship." I agreed.\n';
    const report = await check(beforeSource.replace('I agreed', 'I disagreed'), { beforeSource });
    expect(rules(report)).not.toContain('review.protected-material-change');
    expect(rules(report)).toContain('review.changed-passages');
    expect(
      report.packet.protectedMaterial.after.find((p) => p.kind === 'quotation').excerpt,
    ).toContain('I disagreed');
  });

  it('checks resumeTitle as visible prose while preserving its pinned capitalization', async () => {
    const report = await check(
      '---\nresumeTitle: "Our Colour From The Site"\n---\n\nI chose it.\n',
    );
    expect(report.findings).toContainEqual(
      expect.objectContaining({ rule: 'voice.narrator-plural', surface: 'resumeTitle' }),
    );
    expect(report.findings.filter((f) => f.rule === 'voice.heading-sentence-case')).toEqual([]);
  });

  it('does not flag a post without raw HTML', async () => {
    const report = await check('## A small change\n\nI chose **color** and `code`.\n');
    expect(rules(report)).not.toContain('review.html');
    expect(errors(report)).toEqual([]);
  });

  it('leaves HTML pullquote fidelity and semantic changes to the complete manual packet', async () => {
    const beforeSource =
      '---\npullquotes:\n  - text: "The chosen result."\n---\n\n<div>The chosen result. I will not ship.</div>\n';
    const source = beforeSource
      .replace('not ', '')
      .replace('chosen result. I', 'different result. I');
    const report = await check(source, { beforeSource });
    expect(errors(report)).toEqual([]);
    expect(rules(report)).toContain('review.html');
    expect(rules(report)).not.toContain('review.negation-modal-change');
    expect(report.packet.before.source).toBe(beforeSource);
    expect(report.packet.after.source).toBe(source);
    expect(report.packet.manualMeaningReviewRequired).toBe(true);
  });

  it('does not infer attribution from a cue verb inside a Markdown blockquote', async () => {
    const report = await check('> We asked the agent to organise our colour.\n');
    expect(rules(report)).toContain('review.quotation-attribution');
    expect(errors(report)).toEqual([]);
  });

  it('leaves HTML scope across Markdown siblings manual without reconstructing a quotation', async () => {
    const source = '<blockquote cite="/source">\n\nWe organised colour.\n\n</blockquote>\n';
    const report = await check(source);
    expect(rules(report)).toContain('review.html');
    expect(errors(report)).toEqual([]);
    expect(report.packet.after.source).toBe(source);
    expect(report.packet.protectedMaterial.after.some((p) => p.kind === 'quotation')).toBe(false);
  });

  it('keeps before-only HTML warnings in the revision packet', async () => {
    const beforeSource = '<div>Our colour.</div>\n';
    const report = await check('I chose color.\n', { beforeSource });
    const warning = report.packet.warnings.find((f) => f.rule === 'review.html');
    expect(warning.sourceVersion).toBe('before');
    expect(warning.excerpt).toBe(beforeSource.trimEnd());
    expect(readableReport(report, true)).toContain('Before article: Raw HTML present');
    expect(report.packet.before.source).toBe(beforeSource);
  });

  it('prompts for rendered verification of inline HTML once per complete source surface', async () => {
    const source = 'I read <span hidden>Our colour.</span> and <custom-note>words</custom-note>.\n';
    const report = await check(source);
    const warnings = report.findings.filter((f) => f.rule === 'review.html');
    expect(warnings).toHaveLength(1);
    expect(warnings[0].excerpt).toBe(source.trimEnd());
    expect(warnings[0].location.start.line).toBe(1);
    expect(errors(report)).toEqual([]);
    expect(report.packet.warnings).toContainEqual(warnings[0]);
    expect(readableReport(report, true)).toContain('Raw HTML present');
    expect(rules(await check('I typed `<span hidden>literal</span>`.\n'))).not.toContain(
      'review.html',
    );
    expect(rules(await check('I typed \\<span>literal\\</span>.\n'))).not.toContain('review.html');
  });

  it.each(['<br>', '<br/>', '<br />'])(
    'preserves inline HTML break whitespace (%s)',
    async (tag) => {
      const report = await check(`We${tag}organised it.\n`);
      expect(rules(report)).toEqual(
        expect.arrayContaining(['voice.narrator-plural', 'voice.american-spelling']),
      );
      expect(
        errors(
          await check(
            `---\npullquotes:\n  - text: "The chosen result."\n---\n\nThe chosen${tag}result.\n`,
          ),
        ),
      ).toEqual([]);
      expect(
        rules(await check(`I can${tag}publish.\n`, { beforeSource: 'I publish.\n' })),
      ).toContain('review.negation-modal-change');
    },
  );

  it('retains attributed prose quotations and warns when their source changes', async () => {
    const beforeSource = 'Claude wrote: "We will not ship."\n';
    const source = 'Claude wrote: "We will ship."\n';
    const report = await check(source, { beforeSource });
    for (const [side, text] of [
      ['before', '"We will not ship."'],
      ['after', '"We will ship."'],
    ]) {
      const quote = report.packet.protectedMaterial[side].find((p) => p.kind === 'quotation');
      expect(quote.text).toBe(text);
      expect(quote.attributed).toBe(true);
      expect(quote.location.start.line).toBe(1);
      expect(quote.excerpt).toContain(text);
    }
    expect(errors(report)).toEqual([]);
    expect(rules(report)).toContain('review.protected-material-change');
    expect(rules(report)).toContain('review.negation-modal-change');
  });

  it('warns about positive capability-modal changes without claiming semantic proof', async () => {
    const report = await check('The agent publishes.\n', {
      beforeSource: 'The agent can publish.\n',
    });
    expect(report.exitCode).toBe(0);
    expect(rules(report)).toContain('review.negation-modal-change');
    expect(report.packet.manualMeaningReviewRequired).toBe(true);
  });

  it.each([
    '<img src="/image.png">',
    '<hr>',
    '<script>const x = 1;</script>',
    '<custom-note></custom-note>',
  ])('prompts for rendered verification of textless HTML blocks (%s)', async (source) => {
    const report = await check(source + '\n');
    const warnings = report.findings.filter((f) => f.rule === 'review.html');
    expect(warnings).toHaveLength(1);
    expect(warnings[0].excerpt).toBe(source);
    expect(warnings[0].location.start.line).toBe(1);
    expect(errors(report)).toEqual([]);
  });

  it('recognizes the immediately following attribution paragraph after a Markdown blockquote', async () => {
    const report = await check('> Our colour.\n\nClaude wrote.\n');
    expect(errors(report)).toEqual([]);
    expect(rules(report)).not.toContain('review.quotation-attribution');
    for (const following of [
      'The release ended.\n\nClaude wrote a report.',
      '```text\nClaude wrote.\n```',
    ]) {
      expect(rules(await check(`> Our colour.\n\n${following}\n`))).toContain(
        'review.quotation-attribution',
      );
    }
  });

  it('preserves metadata paragraph boundaries and literal formatting as the layout renders them', async () => {
    const source = '---\ndescription: |\n  We\n\n  organised colour.\n---\n\nI chose it.\n';
    const report = await check(source);
    for (const rule of ['voice.narrator-plural', 'voice.american-spelling']) {
      const item = report.findings.find((f) => f.rule === rule);
      expect(item.surface).toBe('description');
      expect(item.location.start.line).toBe(2);
    }
    const inline = await parseArticle(
      '---\ndescription: "Co**lor** is my choice."\n---\n\nI chose it.\n',
      file,
    );
    expect(inline.surfaces.find((s) => s.field === 'description').text).toBe(
      'Co**lor** is my choice.',
    );
    const beforeSource = '---\ndescription: |\n  I will\n\n  not ship.\n---\n\nI chose it.\n';
    expect(
      rules(await check(beforeSource.replace('I will\n\n  not', 'I will not'), { beforeSource })),
    ).not.toContain('review.negation-modal-change');
  });

  it('checks HTML-like metadata as escaped visible text rather than interpreting source tags', async () => {
    const beforeSource =
      '---\ndescription: |\n  <div><h2>I chose color.</h2><q cite="/source">Our colour will not ship.</q><code>We organised colour.</code></div>\n---\n\nI chose it.\n';
    const report = await check(beforeSource.replace('will not ship', 'will ship'), {
      beforeSource,
    });
    expect(rules(report)).toEqual(
      expect.arrayContaining(['voice.narrator-plural', 'voice.american-spelling']),
    );
    expect(rules(report)).not.toContain('review.html');
    expect(rules(report)).toContain('review.negation-modal-change');
    expect(report.packet.after.source).toContain('<q cite="/source">Our colour will ship.</q>');
    const authored = await check(
      beforeSource.replace('<h2>I chose color.</h2>', '<h2>We</h2><p>organised colour.</p>'),
    );
    expect(rules(authored)).toEqual(
      expect.arrayContaining(['voice.narrator-plural', 'voice.american-spelling']),
    );
  });

  it('retains the original YAML scalar range for plain-text quotation provenance', async () => {
    const source = '---\ndescription: \'I read "Our colour."\'\n---\n\nI chose it.\n';
    const report = await check(source);
    expect(errors(report)).toEqual([]);
    const warning = report.findings.find((f) => f.rule === 'review.quotation-attribution');
    expect(warning.location.start.line).toBe(2);
    expect(warning.excerpt).toBe('\'I read "Our colour."\'');
    expect(report.packet.after.source).toBe(source);
    expect(rules(await check(source.replace('I read', 'Claude wrote:')))).not.toContain(
      'review.quotation-attribution',
    );
  });

  it.each(['`Our colour`', '![Our colour](/image.png)', '**Our colour**'])(
    'checks literal metadata syntax instead of masking it as Markdown (%s)',
    async (value) => {
      const source = `---\ndescription: "${value}"\nkeyTakeaways:\n  - "${value}"\nsidebar:\n  - type: text\n    content: "${value}"\n---\n\nI chose it.\n`;
      const report = await check(source);
      for (const surface of ['description', 'keyTakeaways.0', 'sidebar.0.content']) {
        expect(
          report.findings.some((f) => f.rule === 'voice.narrator-plural' && f.surface === surface),
        ).toBe(true);
        expect(
          report.findings.some(
            (f) => f.rule === 'voice.american-spelling' && f.surface === surface,
          ),
        ).toBe(true);
      }
    },
  );

  it.each([
    '`Claude wrote:`\n\n"Our colour."\n',
    '```text\nClaude wrote:\n```\n\n> Our colour.\n',
    '> Our colour.\n\n`Claude wrote:`\n',
  ])('does not borrow quotation attribution from protected code (%s)', async (source) => {
    expect(rules(await check(source))).toContain('review.quotation-attribution');
  });

  it('keeps inch marks out of straight-quotation masking without rejecting quoted numbers', async () => {
    expect(rules(await check('A 6" colour panel and a 4" display.\n'))).toContain(
      'voice.american-spelling',
    );
    expect(rules(await check('Claude wrote: "We chose 6".\n'))).not.toContain(
      'voice.narrator-plural',
    );
  });

  it('flags raw HTML in Markdown quotations without claiming pullquote equivalence', async () => {
    const source =
      '---\npullquotes:\n  - text: "The chosen result."\n---\n\nClaude wrote:\n\n> <div>The chosen result.</div>\n';
    const report = await check(source);
    expect(errors(report)).toEqual([]);
    expect(rules(report)).toContain('review.html');
    expect(
      rules(
        await check(
          source.replace(
            '<div>The chosen result.</div>',
            '<div>The chosen</div><div>result.</div>',
          ),
        ),
      ),
    ).toContain('review.html');
    expect(rules(await check('> `<custom-note>literal</custom-note>`\n'))).not.toContain(
      'review.html',
    );
    expect(rules(await check('> <custom-note>source text</custom-note>\n'))).toContain(
      'review.html',
    );
  });

  it('matches pullquotes as YAML-decoded plain text while normalizing body Markdown formatting', async () => {
    const source =
      '---\npullquotes:\n  - text: "**The chosen result.**"\n---\n\n**The chosen result.**\n';
    expect(rules(await check(source))).toContain('voice.pullquote-verbatim');
    expect(
      rules(
        await check(source.replace('\n**The chosen result.**', '\n\\*\\*The chosen result.\\*\\*')),
      ),
    ).not.toContain('voice.pullquote-verbatim');
  });

  it('leaves an HTML-containing prose surface for manual review', async () => {
    const report = await check('<code>literal</code> We organised colour.\n');
    expect(rules(report)).toEqual(expect.arrayContaining(['review.html']));
    expect(errors(report)).toEqual([]);
  });

  it('does not silently exempt un-attributed spelling violations inside quotation marks', async () => {
    const report = await check('I called it "colour".\n');
    expect(report.exitCode).toBe(0);
    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rule: 'review.quotation-attribution',
          severity: 'warning',
          reason: expect.stringContaining('voice.american-spelling'),
        }),
      ]),
    );
  });

  it('accepts proper nouns, acronyms, I, code and explicit fragment anchors', async () => {
    const source =
      '## What I changed in August\n\n## Appendix: The evidence\n\n## A condition: the result\n\n## JSON for Astro and `GitHub` <span id="original-anchor"></span>\n\n## Ada Lovelace and AI\n';
    const report = await check(source, { properNouns: ['Ada Lovelace'] });
    expect(errors(report)).toEqual([]);
    expect(report.packet.after.source).toContain('id="original-anchor"');
  });

  it('checks an untouched heading in an otherwise tiny revision, without recasing pinned titles', async () => {
    const beforeSource =
      '---\ntitle: "Pinned Original Article Title"\nseoTitle: "Pinned SEO Title"\n---\n\n## The Wrong Heading Case\n\nI chose a smaller change.\n';
    const report = await check(beforeSource.replace('smaller', 'better'), { beforeSource });
    expect(errors(report).map((f) => f.rule)).toEqual(['voice.heading-sentence-case']);
  });

  it('requires consistent heading forms and quotation treatment, retaining source quotes', async () => {
    expect(rules(await check('## A heading\n\nAnother heading\n---\n'))).toContain(
      'voice.heading-convention',
    );
    const mixed = await check('I called it "small". I called it “quick”.\n');
    expect(mixed.findings.find((f) => f.rule === 'voice.quotation-treatment').severity).toBe(
      'warning',
    );
    expect(mixed.exitCode).toBe(0);
    expect(errors(await check('Claude wrote: “We chose colour.” I called it "small".\n'))).toEqual(
      [],
    );
  });

  it('decodes escaped/multiline YAML, entities, emphasis and links for exact pullquotes', async () => {
    const source = `---
pullquotes:
  - text: "A \\"blue\\" result & a path."
  - text: >-
      A small change
      made publishing practical.
---

A **"blue"** result &amp; a [path](/path).

A small change made publishing practical.
`;
    expect(errors(await check(source))).toEqual([]);
    expect(rules(await check(source.replace('practical.', 'possible.')))).toContain(
      'voice.pullquote-verbatim',
    );
    const punctuated = source.replace('a [path](/path).', 'a [path](/path)!');
    expect(rules(await check(punctuated))).toContain('voice.pullquote-verbatim');
  });

  it('does not count text present only in code, diagram content or captions as a body pullquote', async () => {
    const source =
      '---\npullquotes:\n  - text: "The chosen result."\n---\n\n```text\nThe chosen result.\n```\n\n![The chosen result.](/image)\n';
    expect(rules(await check(source))).toContain('voice.pullquote-verbatim');
  });

  it.each([
    '`The chosen result.`',
    '`The chosen result`.',
    '> `The chosen result.`',
    '| Value |\n| --- |\n| `The chosen result.` |',
    'The `hidden` chosen result.',
    '> The chosen\n>\n> result.',
  ])('does not match code-only occurrences or bridge protected gaps (%s)', async (body) => {
    const source = '---\npullquotes:\n  - text: "The chosen result."\n---\n\n' + body + '\n';
    expect(rules(await check(source))).toContain('voice.pullquote-verbatim');
  });

  it('still matches formatted prose beside unrelated code and inside an attributed prompt', async () => {
    for (const body of [
      '**The chosen result.** `unrelated`',
      'The `chosen` result.',
      'Claude wrote:\n\n> The **chosen** result. `unrelated`',
    ]) {
      const source = '---\npullquotes:\n  - text: "The chosen result."\n---\n\n' + body + '\n';
      expect(rules(await check(source))).not.toContain('voice.pullquote-verbatim');
    }
  });

  it('uses AST-classified HTML rather than escaped text, code or link destinations', async () => {
    for (const prefix of ['\\<code>', '`<code>😀`', '[a](<code>)']) {
      const source =
        '---\npullquotes:\n  - text: "The chosen result."\n---\n\n' +
        prefix +
        ' **The chosen result.** We organised colour.\n';
      const report = await check(source);
      expect(rules(report)).not.toContain('voice.pullquote-verbatim');
      expect(rules(report)).toContain('voice.narrator-plural');
    }
  });

  it('preserves source offsets after astral characters in frontmatter and inline code', async () => {
    const source = '---\ntitle: "A 😀 title"\n---\n\n`😀` <code>literal</code> We chose colour.\n';
    const report = await check(source);
    const item = report.findings.find((f) => f.rule === 'review.html');
    expect(source.slice(item.location.start.offset, item.location.end.offset)).toBe(item.excerpt);
    expect(item.location.start.line).toBe(5);
    expect(item.excerpt).toContain('We chose colour');
  });

  it('maps nested paths, escaped scalars, multiline YAML and CRLF back to complete original source ranges', async () => {
    const source =
      '---\r\ndescription: >-\r\n  We organised colour.\r\n---\r\n\r\nAn emoji 😀 precedes our colour.\r\n';
    const report = await check(source);
    const scalar = errors(report).find((f) => f.surface === 'description');
    expect(scalar.location.start).toMatchObject({ line: 2, column: 14 });
    expect(source.slice(scalar.location.start.offset, scalar.location.end.offset)).toBe(
      scalar.excerpt,
    );
    expect(scalar.excerpt).toContain('We organised colour.');
    const body = errors(report).find((f) => f.location.start.line === 6);
    expect(body.file).toBe(file);
    expect(body.location.start.column).toBe(1);
    expect(source.slice(body.location.start.offset, body.location.end.offset)).toBe(body.excerpt);
  });

  it('flags HTML headings and checks authored Mermaid captions using the existing metadata parser', async () => {
    const source =
      '<h2>A Heading With Wrong Case</h2>\n\n```mermaid title="A diagram" description="A connection" caption="Our colour"\ngraph TD\n  A["We organised colour"] --> B["Result"]\n```\n';
    const report = await check(source);
    expect(rules(report)).toEqual(
      expect.arrayContaining(['review.html', 'voice.narrator-plural', 'voice.american-spelling']),
    );
    expect(
      report.packet.visibleMetadata.find((m) => m.field === 'body.diagram.0.caption').after.text,
    ).toBe('Our colour');
    expect(errors(report).every((f) => !f.excerpt.startsWith('  A['))).toBe(true);
    await expect(check('```mermaid caption="x"\ngraph TD\n```\n')).rejects.toMatchObject({
      exitCode: 2,
    });
  });

  it('retains complete aliases and raw HTML for manual review', async () => {
    const source =
      '---\ndescription: &deck "I chose it."\nkeyTakeaways: [*deck]\n---\n\n<div>Our colour <code>we</code></div>\n';
    const report = await check(source);
    expect(rules(report)).toEqual(expect.arrayContaining(['review.yaml-alias', 'review.html']));
    expect(report.packet.after.source).toBe(source);
  });

  it.each(['---\ntitle: x\n', '---\ntitle: x\ntitle: y\n---\n', '---\nx: [unterminated\n---\n'])(
    'rejects invalid frontmatter instead of reporting a clean partial run',
    async (source) => {
      await expect(parseArticle(source, file)).rejects.toMatchObject({ exitCode: 2 });
    },
  );
});

describe('source-pinned examples, advisory warnings and complete meaning review', () => {
  it.each(excerpts.cases)(
    'retains immutable provenance and an integrity hash for the approved $name excerpt',
    ({ commit, path, approved, approvedSha256, mutationProvenance }) => {
      // Verified against this immutable source during fixture authoring. CI is shallow;
      // fixtures carry provenance and exact excerpt bytes without fetching history.
      expect(commit).toBe('68827d183093fdc9500c0263b1078751067ae2fd');
      expect(path).toMatch(/^src\/content\/blog\/[^/]+\.md$/u);
      expect(hash(approved)).toBe(approvedSha256);
      expect(mutationProvenance).toContain('not an approved article');
    },
  );

  it.each(excerpts.cases)(
    'makes the $name failure reviewable without claiming to prove its meaning',
    async ({ approved, historicalMutation, name }) => {
      const beforeSource =
        name === 'causation'
          ? `---\ndescription: "${approved}"\n---\n\n${approved}\n`
          : `${approved}\n`;
      const source = beforeSource.replaceAll(approved, historicalMutation);
      const report = await check(source, { beforeSource });
      expect(report.exitCode).toBe(0); // A changed meaning can still pass mechanics.
      expect(rules(report)).toContain('review.changed-passages');
      expect(report.packet.before.source).toBe(beforeSource);
      expect(report.packet.after.source).toBe(source);
      expect(report.packet.changedPassages).toContain(historicalMutation);
      expect(report.packet.manualMeaningReviewRequired).toBe(true);
      expect(report.packet.checklist.join('\n')).toMatch(
        /accountability.*rulebook.*planned.*chronology/isu,
      );
      if (name === 'causation') expect(rules(report)).toContain('review.metadata-change');
    },
  );

  it('preserves supplied warning dispositions without claiming approval or hiding findings', async () => {
    const warningDispositions = [
      {
        rule: 'review.defensive-hedging',
        decision: 'keep',
        reason: 'Preserves the factual uncertainty.',
      },
    ];
    const report = await check('Perhaps the result was enough.\n', {
      reviewContext: { warningDispositions },
    });
    expect(report.packet.warningDisposition).toEqual(warningDispositions);
    expect(readableReport(report, true)).toContain(JSON.stringify(warningDispositions, null, 2));
    expect(rules(report)).toContain('review.defensive-hedging');
    expect(report.packet.manualMeaningReviewRequired).toBe(true);
  });

  it('warns on negation/modal changes, while actor swaps can pass the token warning', async () => {
    expect(
      rules(await check('I will add it.\n', { beforeSource: 'I might not add it.\n' })),
    ).toContain('review.negation-modal-change');
    const report = await check('Claude told Codex it should wait.\n', {
      beforeSource: 'Codex told Claude it should wait.\n',
    });
    expect(rules(report)).not.toContain('review.negation-modal-change');
    expect(rules(report)).toContain('review.changed-passages');
  });

  it('warns on negation changes inside attributed inline quotations and blockquoted prompts', async () => {
    for (const beforeSource of [
      'Claude said: "We should not ship."\n',
      'The prompt was:\n\n> We should not ship.\n',
    ]) {
      const report = await check(beforeSource.replace('not ', ''), { beforeSource });
      expect(rules(report)).toContain('review.negation-modal-change');
      expect(report.packet.before.source).toBe(beforeSource);
      expect(errors(report)).toEqual([]);
    }
  });

  it.each(['can’t', 'don’t', 'shouldn’t'])(
    'counts typographic source negations without treating apostrophe typography as a token change (%s)',
    async (contraction) => {
      const beforeSource = `Claude said: “We ${contraction} ship.”\n`;
      const positive = { 'can’t': 'can', 'don’t': 'do', 'shouldn’t': 'should' }[contraction];
      const afterSource = beforeSource.replace(contraction, positive);
      expect(rules(await check(afterSource, { beforeSource }))).toContain(
        'review.negation-modal-change',
      );
      expect(rules(await check(beforeSource.replaceAll('’', "'"), { beforeSource }))).not.toContain(
        'review.negation-modal-change',
      );
    },
  );

  it.each(['> `will not ship`\n', '> ```text\n> will not ship\n> ```\n'])(
    'excludes code in Markdown blockquotes from semantic token warnings (%s)',
    async (beforeSource) => {
      expect(rules(await check(beforeSource.replace('not ', ''), { beforeSource }))).not.toContain(
        'review.negation-modal-change',
      );
    },
  );

  it('counts nested Markdown quotation prose once while retaining code evidence', async () => {
    const beforeSource = '> We will not ship.\n';
    const nested = '> > We will not ship.\n';
    expect(rules(await check(nested, { beforeSource }))).not.toContain(
      'review.negation-modal-change',
    );
    const code = await check('> `will ship`\n', { beforeSource: '> `will not ship`\n' });
    expect(
      code.packet.protectedMaterial.before.some((p) => p.excerpt.includes('`will not ship`')),
    ).toBe(true);
    expect(code.manualMeaningReviewRequired).toBe(true);
  });

  it('allows the authentic trust-burden contrast and excludes pullquote duplication from padding warnings', async () => {
    const quote = excerpts.authenticContrast.approved;
    const report = await check(`---\npullquotes:\n  - text: "${quote}"\n---\n\n${quote}\n`);
    expect(report.exitCode).toBe(0);
    expect(rules(report)).toContain('review.formulaic-contrast');
    expect(rules(report)).not.toContain('review.repeated-explanation');
  });

  it('surfaces repeated openings, explanations and durations alongside judgment prompts', async () => {
    const report = await check(
      'I wanted the smaller change for this project. It took 12 hours. This highlights the landscape.\n\nI wanted the smaller change for this project. It took 12 hours. To be fair, perhaps the key takeaway matters.\n',
    );
    expect(report.exitCode).toBe(0);
    expect(rules(report)).toEqual(
      expect.arrayContaining([
        'review.repeated-opening',
        'review.repeated-explanation',
        'review.repeated-duration',
        'review.vague-signpost',
        'review.abstract-narration',
        'review.defensive-hedging',
      ]),
    );
  });

  it('runs existing phrase advisories on prose metadata with original YAML ranges', async () => {
    const source = `---
description: "Perhaps it is worth noting the result."
keyTakeaways:
  - At the end of the day, I chose the smaller change.
sidebar:
  - type: text
    content: |
      This highlights the decision.
    caption: "To be fair, the result was uncertain."
seoDescription: "Arguably this demonstrates the result."
ogDescription: "In this post I compare the changes."
---

I chose the smaller change.
`;
    const report = await check(source);
    for (const [surface, rule, line] of [
      ['description', 'review.defensive-hedging', 2],
      ['description', 'review.vague-signpost', 2],
      ['keyTakeaways.0', 'review.vague-signpost', 4],
      ['sidebar.0.content', 'review.abstract-narration', 7],
      ['sidebar.0.caption', 'review.defensive-hedging', 9],
      ['seoDescription', 'review.defensive-hedging', 10],
      ['seoDescription', 'review.abstract-narration', 10],
      ['ogDescription', 'review.vague-signpost', 11],
    ]) {
      const warning = report.findings.find((f) => f.surface === surface && f.rule === rule);
      expect(warning).toMatchObject({ severity: 'warning' });
      expect(warning.location.start.line).toBe(line);
      expect(source.slice(warning.location.start.offset, warning.location.end.offset)).toBe(
        warning.excerpt,
      );
      expect(report.packet.warnings).toContainEqual(warning);
    }
    expect(report.exitCode).toBe(0);
    expect(report.packet.after.source).toBe(source);
    expect(report.packet.manualMeaningReviewRequired).toBe(true);
  });

  it('checks repetition in prose metadata while excluding intentional pullquote duplication', async () => {
    const sentence = 'I wanted the smaller change for this project.';
    const source = `---\ndescription: "${sentence} It took 12 hours."\nkeyTakeaways:\n  - "${sentence} It took 12 hours."\npullquotes:\n  - text: "${sentence}"\n---\n\n${sentence} It took 12 hours.\n`;
    const report = await check(source);
    for (const rule of [
      'review.repeated-opening',
      'review.repeated-explanation',
      'review.repeated-duration',
    ]) {
      expect(report.findings).toContainEqual(
        expect.objectContaining({ rule, surface: 'description', severity: 'warning' }),
      );
      expect(report.findings).toContainEqual(
        expect.objectContaining({ rule, surface: 'keyTakeaways.0', severity: 'warning' }),
      );
      expect(report.findings).not.toContainEqual(
        expect.objectContaining({ rule, surface: 'pullquotes.0.text' }),
      );
    }
    expect(report.exitCode).toBe(0);
  });

  it('preserves attributed quotations in prose metadata when checking advisories', async () => {
    const source = `---
description: 'Claude wrote: "Perhaps this highlights the journey."'
sidebar:
  - type: text
    content: 'Claude wrote: "At the end of the day, perhaps it changed."'
---

I chose the smaller change.
`;
    const report = await check(source);
    expect(report.findings.filter((f) => f.rule.startsWith('review.'))).toEqual([]);
    expect(report.exitCode).toBe(0);
    expect(report.packet.after.source).toBe(source);
  });

  it('checks title prose without treating intentional title variants as repetition', async () => {
    const source = `---
title: "Perhaps the journey took 12 hours."
seoTitle: "Perhaps the journey took 12 hours."
shortTitle: "Perhaps the journey took 12 hours."
resumeTitle: "Perhaps the journey took 12 hours."
---

I chose the smaller change.
`;
    const report = await check(source);
    for (const surface of ['title', 'seoTitle', 'shortTitle', 'resumeTitle'])
      for (const rule of ['review.defensive-hedging', 'review.abstract-narration'])
        expect(report.findings).toContainEqual(
          expect.objectContaining({ surface, rule, severity: 'warning' }),
        );
    expect(report.findings.filter((f) => f.rule.startsWith('review.repeated-'))).toEqual([]);
    expect(report.exitCode).toBe(0);
    expect(report.packet.after.source).toBe(source);
  });

  it('excludes metadata labels and configuration while allowing authentic pullquote contrasts', async () => {
    const quote = excerpts.authenticContrast.approved;
    const source = `---
author: "Perhaps the journey"
tags: ["Perhaps the journey"]
category: "Perhaps the journey"
image: "Perhaps the journey"
pullquotes:
  - text: "${quote}"
    label: "Perhaps the journey"
sidebar:
  - type: mermaid
    title: "Perhaps the journey"
    description: "Perhaps the journey"
    content: "graph TD; A[Perhaps the journey]"
  - type: image
    content: "Perhaps the journey"
---

${quote}
`;
    const report = await check(source);
    const warnings = report.findings.filter((f) => f.rule.startsWith('review.'));
    expect(warnings).toHaveLength(2);
    expect(warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: 'review.formulaic-contrast', surface: 'paragraph' }),
        expect.objectContaining({
          rule: 'review.formulaic-contrast',
          surface: 'pullquotes.0.text',
        }),
      ]),
    );
    expect(report.exitCode).toBe(0);
  });

  it('keeps complete protected evidence, metadata, changed passages and approval context together in JSON and readable packets', async () => {
    const beforeSource =
      '---\ndescription: "I chose a change."\nsidebar:\n  - type: mermaid\n    content: |\n      graph TD\n        A["Old"]\n---\n\nI chose a change.\n\n| State |\n| --- |\n| Old |\n\n```js\nconst x = 1;\n```\n\n> The prompt.\n';
    const source = beforeSource.replaceAll('Old', 'New');
    const reviewContext = {
      writingStylePass: { workflow: 'supplied-reference fallback', retrievalUsed: false },
      structuralChoices: ['Moved a section; preserved chronology.'],
      qualifications: ['Two events do not isolate causation.'],
      validation: ['Manual source read; no semantic proof.'],
      occurrenceExceptions: [{ class: 'tables', reason: 'Owner-authorized factual correction.' }],
      referenceProvenance: [{ kind: 'owner-approved-model-revision', commit: 'pinned' }],
      linkedRecords: ['ledger.md'],
    };
    const report = await check(source, {
      beforeSource,
      baseline: { kind: 'file', path: 'before.md', commit: null },
      reviewContext,
    });
    expect(report.packet.approvalSummary).toEqual(reviewContext);
    expect(report.packet.protectedMaterial.before.map((p) => p.excerpt).join('\n')).toContain(
      'const x = 1;',
    );
    expect(rules(report)).toContain('review.protected-material-change');
    const packet = readableReport(report, true);
    expect(packet).toContain(beforeSource);
    expect(packet).toContain(source);
    expect(packet).toContain('Owner-authorized factual correction.');
    expect(packet).toContain('Write Like Me');
    expect(packet).toContain('supplied-reference fallback');
    expect(packet).toContain('Complete manual meaning review remains required');
    expect(packet).toContain(report.packet.before.sha256);
    expect(packet).toContain(report.packet.after.sha256);
    expect(packet).toContain(JSON.stringify(report.packet.protectedMaterial, null, 2));
    const newPost = await check('I chose it.\n');
    const newPacket = readableReport(newPost, true);
    expect(newPacket).toContain(newPost.packet.after.sha256);
    expect(newPacket).toContain('"before": null');
    expect(newPacket).toContain(JSON.stringify(newPost.packet.protectedMaterial, null, 2));
  });

  it('pairs non-prose frontmatter and diagram metadata without linting configuration as prose', async () => {
    const beforeSource =
      '---\ndate: 2026-10-06\nfeatured: false\nimage: /Our-colour.png\ndescription:\n---\n\nI chose it.\n';
    const source = beforeSource.replace('2026-10-06', '2026-10-07').replace('false', 'true');
    const report = await check(source, { beforeSource });
    const date = report.packet.visibleMetadata.find((m) => m.field === 'date');
    expect(date.before.text).toBe('2026-10-06');
    expect(date.after.text).toBe('2026-10-07');
    expect(date.before.location.start.line).toBe(2);
    expect(date.after.excerpt).toBe('2026-10-07');
    const featured = report.packet.visibleMetadata.find((m) => m.field === 'featured');
    expect(featured.before.text).toBe('false');
    expect(featured.after.text).toBe('true');
    expect(report.packet.visibleMetadata.find((m) => m.field === 'description').after.text).toBe(
      '',
    );
    expect(errors(report)).toEqual([]);
    expect(rules(report)).toContain('review.metadata-change');
    expect(readableReport(report, true)).toContain(
      JSON.stringify(report.packet.visibleMetadata, null, 2),
    );
  });
});

describe('CLI contract and read-only execution', () => {
  it('resolves a symbolic local baseline once to a commit SHA without depending on historical Git objects', () => {
    const result = cli([
      'src/content/blog/autofix-was-the-whole-cost.md',
      '--base',
      'HEAD',
      '--json',
    ]);
    expect(result.status).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report.baseline.commit).toBe(
      spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim(),
    );
    expect(report.baseline.sha256).toBe(report.packet.before.sha256);
    expect(report.packet.before.source).toContain(excerpts.authenticContrast.approved);
  });

  it('reads a new nested draft and explicit before-file from any working directory without rewriting either input', () => {
    const temporary = mkdtempSync(join(tmpdir(), 'voice-test-'));
    try {
      mkdirSync(join(temporary, 'nested'));
      const a = join(temporary, 'before.md');
      const b = join(temporary, 'nested', 'after.md');
      writeFileSync(a, 'I might choose it.\n');
      writeFileSync(b, 'I chose it.\n');
      const beforeHash = hash(readFileSync(a));
      const afterHash = hash(readFileSync(b));
      const result = cli([b, '--before', a, '--json'], { cwd: temporary });
      expect(result.status).toBe(0);
      const report = JSON.parse(result.stdout);
      expect(report.baseline).toMatchObject({ kind: 'file', path: a, commit: null });
      expect(report.packet.after.source).toBe('I chose it.\n');
      expect(hash(readFileSync(a))).toBe(beforeHash);
      expect(hash(readFileSync(b))).toBe(afterHash);
      const fresh = cli([b, '--json']);
      expect(fresh.status).toBe(0);
      expect(JSON.parse(fresh.stdout).packet.before).toBeNull();
    } finally {
      rmSync(temporary, { recursive: true, force: true });
    }
  });

  it.each(
    [
      [],
      ['missing.md'],
      ['README.md', '--before', 'README.md', '--base', 'HEAD'],
      ['README.md', '--base', '--bad'],
      ['README.md', '--unknown'],
      ['README.md', '--base', 'missing-ref'],
      ['README.md', '--base-path', 'x'],
      ['README.md', '--json', '--packet'],
    ].map((args) => [args]),
  )('distinguishes invalid inputs (%j) from mechanical failures', (args) => {
    const result = cli([...args, '--json']);
    expect(result.status).toBe(2);
    expect(JSON.parse(result.stdout).error.reason).toBeTruthy();
  });

  it('reports a missing implementation dependency as exit 3 and makes help available without dependencies', () => {
    const directory = mkdtempSync(join(tmpdir(), 'voice-missing-dependency-'));
    try {
      const script = join(directory, 'checker.mjs');
      writeFileSync(script, readFileSync('scripts/check-blog-voice.mjs'));
      const result = spawnSync(
        process.execPath,
        [script, resolve('tests/fixtures/blog-voice/new-post.md'), '--json'],
        { encoding: 'utf8' },
      );
      expect(result.status).toBe(3);
      expect(JSON.parse(result.stdout).error.reason).toContain('Cannot find module');
      expect(spawnSync(process.execPath, [script, '--help'], { encoding: 'utf8' }).status).toBe(0);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('classifies malformed review-context JSON as invalid input', () => {
    const directory = mkdtempSync(join(tmpdir(), 'voice-invalid-context-'));
    try {
      const context = join(directory, 'context.json');
      writeFileSync(context, '{broken');
      const result = cli([
        'tests/fixtures/blog-voice/new-post.md',
        '--review-context',
        context,
        '--json',
      ]);
      expect(result.status).toBe(2);
      expect(JSON.parse(result.stdout).error.reason).toContain('Invalid review context');
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('fails with exit 3 when the required local linter cannot run, without installing or silently skipping it', () => {
    const result = cli(['src/content/blog/autofix-was-the-whole-cost.md', '--json'], {
      env: { ...process.env, PATH: '/nonexistent' },
    });
    expect(result.status).toBe(3);
    expect(JSON.parse(result.stdout).error.reason).toContain('requires local Vale');
  });

  it('executes offline with only Vale/read-only Git, and leaves Git state and sources unchanged', () => {
    const status = () =>
      spawnSync('git', ['status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' })
        .stdout;
    const before = status();
    const checkerBefore = readFileSync('scripts/verify-brevity.py', 'utf8');
    const result = spawnSync(
      process.execPath,
      [
        '--import',
        resolve('tests/fixtures/blog-voice/offline-guard.mjs'),
        resolve('scripts/check-blog-voice.mjs'),
        'src/content/blog/autofix-was-the-whole-cost.md',
        '--base',
        'HEAD',
        '--json',
      ],
      { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
    );
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).exitCode).toBe(0);
    expect(status()).toBe(before);
    expect(readFileSync('scripts/verify-brevity.py', 'utf8')).toBe(checkerBefore);
  });

  it.each([
    ['process', "(await import('node:child_process')).exec('true')"],
    ['TLS', "(await import('node:tls')).connect({port: 1})"],
    ['sync write', "(await import('node:fs')).appendFileSync(process.argv[1], 'changed')"],
    ['async write', "(await import('node:fs')).writeFile(process.argv[1], 'changed', () => {})"],
    [
      'promise write',
      "await (await import('node:fs/promises')).writeFile(process.argv[1], 'changed')",
    ],
    ['copy', "(await import('node:fs')).copyFileSync('README.md', process.argv[1])"],
  ])('the regression guard refuses an unexpected %s operation', (_, expression) => {
    const directory = mkdtempSync(join(tmpdir(), 'voice-test-denied-'));
    const destination = join(directory, 'forbidden.txt');
    try {
      const result = spawnSync(
        process.execPath,
        [
          '--import',
          resolve('tests/fixtures/blog-voice/offline-guard.mjs'),
          '--input-type=module',
          '--eval',
          expression,
          destination,
        ],
        { encoding: 'utf8' },
      );
      expect(result.status).toBe(1);
      expect(result.stderr).toMatch(/forbidden/i);
      expect(existsSync(destination)).toBe(false);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('refuses persistent paths with lookalike temporary-directory names', () => {
    const directory = mkdtempSync(join(process.cwd(), '.guard-persistent-'));
    const lookalike = join(directory, 'blog-voice-escape');
    mkdirSync(lookalike);
    const destination = join(lookalike, 'forbidden.txt');
    try {
      const result = spawnSync(
        process.execPath,
        [
          '--import',
          resolve('tests/fixtures/blog-voice/offline-guard.mjs'),
          '--input-type=module',
          '--eval',
          "(await import('node:fs')).writeFileSync(process.argv[1], 'changed')",
          destination,
        ],
        { encoding: 'utf8' },
      );
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('Persistent write forbidden');
      expect(existsSync(destination)).toBe(false);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
