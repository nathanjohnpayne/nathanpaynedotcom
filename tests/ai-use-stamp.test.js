import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { parseFrontmatter as astroParseFrontmatter } from '@astrojs/markdown-remark';
import { findFilesRecursively } from '../scripts/lib/blog-file-inventory.mjs';
import {
  AI_USE_FIELD,
  AI_USE_HASH_SCRIPT,
  AI_USE_NON_PROSE_FIELDS,
  aiUseContentHash,
  aiUseHashCommand,
  canonicalJson,
  readerFacingContent,
  splitEntry,
} from '../src/lib/ai-use-stamp.mjs';
import { aiUseSchema, sha256Hex } from '../src/lib/content-stamp-schema.ts';

// The AI-use disclosure stamp (#1492, epic #1490).
//
// Every blog post and case study that carries `aiUse` records, in
// `aiUse.reviewed.content`, the hash of its reader-facing content and of
// `aiUse.statement` when the owner last confirmed that statement (#1510 added
// the statement). This suite recomputes the hash and fails, with the remedy,
// when the text or the statement changed since. The hash definition is
// src/lib/ai-use-stamp.mjs; the shape is src/lib/content-stamp-schema.ts.
//
// `aiUse` is optional during rollout, and no real entry carries it yet, so the
// fixture entry below is what exercises the check until the backfills land.
// Like tests/resume-claims-review.test.js this reads source files only: the
// stamp is a fact about content, defined over the bytes in the diff.

const ROOT = resolve(__dirname, '..');
const BLOG_DIR = resolve(ROOT, 'src/content/blog');
const PROJECTS_DIR = resolve(ROOT, 'src/content/projects');
const FIXTURE = resolve(ROOT, 'tests/fixtures/ai-use/stamped-post.md');

function loadEntry(file) {
  const source = readFileSync(file, 'utf8');
  return { file, path: relative(ROOT, file), source, frontmatter: splitEntry(source).frontmatter };
}

// The same inventories the collections load: `blog` takes `**/*.md`, and
// `projects` takes `**/*.{md,mdx}`.
const entries = [
  ...findFilesRecursively(BLOG_DIR, (f) => f.endsWith('.md')),
  ...findFilesRecursively(PROJECTS_DIR, (f) => /\.mdx?$/.test(f)),
].map(loadEntry);
const stampedEntries = entries.filter((e) => e.frontmatter[AI_USE_FIELD] !== undefined);
const fixture = loadEntry(FIXTURE);

/** Today in the local calendar, as `reviewed.date` wants it. */
function todayIso() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * The failure message. It carries the whole procedure, so whoever hits it does
 * not need the issue: the entry, the recorded and current hashes, what a
 * passing stamp does and does not prove, and the remedy in order, ending in a
 * paste-ready stamp.
 */
function staleAiUseStampMessage({ entryPath, recorded, actual, reviewedDate, today }) {
  const headline =
    recorded === undefined
      ? `${entryPath}: aiUse carries no reviewed.content stamp.`
      : `${entryPath}: the aiUse stamp is stale—the entry's reader-facing content or its aiUse statement changed since the statement was last confirmed${reviewedDate ? ` on ${reviewedDate}` : ''}.`;
  return [
    headline,
    `  expected (aiUse.reviewed.content): ${recorded ?? '(none)'}`,
    `  actual (current content):          ${actual}`,
    'A current stamp means the statement was confirmed since the text last changed. It does not prove the statement is accurate.',
    `  1. Confirm that aiUse.statement still describes the text of ${entryPath} as it stands now, frontmatter prose included: what agents did and what the owner did. If it does not, revise the statement first.`,
    `  2. Then re-stamp aiUse.reviewed. The hash covers the statement, so print it only once the statement is final, with \`${aiUseHashCommand(entryPath)}\`, and set:`,
    '',
    'aiUse:',
    '  reviewed:',
    `    content: "${actual}"`,
    `    date: "${today}"`,
    '',
    '     Quote both values, so YAML keeps the date a string. Editing the statement changes the hash; editing aiUse.reviewed does not, since it holds the stamp.',
  ].join('\n');
}

/** Null when the entry's stamp is current, otherwise the failure message. */
function aiUseStampFailure(entry, today = todayIso()) {
  const aiUse = entry.frontmatter[AI_USE_FIELD];
  const recorded =
    typeof aiUse?.reviewed?.content === 'string' ? aiUse.reviewed.content : undefined;
  const actual = aiUseContentHash(entry.source);
  if (recorded === actual) return null;
  return staleAiUseStampMessage({
    entryPath: entry.path,
    recorded,
    actual,
    reviewedDate: aiUse?.reviewed?.date,
    today,
  });
}

/**
 * Replace a whole top-level frontmatter line `key: ...`, or insert one after
 * the opening delimiter when the key is absent.
 */
function setTopLevel(source, key, yamlValue) {
  const line = new RegExp(`^${key}:.*$`, 'm');
  if (line.test(source)) return source.replace(line, `${key}: ${yamlValue}`);
  return source.replace(/^---\n/, `---\n${key}: ${yamlValue}\n`);
}

describe('AI-use stamp — stamps are current', () => {
  it('discovers blog posts and case studies from the collection directories', () => {
    // Positive control: without it, the stamp check below passes vacuously on
    // an empty or misdirected walk.
    expect(entries.filter((e) => e.file.startsWith(BLOG_DIR)).length).toBeGreaterThan(0);
    expect(entries.filter((e) => e.file.startsWith(PROJECTS_DIR)).length).toBeGreaterThan(0);
  });

  it('every entry that carries aiUse was confirmed since its text last changed', () => {
    const failures = stampedEntries.map((e) => aiUseStampFailure(e)).filter(Boolean);
    if (failures.length > 0) throw new Error(failures.join('\n\n'));
  });

  it('the fixture entry carries a current stamp, so the check above is not vacuous', () => {
    // The fixture's recorded hash also pins the hash definition: a change to
    // how the hash is computed fails here before it can re-key every stamp.
    expect(fixture.frontmatter[AI_USE_FIELD]).toBeDefined();
    const failure = aiUseStampFailure(fixture);
    if (failure) throw new Error(failure);
  });

  it('fails a changed fixture with the entry, both hashes and the remedy', () => {
    const edited = {
      ...fixture,
      source: fixture.source.replace('This body exists', 'This body still exists'),
    };
    const message = aiUseStampFailure(edited, '2026-11-02');
    const recorded = fixture.frontmatter.aiUse.reviewed.content;
    const actual = aiUseContentHash(edited.source);
    expect(actual).not.toBe(recorded);
    expect(message).toContain(
      "tests/fixtures/ai-use/stamped-post.md: the aiUse stamp is stale—the entry's reader-facing content or its aiUse statement changed since the statement was last confirmed on 2026-11-01.",
    );
    expect(message).toContain(`  expected (aiUse.reviewed.content): ${recorded}`);
    expect(message).toContain(`  actual (current content):          ${actual}`);
    expect(message).toContain('It does not prove the statement is accurate.');

    // Confirm first, re-stamp second.
    const confirm = message.indexOf('  1. Confirm that aiUse.statement still describes the text');
    const restamp = message.indexOf('  2. Then re-stamp aiUse.reviewed.');
    expect(confirm).toBeGreaterThan(-1);
    expect(restamp).toBeGreaterThan(confirm);

    // The command named is the one that prints the hash, and the stamp is
    // paste-ready and quoted.
    expect(message).toContain(
      '`npm run --silent ai-use:hash -- tests/fixtures/ai-use/stamped-post.md`',
    );
    expect(message).toContain(
      ['aiUse:', '  reviewed:', `    content: "${actual}"`, '    date: "2026-11-02"'].join('\n'),
    );
  });

  it('treats aiUse without a reviewed hash as unstamped', () => {
    const unstamped = {
      ...fixture,
      frontmatter: { ...fixture.frontmatter, aiUse: { statement: 'x' } },
    };
    const message = aiUseStampFailure(unstamped, '2026-11-02');
    expect(message).toContain(
      'tests/fixtures/ai-use/stamped-post.md: aiUse carries no reviewed.content stamp.',
    );
    expect(message).toContain('  expected (aiUse.reviewed.content): (none)');
  });
});

describe('AI-use stamp — what the hash covers', () => {
  const base = fixture.source;
  const hash = aiUseContentHash(base);

  it('defines the exclusion list once, in the helper', () => {
    // The helper and this suite import the same frozen array; a second
    // declaration anywhere in the source tree would be free to drift from it.
    expect(Object.isFrozen(AI_USE_NON_PROSE_FIELDS)).toBe(true);
    expect(new Set(AI_USE_NON_PROSE_FIELDS).size).toBe(AI_USE_NON_PROSE_FIELDS.length);
    expect(AI_USE_NON_PROSE_FIELDS).not.toContain(AI_USE_FIELD);

    const declarations = ['src', 'scripts', 'tests']
      .flatMap((dir) =>
        findFilesRecursively(resolve(ROOT, dir), (f) => /\.(?:m?js|ts|astro)$/.test(f)),
      )
      .filter((f) => /\bAI_USE_NON_PROSE_FIELDS\s*=/.test(readFileSync(f, 'utf8')))
      .map((f) => relative(ROOT, f));
    expect(declarations).toEqual(['src/lib/ai-use-stamp.mjs']);
  });

  it('excludes only fields the blog or projects schema declares', () => {
    // A misspelled exclusion would exclude nothing and hide the mistake.
    const config = readFileSync(resolve(ROOT, 'src/content.config.ts'), 'utf8');
    const collections = ['projects', 'blog'].map((name) => {
      const start = config.search(new RegExp(`const\\s+${name}\\s*=\\s*defineCollection\\(\\{`));
      expect(start, `missing ${name} collection`).toBeGreaterThan(-1);
      return config.slice(start, config.indexOf('\n});', start));
    });
    for (const field of AI_USE_NON_PROSE_FIELDS) {
      expect(
        collections.some((source) => new RegExp(`^ {4,6}${field}: z`, 'm').test(source)),
        `${field} is not a top-level field of blog or projects`,
      ).toBe(true);
    }
  });

  it('changes when a prose frontmatter field changes', () => {
    expect(
      aiUseContentHash(
        base.replace('A changed takeaway changes the hash.', 'A changed takeaway moves it.'),
      ),
    ).not.toBe(hash);
    expect(aiUseContentHash(setTopLevel(base, 'title', '"Another title"'))).not.toBe(hash);
    expect(
      aiUseContentHash(base.replace('Pull quotes are prose', 'Pull quotes are text')),
    ).not.toBe(hash);
    expect(aiUseContentHash(setTopLevel(base, 'date', '2026-11-02'))).not.toBe(hash);
  });

  it('covers a frontmatter field nobody listed, because it is an exclusion list', () => {
    expect(aiUseContentHash(setTopLevel(base, 'subtitle', '"A new prose field"'))).not.toBe(hash);
  });

  it('does not change when homepageRank changes', () => {
    expect(base).toMatch(/^homepageRank: 2$/m);
    expect(aiUseContentHash(setTopLevel(base, 'homepageRank', '4'))).toBe(hash);
    expect(aiUseContentHash(base.replace(/^homepageRank: 2\n/m, ''))).toBe(hash);
  });

  it('does not change when any excluded field changes', () => {
    for (const field of AI_USE_NON_PROSE_FIELDS) {
      expect(aiUseContentHash(setTopLevel(base, field, '"changed"')), field).toBe(hash);
    }
  });

  it('changes when only aiUse.statement changes, and fails the stamp (#1510)', () => {
    // Regression: before #1510 the hash dropped all of aiUse, so a
    // statement-only edit left the stamp current.
    const edited = base.replace('Fixture only.', 'Fixture only, reworded.');
    expect(splitEntry(edited).body).toBe(splitEntry(base).body);
    expect(aiUseContentHash(edited)).not.toBe(hash);
    expect(aiUseStampFailure({ ...fixture, source: edited }, '2026-11-02')).toContain(
      'the aiUse stamp is stale',
    );
  });

  it('does not change when only aiUse.reviewed changes, since it holds the stamp', () => {
    const recorded = fixture.frontmatter.aiUse.reviewed.content;
    expect(base).toContain(`content: "${recorded}"`);
    expect(aiUseContentHash(base.replace(recorded, 'f'.repeat(64)))).toBe(hash);
    expect(aiUseContentHash(base.replace('date: "2026-11-01"', 'date: "2026-12-01"'))).toBe(hash);
    const unstamped = base.replace(/^ {2}reviewed:\n(?: {4}.*\n)+/m, '');
    expect(unstamped).not.toMatch(/^ {2}reviewed:/m);
    expect(aiUseContentHash(unstamped)).toBe(hash);
  });

  it('hashes the statement as the schema renders it: trimmed, quoting and reflow ignored', () => {
    const statementLine = /^ {2}statement: "(.*)"$/m;
    const [, text] = base.match(statementLine);
    expect(aiUseContentHash(base.replace(statementLine, `  statement: '${text}'`))).toBe(hash);
    expect(aiUseContentHash(base.replace(statementLine, `  statement: "  ${text}  "`))).toBe(hash);
    expect(
      aiUseContentHash(
        base.replace(statementLine, `  statement: >-\n    ${text.replace('. ', '.\n    ')}`),
      ),
    ).toBe(hash);
    // Whitespace inside the statement is text, so it counts.
    expect(aiUseContentHash(base.replace('Fixture only. An', 'Fixture only.  An'))).not.toBe(hash);
  });

  it('refuses to hash aiUse that carries no statement', () => {
    const statementLine = /^ {2}statement: .*\n/m;
    expect(base).toMatch(statementLine);
    for (const replacement of ['', '  statement: ""\n', '  statement: "   "\n', '  statement:\n']) {
      expect(() => aiUseContentHash(base.replace(statementLine, replacement)), replacement).toThrow(
        /aiUse has no statement/,
      );
    }
    expect(() =>
      aiUseContentHash(setTopLevel(base.replace(/^aiUse:\n(?: {2}.*\n)+/m, ''), 'aiUse', '')),
    ).toThrow(/aiUse has no statement/);
  });

  it('hashes a null statement for an entry without aiUse', () => {
    const withoutAiUse = base.replace(/^aiUse:\n(?: {2}.*\n)+/m, '');
    expect(withoutAiUse).not.toMatch(/^ *(?:aiUse|statement|reviewed):/m);
    expect(readerFacingContent(withoutAiUse).statement).toBeNull();
    expect(aiUseContentHash(withoutAiUse)).not.toBe(hash);
  });

  it('changes when the body changes, but not with its outer whitespace', () => {
    expect(aiUseContentHash(base.replace('second paragraph', 'third paragraph'))).not.toBe(hash);
    expect(aiUseContentHash(base.replace('second paragraph', 'second  paragraph'))).not.toBe(hash);
    expect(aiUseContentHash(`${base}\n\n`)).toBe(hash);
    expect(aiUseContentHash(base.replace(/\n$/, ''))).toBe(hash);
  });

  it('does not change with frontmatter key order, at any depth', () => {
    const { body } = splitEntry(base);
    const lines = base.slice(4, base.indexOf('\n---\n', 4)).split('\n');
    // Move `title` from first to last at the top level.
    const topReordered = `---\n${[...lines.slice(1), lines[0]].join('\n')}\n---\n\n${body}\n`;
    expect(topReordered).not.toBe(base);
    expect(aiUseContentHash(topReordered)).toBe(hash);
    // Swap the keys inside a pull quote.
    const nestedReordered = base.replace(
      '  - text: "Pull quotes are prose, so they are hashed."\n    accent: "blue"',
      '  - accent: "blue"\n    text: "Pull quotes are prose, so they are hashed."',
    );
    expect(nestedReordered).not.toBe(base);
    expect(aiUseContentHash(nestedReordered)).toBe(hash);
  });

  it('keeps array order, which readers see', () => {
    const swapped = base.replace(
      '  - "A changed takeaway changes the hash."\n  - "A changed homepage rank does not."',
      '  - "A changed homepage rank does not."\n  - "A changed takeaway changes the hash."',
    );
    expect(swapped).not.toBe(base);
    expect(aiUseContentHash(swapped)).not.toBe(hash);
  });

  it('does not change with YAML quoting', () => {
    expect(base).toMatch(/^date: 2026-11-01$/m);
    expect(aiUseContentHash(setTopLevel(base, 'date', '"2026-11-01"'))).toBe(hash);
    expect(aiUseContentHash(setTopLevel(base, 'author', 'Nathan Payne'))).toBe(hash);
  });

  it('hashes canonical JSON of the body and the kept frontmatter', () => {
    expect(canonicalJson({ b: 1, a: { d: [2, { f: 1, e: 0 }], c: null }, x: undefined })).toBe(
      '{"a":{"c":null,"d":[2,{"e":0,"f":1}]},"b":1}',
    );
    const content = readerFacingContent(base);
    expect(Object.keys(content).sort()).toEqual(['body', 'frontmatter', 'statement']);
    expect(content.statement).toBe(fixture.frontmatter.aiUse.statement);
    expect(Object.keys(content.frontmatter)).not.toContain(AI_USE_FIELD);
    for (const field of AI_USE_NON_PROSE_FIELDS) {
      expect(Object.keys(content.frontmatter)).not.toContain(field);
    }
    expect(content.frontmatter.keyTakeaways).toEqual([
      'A changed takeaway changes the hash.',
      'A changed homepage rank does not.',
    ]);
    // The statement is its own member, outside frontmatter, so a frontmatter
    // field cannot stand in for it.
    expect(aiUseContentHash(base)).toBe(
      createHash('sha256').update(canonicalJson(content), 'utf8').digest('hex'),
    );
    expect(
      aiUseContentHash(setTopLevel(base, 'statement', JSON.stringify(content.statement))),
    ).not.toBe(hash);
  });

  it('ends the frontmatter only at a whole `---` line', () => {
    const tricky = setTopLevel(base, 'note', '"----"');
    expect(splitEntry(tricky).body).toBe(splitEntry(base).body);
    expect(() => splitEntry('no frontmatter here')).toThrow(/no frontmatter/);
  });

  it('splits every real entry where the content layer does', () => {
    // The body hashed must be the body Astro loads, or a stamp could pass over
    // text the page does not render. Astro's splitter is the comparison, not
    // the definition, so a change in its internals cannot re-key every stamp.
    for (const e of [...entries, fixture]) {
      expect(splitEntry(e.source).body, e.path).toBe(
        astroParseFrontmatter(e.source).content.trim(),
      );
    }
  });
});

describe('AI-use stamp — the hash command', () => {
  it('is an npm script that prints the hash the test computes', () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));
    expect(pkg.scripts[AI_USE_HASH_SCRIPT]).toBe('node scripts/ai-use-hash.mjs');
    expect(aiUseHashCommand('src/content/blog/x.md')).toBe(
      `npm run --silent ${AI_USE_HASH_SCRIPT} -- src/content/blog/x.md`,
    );

    const run = spawnSync(process.execPath, ['scripts/ai-use-hash.mjs', fixture.path], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    expect(run.status, run.stderr).toBe(0);
    expect(run.stdout).toBe(`${aiUseContentHash(fixture.source)}\n`);
  });

  it('fails with usage when not given exactly one entry', () => {
    for (const args of [[], [fixture.path, fixture.path], ['--help']]) {
      const run = spawnSync(process.execPath, ['scripts/ai-use-hash.mjs', ...args], {
        cwd: ROOT,
        encoding: 'utf8',
      });
      expect(run.status).toBe(2);
      expect(run.stderr).toContain('usage: npm run --silent ai-use:hash -- ');
    }
  });
});

describe('AI-use schema', () => {
  const valid = {
    statement: 'An agent wrote the first draft from my notes. I rewrote the argument.',
    reviewed: { content: 'a'.repeat(64), date: '2026-11-01' },
  };
  const parse = (value) => aiUseSchema.safeParse(value).success;

  it('accepts a statement with a stamp', () => {
    expect(parse(valid)).toBe(true);
    expect(parse(fixture.frontmatter.aiUse)).toBe(true);
  });

  it('rejects an empty statement', () => {
    expect(parse({ ...valid, statement: '' })).toBe(false);
    expect(parse({ ...valid, statement: '   ' })).toBe(false);
    expect(parse({ reviewed: valid.reviewed })).toBe(false);
  });

  it('rejects a malformed hash', () => {
    for (const content of ['a'.repeat(63), 'a'.repeat(65), 'A'.repeat(64), 'g'.repeat(64), '']) {
      expect(parse({ ...valid, reviewed: { ...valid.reviewed, content } }), content).toBe(false);
    }
    expect(sha256Hex.safeParse(aiUseContentHash(fixture.source)).success).toBe(true);
  });

  it('rejects an invalid date', () => {
    for (const date of ['2026-13-01', '2026-02-29', '2026-11-1', 'November 1, 2026', '']) {
      expect(parse({ ...valid, reviewed: { ...valid.reviewed, date } }), date).toBe(false);
    }
    // An unquoted YAML date reaches Zod as a Date, which is why the remedy
    // prints quoted values.
    expect(parse({ ...valid, reviewed: { ...valid.reviewed, date: new Date('2026-11-01') } })).toBe(
      false,
    );
  });

  it('rejects an unknown key at either level', () => {
    expect(parse({ ...valid, template: 'agent-drafted' })).toBe(false);
    expect(parse({ ...valid, reviewed: { ...valid.reviewed, by: 'owner' } })).toBe(false);
    expect(parse({ statement: valid.statement })).toBe(false);
  });

  it('is optional on blog and projects during rollout, so entries without it still build', () => {
    // #1498 makes it required once every entry carries an approved statement.
    // Until then an entry without aiUse must build; `npm test` builds every
    // entry, and the schema below is what lets it.
    const config = readFileSync(resolve(ROOT, 'src/content.config.ts'), 'utf8');
    expect(config).toContain(
      "import { aiUseSchema, sha256Hex } from './lib/content-stamp-schema';",
    );
    expect(config.match(/^\s+aiUse: aiUseSchema\.optional\(\),$/gm)).toHaveLength(2);
    expect(aiUseSchema.optional().safeParse(undefined).success).toBe(true);
  });
});
