#!/usr/bin/env node
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { visit } from 'unist-util-visit';

const CONTENT_ROOT = resolve(process.cwd(), 'src/content');
// `.md` only. The body is parsed as plain CommonMark, which does not
// recognize MDX expressions or JSX, so an `.mdx` file would have its embedded
// code read as prose and potentially rewritten. Adding `.mdx` back requires an
// MDX-aware parser that can exclude expression and JSX node spans.
const TARGET_EXTENSIONS = new Set(['.md']);

// Horizontal whitespace that reads as padding around a dash. No-break and
// narrow no-break spaces are included because pasted prose carries them and
// they render as the prohibited gap.
const PADDING = ' \\t\\u00a0\\u202f';

// Padding on one side of a dash: horizontal whitespace, optionally running
// across a single soft line break. Markdown renders a soft break as a space,
// so `word —\ncontinuation` publishes the prohibited gap and must be caught.
// The lookahead stops the run at a blank line, which is a paragraph break
// rather than a soft break.
const SIDE_PADDING = `[${PADDING}]*(?:\\r?\\n(?![${PADDING}]*\\r?\\n)[${PADDING}]*)?`;

// An em dash carrying any padding on either side. Matching the whole padding
// run catches one-sided spacing (`word —next`), tabs, and multi-space
// padding, and collapses each in a single pass instead of leaving a violation
// behind for the next lint run. A bare `—` matches with zero padding and is
// filtered out below.
const PADDED_EM_DASH = new RegExp(`${SIDE_PADDING}—${SIDE_PADDING}`, 'g');

// `[DST-047 — Title]` keeps its separator: the dash after the identifier is a
// delimiter, not prose punctuation. The match deliberately stops at the
// separator, so any *later* dash in the same label is still linted.
const IDENTIFIER_LABEL_EXCEPTION = new RegExp(
  `\\[[A-Z]{2,}[A-Z0-9_-]*-\\d+[${PADDING}]+—[${PADDING}]+`,
  'g',
);

// Everything before a value on a YAML line: indentation, sequence dashes, and
// an optional `key:`. Whitespace that follows such a prefix is YAML syntax,
// not prose padding — rewriting it would turn `title: —` into `title:—` and
// break the frontmatter mapping.
const YAML_VALUE_PREFIX = new RegExp(`^[${PADDING}]*(?:-[${PADDING}]*)*(?:[^:\\n]+:)?[${PADDING}]*$`);

// Tags and comments inside a raw-HTML span. The markup itself is not prose,
// but the visible text between tags is.
const HTML_MARKUP = /<!--[\s\S]*?-->|<[^>]*>/g;

// Nodes carrying a link destination, whose URL is not prose even though it
// sits in the middle of a line of it.
const LINK_NODES = new Set(['link', 'image', 'definition']);

// Frontmatter is YAML rather than Markdown, but it carries published prose
// (titles, card copy, pull quotes), so it is scanned as plain text. Only the
// body below it is parsed as Markdown.
const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/;

// Node types whose entire source span is code, never prose. `code` covers
// fenced and indented blocks alike, at any container depth, because the span
// comes from the parsed tree rather than from a line scan. `html` is handled
// separately: only its markup is excluded, not the text it wraps.
const NON_PROSE_NODES = new Set(['code', 'inlineCode']);

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

// End offset of a link destination starting at `start`. Handles the
// angle-bracket form (`<...>`, which may legally contain spaces) and the bare
// form, which ends at the first whitespace or the unbalanced closing paren.
function destinationEnd(source, start, limit) {
  let i = start;
  while (i < limit && /[ \t\n]/.test(source[i])) {
    i += 1;
  }

  if (source[i] === '<') {
    const close = source.indexOf('>', i);
    return close === -1 || close >= limit ? limit : close + 1;
  }

  let depth = 0;
  while (i < limit) {
    const character = source[i];
    if (character === '\\') {
      i += 2;
      continue;
    }
    if (character === '(') {
      depth += 1;
    } else if (character === ')') {
      if (depth === 0) {
        return i;
      }
      depth -= 1;
    } else if (/[ \t\n]/.test(character)) {
      return i;
    }
    i += 1;
  }

  return limit;
}

// The destination span of a link, image, or definition node, in source
// offsets. The label and any link title are deliberately left out: both are
// published text and stay subject to the lint.
function linkDestinationRange(node, source, nodeStart, nodeEnd) {
  if (node.type === 'definition') {
    const marker = source.indexOf(']:', nodeStart);
    if (marker === -1 || marker >= nodeEnd) {
      return null;
    }
    return [marker + 2, destinationEnd(source, marker + 2, nodeEnd)];
  }

  const lastChild = node.children?.[node.children.length - 1];
  const labelEnd =
    lastChild?.position?.end?.offset === undefined ? nodeStart : lastChild.position.end.offset;
  const open = source.indexOf('](', Math.max(labelEnd, nodeStart));
  if (open === -1 || open >= nodeEnd) {
    return null;
  }
  return [open + 2, destinationEnd(source, open + 2, nodeEnd)];
}

// Source offsets of every code or raw-markup span in the Markdown body.
// Parsing rather than line-scanning is what makes indented code blocks,
// fences nested in block quotes or list items, and multi-line code spans all
// fall out correctly.
function collectNonProseRanges(source) {
  const bodyStart = frontmatterLength(source);
  const body = source.slice(bodyStart);
  const tree = fromMarkdown(body);
  const ranges = [];

  visit(tree, (node) => {
    const { start, end } = node.position ?? {};
    if (start?.offset === undefined || end?.offset === undefined) {
      return;
    }

    if (NON_PROSE_NODES.has(node.type)) {
      ranges.push([start.offset + bodyStart, end.offset + bodyStart]);
      return;
    }

    // mdast reports a raw-HTML block as one node covering its rendered text
    // too. Excluding the whole node would let a spaced em dash inside
    // `<div>visible — prose</div>` slip through, so exclude only the markup.
    if (node.type === 'html') {
      const offset = start.offset + bodyStart;
      for (const [markupStart, markupEnd] of collectMatchRanges(
        HTML_MARKUP,
        source.slice(offset, end.offset + bodyStart),
      )) {
        ranges.push([markupStart + offset, markupEnd + offset]);
      }
      return;
    }

    if (LINK_NODES.has(node.type)) {
      const destination = linkDestinationRange(
        node,
        body,
        start.offset,
        end.offset,
      );
      if (destination) {
        ranges.push([destination[0] + bodyStart, destination[1] + bodyStart]);
      }
    }
  });

  return ranges;
}

function isInsideAnyRange(start, end, ranges) {
  return ranges.some(([rangeStart, rangeEnd]) => start >= rangeStart && end <= rangeEnd);
}

function overlapsAnyRange(start, end, ranges) {
  return ranges.some(([rangeStart, rangeEnd]) => start < rangeEnd && end > rangeStart);
}

// Frontmatter is YAML, so two of the Markdown assumptions above do not hold.
// A line break separates scalars rather than joining them, and the whitespace
// after `key:` or a sequence `-` is syntax rather than prose padding —
// rewriting it would turn `title: —` into `title:—` and break the mapping.
// Clip the match to the dash's own line, and past any structural prefix.
function clipToYamlValue(source, range, frontmatterEnd) {
  const [start, end] = range;
  if (start >= frontmatterEnd) {
    return range;
  }

  const dashIndex = source.indexOf('—', start);
  if (dashIndex === -1) {
    return range;
  }

  const lineStart = source.lastIndexOf('\n', dashIndex - 1) + 1;
  const newlineIndex = source.indexOf('\n', dashIndex);
  const lineEnd = newlineIndex === -1 ? source.length : newlineIndex;

  let clippedStart = Math.max(start, lineStart);
  if (YAML_VALUE_PREFIX.test(source.slice(lineStart, clippedStart))) {
    clippedStart = dashIndex;
  }

  return [clippedStart, Math.min(end, lineEnd)];
}

// The padded-em-dash matches in `source` that are neither inside code nor
// covered by the identifier-label exception.
function collectViolationRanges(source) {
  const frontmatterEnd = frontmatterLength(source);
  const nonProseRanges = collectNonProseRanges(source);
  const exceptionRanges = collectMatchRanges(IDENTIFIER_LABEL_EXCEPTION, source);

  return collectMatchRanges(PADDED_EM_DASH, source)
    .map((range) => clipToYamlValue(source, range, frontmatterEnd))
    .filter(
      ([start, end]) =>
        // A dash with no padding left around it is already correct.
        end - start > 1 &&
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

// Drop the padding around a matched dash, but keep any line break it spans.
// Deleting the newline would reflow the source and can glue two block
// elements together (`- one —\n- two`). A violation that only a reflow can
// close is therefore reported, not silently rewritten.
function collapsePadding(matched) {
  const dash = matched.indexOf('—');
  const before = matched.slice(0, dash);
  const after = matched.slice(dash + 1);

  return `${before.includes('\n') ? before : ''}—${after.includes('\n') ? after : ''}`;
}

export function closeUpSpacedEmDashesInText(source) {
  let fixed = '';
  let cursor = 0;

  for (const [start, end] of collectViolationRanges(source)) {
    fixed += source.slice(cursor, start) + collapsePadding(source.slice(start, end));
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
