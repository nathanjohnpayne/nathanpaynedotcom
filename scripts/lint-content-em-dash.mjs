#!/usr/bin/env node
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const CONTENT_ROOT = resolve(process.cwd(), 'src/content');
const TARGET_EXTENSIONS = new Set(['.md', '.mdx']);
const SPACED_EM_DASH = / — /g;
const IDENTIFIER_LABEL_EXCEPTION = /\[[A-Z]{2,}[A-Z0-9_-]*-\d+\s—\s[^\]]+\](?:\([^)]+\))?/g;
const CODE_FENCE_OPEN = /^ {0,3}([`~]{3,})(.*)$/;
const CODE_FENCE_CLOSE = /^ {0,3}([`~]{3,})\s*$/;

function collectRanges(regex, line) {
  const cloned = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : `${regex.flags}g`);
  const ranges = [];
  let match;
  while ((match = cloned.exec(line)) !== null) {
    ranges.push([match.index, match.index + match[0].length]);
  }
  return ranges;
}

function removeInlineCodeToSpaces(line) {
  let output = '';
  let i = 0;
  let inInlineCode = false;
  let inlineFenceLen = 0;

  while (i < line.length) {
    if (line[i] !== '`') {
      output += inInlineCode ? ' ' : line[i];
      i += 1;
      continue;
    }

    let j = i;
    while (j < line.length && line[j] === '`') {
      j += 1;
    }
    const runLen = j - i;
    output += ' '.repeat(runLen);

    if (!inInlineCode) {
      inInlineCode = true;
      inlineFenceLen = runLen;
    } else if (runLen >= inlineFenceLen) {
      inInlineCode = false;
      inlineFenceLen = 0;
    }

    i = j;
  }

  return output;
}

function updateCodeFenceState(line, state) {
  const openMatch = line.match(CODE_FENCE_OPEN);

  if (!state.inCodeBlock) {
    if (!openMatch) {
      return { ...state, isFenceBoundary: false };
    }

    const marker = openMatch[1];
    return {
      inCodeBlock: true,
      fenceChar: marker[0],
      fenceLen: marker.length,
      isFenceBoundary: true,
    };
  }

  if (!openMatch) {
    return { ...state, isFenceBoundary: false };
  }

  const closeMatch = line.match(CODE_FENCE_CLOSE);
  if (!closeMatch) {
    return { ...state, isFenceBoundary: false };
  }

  const marker = closeMatch[1];
  const isClose =
    marker[0] === state.fenceChar &&
    marker.length >= (state.fenceLen || 0);

  if (!isClose) {
    return { ...state, isFenceBoundary: false };
  }

  return {
    inCodeBlock: false,
    fenceChar: null,
    fenceLen: null,
    isFenceBoundary: true,
  };
}

function isRangeInsideExceptions(start, end, ranges) {
  return ranges.some(([exceptionStart, exceptionEnd]) => start >= exceptionStart && end <= exceptionEnd);
}

function fixContentLine(line) {
  const lineWithoutInlineCode = removeInlineCodeToSpaces(line);
  const exceptionRanges = collectRanges(IDENTIFIER_LABEL_EXCEPTION, lineWithoutInlineCode);
  const spacedDashRanges = collectRanges(SPACED_EM_DASH, lineWithoutInlineCode);

  let fixed = '';
  let cursor = 0;

  for (const [start, end] of spacedDashRanges) {
    if (isRangeInsideExceptions(start, end, exceptionRanges)) {
      continue;
    }

    fixed += `${line.slice(cursor, start)}—`;
    cursor = end;
  }

  fixed += line.slice(cursor);
  return fixed;
}

export function findSpacedEmDashViolations(filePath, source) {
  const violations = [];
  const lines = source.split(/\r?\n/);
  const fenceState = { inCodeBlock: false, fenceChar: null, fenceLen: null, isFenceBoundary: false };

  lines.forEach((line, index) => {
    Object.assign(fenceState, updateCodeFenceState(line, fenceState));

    if (fenceState.isFenceBoundary || fenceState.inCodeBlock) {
      return;
    }

    const lineWithoutInlineCode = removeInlineCodeToSpaces(line);
    const exceptionRanges = collectRanges(IDENTIFIER_LABEL_EXCEPTION, lineWithoutInlineCode);
    const spacedDashRanges = collectRanges(SPACED_EM_DASH, lineWithoutInlineCode);

    for (const [start, end] of spacedDashRanges) {
      if (isRangeInsideExceptions(start, end, exceptionRanges)) {
        continue;
      }

      violations.push({
        filePath,
        line: index + 1,
        column: start + 1,
        snippet: line.trim(),
      });
    }
  });

  return violations;
}

export function closeUpSpacedEmDashesInText(source) {
  const lines = source.split(/\r?\n/);
  const fenceState = { inCodeBlock: false, fenceChar: null, fenceLen: null, isFenceBoundary: false };

  return lines
    .map((line) => {
      Object.assign(fenceState, updateCodeFenceState(line, fenceState));

      if (fenceState.isFenceBoundary || fenceState.inCodeBlock) {
        return line;
      }

      return fixContentLine(line);
    })
    .join('\n');
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
  let violations = [];

  for (const filePath of files) {
    const source = readFileSync(filePath, 'utf8');
    const fileViolations = findSpacedEmDashViolations(filePath, source);
    violations = violations.concat(fileViolations);
    if (applyWrite && fileViolations.length > 0) {
      const fixedSource = closeUpSpacedEmDashesInText(source);
      if (fixedSource !== source) {
        writeFileSync(filePath, fixedSource, 'utf8');
      }
    }
  }

  if (violations.length > 0) {
    for (const violation of violations) {
      console.error(
        `${violation.filePath}:${violation.line}:${violation.column}: use an unspaced em dash (—).`,
      );
      if (violation.snippet) {
        console.error(`  ${violation.snippet}`);
      }
    }
    if (!applyWrite) {
      process.exit(1);
    }
  } else if (applyWrite) {
    console.log('content em-dash lint: fixed zero files');
  }
}

main();
