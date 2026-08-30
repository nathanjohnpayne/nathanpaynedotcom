import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

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

// Drop whole-line shell comments so an absence assertion is about what the
// script runs, not about what it mentions.
function stripShellComments(source) {
  return source.replace(/^[ \t]*#.*$/gm, '');
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

  it('keeps the trusted parser self-contained on a clean policy runner', () => {
    const workflow = readFileSync('.github/workflows/pr-review-policy.yml', 'utf8');
    const parser = readFileSync('scripts/lib/pr-body-contract.mjs', 'utf8');

    expect(workflow).toContain('actions/setup-node@');
    expect(workflow).not.toContain('Install trusted validator dependencies');
    expect(parser).not.toMatch(/from ['"](?:unified|remark-parse)['"]/);
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

  it('keeps contract markers after closing HTML block tags hidden until a blank line', () => {
    const hiddenAuthor = validate(
      ['</div>', 'Authoring-Agent: codex', '', '## Self-Review'].join('\n'),
    );

    expect(hiddenAuthor.status).toBe(1);
    expect(hiddenAuthor.stderr).toContain("missing a valid 'Authoring-Agent:' line");
  });

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

  it('routes every PR-body check through the one shared contract library', () => {
    const phase4b = readFileSync('scripts/phase-4b-review.sh', 'utf8');
    const workflow = readFileSync('.github/workflows/pr-review-policy.yml', 'utf8');
    const validateScript = readFileSync('scripts/validate-pr-body.sh', 'utf8');
    const author = readFileSync('scripts/gh-as-author.sh', 'utf8');

    // Phase 4b reads the body to attribute it, so it can pick a reviewer whose
    // agent differs from the author's. It must reach the Authoring-Agent line
    // through the shared library rather than a local regex, which would pick a
    // marker out of an HTML comment (#1121).
    expect(phase4b).toContain('. "$ROOT/lib/pr-body-contract.sh"');
    expect(phase4b).toContain('pr_body_authoring_agent "$body"');

    // And it VALIDATES before trusting that identity (mergepath#1141).
    //
    // This assertion was previously inverted, on the reasoning that a body
    // reaching Phase 4b "has already passed the two gates asserted below".
    // That premise does not hold, and the comment twenty lines down says so
    // itself: the required per-event check "makes no claim about
    // `Authoring-Agent:`". Only the author wrapper validates that field, and
    // only at PR CREATION — so a body edited afterwards reaches Phase 4b with
    // an unvalidated agent.
    //
    // Measured against mergepath without the call: `Authoring-Agent: nobody`
    // is accepted and a reviewer is selected —
    //   [phase-4b] ... direction=nobody->codex  reviewer=nathanpayne-codex
    // With it, the same body dies at the contract with "unknown
    // Authoring-Agent 'nobody' (expected an agent represented in
    // available_reviewers)".
    expect(stripShellComments(phase4b)).toContain('pr_body_validate');

    // Full validation — the Authoring-Agent allow-list and the Self-Review
    // section together — runs at PR creation through the author wrapper, and is
    // reachable standalone through the validator script.
    expect(author).toContain('pr_body_validate "$PR_BODY"');
    expect(validateScript).toContain('pr_body_validate "$BODY"');

    // The required check that runs on every PR event is deliberately narrower:
    // it asks the markdown-aware parser one question and makes no claim about
    // `Authoring-Agent:`, because the validator is loaded from the default
    // branch and widening this gate is tracked separately (mergepath#1137).
    // Assert the call the workflow actually makes, matched against
    // comment-stripped source: `scripts/validate-pr-body.sh` is also named in
    // the comment above the step, so matching raw source would pass on that
    // mention alone whether or not the step invokes anything.
    //
    // TRANSITIONAL, and deliberately so. mergepath#1139 reroutes this gate
    // through the shared entrypoint, replacing the direct parser call with
    // `scripts/validate-pr-body.sh --self-review-only`. This repo has not
    // received that wave yet, so its workflow still calls the parser directly.
    // Both invocations are accepted for exactly as long as that migration is in
    // flight, because the test and the workflow cannot change in the same
    // commit here — the workflow arrives by propagation, not by hand.
    //
    // Drop the `.mjs` arm as soon as the wave lands: keeping it would let the
    // gate silently regress to the old path and this assertion would not
    // notice.
    const selfReviewGate = stripShellComments(workflow);
    const invokesParserDirectly = selfReviewGate.includes(
      'node scripts/lib/pr-body-contract.mjs --has-self-review',
    );
    const invokesSharedEntrypoint = selfReviewGate.includes(
      'scripts/validate-pr-body.sh --self-review-only',
    );
    expect(
      invokesParserDirectly || invokesSharedEntrypoint,
      'the required PR-event gate must invoke the self-review check through one of the two documented paths',
    ).toBe(true);
    expect(workflow).toMatch(/pull_request:\s*\n\s*types: \[opened, edited, synchronize,/);
  });
});
