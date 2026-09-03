import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { relative, resolve } from 'path';
import { findFilesRecursively } from '../scripts/lib/blog-file-inventory.mjs';
import { PROJECTS_HEADING } from '../src/lib/section-propositions';

const SRC = resolve(__dirname, '../src');

// #947. The proposition is quoted by several surfaces, and the module exists so
// a copy edit reaches all of them. That only holds while nobody retypes it —
// which is exactly what had happened in the projects OG template, where a
// hard-coded duplicate would have shipped stale share artwork after an edit and
// raised no error anywhere (Codex).

describe('section propositions', () => {
  it('is the only place src/ spells the projects heading', () => {
    const offenders = findFilesRecursively(SRC, (f) => /\.(astro|ts|js|mjs|css)$/.test(f))
      .filter((f) => relative(SRC, f) !== 'lib/section-propositions.ts')
      .filter((f) => {
        const body = readFileSync(f, 'utf-8');
        // A CSS comment quoting the copy is documentation, not a consumer;
        // only code that could RENDER a stale duplicate counts.
        return f.endsWith('.css') ? false : body.includes(PROJECTS_HEADING);
      })
      .map((f) => relative(SRC, f));
    expect(
      offenders,
      'the projects heading is hard-coded outside section-propositions.ts — import it instead',
    ).toEqual([]);
  });

  it('reaches the surfaces that render it', () => {
    // The control for the guard above: a zero-hit search proves nothing unless
    // the same walk demonstrably reaches the files that should import it.
    const consumers = ['pages/projects/index.astro', 'pages/og-templates/projects.astro', 'components/resume/ProjectsSection.astro'];
    const walked = findFilesRecursively(SRC, (f) => /\.(astro|ts|js|mjs)$/.test(f)).map((f) =>
      relative(SRC, f),
    );
    for (const consumer of consumers) {
      expect(walked, `the walk never reached ${consumer}`).toContain(consumer);
      expect(
        readFileSync(resolve(SRC, consumer), 'utf-8'),
        `${consumer} does not import the shared proposition`,
      ).toMatch(/from '[./]*lib\/section-propositions'/);
    }
  });
});
