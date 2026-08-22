#!/usr/bin/env node
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { visit } from 'unist-util-visit';

const CONTENT_ROOT = resolve(process.cwd(), 'src/content');
const TARGET_EXTENSIONS = new Set(['.md', '.mdx']);

// A spaced em dash, padded by one or more spaces on each side. Matching the
// whole padding run means `word  —  next` collapses in a single pass instead
// of leaving a violation behind for the next lint run.
const SPACED_EM_DASH = / +— +/g;

// `[DST-047 — Title]` keeps its separator: the dash after the identifier is a
// delimiter, not prose punctuation. The match deliberately stops at the
// separator, so any *later* dash in the same label is still linted.
const IDENTIFIER_LABEL_EXCEPTION = /\[[A-Z]{2,}[A-Z0-9_-]*-\d+\s+—\s+/g;

// Frontmatter is YAML rather than Markdown, but it carries published prose
// (titles, card copy, pull quotes), so it is scanned as plain text. Only the
// body below it is parsed as Markdown.
const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/;

// Node types whose source span is code or raw markup, never prose. `code`
// covers fenced and indented blocks alike, at any container depth, because
// the span comes from the parsed tree rather than from a line scan.
const NON_PROSE_NODES = new Set(['code', 'inlineCode', 'html']);

function collectMatchRanges(regex, source) {
  const cloned = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : `${regex.flags}g`);
  const ranges = [];
  let match;
  while ((match = cloned.exec(source)) !== null) {
    ranges.push([match.index, match.index + match[0].length]);
  }
  return ranges;
}

function frontmatterLength(source) {
  const match = source.match(FRONTMATTER);
  return match ? match[0].length : 0;
}

// Source offsets of every code or raw-markup span in the Markdown body.
// Parsing rather than line-scanning is what makes indented code blocks,
// fences nested in block quotes or list items, and multi-line code spans all
// fall out correctly.
function collectNonProseRanges(source) {
  const bodyStart = frontmatterLength(source);
  const tree = fromMarkdown(source.slice(bodyStart));
  const ranges = [];

  visit(tree, (node) => {
    if (!NON_PROSE_NODES.has(node.type)) {
      return;
    }
    const { start, end } = node.position ?? {};
    if (start?.offset === undefined || end?.offset === undefined) {
      return;
    }
    ranges.push([start.offset + bodyStart, end.offset + bodyStart]);
  });

  return ranges;
}

function isInsideAnyRange(start, end, ranges) {
  return ranges.some(([rangeStart, rangeEnd]) => start >= rangeStart && end <= rangeEnd);
}

function overlapsAnyRange(start, end, ranges) {
  return ranges.some(([rangeStart, rangeEnd]) => start < rangeEnd && end > rangeStart);
}

// The spaced-em-dash matches in `source` that are neither inside code nor
// covered by the identifier-label exception.
function collectViolationRanges(source) {
  const nonProseRanges = collectNonProseRanges(source);
  const exceptionRanges = collectMatchRanges(IDENTIFIER_LABEL_EXCEPTION, source);

  return collectMatchRanges(SPACED_EM_DASH, source).filter(
    ([start, end]) =>
      !overlapsAnyRange(start, end, nonProseRanges) &&
      !isInsideAnyRange(start, end, exceptionRanges),
  );
}

function buildLineIndex(source) {
  const starts = [0];
  for (let i = 0; i < source.length; i += 1) {
    if (source[i] === '\n') {
      starts.push(i + 1);
    }
  }
  return starts;
}

function locationOf(offset, lineStarts, source) {
  let low = 0;
  let high = lineStarts.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (lineStarts[mid] <= offset) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  const lineStart = lineStarts[low];
  const lineEnd = source.indexOf('\n', lineStart);
  return {
    line: low + 1,
    column: offset - lineStart + 1,
    snippet: source.slice(lineStart, lineEnd === -1 ? source.length : lineEnd).trim(),
  };
}

export function findSpacedEmDashViolations(filePath, source) {
  const lineStarts = buildLineIndex(source);

  return collectViolationRanges(source).map(([start]) => ({
    filePath,
    ...locationOf(start, lineStarts, source),
  }));
}

export function closeUpSpacedEmDashesInText(source) {
  let fixed = '';
  let cursor = 0;

  for (const [start, end] of collectViolationRanges(source)) {
    fixed += `${source.slice(cursor, start)}—`;
    cursor = end;
  }

  // Splicing the original string leaves every byte outside a violation
  // untouched, so a CRLF file stays CRLF.
  return fixed + source.slice(cursor);
}

function collectContentFiles(dir) {
  const fileEntries = readdirSync(dir, { withFileTypes: true });
  let files = [];

  for (const entry of fileEntries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(collectContentFiles(fullPath));
      continue;
    }

    if (TARGET_EXTENSIONS.has(extname(fullPath))) {
      files.push(fullPath);
    }
  }

  return files;
}

function scanFiles(files) {
  let violations = [];

  for (const filePath of files) {
    violations = violations.concat(
      findSpacedEmDashViolations(filePath, readFileSync(filePath, 'utf8')),
    );
  }

  return violations;
}

function reportViolations(violations) {
  for (const violation of violations) {
    console.error(
      `${violation.filePath}:${violation.line}:${violation.column}: use an unspaced em dash (—).`,
    );
    if (violation.snippet) {
      console.error(`  ${violation.snippet}`);
    }
  }
}

function printUsageAndExit(code = 0) {
  console.log(`Usage:
  node scripts/lint-content-em-dash.mjs [--write]

Checks for spaced em dashes in src/content markdown files and reports violations.
Exceptions: bracketed ID-title labels such as [DST-047 — Title] remain allowed.`);
  process.exit(code);
}

function main() {
  const args = process.argv.slice(2);
  const applyWrite = args.includes('--write');
  const shouldHelp = args.includes('-h') || args.includes('--help');

  if (shouldHelp) {
    printUsageAndExit(0);
  }

  const files = collectContentFiles(CONTENT_ROOT);

  if (!applyWrite) {
    const violations = scanFiles(files);
    if (violations.length > 0) {
      reportViolations(violations);
      process.exit(1);
    }
    return;
  }

  let fixedCount = 0;

  for (const filePath of files) {
    const source = readFileSync(filePath, 'utf8');
    const fixedSource = closeUpSpacedEmDashesInText(source);
    if (fixedSource !== source) {
      writeFileSync(filePath, fixedSource, 'utf8');
      fixedCount += 1;
    }
  }

  console.log(`content em-dash lint: fixed ${fixedCount} file${fixedCount === 1 ? '' : 's'}`);

  // A write pass that leaves violations behind must not report success.
  const remaining = scanFiles(files);
  if (remaining.length > 0) {
    console.error('content em-dash lint: violations remain after --write.');
    reportViolations(remaining);
    process.exit(1);
  }
}

// Importing this module for its helpers must not run a repository-wide scan
// or call process.exit().
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
