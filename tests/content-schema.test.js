import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { relative, resolve } from 'path';
import {
  findBlogMarkdownFiles,
  findFilesRecursively,
} from '../scripts/lib/blog-file-inventory.mjs';
import { parseFrontmatter } from '../scripts/lib/parse-frontmatter.mjs';

const configSource = readFileSync(resolve(__dirname, '../src/content.config.ts'), 'utf-8');

const contentDir = resolve(__dirname, '../src/content/blog');
const markdownFiles = findBlogMarkdownFiles(contentDir).map((filePath) => ({
  name: relative(contentDir, filePath),
  content: readFileSync(filePath, 'utf-8'),
}));

// `projects` accepts .md AND .mdx (see src/content.config.ts's glob pattern
// comment, epic #759) — glob both here rather than reusing
// findBlogMarkdownFiles, which is hardcoded to `.md` only.
const projectsDir = resolve(__dirname, '../src/content/projects');
const projectFiles = findFilesRecursively(projectsDir, (filePath) => /\.mdx?$/.test(filePath)).map(
  (filePath) => ({
    name: relative(projectsDir, filePath),
    content: readFileSync(filePath, 'utf-8'),
  }),
);

function collectionSource(collectionName) {
  const startMatch = configSource.match(
    new RegExp(`const\\s+${collectionName}\\s*=\\s*defineCollection\\(\\{`),
  );
  expect(startMatch, `missing ${collectionName} collection`).not.toBeNull();

  const startIndex = startMatch.index;
  const endIndex = configSource.indexOf('\n});', startIndex);
  expect(endIndex, `missing ${collectionName} collection terminator`).not.toBe(-1);

  return configSource.slice(startIndex, endIndex + '\n});'.length);
}

describe('Content Schema', () => {
  it('content.config.ts exists and defines a blog collection', () => {
    expect(configSource).toContain('defineCollection');
    expect(configSource).toContain('glob(');
    expect(configSource).toMatch(/const\s+blog\s*=/);
    expect(configSource).toContain('collections');
  });

  it('blog schema requires title, description, category, date, tags, and image', () => {
    expect(configSource).toContain('title: z.string()');
    expect(configSource).toContain('seoTitle: z.string().optional()');
    expect(configSource).toContain('description: z.string()');
    expect(configSource).toContain('seoDescription: z.string().optional()');
    expect(configSource).toContain("import { BLOG_CATEGORIES } from './lib/blog-order'");
    expect(configSource).toContain('category: z.enum(BLOG_CATEGORIES)');
    expect(configSource).toContain('featured: z.boolean().default(false)');
    expect(configSource).toContain('date: z.coerce.date()');
    expect(configSource).toContain('tags: z.array(z.string())');
    expect(configSource).toContain('image: z.string()');
  });

  it('projects schema supports optional seoDescription', () => {
    const projectsSource = collectionSource('projects');

    expect(projectsSource).not.toContain('const blog');
    expect(projectsSource).toContain('seoDescription: z.string().optional()');
  });

  it('blog sidebar mermaid items reject an empty caption', () => {
    // A sidebar Mermaid item's caption is the same visible `<figcaption>` a body
    // fence's `caption=` produces (#989), and a fence rejects an empty one, so
    // the two surfaces reject the same authoring mistake. Sliced to the mermaid
    // arm of the discriminated union: the `image` and `text` arms keep the
    // looser `z.string().optional()`, because their caption is still a sibling
    // `<p>` the layout drops when falsy.
    const blogSource = collectionSource('blog');
    const sidebarSource = blogSource.slice(blogSource.indexOf('sidebar: z'));
    const mermaidStart = sidebarSource.indexOf("type: z.literal('mermaid')");
    const imageStart = sidebarSource.indexOf("type: z.literal('image')");

    expect(mermaidStart, 'the mermaid sidebar variant must be in the union').toBeGreaterThan(-1);
    expect(imageStart, 'the image sidebar variant must follow it').toBeGreaterThan(mermaidStart);

    const mermaidItem = sidebarSource.slice(mermaidStart, imageStart);
    expect(mermaidItem, 'a mermaid sidebar caption must reject an empty string').toContain(
      'caption: z.string().trim().min(1).optional()',
    );
    expect(
      sidebarSource.slice(imageStart),
      'the image and text variants keep the looser caption',
    ).toContain('caption: z.string().optional()');
  });

  it('projects schema declares decisions, constraints, and learnings as flat, optional, defaulted arrays', () => {
    const projectsSource = collectionSource('projects');
    const blogSource = collectionSource('blog');

    // Flat top-level fields on `projects` only — never on `blog`.
    for (const field of ['decisions', 'constraints', 'learnings']) {
      expect(projectsSource).toContain(`${field}: z`);
      expect(blogSource).not.toContain(`${field}: z`);
    }

    // Each field is an array that is optional with a [] default — the shape
    // that makes an un-authored case study a no-op rather than a schema
    // failure.
    //
    // Sliced per field rather than matched by regex across the whole
    // collection. Two weaker forms were tried and both let a missing default
    // through:
    //   1. Counting `.optional().default([])` occurrences — `related` already
    //      contributes one, so the count stays satisfied when one of the three
    //      loses its default.
    //   2. A per-field regex spanning `[\s\S]*?` from the field name — the lazy
    //      quantifier walks past that field's own closing paren and matches the
    //      `.optional().default([])` belonging to the NEXT array. Only the last
    //      field in the sequence, `learnings`, actually fails when broken,
    //      which is exactly the one a spot-check negative test picks.
    // The slice makes the assertion structurally incapable of reaching a
    // neighbouring field (Codex P2, round 3).
    const fieldOrder = ['decisions', 'constraints', 'learnings'];
    for (const [index, field] of fieldOrder.entries()) {
      const start = projectsSource.indexOf(`${field}: z`);
      expect(start, `${field} not found in the projects collection`).toBeGreaterThan(-1);

      const next = fieldOrder[index + 1];
      const end = next ? projectsSource.indexOf(`${next}: z`, start) : projectsSource.length;
      const block = projectsSource.slice(start, end === -1 ? projectsSource.length : end);

      expect(block, `${field} must be a z.array(...)`).toMatch(/^\w+: z\s*\n\s*\.array\(/);
      expect(block, `${field} must be .optional()`).toContain('.optional()');
      expect(block, `${field} must carry a .default([])`).toContain('.default([])');
    }

    // decisions: the string sub-fields, plus the exact four-value status enum.
    for (const subfield of ['title', 'context', 'rejected', 'rationale']) {
      expect(projectsSource).toContain(`${subfield}: z.string().trim().min(1)`);
    }
    // `evidence` became optional in #883: a `pending` record may omit it when
    // the page states the validation boundary once for the whole set and the
    // record has nothing decision-specific to add (specs/project-pages.md).
    // Optional, but never empty when present.
    expect(projectsSource).toContain('evidence: z.string().trim().min(1).optional()');
    expect(projectsSource).toContain(
      "status: z.enum(['validated', 'mixed', 'revised', 'pending'])",
    );

    // The assertion anatomy's three fields are OPTIONAL by contract, not by
    // accident: five-across and swipe-watch author the original shape and
    // must keep validating. Asserting `.optional()` on each is what stops a
    // later edit from making one required and silently breaking two pages.
    for (const subfield of ['lens', 'chosen', 'cost']) {
      expect(projectsSource).toContain(`${subfield}: z.string().trim().min(1).optional()`);
    }

    // constraints: value + label.
    expect(projectsSource).toContain('value: z.string().trim().min(1)');
    expect(projectsSource).toContain('label: z.string().trim().min(1)');

    // learnings: expected + observed + response.
    expect(projectsSource).toContain('expected: z.string().trim().min(1)');
    expect(projectsSource).toContain('observed: z.string().trim().min(1)');
    expect(projectsSource).toContain('response: z.string().trim().min(1)');
  });

  it('the live CTA label is optional, non-empty, and useless without liveUrl', () => {
    const projectsSource = collectionSource('projects');
    expect(projectsSource, 'liveLabel must be optional and non-empty when present').toContain(
      'liveLabel: z.string().trim().min(1).optional()',
    );
    // `liveLabel` names a button only `liveUrl` renders. Without the guard the
    // pairing is dead frontmatter that reads, to anyone editing the file, like
    // a shipped label.
    expect(projectsSource, 'liveLabel without liveUrl must be rejected').toMatch(
      /if\s*\(data\.liveLabel\s*&&\s*!data\.liveUrl\)/,
    );

    // And the same rule against the real files, so the guard is not just
    // asserted in source.
    expect(projectFiles.length).toBeGreaterThan(0);
    let labelled = 0;
    for (const file of projectFiles) {
      const fm = parseFrontmatter(file.content);
      // Presence, not truthiness. `liveLabel: ""` and a bare `liveLabel:`
      // (which YAML reads as null) are declarations, and they are precisely
      // the ones the assertions below exist to reject — a truthiness skip
      // waved through every value this block is meant to catch.
      if (!fm || !('liveLabel' in fm)) continue;
      labelled += 1;
      expect(typeof fm.liveLabel, `${file.name}: liveLabel must be a string`).toBe('string');
      expect(
        fm.liveLabel.trim().length,
        `${file.name}: liveLabel must be non-empty`,
      ).toBeGreaterThan(0);
      expect(fm.liveUrl, `${file.name}: liveLabel without liveUrl`).toBeTruthy();
    }
    // Control: the loop above is vacuous if nothing declares the field, and a
    // vacuous loop passes no matter how broken the schema is.
    // A control, not a census: it must prove the loop ran, and it must not
    // need editing when a project legitimately gains or drops the field. It
    // asserted `toBe(1)` and broke the moment a second project declared one
    // (#947), which is the hand-maintained-figure failure this repo keeps
    // finding elsewhere.
    expect(
      labelled,
      'no project declares liveLabel — the checks above ran on nothing',
    ).toBeGreaterThan(0);

    // And a control on the predicate itself: a declared-but-falsy label has to
    // reach the assertions rather than be skipped past them. Asserted against
    // the real parser, so it stays true if that parser ever changes how it
    // represents an empty scalar.
    for (const declared of ['liveLabel: ""', 'liveLabel:']) {
      const fm = parseFrontmatter(`---\ntitle: x\n${declared}\n---\n`);
      expect(
        fm && 'liveLabel' in fm,
        `${declared} must count as declared, or the checks above skip it`,
      ).toBe(true);
      expect(Boolean(fm.liveLabel), `${declared} is falsy, which is why presence is the test`).toBe(
        false,
      );
    }
  });

  it('every project file that declares decisions has well-formed decision records', () => {
    expect(projectFiles.length).toBeGreaterThan(0);

    const validStatuses = ['validated', 'mixed', 'revised', 'pending'];
    // `rejected` left this list in #754: under the encountered/decided anatomy
    // the alternative often belongs inside `rationale`. Records on the original
    // shape still owe it, which the per-record branch below enforces.
    // `evidence` left this list in #883 — see the schema assertion above. A
    // record that carries it must still carry a non-empty string, which the
    // per-record branch below enforces.
    const requiredKeys = ['title', 'context', 'rationale', 'status'];

    for (const file of projectFiles) {
      const fm = parseFrontmatter(file.content);
      const decisions = fm?.decisions;
      // No project has adopted decisions yet (epic #759 lands the field
      // ahead of any page authoring it) — zero records is not a failure,
      // only a malformed record among files that DO declare it is.
      if (!decisions) continue;

      expect(Array.isArray(decisions), `${file.name}: decisions must be an array`).toBe(true);
      decisions.forEach((decision, index) => {
        for (const key of requiredKeys) {
          expect(decision?.[key], `${file.name}: decisions[${index}].${key} missing`).toBeTruthy();
        }
        // The assertion anatomy is all-or-nothing per record. `chosen` is what
        // switches the component's layout, and a record that switches without
        // stating what the choice cost is the exact shape this anatomy exists
        // to prevent — a decision presented as free.
        if (decision?.chosen) {
          expect(
            decision?.cost,
            `${file.name}: decisions[${index}] declares chosen without cost`,
          ).toBeTruthy();
        } else {
          // A record on the original shape still owes its rejected path —
          // that anatomy has no other slot for the alternative.
          expect(
            decision?.rejected,
            `${file.name}: decisions[${index}] has neither chosen nor rejected`,
          ).toBeTruthy();
        }
        expect(validStatuses, `${file.name}: decisions[${index}].status invalid`).toContain(
          decision.status,
        );
        // `evidence` is optional only for `pending` (#883). The other three
        // statuses assert an observation, and the field IS the observation —
        // omitting it there would claim an outcome with nothing behind it.
        // Present at any status, it must not be empty.
        if (decision.status !== 'pending') {
          expect(
            decision?.evidence,
            `${file.name}: decisions[${index}] is ${decision.status} without evidence`,
          ).toBeTruthy();
        }
        if ('evidence' in (decision ?? {})) {
          expect(
            String(decision.evidence).trim(),
            `${file.name}: decisions[${index}].evidence present but empty`,
          ).not.toBe('');
        }
      });
    }
  });

  it('all blog markdown files have required frontmatter fields', () => {
    expect(markdownFiles.length).toBeGreaterThan(0);
    for (const file of markdownFiles) {
      const fm = parseFrontmatter(file.content);
      expect(fm, `${file.name}: missing frontmatter`).not.toBeNull();
      expect(fm.title, `${file.name}: missing title`).toBeTruthy();
      expect(fm.description, `${file.name}: missing description`).toBeTruthy();
      expect(fm.category, `${file.name}: missing category`).toBeTruthy();
      expect(fm.date, `${file.name}: missing date`).toBeTruthy();
      expect(fm.tags, `${file.name}: missing tags`).toBeTruthy();
      expect(fm.image, `${file.name}: missing image`).toBeTruthy();
    }
  });

  it('publishes exactly one featured post across the collection', () => {
    const featured = markdownFiles.filter((file) => {
      const fm = parseFrontmatter(file.content);
      return fm?.featured === 'true' && fm?.draft !== 'true';
    });

    expect(featured.map((file) => file.name)).toEqual(['six-prs-one-bug-agent-failure-modes.md']);
  });

  // The literal below is deliberately NOT an import of `BLOG_CATEGORIES` from
  // `src/lib/blog-order.ts`, the array `src/content.config.ts` builds its
  // `z.enum` from (#737). Importing it would make this assertion restate the
  // schema instead of checking anything: a third category added to that array
  // would be accepted here the moment it was declared, and every published
  // post would satisfy an enum widened in the same edit.
  //
  // The two assertions have different subjects, and both are wanted. The enum
  // itself is pinned by `tests/blog-order.test.js` ("uses one ranked category
  // vocabulary"), which fails when the production array changes. This one is
  // about the *content*: no post carries a category outside the pair the
  // editorial surfaces are built for. Keeping it independent is what makes
  // widening the vocabulary a two-file decision rather than a one-line one.
  //
  // The wiring between the schema and the enum — that `content.config.ts`
  // imports `BLOG_CATEGORIES` rather than duplicating the strings — is covered
  // above, by source assertion, so nothing here depends on this literal to
  // catch a drifting schema.
  it('assigns every published post to one of the two editorial categories', () => {
    const allowedCategories = ['Agent Systems', 'Building This Site'];

    for (const file of markdownFiles) {
      const fm = parseFrontmatter(file.content);
      if (fm?.draft === 'true') continue;
      expect(allowedCategories, `${file.name}: invalid category`).toContain(fm?.category);
    }
  });
});
