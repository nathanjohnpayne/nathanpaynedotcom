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

    expect(hiddenAuthor.status).toBe(1);
    expect(hiddenAuthor.stderr).toContain("missing a valid 'Authoring-Agent:' line");
    expect(fencedSelfReview.status).toBe(1);
    expect(fencedSelfReview.stderr).toContain("missing a '## Self-Review' section");
    expect(multilineInlineComment.status).toBe(1);
    expect(multilineInlineComment.stderr).toContain("missing a valid 'Authoring-Agent:' line");
    expect(htmlBlockAttribute.status).toBe(1);
    expect(htmlBlockAttribute.stderr).toContain("missing a valid 'Authoring-Agent:' line");
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

  it('ignores fenced markers nested in Markdown containers', () => {
    const result = validate(
      ['## Self-Review', '', '- ```text', '  Authoring-Agent: codex', '  ```'].join('\n'),
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("missing a valid 'Authoring-Agent:' line");
  });

  it('uses the same parser in Phase 4b and enforces it on every PR event path', () => {
    const phase4b = readFileSync('scripts/phase-4b-review.sh', 'utf8');
    const workflow = readFileSync('.github/workflows/pr-review-policy.yml', 'utf8');

    expect(phase4b).toContain('. "$ROOT/lib/pr-body-contract.sh"');
    expect(phase4b).toContain('pr_body_validate "$body" "$(p4b_config)"');
    expect(workflow).toContain('scripts/validate-pr-body.sh');
    expect(workflow).toMatch(/pull_request:\s*\n\s*types: \[opened, edited, synchronize,/);
  });
});
