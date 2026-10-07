import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { slug as githubSlug } from 'github-slugger';
import { parseFrontmatter as astroParseFrontmatter } from '@astrojs/markdown-remark';
import { parseFrontmatter } from '../scripts/lib/parse-frontmatter.mjs';
import { findFilesRecursively } from '../scripts/lib/blog-file-inventory.mjs';

// The two-sided claims-review stamp (#1165). See specs/resume.md § Claims
// review, which is the contract; this file enforces it.
//
// Each `src/content/resume/projects/<slug>.md` entry records the pair it was
// last reviewed as:
//
//   claimsReviewed:
//     caseStudy: <sha256 of the case study file's raw bytes>
//     resume: <sha256 of this entry's Markdown body>
//     date: <YYYY-MM-DD of the review>
//
// and this suite fails when either side no longer hashes to its stamp. Roles:
// the project page owns the CLAIMS, the private canonical résumé owns the
// WORDING, and changes flow one way, project page → canonical → site mirror.
// Nothing here can read the canonical (it is private and not in CI), and
// nothing here writes to it. A passing stamp proves a person compared the two
// sides since either last changed; it does not prove they agree.
//
// Unlike tests/resume.test.js this reads source files only, not dist/: the
// stamp is a fact about content, and the hashes are defined over source bytes.

const ROOT = resolve(__dirname, '..');
const RESUME_DIR = resolve(ROOT, 'src/content/resume/projects');
const PROJECTS_DIR = resolve(ROOT, 'src/content/projects');
const CANONICAL = 'nathanjohnpayne/docs → job-search/nathan-payne-resume.md';

/**
 * The opening frontmatter block, through the newline that ends its closing
 * `---` line. Anchored at the start of the file, and the closing delimiter
 * must be a whole line — `----` or `--- x` inside the YAML does not end it.
 */
const FRONTMATTER_BLOCK = /^---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/;

/**
 * The part of a résumé entry the `resume` hash covers: everything after the
 * closing frontmatter delimiter, with leading and trailing whitespace removed.
 *
 * Body only, so writing a new `claimsReviewed` — or reordering the list, or
 * fixing a URL — cannot invalidate the stamp. Trimmed, so an editor adding or
 * dropping the final newline is not a "change" anyone has to review. Every
 * other byte counts, including whitespace inside the text.
 *
 * @param {string} source - the full entry file
 * @returns {string}
 */
function resumeEntryBody(source) {
  const match = FRONTMATTER_BLOCK.exec(source);
  if (!match) throw new Error('résumé entry has no frontmatter block');
  return source.slice(match[0].length).trim();
}

/** @param {string | Buffer} data */
function sha256Hex(data) {
  return createHash('sha256').update(data).digest('hex');
}

/** @param {string} source - the full entry file */
function resumeHash(source) {
  return sha256Hex(Buffer.from(resumeEntryBody(source), 'utf8'));
}

/** @param {Buffer} bytes - the case study file exactly as stored */
function caseStudyHash(bytes) {
  return sha256Hex(bytes);
}

/**
 * The id Astro's glob loader gives an entry with no `slug` field: the path
 * under the collection base, extension dropped, each segment slugified, and a
 * trailing `/index` removed. ProjectsSection looks the project up by this id,
 * so it is the résumé entry's project slug.
 */
function resumeEntryId(file, data) {
  if (typeof data?.slug === 'string' && data.slug) return data.slug;
  return relative(RESUME_DIR, file)
    .replace(/\.md$/, '')
    .split(sep)
    .map((segment) => githubSlug(segment))
    .join('/')
    .replace(/\/index$/, '');
}

/**
 * Which sides moved since the stamp. A missing stamp moves both: there is no
 * recorded review to be current against. (The schema already rejects one at
 * build time; this keeps the suite honest when run against source alone.)
 */
function claimsReviewVerdict(stamp, current) {
  const recorded = typeof stamp === 'object' && stamp !== null;
  const caseStudyChanged = stamp?.caseStudy !== current.caseStudy;
  const resumeChanged = stamp?.resume !== current.resume;
  return { recorded, caseStudyChanged, resumeChanged, stale: caseStudyChanged || resumeChanged };
}

/** Today in the local calendar, as the stamp's `date` wants it. */
function todayIso() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * The failure message. It carries the whole procedure, so whoever hits it does
 * not need the issue: which side changed, what a passing stamp does and does
 * not prove, the remedy in the order canonical → mirror → stamp, and the
 * replacement stamp ready to paste.
 */
function staleClaimsReviewMessage({
  entryPath,
  name,
  caseStudyPath,
  stamp,
  verdict,
  current,
  today,
}) {
  const side =
    verdict.caseStudyChanged && verdict.resumeChanged
      ? `both the case study (${caseStudyPath}) and this résumé entry changed`
      : verdict.caseStudyChanged
        ? `the case study (${caseStudyPath}) changed`
        : 'this résumé entry changed';
  const headline = verdict.recorded
    ? `${entryPath}: claims review is stale—${side} since the last review on ${stamp.date}.`
    : `${entryPath}: no claims review is recorded—this entry has no claimsReviewed stamp against ${caseStudyPath}.`;
  return [
    headline,
    'A passing stamp means a person compared the two since either side last changed. It does not prove they agree.',
    `  1. Re-read the canonical résumé's "${name}" entry (${CANONICAL}, checked out at ~/GitHub/docs) against ${caseStudyPath}. The project page is the source of truth for claims; the canonical is the source of truth for wording.`,
    '  2. If a claim no longer holds, revise the canonical first: edit it on disk in ~/GitHub/docs and let the vault backup commit it, since a targeted commit would sweep in unrelated edits in progress. If every claim still holds, the canonical needs no edit.',
    `  3. Copy the canonical entry verbatim into ${entryPath}. Never edit the site entry alone: that breaks verbatim fidelity with the canonical.`,
    '  4. Update claimsReviewed to:',
    '',
    'claimsReviewed:',
    `  caseStudy: "${current.caseStudy}"`,
    `  resume: "${current.resume}"`,
    `  date: "${today}"`,
    '',
    '     These hashes are of the files as they stand now. If step 3 changed the entry body, rerun this test for the new résumé hash.',
  ].join('\n');
}

function loadResumeEntries() {
  return findFilesRecursively(RESUME_DIR, (f) => f.endsWith('.md')).map((file) => {
    const source = readFileSync(file, 'utf-8');
    const data = parseFrontmatter(source) ?? {};
    return {
      file,
      path: relative(ROOT, file),
      id: resumeEntryId(file, data),
      data,
      source,
    };
  });
}

function loadCaseStudies() {
  // The same recursive `**/*.{md,mdx}` inventory the `projects` collection
  // loads, matched by DECLARED slug — never by basename or extension.
  return findFilesRecursively(PROJECTS_DIR, (f) => /\.mdx?$/.test(f)).map((file) => {
    const bytes = readFileSync(file);
    return {
      file,
      path: relative(ROOT, file),
      slug: parseFrontmatter(bytes.toString('utf-8'))?.slug,
      bytes,
    };
  });
}

const resumeEntries = loadResumeEntries();
const caseStudies = loadCaseStudies();

function caseStudyFor(entry) {
  return caseStudies.filter((c) => c.slug === entry.id);
}

describe('Résumé claims review — linkage', () => {
  it('discovers résumé project entries from the collection directory', () => {
    // Positive control for every per-entry test below, which would otherwise
    // pass vacuously on an empty or misdirected walk.
    expect(resumeEntries.length, `no .md entries found under ${RESUME_DIR}`).toBeGreaterThan(0);
    expect(caseStudies.length, `no case studies found under ${PROJECTS_DIR}`).toBeGreaterThan(0);
  });

  it.each(resumeEntries.map((e) => [e.path, e]))(
    '%s links to exactly one case study by its project slug',
    (_path, entry) => {
      // A résumé entry's id is its project slug (specs/resume.md § Projects).
      // The reverse is not required: the résumé selects projects, so a case
      // study with no résumé entry is curation, not drift.
      const matches = caseStudyFor(entry);
      expect(
        matches.map((c) => c.path),
        `${entry.path}: expected exactly one file under src/content/projects/ declaring slug "${entry.id}"`,
      ).toHaveLength(1);
    },
  );
});

describe('Résumé claims review — stamps are current', () => {
  it.each(resumeEntries.map((e) => [e.path, e]))(
    '%s was reviewed against its case study since either side last changed',
    (_path, entry) => {
      const [caseStudy] = caseStudyFor(entry);
      expect(caseStudy, `${entry.path}: no case study declares slug "${entry.id}"`).toBeTruthy();

      const stamp = entry.data.claimsReviewed;
      const current = {
        caseStudy: caseStudyHash(caseStudy.bytes),
        resume: resumeHash(entry.source),
      };
      const verdict = claimsReviewVerdict(stamp, current);
      if (verdict.stale) {
        throw new Error(
          staleClaimsReviewMessage({
            entryPath: entry.path,
            name: entry.data.name,
            caseStudyPath: caseStudy.path,
            stamp,
            verdict,
            current,
            today: todayIso(),
          }),
        );
      }
    },
  );
});

describe('Résumé claims review — the hash definitions', () => {
  const entry = [
    '---',
    'name: "Example—A Project"',
    'tech: ["Astro"]',
    'order: 1',
    'claimsReviewed:',
    '  caseStudy: "aaaa"',
    '  resume: "bbbb"',
    '  date: "2026-10-07"',
    '---',
    '',
    'A project that does one thing, with a qualifier.',
    '',
  ].join('\n');

  it('hashes the body only, so frontmatter edits — the stamp itself included — do not move it', () => {
    const reordered = entry.replace('order: 1', 'order: 7');
    const restamped = entry.replace('resume: "bbbb"', 'resume: "cccc"');
    expect(resumeHash(reordered)).toBe(resumeHash(entry));
    expect(resumeHash(restamped)).toBe(resumeHash(entry));
    expect(resumeEntryBody(entry)).toBe('A project that does one thing, with a qualifier.');
  });

  it('ignores outer whitespace but not a change to the text', () => {
    expect(resumeHash(entry.replace(/\n$/, ''))).toBe(resumeHash(entry));
    expect(resumeHash(`${entry}\n\n`)).toBe(resumeHash(entry));
    expect(resumeHash(entry.replace('one thing', 'two things'))).not.toBe(resumeHash(entry));
    expect(resumeHash(entry.replace('a qualifier', 'a  qualifier'))).not.toBe(resumeHash(entry));
  });

  it('ends the frontmatter only at a whole `---` line', () => {
    const tricky = entry.replace('order: 1', 'order: 1\nnote: "----"');
    expect(resumeEntryBody(tricky)).toBe(resumeEntryBody(entry));
    expect(() => resumeEntryBody('no frontmatter here')).toThrow(/no frontmatter/);
  });

  it('splits every real entry where the content layer does', () => {
    // The body this suite hashes must be the body Astro loads, or a stamp
    // could pass over text the page does not render. Astro's own splitter is
    // the comparison, not the definition, so a change in its internals cannot
    // silently re-key every stamp.
    for (const e of resumeEntries) {
      expect(resumeEntryBody(e.source), e.path).toBe(
        astroParseFrontmatter(e.source).content.trim(),
      );
    }
  });

  it('hashes the case study as raw bytes, so any edit to it moves the stamp', () => {
    const bytes = Buffer.from('---\nslug: "x"\n---\n\nBody.\n', 'utf8');
    expect(caseStudyHash(bytes)).toBe(sha256Hex(bytes));
    expect(caseStudyHash(Buffer.from('---\nslug: "x"\n---\n\nBody!\n', 'utf8'))).not.toBe(
      caseStudyHash(bytes),
    );
    // Frontmatter counts on this side: status, dates and qualifiers live there.
    expect(caseStudyHash(Buffer.from('---\nslug: "y"\n---\n\nBody.\n', 'utf8'))).not.toBe(
      caseStudyHash(bytes),
    );
  });
});

describe('Résumé claims review — the verdict and its message', () => {
  const stamp = { caseStudy: 'a'.repeat(64), resume: 'b'.repeat(64), date: '2026-10-07' };
  const base = {
    entryPath: 'src/content/resume/projects/example.md',
    name: 'Example—A Project',
    caseStudyPath: 'src/content/projects/example.mdx',
    stamp,
    today: '2026-10-08',
  };

  it('is current only when both hashes match', () => {
    expect(
      claimsReviewVerdict(stamp, { caseStudy: stamp.caseStudy, resume: stamp.resume }),
    ).toEqual({ recorded: true, caseStudyChanged: false, resumeChanged: false, stale: false });
    expect(claimsReviewVerdict(stamp, { caseStudy: 'c'.repeat(64), resume: stamp.resume })).toEqual(
      { recorded: true, caseStudyChanged: true, resumeChanged: false, stale: true },
    );
    expect(
      claimsReviewVerdict(stamp, { caseStudy: stamp.caseStudy, resume: 'c'.repeat(64) }),
    ).toEqual({ recorded: true, caseStudyChanged: false, resumeChanged: true, stale: true });
    expect(claimsReviewVerdict(undefined, { caseStudy: 'x', resume: 'y' })).toEqual({
      recorded: false,
      caseStudyChanged: true,
      resumeChanged: true,
      stale: true,
    });
  });

  it('names the side that changed', () => {
    const current = { caseStudy: 'c'.repeat(64), resume: stamp.resume };
    const caseSide = staleClaimsReviewMessage({
      ...base,
      verdict: claimsReviewVerdict(stamp, current),
      current,
    });
    expect(caseSide).toContain(
      'claims review is stale—the case study (src/content/projects/example.mdx) changed since the last review on 2026-10-07.',
    );

    const current2 = { caseStudy: stamp.caseStudy, resume: 'd'.repeat(64) };
    const resumeSide = staleClaimsReviewMessage({
      ...base,
      verdict: claimsReviewVerdict(stamp, current2),
      current: current2,
    });
    expect(resumeSide).toContain('claims review is stale—this résumé entry changed since');

    const current3 = { caseStudy: 'c'.repeat(64), resume: 'd'.repeat(64) };
    const both = staleClaimsReviewMessage({
      ...base,
      verdict: claimsReviewVerdict(stamp, current3),
      current: current3,
    });
    expect(both).toContain(
      'both the case study (src/content/projects/example.mdx) and this résumé entry changed',
    );
  });

  it('says what a pass proves, gives the remedy in order, and prints the replacement stamp', () => {
    const current = { caseStudy: 'c'.repeat(64), resume: 'd'.repeat(64) };
    const message = staleClaimsReviewMessage({
      ...base,
      verdict: claimsReviewVerdict(stamp, current),
      current,
    });
    expect(message).toContain('It does not prove they agree.');

    // Canonical → mirror → stamp, in that order.
    const steps = [
      `  1. Re-read the canonical résumé's "Example—A Project" entry (${CANONICAL}`,
      '  2. If a claim no longer holds, revise the canonical first: edit it on disk in ~/GitHub/docs and let the vault backup commit it',
      '  3. Copy the canonical entry verbatim into src/content/resume/projects/example.md.',
      '  4. Update claimsReviewed to:',
    ];
    const positions = steps.map((step) => message.indexOf(step));
    expect(
      positions.every((p) => p >= 0),
      `missing a step:\n${message}`,
    ).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);

    // Paste-ready, quoted so YAML keeps the date a string for the schema.
    expect(message).toContain(
      [
        'claimsReviewed:',
        `  caseStudy: "${'c'.repeat(64)}"`,
        `  resume: "${'d'.repeat(64)}"`,
        '  date: "2026-10-08"',
      ].join('\n'),
    );
  });

  it('treats a missing stamp as never reviewed', () => {
    const current = { caseStudy: 'c'.repeat(64), resume: 'd'.repeat(64) };
    const message = staleClaimsReviewMessage({
      ...base,
      stamp: undefined,
      verdict: claimsReviewVerdict(undefined, current),
      current,
    });
    expect(message).toContain(
      'example.md: no claims review is recorded—this entry has no claimsReviewed stamp against src/content/projects/example.mdx.',
    );
    // Still the full remedy, ending in a stamp to paste.
    expect(message).toContain('It does not prove they agree.');
    expect(message).toContain(`  resume: "${'d'.repeat(64)}"`);
  });
});
