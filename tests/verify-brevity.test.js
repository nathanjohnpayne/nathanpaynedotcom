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
    title: "Handover"
    content: |
      graph TD
          A["Authoring session"] --> B["Merge"]
---

The figure moved -3.8% and the run recorded zero rejections. See [the audit](/blog/some-post/) and the \`/\` separator.
`;


const CLOCK = `---
title: >-
  Original headline
seoDescription: "Pinned."
---

The deploy ran at 10:04am Pacific and the shell piped through | to the next stage.

Name | Count
--- | ---:
Alpha | 1

~~~js
const mode = "strict";
~~~
`;


const UNITS = `---
title: "Units"
seoDescription: "Pinned."
---

The grid line is 9px and the breakpoint 480px. Rates run $4/M. Deployed at 10:04am Pacific.
`;

function paths(after, base) {
  const dir = mkdtempSync(join(tmpdir(), 'brevity-'));
  const a = join(dir, 'before.md');
  const b = join(dir, 'after.md');
  writeFileSync(a, base ?? (after.includes('Authoring session') || after.includes('rejections') ? SIGNED : BEFORE));
  writeFileSync(b, after);
  return [a, b];
}

// Python exits 1 on an uncaught exception, which is also the verifier's
// "evidence changed" status. Without separating them, a crash inside any
// token class satisfies `expect(run(...)).toBe(1)` and the suite stays green
// over a tool that never ran its check. A traceback on stderr is the
// discriminator, and it is rethrown so the failure is loud.
function run(after, base) {
  const [a, b] = paths(after, base);
  try {
    execFileSync('python3', [script, '--quiet', a, b], { stdio: 'pipe' });
    return 0;
  } catch (err) {
    const stderr = (err.stderr || '').toString();
    if (stderr.includes('Traceback') || stderr.includes('SyntaxError')) {
      throw new Error(`verify-brevity crashed instead of reporting:\n${stderr}`);
    }
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

  it('fails when a unit-bearing numeral changes', () => {
    // 9px and 8px are different grids. An earlier percent fix used a
    // trailing (?!\\w) that stopped these matching at all.
    expect(run(UNITS.replace('9px', '8px'), UNITS)).toBe(1);
  });

  it('fails when a currency symbol changes', () => {
    expect(run(UNITS.replace('$4/M', '\u20ac4/M'), UNITS)).toBe(1);
  });

  it('fails when a timestamp changes zone', () => {
    expect(run(UNITS.replace('10:04am Pacific', '10:04am Eastern'), UNITS)).toBe(1);
  });

  it('still passes on a pure prose edit near protected tokens', () => {
    expect(run(UNITS.replace('The grid line', 'The grid rule'), UNITS)).toBe(0);
  });

  it('fails when a percent suffix is dropped', () => {
    // -3.8% and -3.8 are different claims; matching only the bare number
    // leaves the token count unchanged.
    expect(run(SIGNED.replace('-3.8%', '-3.8'), SIGNED)).toBe(1);
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

  // CodeQL js/identity-replacement caught this replacing the string with
  // itself, so the assertion only ever exercised the diagram content and the
  // item's title -- the thing the test is named for -- went unchecked.
  it('fails when a sidebar mermaid title changes', () => {
    expect(run(SIGNED.replace('title: "Handover"', 'title: "The handover"'))).toBe(1);
  });

  it('fails when sidebar mermaid content changes', () => {
    expect(run(SIGNED.replace('graph TD', 'graph LR'))).toBe(1);
  });

  it('fails when a natural-language timestamp flips am to pm', () => {
    expect(run(CLOCK.replace('10:04am', '10:04pm'), CLOCK)).toBe(1);
  });

  it('fails when a tilde-fenced code block changes', () => {
    expect(run(CLOCK.replace('const mode = "strict"', 'const mode = "loose"'), CLOCK)).toBe(1);
  });

  it('fails when a table without a leading pipe changes', () => {
    expect(run(CLOCK.replace('Alpha | 1', 'Beta | 1'), CLOCK)).toBe(1);
  });

  it('fails when a pinned block-scalar title changes', () => {
    expect(run(CLOCK.replace('Original headline', 'Updated headline'), CLOCK)).toBe(1);
  });

  it('does not flag prose that merely contains a pipe', () => {
    expect(run(CLOCK.replace('piped through', 'passed through'), CLOCK)).toBe(0);
  });

  it('flags a dropped "zero" count as advisory', () => {
    const after = SIGNED.replace('zero rejections', 'no rejections');
    expect(output(after)).toMatch(/note\s+spelled-out numbers/);
  });

  it('fails when an ISO timestamp offset changes sign', () => {
    const before = 'Merged at 2026-01-01T10:20:30+05:00 exactly.\n';
    const after = 'Merged at 2026-01-01T10:20:30-05:00 exactly.\n';
    expect(run(before, after)).toBe(1);
  });

  it('fails when content inside a four-backtick fence changes', () => {
    const before = '````\n```\nalpha\n````\n';
    const after = '````\n```\nbeta\n````\n';
    expect(run(before, after)).toBe(1);
  });

  it('fails when a reference-style link destination is repointed', () => {
    const before = '[post][p]\n\n[p]: /blog/original/\n';
    const after = '[post][p]\n\n[p]: /blog/revised/\n';
    expect(run(before, after)).toBe(1);
  });

  it('fails when a multi-backtick code span changes after an embedded backtick', () => {
    const before = 'see ``alpha ` beta`` here\n';
    const after = 'see ``alpha ` gamma`` here\n';
    expect(run(before, after)).toBe(1);
  });

  it('allows sentence punctuation to change after a numeral', () => {
    const before = 'The run took 22, which was long.\n';
    const after = 'The run took 22. It was long.\n';
    expect(run(before, after)).toBe(0);
  });

  it('reports prose word count separately from the whole file', () => {
    expect(output(BEFORE)).toMatch(/prose \d+ -> \d+/);
    expect(output(BEFORE)).toMatch(/whole file, including tables and code/);
  });

  it('does not report a case change as a lost spelled-out number', () => {
    const before = 'We shipped seventeen fixes and one revert.\n';
    const after = 'Seventeen fixes shipped, and one revert.\n';
    expect(output(after, before)).not.toMatch(/note\s+spelled-out numbers/);
  });

  it('fails when a titled relative link destination changes', () => {
    expect(run('[x](/blog/a "T") end\n', '[x](/blog/b "T") end\n')).toBe(1);
  });

  it('fails when a single-digit issue reference loses its hash', () => {
    expect(run('closed #5 today\n', 'closed 5 today\n')).toBe(1);
  });

  it('fails when a month-name date changes month', () => {
    expect(run('On July 30, 2026 it merged\n', 'On August 30, 2026 it merged\n')).toBe(1);
  });

  it('fails when a slash denominator changes the rate', () => {
    expect(run('costs $4/M tokens\n', 'costs $4/B tokens\n')).toBe(1);
  });

  it('fails when content inside an indented fence changes', () => {
    expect(run('   ~~~\nalpha\n   ~~~\n', '   ~~~\nbeta\n   ~~~\n')).toBe(1);
  });

  it('fails when a mermaid item declared title-first changes', () => {
    const mk = (label) =>
      `x\nsidebar:\n  - title: "D"\n    type: mermaid\n    content: |\n      graph TD\n          A["${label}"]\n`;
    expect(run(mk('one'), mk('two'))).toBe(1);
  });

  it('fails when a one-column table body cell changes', () => {
    expect(run('| State |\n| --- |\n| Alpha |\n', '| State |\n| --- |\n| Beta |\n')).toBe(1);
  });

  it('does not treat a mixed-delimiter line as a closing fence', () => {
    const mk = (label) => '```\nalpha\n``~~\n' + label + '\n```\n';
    expect(run(mk('beta'), mk('gamma'))).toBe(1);
  });

  it('fails when a version-prefixed numeral changes', () => {
    expect(run('Astro v5 to v6.1 here\n', 'Astro v4 to v6.1 here\n')).toBe(1);
  });

  it('fails when a path-relative link destination changes', () => {
    expect(run('[a](./notes/x.md) end\n', '[a](./notes/y.md) end\n')).toBe(1);
  });

  it('allows sentence punctuation to change after a URL', () => {
    expect(run(
      'see https://example.com, then more\n',
      'see https://example.com. Then more\n',
    )).toBe(0);
  });

  it('still fails when the URL itself changes', () => {
    expect(run('see https://example.com/a here\n', 'see https://example.com/b here\n')).toBe(1);
  });

  it('fails when indented code block content changes', () => {
    const mk = (v) => `text\n\n    const mode = "${v}"\n    more\n\nend\n`;
    expect(run(mk('strict'), mk('loose'))).toBe(1);
  });

  it('fails when a mermaid item changes after a blank line', () => {
    const mk = (label) =>
      `x\nsidebar:\n  - type: mermaid\n    content: |\n      graph TD\n          A["one"]\n\n          B["${label}"]\n`;
    expect(run(mk('two'), mk('three'))).toBe(1);
  });

  it('excludes inline code from the prose word count', () => {
    const before = 'The `alpha beta` process was extremely slow.\n';
    const after = 'The `alpha beta` process was slow.\n';
    const text = output(after, before);
    expect(text).toMatch(/prose \d+ -> \d+/);
  });

  it('notes a description change without failing the gate', () => {
    const mk = (d) => `---\ntitle: "T"\ndescription: "${d}"\n---\n\nBody text here.\n`;
    expect(run(mk('Alpha gamma.'), mk('Alpha beta gamma.'))).toBe(0);
    expect(output(mk('Alpha gamma.'), mk('Alpha beta gamma.'))).toMatch(/note\s+description changed/);
  });

  it('fails when a fragment-only link destination changes', () => {
    expect(run('[a](#one) end\n', '[a](#two) end\n')).toBe(1);
  });

  it('fails when a mailto destination changes', () => {
    expect(run('[m](mailto:a@x.com) e\n', '[m](mailto:b@x.com) e\n')).toBe(1);
  });

  it('fails when a bare frontmatter path is repointed', () => {
    const mk = (p) => `---\nimage: ${p}\n---\nx\n`;
    expect(run(mk('/og/blog/original.png'), mk('/og/blog/revised.png'))).toBe(1);
  });

  it('fails when a weekday claim changes', () => {
    expect(run('closed the same Wednesday\n', 'closed the same Thursday\n')).toBe(1);
  });

  it('fails when a scientific-notation exponent changes', () => {
    expect(run('held 1e6 records here\n', 'held 1e9 records here\n')).toBe(1);
  });

  it('fails when tab-indented code content changes', () => {
    const mk = (v) => `text\n\n\tconst mode = "${v}"\n\nend\n`;
    expect(run(mk('strict'), mk('loose'))).toBe(1);
  });

  it('fails when blockquoted fenced code changes', () => {
    const mk = (v) => `q\n\n> ~~~\n> ${v}\n> ~~~\n`;
    expect(run(mk('alpha'), mk('beta'))).toBe(1);
  });

  it('fails when a blockquoted table body cell changes', () => {
    const mk = (v) => `q\n\n> Name | State\n> --- | ---\n> ${v} | 1\n`;
    expect(run(mk('Alpha'), mk('Beta'))).toBe(1);
  });

  it('does not let a mermaid item swallow the next sidebar item', () => {
    const mk = (b) =>
      `x\nsidebar:\n  - type: mermaid\n    content: |\n      graph TD\n          A["one"]\n  - type: text\n    body: "${b}"\n`;
    expect(run(mk('alpha gamma'), mk('alpha beta gamma'))).toBe(0);
  });
});
