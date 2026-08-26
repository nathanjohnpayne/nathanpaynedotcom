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

function paths(after) {
  const dir = mkdtempSync(join(tmpdir(), 'brevity-'));
  const a = join(dir, 'before.md');
  const b = join(dir, 'after.md');
  writeFileSync(a, BEFORE);
  writeFileSync(b, after);
  return [a, b];
}

function run(after) {
  const [a, b] = paths(after);
  try {
    execFileSync('python3', [script, '--quiet', a, b]);
    return 0;
  } catch (err) {
    return err.status;
  }
}

function output(after) {
  const [a, b] = paths(after);
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
});
