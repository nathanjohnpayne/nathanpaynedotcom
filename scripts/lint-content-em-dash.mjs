#!/usr/bin/env node
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const CONTENT_ROOT = resolve(process.cwd(), 'src/content');
const TARGET_EXTENSIONS = new Set(['.md', '.mdx']);
const SPACED_EM_DASH = / +— +/g;
const IDENTIFIER_LABEL_EXCEPTION = /\[[A-Z]{2,}[A-Z0-9_-]*-\d+\s+—\s+/g;
const CODE_FENCE = /^ {0,3}(`{3,}|~{3,})(.*)$/;

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

  while (i < line.length) {
    if (line[i] !== '`') {
      output += line[i];
      i += 1;
      continue;
    }

    let j = i;
    while (j < line.length && line[j] === '`') {
      j += 1;
    }
    const openFenceLen = j - i;
    let k = j;
    let closeIndex = -1;

    while (k < line.length) {
      if (line[k] !== '`') {
        k += 1;
        continue;
      }

      let m = k;
      while (m < line.length && line[m] === '`') {
        m += 1;
      }

      if (m - k === openFenceLen) {
        closeIndex = k;
        k = m;
        break;
      }

      k = m;
    }

    if (closeIndex === -1) {
      output += line.slice(i, j);
      i = j;
      continue;
    }

    output += ' '.repeat(k - i);
    i = k;
  }

  return output;
}

// Returns the fence this line opens or closes, or null when the line is prose.
// The marker run is homogeneous by construction, and a backtick fence's info
// string may not itself contain a backtick (CommonMark 4.5).
function parseFence(line) {
  const match = line.match(CODE_FENCE);
  if (!match) {
    return null;
  }

  const [, marker, info] = match;
  if (marker[0] === '`' && info.includes('`')) {
    return null;
  }

  return { fenceChar: marker[0], fenceLen: marker.length, info };
}

function updateCodeFenceState(line, state) {
  const fence = parseFence(line);

  if (!state.inCodeBlock) {
    if (!fence) {
      return { ...state, isFenceBoundary: false };
    }

    return {
      inCodeBlock: true,
      fenceChar: fence.fenceChar,
      fenceLen: fence.fenceLen,
      isFenceBoundary: true,
    };
  }

  // A closing fence repeats the opening marker, is at least as long, and
  // carries no info string.
  const isClose =
    fence !== null &&
    fence.fenceChar === state.fenceChar &&
    fence.fenceLen >= (state.fenceLen || 0) &&
    fence.info.trim() === '';

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

main();
