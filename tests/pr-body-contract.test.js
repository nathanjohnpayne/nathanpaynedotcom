import { mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parsePrBodyContract } from '../scripts/lib/pr-body-contract.mjs';

const validBody = [
  'Authoring-Agent: codex',
  '',
  '## Self-Review',
  '',
  '- Correctness: verified.',
].join('\n');

function validate(body, ...arguments_) {
  return spawnSync('scripts/validate-pr-body.sh', arguments_, {
    encoding: 'utf8',
    input: body,
  });
}

describe('PR body contract', () => {
  it('accepts a complete body and returns the Phase 4b authoring agent', () => {
    const result = validate(validBody, '--print-author');

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toBe('codex\n');
  });

  it('rejects a missing Authoring-Agent field', () => {
    const result = validate('## Self-Review\n\n- Correctness: verified.');

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("missing a valid 'Authoring-Agent:' line");
  });

  it('rejects a missing Self-Review section', () => {
    const result = validate('Authoring-Agent: codex\n');

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("missing a '## Self-Review' section");
  });

  it('rejects unknown and duplicate authoring-agent identifiers', () => {
    const unknown = validate(validBody.replace('codex', 'codxe'));
    const duplicate = validate(`${validBody}\n\nAuthoring-Agent: claude\n`);

    expect(unknown.status).toBe(1);
    expect(unknown.stderr).toContain('available_reviewers');
    expect(duplicate.status).toBe(1);
    expect(duplicate.stderr).toContain('exactly one');
  });

  it('ignores contract markers in non-rendered Markdown regions', () => {
    const hiddenAuthor = validate(
      ['<!--', 'Authoring-Agent: codex', '-->', '', '## Self-Review'].join('\n'),
    );
    const fencedSelfReview = validate(
      ['Authoring-Agent: codex', '', '```markdown', '## Self-Review', '```'].join('\n'),
    );
    const multilineInlineComment = validate(
      ['Visible introduction <!--', 'Authoring-Agent: codex', '-->', '', '## Self-Review'].join(
        '\n',
      ),
    );
    const htmlBlockAttribute = validate(
      ['<div data-agent="', 'Authoring-Agent: codex', '">', '', '## Self-Review'].join('\n'),
    );
    const commentClosingLine = validate(
      ['<!-- hidden', '-->Authoring-Agent: codex', '', '## Self-Review'].join('\n'),
    );

    expect(hiddenAuthor.status).toBe(1);
    expect(hiddenAuthor.stderr).toContain("missing a valid 'Authoring-Agent:' line");
    expect(fencedSelfReview.status).toBe(1);
    expect(fencedSelfReview.stderr).toContain("missing a '## Self-Review' section");
    expect(multilineInlineComment.status).toBe(1);
    expect(multilineInlineComment.stderr).toContain("missing a valid 'Authoring-Agent:' line");
    expect(htmlBlockAttribute.status).toBe(1);
    expect(htmlBlockAttribute.stderr).toContain("missing a valid 'Authoring-Agent:' line");
    expect(commentClosingLine.status).toBe(1);
    expect(commentClosingLine.stderr).toContain("missing a valid 'Authoring-Agent:' line");
  });

  it('ignores contract markers in GitHub footnote definitions', () => {
    const hiddenAuthor = validate(
      ['[^agent]: generated note', 'Authoring-Agent: codex', '', '## Self-Review'].join('\n'),
    );
    const hiddenSelfReview = validate(
      ['Authoring-Agent: codex', '', '[^review]: generated note', '', '    ## Self-Review'].join(
        '\n',
      ),
    );

    expect(hiddenAuthor.status).toBe(1);
    expect(hiddenAuthor.stderr).toContain("missing a valid 'Authoring-Agent:' line");
    expect(hiddenSelfReview.status).toBe(1);
    expect(hiddenSelfReview.stderr).toContain("missing a '## Self-Review' section");
  });

  it('accepts CR-only PR body line endings', () => {
    const result = validate(validBody.replaceAll('\n', '\r'));

    expect(result.status, result.stderr).toBe(0);
  });

  it('installs the maintained parser from the trusted lockfile without lifecycle scripts', () => {
    const workflow = readFileSync('.github/workflows/pr-review-policy.yml', 'utf8');
    const repoLintWorkflow = readFileSync('.github/workflows/repo_lint.yml', 'utf8');
    const parser = readFileSync('scripts/lib/pr-body-contract.mjs', 'utf8');
    const toolManifest = JSON.parse(
      readFileSync('scripts/ci/pr-body-contract/package.json', 'utf8'),
    );

    expect(workflow).toContain('actions/setup-node@');
    expect(workflow).toContain(
      'node-version-file: ${{ steps.parser_runtime.outputs.version_file }}',
    );
    expect(workflow).toContain("if: steps.parser_runtime.outputs.mode == 'tool'");
    expect(workflow).toContain("if: steps.parser_runtime.outputs.mode == 'bootstrap'");
    expect(workflow).toContain('working-directory: scripts/ci/pr-body-contract');
    expect(workflow).toContain('ln -s "$PWD/node_modules" ../../node_modules');
    expect(repoLintWorkflow.match(/actions\/setup-node@/g)).toHaveLength(2);
    expect(
      repoLintWorkflow.match(/working-directory: scripts\/ci\/pr-body-contract/g),
    ).toHaveLength(2);
    expect(
      repoLintWorkflow.match(/ln -s "\$PWD\/node_modules" \.\.\/\.\.\/node_modules/g),
    ).toHaveLength(2);
    expect(repoLintWorkflow.match(/id: parser_tool/g)).toHaveLength(2);
    expect(toolManifest.dependencies).toMatchObject({
      micromark: '4.0.2',
      'micromark-extension-gfm-footnote': '2.1.0',
      'micromark-extension-gfm-table': '2.1.1',
      'micromark-extension-math': '3.1.0',
      parse5: '7.3.0',
    });
    expect(parser).toMatch(/from ['"]micromark['"]/);
    expect(parser).not.toMatch(/from ['"](?:unified|remark-parse)['"]/);
  });

  it('runs the CLI contract when invoked through a symlink', () => {
    const temporaryDirectory = mkdtempSync(join(tmpdir(), 'pr-body-contract-'));
    const linkedParser = join(temporaryDirectory, 'pr-body-contract.mjs');
    symlinkSync(resolve('scripts/lib/pr-body-contract.mjs'), linkedParser);

    try {
      const result = spawnSync(process.execPath, [linkedParser, '--has-self-review'], {
        encoding: 'utf8',
        input: 'Authoring-Agent: codex\n',
      });

      expect(result.stderr).toBe('');
      expect(result.status).toBe(1);

      const accepted = spawnSync(process.execPath, [linkedParser, '--has-self-review'], {
        encoding: 'utf8',
        input: 'Authoring-Agent: codex\n\n## Self-Review\n',
      });

      expect(accepted.status, accepted.stderr).toBe(0);
    } finally {
      rmSync(temporaryDirectory, { recursive: true });
    }
  });

  it('can be imported when argv[1] is not a filesystem path', () => {
    const parserUrl = pathToFileURL(resolve('scripts/lib/pr-body-contract.mjs')).href;
    const result = spawnSync(process.execPath, ['--input-type=module', '-'], {
      encoding: 'utf8',
      input: `import { parsePrBodyContract } from ${JSON.stringify(parserUrl)};\nprocess.stdout.write(parsePrBodyContract('Authoring-Agent: codex').author);\n`,
    });

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toBe('codex');
  });

  it('keeps raw HTML blocks hidden across internal blank lines', () => {
    for (const tag of ['script', 'pre', 'style', 'textarea']) {
      const result = validate(
        [`<${tag}>`, '', 'Authoring-Agent: codex', `</${tag}>`, '', '## Self-Review'].join('\n'),
      );

      expect(result.status, tag).toBe(1);
      expect(result.stderr).toContain("missing a valid 'Authoring-Agent:' line");
    }
  });

  it('uses CommonMark shared raw HTML closing conditions', () => {
    const result = validate(
      ['<pre>', '</script>', '</pre>', 'Authoring-Agent: codex', '', '## Self-Review'].join('\n'),
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("missing a valid 'Authoring-Agent:' line");
  });

  it('does not end raw HTML blocks on whitespace-altered closing tags', () => {
    for (const tag of ['script', 'pre', 'style', 'textarea']) {
      for (const whitespace of [' ', '\t']) {
        const result = validate(
          [
            `<${tag}>`,
            `</${tag}${whitespace}>`,
            'Authoring-Agent: codex',
            `</${tag}>`,
            '',
            '## Self-Review',
          ].join('\n'),
        );

        expect(result.status, `${tag} / ${JSON.stringify(whitespace)}`).toBe(1);
        expect(result.stderr).toContain("missing a valid 'Authoring-Agent:' line");
      }
    }
  });

  it('does not start raw HTML blocks with non-CommonMark tag whitespace', () => {
    for (const tag of ['script', 'pre', 'style', 'textarea']) {
      for (const whitespace of ['\f', '\v', '\u00a0']) {
        const result = validate(
          [
            `<${tag}${whitespace}>`,
            '',
            `</${tag}>`,
            'Authoring-Agent: codex',
            '',
            '## Self-Review',
          ].join('\n'),
        );

        expect(result.status, `${tag} / ${JSON.stringify(whitespace)}`).toBe(1);
        expect(result.stderr).toContain("missing a valid 'Authoring-Agent:' line");
      }
    }
  });

  it('keeps contract markers after closing HTML block tags hidden until a blank line', () => {
    const hiddenAuthor = validate(
      ['</div>', 'Authoring-Agent: codex', '', '## Self-Review'].join('\n'),
    );

    expect(hiddenAuthor.status).toBe(1);
    expect(hiddenAuthor.stderr).toContain("missing a valid 'Authoring-Agent:' line");
  });

  it('does not end HTML blocks on non-CommonMark fake blank lines', () => {
    for (const tag of ['div', 'span']) {
      for (const whitespace of ['\f', '\v', '\u00a0']) {
        const result = validate(
          [`<${tag}>`, whitespace, 'Authoring-Agent: codex', '', '## Self-Review'].join('\n'),
        );

        expect(result.status, `${tag} / ${JSON.stringify(whitespace)}`).toBe(1);
        expect(result.stderr).toContain("missing a valid 'Authoring-Agent:' line");
      }
    }
  });

  it('does not strip indented comments into HTML-block blank lines', () => {
    for (const tag of ['div', 'span']) {
      for (const comment of ['    <!-- generated -->', '\t<!-- generated -->']) {
        const result = validate(
          [`<${tag}>`, comment, 'Authoring-Agent: codex', '', '## Self-Review'].join('\n'),
        );

        expect(result.status, `${tag} / ${JSON.stringify(comment)}`).toBe(1);
        expect(result.stderr).toContain("missing a valid 'Authoring-Agent:' line");
      }
    }
  });

  it('accepts visible markers after inline HTML that is not a CommonMark HTML block', () => {
    const result = validate(
      ['<span>Context</span>', 'Authoring-Agent: codex', '', '## Self-Review'].join('\n'),
    );

    expect(result.status, result.stderr).toBe(0);
  });

  it('keeps markers after type-7 tags with consecutive valueless attributes hidden', () => {
    for (const tag of ['<span disabled class=foo>', '<span a b>']) {
      const result = validate([tag, 'Authoring-Agent: codex', '', '## Self-Review'].join('\n'));

      expect(result.status, tag).toBe(1);
      expect(result.stderr).toContain("missing a valid 'Authoring-Agent:' line");
    }
  });

  it('does not treat slash-valued unquoted attributes as complete type-7 tags', () => {
    const result = validate(
      ['<span a=/foo>', '```', '', 'Authoring-Agent: codex', '', '## Self-Review'].join('\n'),
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("missing a valid 'Authoring-Agent:' line");
    expect(result.stderr).toContain("missing a '## Self-Review' section");
  });

  it('rejects adversarial incomplete tags in linear time', () => {
    const adversarialTag = `<x${' a\t\t:=!'.repeat(10_000)}`;
    const parsed = parsePrBodyContract([adversarialTag, '', validBody].join('\n'));

    expect(parsed).toEqual({ author: 'codex', authorCount: 1, hasSelfReview: true });
  }, 1_000);

  it('keeps markers inside CommonMark processing, declaration, and CDATA blocks hidden', () => {
    const blocks = [
      ['<?review', '?>'],
      ['<!REVIEW', '>'],
      ['<![CDATA[', ']]>'],
    ];

    for (const [opening, closing] of blocks) {
      const hiddenAuthor = validate(
        [opening, 'Authoring-Agent: codex', closing, '', '## Self-Review'].join('\n'),
      );

      expect(hiddenAuthor.status, opening).toBe(1);
      expect(hiddenAuthor.stderr).toContain("missing a valid 'Authoring-Agent:' line");
    }
  });

  it('ignores fenced markers nested in Markdown containers', () => {
    const result = validate(
      ['## Self-Review', '', '- ```text', '  Authoring-Agent: codex', '  ```'].join('\n'),
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("missing a valid 'Authoring-Agent:' line");
  });

  it('ignores markers inside multiline inline-code spans', () => {
    for (const delimiter of ['`', '``', '```']) {
      const result = validate(
        [delimiter, 'Authoring-Agent: codex', delimiter, '', '## Self-Review'].join('\n'),
      );

      expect(result.status, delimiter).toBe(1);
      expect(result.stderr).toContain("missing a valid 'Authoring-Agent:' line");
    }
  });

  it('does not close fences with four-space-indented fake closers', () => {
    const result = validate(
      ['<span', '```', '    ```', 'Authoring-Agent: codex', '', '## Self-Review'].join('\n'),
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("missing a valid 'Authoring-Agent:' line");
    expect(result.stderr).toContain("missing a '## Self-Review' section");
  });

  it('reprocesses a fence line after its opening container ends', () => {
    const result = validate(
      ['> ```', '  ```', '> ```', 'Authoring-Agent: codex', '', '## Self-Review'].join('\n'),
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("missing a valid 'Authoring-Agent:' line");
    expect(result.stderr).toContain("missing a '## Self-Review' section");
  });

  it('does not close fences with non-CommonMark trailing whitespace', () => {
    for (const whitespace of ['\f', '\v', '\u00a0']) {
      const result = validate(
        ['```', `\`\`\`${whitespace}`, 'Authoring-Agent: codex', '', '## Self-Review'].join('\n'),
      );

      expect(result.status, JSON.stringify(whitespace)).toBe(1);
      expect(result.stderr).toContain("missing a valid 'Authoring-Agent:' line");
      expect(result.stderr).toContain("missing a '## Self-Review' section");
    }
  });

  it('does not strip comment suffixes from fence-like code content', () => {
    for (const fenceMarker of ['```', '~~~']) {
      const result = validate(
        [
          fenceMarker,
          `${fenceMarker}<!-- generated -->`,
          'Authoring-Agent: codex',
          '',
          '## Self-Review',
        ].join('\n'),
      );

      expect(result.status, fenceMarker).toBe(1);
      expect(result.stderr).toContain("missing a valid 'Authoring-Agent:' line");
      expect(result.stderr).toContain("missing a '## Self-Review' section");
    }
  });

  it('does not open backtick fences with forbidden backticks in the info string', () => {
    const result = validate(
      ['``` generated`', '```', 'Authoring-Agent: codex', '', '## Self-Review'].join('\n'),
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("missing a valid 'Authoring-Agent:' line");
    expect(result.stderr).toContain("missing a '## Self-Review' section");
  });

  it('tracks inline-code delimiters in invalid fence suffixes', () => {
    const result = validate(
      ['``` ``', 'Authoring-Agent: codex', '``', '', '## Self-Review'].join('\n'),
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("missing a valid 'Authoring-Agent:' line");
  });

  it('resets unmatched inline-code delimiters at paragraph-ending blank lines', () => {
    for (const delimiter of ['`', '``']) {
      const result = validate(
        [delimiter, '', delimiter, 'Authoring-Agent: codex', delimiter, '', '## Self-Review'].join(
          '\n',
        ),
      );

      expect(result.status, delimiter).toBe(1);
      expect(result.stderr).toContain("missing a valid 'Authoring-Agent:' line");
    }
  });

  it('gives HTML blocks precedence over backticks in tag attributes', () => {
    for (const tag of ['<span title="`">', '<div title="`">']) {
      const result = validate(
        [tag, '`', 'Authoring-Agent: codex', '', '## Self-Review'].join('\n'),
      );

      expect(result.status, tag).toBe(1);
      expect(result.stderr).toContain("missing a valid 'Authoring-Agent:' line");
    }
  });

  it('does not treat backticks inside inline HTML attributes as code delimiters', () => {
    const result = validate(
      ['Intro', '<span title="`">', '`', 'Authoring-Agent: codex', '`', '', '## Self-Review'].join(
        '\n',
      ),
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("missing a valid 'Authoring-Agent:' line");
  });

  it('does not mask HTML-looking backticks while seeking an active code-span closer', () => {
    for (const htmlLikeCode of ['<span title="`">', '<http://example.com/`>']) {
      const result = validate(
        ['`', htmlLikeCode, '`', 'Authoring-Agent: codex', '`', '', '## Self-Review'].join('\n'),
      );

      expect(result.status, htmlLikeCode).toBe(1);
      expect(result.stderr).toContain("missing a valid 'Authoring-Agent:' line");
    }
  });

  it('does not retroactively mask later runs in an HTML-looking token after span closure', () => {
    for (const htmlLikeCode of ['<span title="`x`">', '<http://example.com/`x`>']) {
      const result = validate(
        ['`', htmlLikeCode, 'Authoring-Agent: codex', '`', '', '## Self-Review'].join('\n'),
      );

      expect(result.status, htmlLikeCode).toBe(1);
      expect(result.stderr).toContain("missing a valid 'Authoring-Agent:' line");
    }
  });

  it('fails closed for backticks in link and image destinations or titles', () => {
    for (const markdown of [
      '[x](http://example.com/`)',
      '[x](http://example.com "title `")',
      '![x](http://example.com/`)',
    ]) {
      const result = validate(
        ['Intro ' + markdown, '`', 'Authoring-Agent: codex', '`', '', '## Self-Review'].join('\n'),
      );

      expect(result.status, markdown).toBe(1);
      expect(result.stderr).toContain("missing a valid 'Authoring-Agent:' line");
    }
  });

  it('fails closed for potentially multiline link targets', () => {
    const result = validate(
      [
        'Intro [x](http://example.com',
        ' "title `")',
        '`',
        'Authoring-Agent: codex',
        '`',
        '',
        '## Self-Review',
      ].join('\n'),
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("missing a valid 'Authoring-Agent:' line");
  });

  it('fails closed for backticks in link reference definitions', () => {
    for (const definition of [
      '[x]: http://example.com/`',
      '[x\\]]: http://example.com/`',
      '[x]: http://example.com "title `"',
      '[x]: http://example.com\n "title `"',
      '[x]: http://example.com\n "title\n continued `"',
      '[x]: http://example.com\n (title\n continued `)',
      '[x]: http://example.com "title\n continued `"',
      '[x]: http://example.com (title\n continued `)',
    ]) {
      const result = validate(
        [definition, '`', 'Authoring-Agent: codex', '`', '', '## Self-Review'].join('\n'),
      );

      expect(result.status, definition).toBe(1);
      expect(result.stderr).toContain("missing a valid 'Authoring-Agent:' line");
    }
  });

  it('does not carry ambiguity past complete link reference definitions', () => {
    const result = validate(
      ['[docs]: https://example.com', 'Authoring-Agent: codex', '', '## Self-Review'].join('\n'),
    );

    expect(result.status, result.stderr).toBe(0);
  });

  it('does not let indented code establish inline-code paragraph state', () => {
    const result = validate(
      ['    `x`', '<span hidden>', 'Authoring-Agent: codex', '', '## Self-Review'].join('\n'),
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("missing a valid 'Authoring-Agent:' line");
  });

  it('recognizes non-interrupting ordered lists at block boundaries', () => {
    const result = validate(
      ['2) x', '<span>', '<span hidden>', 'Authoring-Agent: codex', '', '## Self-Review'].join(
        '\n',
      ),
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("missing a valid 'Authoring-Agent:' line");
  });

  it('reprocesses the first line after a lazy list continuation ends', () => {
    const result = validate(
      ['- ', '  x', '<span>', '</script>', 'Authoring-Agent: codex', '', '## Self-Review'].join(
        '\n',
      ),
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("missing a valid 'Authoring-Agent:' line");
  });

  it('rejects contract markers in lazy blockquote continuations', () => {
    const result = validate(['> x', 'Authoring-Agent: codex', '', '## Self-Review'].join('\n'));

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("missing a valid 'Authoring-Agent:' line");
  });

  it('does not carry lazy blockquote state out of leaf blocks', () => {
    for (const quotedLeaf of ['>     code', '> <span>', '> ## Heading']) {
      const result = validate(
        [quotedLeaf, 'Authoring-Agent: codex', '', '## Self-Review'].join('\n'),
      );

      expect(result.status, `${quotedLeaf}: ${result.stderr}`).toBe(0);
    }
  });

  it('starts a lazy blockquote paragraph after quoted code and an empty list marker', () => {
    const result = validate(
      ['>     code', '> -', 'Authoring-Agent: codex', '', '## Self-Review'].join('\n'),
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("missing a valid 'Authoring-Agent:' line");
  });

  it('keeps empty list markers inside an active lazy blockquote paragraph', () => {
    for (const marker of ['+', '*', '1.', '2.']) {
      const result = validate(
        ['> x', `> ${marker}`, 'Authoring-Agent: codex', '', '## Self-Review'].join('\n'),
      );

      expect(result.status, marker).toBe(1);
      expect(result.stderr).toContain("missing a valid 'Authoring-Agent:' line");
    }
  });

  it('ends lazy blockquote paragraphs on Setext underlines', () => {
    for (const underline of ['-', '--', '=', '==']) {
      const result = validate(
        ['> x', `> ${underline}`, 'Authoring-Agent: codex', '', '## Self-Review'].join('\n'),
      );

      expect(result.status, `${underline}: ${result.stderr}`).toBe(0);
    }
  });

  it('measures leading blockquote tabs at their CommonMark tab stops', () => {
    for (const quotedParagraph of ['>\ttext', '> \ttext']) {
      const result = validate(
        [quotedParagraph, 'Authoring-Agent: codex', '', '## Self-Review'].join('\n'),
      );

      expect(result.status, quotedParagraph).toBe(1);
      expect(result.stderr).toContain("missing a valid 'Authoring-Agent:' line");
    }

    for (const quotedCode of ['>\t \tcode', '> \t \tcode']) {
      const result = validate(
        [quotedCode, 'Authoring-Agent: codex', '', '## Self-Review'].join('\n'),
      );

      expect(result.status, `${quotedCode}: ${result.stderr}`).toBe(0);
    }

    const indentedMarker = validate(
      [' >\t  text', 'Authoring-Agent: codex', '', '## Self-Review'].join('\n'),
    );
    expect(indentedMarker.status).toBe(1);
    expect(indentedMarker.stderr).toContain("missing a valid 'Authoring-Agent:' line");

    const twoSpaceMarker = validate(
      ['  >\ttext', 'Authoring-Agent: codex', '', '## Self-Review'].join('\n'),
    );
    expect(twoSpaceMarker.status).toBe(1);
    expect(twoSpaceMarker.stderr).toContain("missing a valid 'Authoring-Agent:' line");
  });

  it('does not carry quoted leaf state across blockquote depth changes', () => {
    const result = validate(
      ['> >     code', '> -', 'Authoring-Agent: codex', '', '## Self-Review'].join('\n'),
    );

    expect(result.status, result.stderr).toBe(0);

    const differentPath = validate(
      ['> - >     code', '> > -', 'Authoring-Agent: codex', '', '## Self-Review'].join('\n'),
    );
    expect(differentPath.status, differentPath.stderr).toBe(0);

    const siblingListItem = validate(
      ['> - >     code', '> + > -', 'Authoring-Agent: codex', '', '## Self-Review'].join('\n'),
    );
    expect(siblingListItem.status, siblingListItem.stderr).toBe(0);

    const continuedListItem = validate(
      ['> - >     code', '>   > -', 'Authoring-Agent: codex', '', '## Self-Review'].join('\n'),
    );
    expect(continuedListItem.status).toBe(1);
    expect(continuedListItem.stderr).toContain("missing a valid 'Authoring-Agent:' line");

    for (const opening of ['> -   >     code', '> -\t>     code']) {
      const wideContinuation = validate(
        [opening, '>     > -', 'Authoring-Agent: codex', '', '## Self-Review'].join('\n'),
      );
      expect(wideContinuation.status, opening).toBe(1);
      expect(wideContinuation.stderr).toContain("missing a valid 'Authoring-Agent:' line");
    }

    for (const marker of ['-', '+', '*', '1.', '2.']) {
      const nestedQuote = validate(
        ['> x', `> > ${marker}`, 'Authoring-Agent: codex', '', '## Self-Review'].join('\n'),
      );
      expect(nestedQuote.status, marker).toBe(1);
      expect(nestedQuote.stderr).toContain("missing a valid 'Authoring-Agent:' line");
    }
  });

  it('does not start lazy blockquote paragraphs after non-code leaf blocks', () => {
    const cases = [
      ['> ---', '> -'],
      ['> ```', '> ```', '> -'],
      ['> <span>', '> -'],
    ];

    for (const quotedLeaf of cases) {
      const result = validate(
        [...quotedLeaf, 'Authoring-Agent: codex', '', '## Self-Review'].join('\n'),
      );

      expect(result.status, `${quotedLeaf.join(' / ')}: ${result.stderr}`).toBe(0);
    }
  });

  it('keeps lazy blockquote state after quoted reference definitions', () => {
    const result = validate(
      ['> [docs]: /url', 'Authoring-Agent: codex', '', '## Self-Review'].join('\n'),
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("missing a valid 'Authoring-Agent:' line");

    const emptyMarker = validate(
      ['> [docs]: /url', '> -', 'Authoring-Agent: codex', '', '## Self-Review'].join('\n'),
    );
    expect(emptyMarker.status).toBe(1);
    expect(emptyMarker.stderr).toContain("missing a valid 'Authoring-Agent:' line");
  });

  it('keeps multiline code spans open across empty list markers', () => {
    const result = validate(
      ['text', '<span>', '`', '1. ', 'Authoring-Agent: codex', '`', '', '## Self-Review'].join(
        '\n',
      ),
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("missing a valid 'Authoring-Agent:' line");
  });

  it('masks backticks in every CommonMark inline HTML token family', () => {
    for (const html of ['<?foo ` ?>', '<!X ` >', '<![CDATA[`]]>', '<!-- ` -->']) {
      const result = validate(
        ['Intro ' + html, '`', 'Authoring-Agent: codex', '`', '', '## Self-Review'].join('\n'),
      );

      expect(result.status, html).toBe(1);
      expect(result.stderr).toContain("missing a valid 'Authoring-Agent:' line");
    }
  });

  it('masks backticks inside URI and email autolinks', () => {
    for (const autolink of [
      '<http://example.com/`>',
      '<foo`bar@example.com>',
      '<foo`bar@example>',
      '<foo`bar@localhost>',
      '<foo`bar@a>',
    ]) {
      const result = validate(
        ['Intro ' + autolink, '`', 'Authoring-Agent: codex', '`', '', '## Self-Review'].join('\n'),
      );

      expect(result.status, autolink).toBe(1);
      expect(result.stderr).toContain("missing a valid 'Authoring-Agent:' line");
    }
  });

  it('rejects NUL input before CommonMark normalization', () => {
    expect(parsePrBodyContract(`Authoring-Agent: codex\0\n\n## Self-Review`)).toEqual({
      author: '',
      authorCount: 0,
      hasSelfReview: false,
    });
  });

  it('does not mask backticks in URI-like text containing other ASCII controls', () => {
    for (const control of ['\u001f', '\u007f']) {
      const parsed = parsePrBodyContract(
        [
          `Intro <http://example.com/\`${control}>`,
          'Authoring-Agent: codex',
          '`',
          '',
          '## Self-Review',
        ].join('\n'),
      );

      expect(parsed.author, JSON.stringify(control)).toBe('');
    }
  });

  it('fails closed for potentially multiline inline HTML tags', () => {
    const result = validate(
      [
        'Intro',
        '<span',
        ' title="`">',
        '`',
        'Authoring-Agent: codex',
        '`',
        '',
        '## Self-Review',
      ].join('\n'),
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("missing a valid 'Authoring-Agent:' line");
  });

  it('prefers a rejected fence run when it has a later inline-code closer', () => {
    const result = validate(
      ['``` ``', '``', 'Authoring-Agent: codex', 'x```', '', '## Self-Review'].join('\n'),
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("missing a valid 'Authoring-Agent:' line");
  });

  it('does not treat non-interrupting ordered-list fences as paragraph breaks', () => {
    for (const listMarker of ['2.', '3)', '10.']) {
      const result = validate(
        [
          '``` ``',
          '``',
          'Authoring-Agent: codex',
          `${listMarker} \`\`\``,
          '',
          '## Self-Review',
        ].join('\n'),
      );

      expect(result.status, listMarker).toBe(1);
      expect(result.stderr).toContain("missing a valid 'Authoring-Agent:' line");
    }
  });

  it('does not strip container-looking content into top-level fence closers', () => {
    for (const fakeCloser of ['- ```', '> ```', '1. ```']) {
      const result = validate(
        ['```', fakeCloser, 'Authoring-Agent: codex', '', '## Self-Review'].join('\n'),
      );

      expect(result.status, fakeCloser).toBe(1);
      expect(result.stderr).toContain("missing a valid 'Authoring-Agent:' line");
      expect(result.stderr).toContain("missing a '## Self-Review' section");
    }
  });

  it('does not close list-contained fences below the list continuation indentation', () => {
    const cases = [
      ['- ```', '```'],
      ['- ```', ' ```'],
      ['1. ```', '  ```'],
    ];

    for (const [opening, underIndentedFence] of cases) {
      const result = validate(
        [opening, underIndentedFence, 'Authoring-Agent: codex', '', '## Self-Review'].join('\n'),
      );

      expect(result.status, `${opening} / ${underIndentedFence}`).toBe(1);
      expect(result.stderr).toContain("missing a valid 'Authoring-Agent:' line");
      expect(result.stderr).toContain("missing a '## Self-Review' section");
    }
  });

  it('measures tabbed list continuation indentation in CommonMark columns', () => {
    const underIndentedCases = [
      ['-\t```', '  ```'],
      ['-\t```', '   ```'],
      ['1.\t```', '   ```'],
    ];

    for (const [opening, underIndentedFence] of underIndentedCases) {
      const result = validate(
        [opening, underIndentedFence, 'Authoring-Agent: codex', '', '## Self-Review'].join('\n'),
      );

      expect(result.status, `${opening} / ${underIndentedFence}`).toBe(1);
      expect(result.stderr).toContain("missing a valid 'Authoring-Agent:' line");
    }

    const validCloser = validate(
      ['-\t```', '    ```', 'Authoring-Agent: codex', '', '## Self-Review'].join('\n'),
    );
    expect(validCloser.status, validCloser.stderr).toBe(0);
  });

  it('uses the same parser in Phase 4b and enforces it on every PR event path', () => {
    const phase4b = readFileSync('scripts/phase-4b-review.sh', 'utf8');
    const workflow = readFileSync('.github/workflows/pr-review-policy.yml', 'utf8');

    expect(phase4b).toContain('. "$ROOT/lib/pr-body-contract.sh"');
    expect(phase4b).toContain('pr_body_validate "$body" "$(p4b_config)"');
    expect(workflow).toContain('scripts/validate-pr-body.sh');
    expect(workflow).toContain('Trusted PR body validator is unavailable');
    expect(workflow).not.toContain('Bootstrap for the PR that first adds');
    expect(workflow).toMatch(/pull_request:\s*\n\s*types: \[opened, edited, synchronize,/);
  });
});
