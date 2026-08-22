#!/usr/bin/env node
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const CONTENT_ROOT = resolve(process.cwd(), 'src/content');
const TARGET_EXTENSIONS = new Set(['.md', '.mdx']);
const SPACED_EM_DASH = / — /g;
const IDENTIFIER_LABEL_EXCEPTION = /\[[A-Z]{2,}[A-Z0-9_-]*-\d+\s—\s[^\]]+\](?:\([^)]+\))?/g;

export function findSpacedEmDashViolations(filePath, source) {
  const violations = [];
  const lines = source.split(/\r?\n/);
  let inCodeBlock = false;

  lines.forEach((line, index) => {
    if (/^\s*```/.test(line)) {
      inCodeBlock = !inCodeBlock;
      return;
    }

    if (inCodeBlock) {
      return;
    }

    const exceptionRanges = [];
    const exceptionRegex = new RegExp(IDENTIFIER_LABEL_EXCEPTION);
    let match;

    while ((match = exceptionRegex.exec(line)) !== null) {
      exceptionRanges.push([match.index, match.index + match[0].length]);
    }

    const spacedDashRegex = new RegExp(SPACED_EM_DASH);
    while ((match = spacedDashRegex.exec(line)) !== null) {
      const start = match.index;
      const end = match.index + match[0].length;
      const insideException = exceptionRanges.some(
        ([exceptionStart, exceptionEnd]) => start >= exceptionStart && end <= exceptionEnd,
      );

      if (!insideException) {
        violations.push({
          filePath,
          line: index + 1,
          column: start + 1,
          snippet: line.trim(),
        });
      }
    }
  });

  return violations;
}

export function fixContentLine(line) {
  const exceptionMatches = [];
  const exceptionRegex = new RegExp(IDENTIFIER_LABEL_EXCEPTION);
  let index = 0;
  let match;

  while ((match = exceptionRegex.exec(line)) !== null) {
    const token = `__MERGEPATH_EM_DASH_EXCEPTION_${exceptionMatches.length}__`;
    exceptionMatches.push({
      token,
      text: match[0],
    });
    line = line.slice(0, match.index - index) + token + line.slice(match.index + match[0].length - index);
    index += match[0].length - token.length;
  }

  const fixedLine = line.replace(SPACED_EM_DASH, '—');

  return exceptionMatches.reduce((acc, { token, text }) => acc.replace(token, text), fixedLine);
}

export function closeUpSpacedEmDashesInText(source) {
  const lines = source.split(/\r?\n/);
  let inCodeBlock = false;

  return lines
    .map((line) => {
      if (/^\s*```/.test(line)) {
        inCodeBlock = !inCodeBlock;
        return line;
      }

      if (inCodeBlock) {
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
