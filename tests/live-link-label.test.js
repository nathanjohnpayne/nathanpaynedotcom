import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { findFilesRecursively } from '../scripts/lib/blog-file-inventory.mjs';
import { parseFrontmatter } from '../scripts/lib/parse-frontmatter.mjs';
import { liveLinkLabel } from '../src/lib/live-link-label';

// #947. The résumé's destination row and the project detail page's live CTA
// must not disagree about what a URL opens. The row derives its word from the
// CTA's own label, so these cover the derivation — and, more importantly, the
// case that made the first version wrong.

describe('live link label', () => {
  it('says Live when the project declares no override', () => {
    // No `liveLabel` means the default CTA, and the default CTA is the product.
    expect(liveLinkLabel(undefined)).toBe('Live');
    expect(liveLinkLabel('')).toBe('Live');
    expect(liveLinkLabel('   ')).toBe('Live');
  });

  it('carries through any override, not just ones containing "demo"', () => {
    // The regression this file exists for. The first version tested /demo/i and
    // returned 'Live' for everything else, so a project whose detail page said
    // "View Prototype" would have had a résumé row saying "Live" — exactly the
    // cross-surface contradiction the derivation is meant to make impossible.
    expect(liveLinkLabel('View Demo')).toBe('Demo');
    expect(liveLinkLabel('View Prototype')).toBe('Prototype');
    expect(liveLinkLabel('Open Sandbox')).toBe('Sandbox');
    expect(liveLinkLabel('Try the beta')).toBe('the beta');
    for (const override of ['View Prototype', 'Open Sandbox', 'View Demo']) {
      expect(liveLinkLabel(override), `${override} must not collapse to Live`).not.toBe('Live');
    }
  });

  it('uses an unrecognised label whole rather than mangling it', () => {
    // Shortening is best-effort; losing the author's words is not acceptable.
    expect(liveLinkLabel('Deal room')).toBe('Deal room');
    expect(liveLinkLabel('Live product')).toBe('Live product');
  });

  it('agrees with every liveLabel the projects collection actually declares', () => {
    // The control against real data: whatever is authored today must produce a
    // label, and a project that sets an override must never read "Live".
    //
    // Discovered the way the collection loads — `**/*.{md,mdx}`, recursive,
    // both extensions — and parsed rather than regexed. A `readdirSync` over
    // the root for `.mdx` only would let a nested or `.md` project declare a
    // `liveLabel` that never enters this control, and the control would go on
    // reporting green off the one root-level override that does (CodeRabbit and
    // Codex both, PR #946). A check that cannot see the input it exists to
    // check is worse than no check.
    const dir = resolve(__dirname, '../src/content/projects');
    const declared = findFilesRecursively(dir, (f) => /\.mdx?$/.test(f))
      .map((f) => parseFrontmatter(readFileSync(f, 'utf-8')).liveLabel)
      .filter(Boolean);
    expect(
      declared.length,
      'no project declares a liveLabel — this check proves nothing',
    ).toBeGreaterThan(0);
    for (const override of declared) {
      const label = liveLinkLabel(override);
      expect(label.length, `${override} produced an empty label`).toBeGreaterThan(0);
      expect(label, `${override} collapsed to Live`).not.toBe('Live');
    }
  });
});
