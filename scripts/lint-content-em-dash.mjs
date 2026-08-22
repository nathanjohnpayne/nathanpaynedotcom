#!/usr/bin/env node
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fromMarkdown } from 'mdast-util-from-markdown';

const CONTENT_ROOT = resolve(process.cwd(), 'src/content');

// `.md` only. The body is parsed as plain CommonMark, which does not
// recognize MDX expressions or JSX, so an `.mdx` file would have its embedded
// code read as prose and potentially rewritten. Adding `.mdx` back requires an
// MDX-aware parser that can exclude expression and JSX node spans.
const TARGET_EXTENSIONS = new Set(['.md']);

// Padding is any rendered horizontal space. `\p{Zs}` covers the whole Unicode
// space-separator category — ordinary, no-break, narrow no-break, thin, and
// the rest — because pasted prose carries them and each renders as the gap
// the rule prohibits. A line break is deliberately excluded: the prose stream
// below turns a soft break into a space and everything else into `\n`, so a
// newline surviving in the stream is a boundary padding may not cross.
const PADDED_EM_DASH = /[\p{Zs}\t]*—[\p{Zs}\t]*/gu;

// `[DST-047 — Title]` keeps its separator: the dash after the identifier is a
// delimiter, not prose punctuation. Matched against raw source so it covers
// both a Markdown link label and a plain bracketed label; the match stops at
// the separator, so any *later* dash in the same label is still linted.
const IDENTIFIER_LABEL_EXCEPTION = /\[[A-Z]{2,}[A-Z0-9_-]*-\d+[\p{Zs}\t]+—[\p{Zs}\t]+/gu;

const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/;

// Everything before a value on a YAML line: indentation, sequence dashes, and
// an optional `key:`. Whitespace that follows such a prefix is YAML syntax,
// not prose padding — rewriting it would turn `title: —` into `title:—` and
// break the frontmatter mapping.
const YAML_VALUE_PREFIX = /^[\p{Zs}\t]*(?:-[\p{Zs}\t]*)*(?:[^:\n]+:)?[\p{Zs}\t]*$/u;

// HTML elements whose content is raw text or code rather than prose. Their
// bodies are left alone: rewriting `<pre>a — b</pre>` would edit a code
// sample, and rewriting a `<script>` string would edit executable source.
const HTML_RAW_TEXT_ELEMENT = /<(script|style|pre|code|textarea)\b[\s\S]*?<\/\1\s*>/gi;
const HTML_MARKUP = /<!--[\s\S]*?-->|<[^>]*>/g;

// Block-level nodes. Padding may not run across their edges, because the
// rendered output puts a line break there.
const BLOCK_NODES = new Set([
  'blockquote',
  'definition',
  'footnoteDefinition',
  'heading',
  'list',
  'listItem',
  'paragraph',
  'table',
  'tableCell',
  'tableRow',
  'thematicBreak',
]);

// Nodes that render no prose at all. `code` and `inlineCode` are code;
// `image` alt text is not addressed by this rule; `break` is a hard line
// break, which is a boundary rather than padding.
const OPAQUE_NODES = new Set(['break', 'code', 'image', 'inlineCode']);

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

// ---------------------------------------------------------------------------
// Rendered prose stream
//
// The scan runs over what the Markdown *renders*, not over its source. That is
// what lets it see a dash padded through inline markup (`word **—** next`), a
// character reference (`word &mdash; next`), or a soft line break, none of
// which a raw-source regex can match. Every stream character carries the
// source span that produced it, so a fix can still be applied as a precise
// source edit.
// ---------------------------------------------------------------------------

function createProseStream() {
  return { text: '', spans: [], fixed: [] };
}

// `isFixed` marks a character the fixer must not delete — a soft line break,
// which renders as a space but whose newline is structural. Deleting it would
// reflow the source and could glue two block elements together.
function pushCharacter(stream, character, span, isFixed = false) {
  stream.text += character;
  stream.spans.push(span);
  stream.fixed.push(isFixed);
}

function pushBoundary(stream) {
  if (stream.text.length > 0 && !stream.text.endsWith('\n')) {
    pushCharacter(stream, '\n', null, true);
  }
}

// Map each character of a node's decoded value back to the source span that
// produced it. The two run at different lengths wherever the source used a
// character reference (`&mdash;`) or a backslash escape.
function alignValueToSource(value, raw) {
  const spans = [];
  let cursor = 0;

  for (const character of value) {
    if (cursor >= raw.length) {
      spans.push([raw.length, raw.length]);
      continue;
    }

    if (raw[cursor] === character) {
      spans.push([cursor, cursor + character.length]);
      cursor += character.length;
      continue;
    }

    if (raw[cursor] === '&') {
      const semicolon = raw.indexOf(';', cursor);
      if (semicolon !== -1 && semicolon - cursor <= 32) {
        spans.push([cursor, semicolon + 1]);
        cursor = semicolon + 1;
        continue;
      }
    }

    if (raw[cursor] === '\\') {
      spans.push([cursor, cursor + 2]);
      cursor += 2;
      continue;
    }

    spans.push([cursor, cursor + 1]);
    cursor += 1;
  }

  return spans;
}

function emitText(node, body, stream) {
  const start = node.position.start.offset;
  const raw = body.slice(start, node.position.end.offset);
  const spans = alignValueToSource(node.value, raw);

  [...node.value].forEach((character, index) => {
    const [spanStart, spanEnd] = spans[index];
    const span = [spanStart + start, spanEnd + start];

    // A soft break renders as a space, so it is padding — but its source
    // newline must survive the fix.
    if (character === '\n') {
      pushCharacter(stream, ' ', span, true);
      return;
    }

    pushCharacter(stream, character, span);
  });
}

// A raw-HTML span is not uniformly opaque: the tags are markup, the body of a
// raw-text element is code, and everything else between tags is visible prose.
function emitHtml(node, body, stream) {
  const start = node.position.start.offset;
  const raw = body.slice(start, node.position.end.offset);
  const skip = [
    ...collectMatchRanges(HTML_RAW_TEXT_ELEMENT, raw),
    ...collectMatchRanges(HTML_MARKUP, raw),
  ];

  pushBoundary(stream);
  for (let index = 0; index < raw.length; index += 1) {
    if (skip.some(([skipStart, skipEnd]) => index >= skipStart && index < skipEnd)) {
      pushBoundary(stream);
      continue;
    }
    pushCharacter(stream, raw[index], [index + start, index + start + 1]);
  }
  pushBoundary(stream);
}

// A link title (`[a](/url "title")`) is published text, so it is scanned. The
// destination never is.
function emitLinkTitle(node, body, stream) {
  if (!node.title) {
    return;
  }

  const nodeEnd = node.position.end.offset;
  const titleStart = body.lastIndexOf(node.title, nodeEnd);
  if (titleStart === -1 || titleStart < node.position.start.offset) {
    return;
  }

  pushBoundary(stream);
  [...node.title].forEach((character, index) => {
    pushCharacter(stream, character, [titleStart + index, titleStart + index + 1]);
  });
  pushBoundary(stream);
}

function emitNode(node, body, stream) {
  if (OPAQUE_NODES.has(node.type)) {
    pushBoundary(stream);
    return;
  }

  if (node.type === 'text') {
    emitText(node, body, stream);
    return;
  }

  if (node.type === 'html') {
    emitHtml(node, body, stream);
    return;
  }

  const isBlock = BLOCK_NODES.has(node.type);
  if (isBlock) {
    pushBoundary(stream);
  }

  for (const child of node.children ?? []) {
    emitNode(child, body, stream);
  }

  if (node.type === 'link' || node.type === 'linkReference') {
    emitLinkTitle(node, body, stream);
  }

  if (isBlock) {
    pushBoundary(stream);
  }
}

function buildProseStream(body) {
  const stream = createProseStream();
  emitNode(fromMarkdown(body), body, stream);
  return stream;
}

// ---------------------------------------------------------------------------
// Violations
// ---------------------------------------------------------------------------

// A violation is a dash plus the source spans of the padding around it. The
// spans are what a fix deletes; the dash itself is never touched.
function bodyViolations(source) {
  const bodyStart = frontmatterLength(source);
  const stream = buildProseStream(source.slice(bodyStart));
  const exceptionRanges = collectMatchRanges(IDENTIFIER_LABEL_EXCEPTION, source);
  const violations = [];

  for (const [start, end] of collectMatchRanges(PADDED_EM_DASH, stream.text)) {
    const removals = [];
    let dashOffset = null;

    for (let index = start; index < end; index += 1) {
      const span = stream.spans[index];
      if (!span) {
        continue;
      }
      if (stream.text[index] === '—') {
        dashOffset = span[0] + bodyStart;
        continue;
      }
      if (!stream.fixed[index]) {
        removals.push([span[0] + bodyStart, span[1] + bodyStart]);
      }
    }

    if (dashOffset === null || end - start < 2) {
      continue;
    }
    if (exceptionRanges.some(([rangeStart, rangeEnd]) => dashOffset >= rangeStart && dashOffset < rangeEnd)) {
      continue;
    }

    violations.push({ offset: dashOffset, removals });
  }

  return violations;
}

// Strip a YAML end-of-line comment, without mistaking a `#` inside a quoted
// scalar for one.
function yamlCommentStart(line) {
  let quote = null;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (quote) {
      if (character === '\\' && quote === '"') {
        index += 1;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }

    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }

    if (character === '#' && (index === 0 || /[\p{Zs}\t]/u.test(line[index - 1]))) {
      return index;
    }
  }

  return line.length;
}

// Frontmatter is YAML, not Markdown, but it carries most of this repo's
// published prose (titles, card copy, pull quotes). It is scanned line by
// line: a line break separates scalars rather than joining them, structural
// prefixes are not padding, and comments are not published.
function frontmatterViolations(source) {
  const end = frontmatterLength(source);
  if (end === 0) {
    return [];
  }

  const exceptionRanges = collectMatchRanges(IDENTIFIER_LABEL_EXCEPTION, source);
  const violations = [];
  let lineStart = 0;

  while (lineStart < end) {
    const newline = source.indexOf('\n', lineStart);
    const lineEnd = newline === -1 || newline > end ? end : newline;
    const line = source.slice(lineStart, lineEnd).replace(/\r$/, '');
    const scanEnd = lineStart + yamlCommentStart(line);

    for (const [start, matchEnd] of collectMatchRanges(PADDED_EM_DASH, line)) {
      const absoluteStart = lineStart + start;
      const absoluteEnd = Math.min(lineStart + matchEnd, scanEnd);
      const dashOffset = source.indexOf('—', absoluteStart);
      if (dashOffset === -1 || dashOffset >= scanEnd) {
        continue;
      }

      // Whitespace after `key:` or a sequence `-` is YAML syntax.
      const prefixIsStructural = YAML_VALUE_PREFIX.test(source.slice(lineStart, absoluteStart));
      const paddingStart = prefixIsStructural ? dashOffset : absoluteStart;

      const removals = [];
      if (paddingStart < dashOffset) {
        removals.push([paddingStart, dashOffset]);
      }
      if (absoluteEnd > dashOffset + 1) {
        removals.push([dashOffset + 1, absoluteEnd]);
      }

      if (removals.length === 0) {
        continue;
      }
      if (exceptionRanges.some(([rangeStart, rangeEnd]) => dashOffset >= rangeStart && dashOffset < rangeEnd)) {
        continue;
      }

      violations.push({ offset: dashOffset, removals });
    }

    lineStart = lineEnd + 1;
  }

  return violations;
}

function collectViolations(source) {
  return [...frontmatterViolations(source), ...bodyViolations(source)].sort(
    (a, b) => a.offset - b.offset,
  );
}

function buildLineIndex(source) {
  const starts = [0];
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === '\n') {
      starts.push(index + 1);
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
  const newline = source.indexOf('\n', lineStart);
  return {
    line: low + 1,
    column: offset - lineStart + 1,
    snippet: source.slice(lineStart, newline === -1 ? source.length : newline).trim(),
  };
}

export function findSpacedEmDashViolations(filePath, source) {
  const lineStarts = buildLineIndex(source);

  return collectViolations(source).map((violation) => ({
    filePath,
    ...locationOf(violation.removals[0]?.[0] ?? violation.offset, lineStarts, source),
  }));
}

export function closeUpSpacedEmDashesInText(source) {
  const removals = collectViolations(source)
    .flatMap((violation) => violation.removals)
    .sort((a, b) => a[0] - b[0]);

  let fixed = '';
  let cursor = 0;

  for (const [start, end] of removals) {
    if (start < cursor) {
      continue;
    }
    fixed += source.slice(cursor, start);
    cursor = end;
  }

  // Splicing the original string leaves every byte outside a removal
  // untouched, so a CRLF file stays CRLF.
  return fixed + source.slice(cursor);
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

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

  if (args.includes('-h') || args.includes('--help')) {
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
