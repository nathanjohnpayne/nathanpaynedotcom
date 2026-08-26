import { describe, it, expect } from 'vitest';
import { execFileSync } from 'child_process';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

const script = resolve(__dirname, '../scripts/verify-brevity.py');

const BEFORE = `---
title: "A Post"
seoDescription: "Pinned exactly."
---

The run took 22 hours and closed [#161](https://example.com/pull/161) across three platforms.

| State | Lines |
|---|---:|
| Peak | 1,721 |

\`\`\`js
const x = 1;
\`\`\`
`;

const SIGNED = `---
title: "Signed"
seoDescription: "Pinned."
sidebar:
  - type: mermaid
    content: |
      graph TD
          A["Authoring session"] --> B["Merge"]
---

The figure moved -3.8% and the run recorded zero rejections. See [the audit](/blog/some-post/) and the \`/\` separator.
`;

function paths(after, base) {
  const dir = mkdtempSync(join(tmpdir(), 'brevity-'));
  const a = join(dir, 'before.md');
  const b = join(dir, 'after.md');
  writeFileSync(a, base ?? (after.includes('Authoring session') || after.includes('rejections') ? SIGNED : BEFORE));
  writeFileSync(b, after);
  return [a, b];
}

function run(after, base) {
  const [a, b] = paths(after, base);
  try {
    execFileSync('python3', [script, '--quiet', a, b]);
    return 0;
  } catch (err) {
    return err.status;
  }
}

function output(after, base) {
  const [a, b] = paths(after, base);
  return execFileSync('python3', [script, a, b], { encoding: 'utf-8' });
}

describe('verify-brevity', () => {
  it('passes when only prose is tightened', () => {
    expect(run(BEFORE.replace('The run took', 'The run ran'))).toBe(0);
  });

  it('flags a dropped spelled-out count as advisory, not a failure', () => {
    // The defect this harness exists for: a numeral written as a word is
    // invisible to a prose-focused pass but is still evidence. It cannot
    // gate, because no regex separates "three platforms" from "one of the
    // reasons" -- so it surfaces as a note for a human to judge.
    const after = BEFORE.replace(' across three platforms', '');
    expect(run(after)).toBe(0);
    expect(output(after)).toMatch(/note\s+spelled-out numbers/);
    expect(output(after)).toContain("'three'");
  });

  it('fails when a numeral changes', () => {
    expect(run(BEFORE.replace('22 hours', '20 hours'))).toBe(1);
  });

  it('fails when an issue reference is dropped', () => {
    expect(run(BEFORE.replace('[#161](https://example.com/pull/161)', 'the fix'))).toBe(1);
  });

  it('fails when a pinned frontmatter field changes', () => {
    expect(run(BEFORE.replace('Pinned exactly.', 'Reworded.'))).toBe(1);
  });

  it('fails when a table row changes', () => {
    expect(run(BEFORE.replace('| Peak | 1,721 |', '| Peak | 1,720 |'))).toBe(1);
  });

  it('fails when a code block changes', () => {
    expect(run(BEFORE.replace('const x = 1;', 'const x = 2;'))).toBe(1);
  });

  it('fails when a numeral loses its sign', () => {
    // -3.8% and +3.8% are opposite claims; matching from the digit misses it.
    expect(run(SIGNED.replace('-3.8%', '+3.8%'))).toBe(1);
  });

  it('fails when a one-character code span is dropped', () => {
    expect(run(SIGNED.replace(' the `/` separator', ' the separator'))).toBe(1);
  });

  it('fails when a repository-relative link is removed', () => {
    expect(run(SIGNED.replace('[the audit](/blog/some-post/)', 'the audit'))).toBe(1);
  });

  it('fails when a sidebar mermaid node label changes', () => {
    expect(run(SIGNED.replace('Authoring session', 'Writing session'))).toBe(1);
  });

  it('reports the advisory even under --quiet', () => {
    // The documented gate usage is `--quiet BEFORE AFTER && git commit`;
    // suppressing the note there would hide the loss it exists to surface.
    const after = BEFORE.replace(' across three platforms', '');
    const [a, b] = paths(after);
    const out = execFileSync('python3', [script, '--quiet', a, b], { encoding: 'utf-8' });
    expect(out).toMatch(/note\s+spelled-out numbers/);
  });

  it('flags a dropped "zero" count as advisory', () => {
    const after = SIGNED.replace('zero rejections', 'no rejections');
    expect(output(after)).toMatch(/note\s+spelled-out numbers/);
  });
});
