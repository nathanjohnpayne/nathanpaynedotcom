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

  it('uses the same parser in Phase 4b and enforces it on every PR event path', () => {
    const phase4b = readFileSync('scripts/phase-4b-review.sh', 'utf8');
    const workflow = readFileSync('.github/workflows/pr-review-policy.yml', 'utf8');

    expect(phase4b).toContain('. "$ROOT/lib/pr-body-contract.sh"');
    expect(phase4b).toContain('pr_body_validate "$body" "$(p4b_config)"');
    expect(workflow).toContain('scripts/validate-pr-body.sh');
    expect(workflow).toMatch(/pull_request:\s*\n\s*types: \[opened, edited, synchronize,/);
  });
});
