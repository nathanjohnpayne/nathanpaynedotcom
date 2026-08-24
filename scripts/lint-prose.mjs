#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';

const MARKDOWN_EXTENSIONS = new Set(['.md', '.mdx']);
const YAML_EXTENSIONS = new Set(['.yaml', '.yml']);
const PROSE_EXTENSIONS = new Set([...MARKDOWN_EXTENSIONS, ...YAML_EXTENSIONS]);
const PROPAGATED_MARKDOWN_FILES = new Set([
  '.github/pull_request_template.md',
  'docs/agents/code-review-requirements.md',
  'docs/agents/decision-records.md',
  'docs/agents/prose-line-wrapping.md',
  'docs/agents/shared-operating-rules.md',
  'docs/agents/worktree-placement.md',
]);
const PROPAGATED_MARKDOWN_PREFIXES = [
  '.github/ISSUE_TEMPLATE/',
  'scripts/ci/',
  'scripts/gh-projects/',
  'scripts/phase-4b/',
  'scripts/workflow/',
];

function parseArguments(args) {
  const files = [];
  let listFiles = false;
  let outputJson = false;

  for (const arg of args) {
    if (arg === '--output=JSON') {
      outputJson = true;
    } else if (arg === '--list-files') {
      listFiles = true;
    } else if (arg.startsWith('-')) {
      throw new Error(`unknown argument: ${arg}`);
    } else {
      files.push(arg);
    }
  }

  for (const file of files) {
    if (!PROSE_EXTENSIONS.has(extname(file).toLowerCase())) {
      throw new Error(`expected a .md, .mdx, .yaml, or .yml path: ${file}`);
    }
  }

  if (listFiles && (outputJson || files.length > 0)) {
    throw new Error('--list-files cannot be combined with paths or --output=JSON');
  }

  return { files, listFiles, outputJson };
}

function isPropagatedMirror(file) {
  if (
    PROPAGATED_MARKDOWN_FILES.has(file) ||
    PROPAGATED_MARKDOWN_PREFIXES.some((prefix) => file.startsWith(prefix))
  ) {
    return true;
  }
  const firstLines = readFileSync(file, 'utf8').split(/\r?\n/, 8);
  return firstLines.some((line) => /^> Canonical source:/.test(line));
}

function discoverProseFiles() {
  const result = spawnSync(
    'git',
    [
      'ls-files',
      '--cached',
      '--others',
      '--exclude-standard',
      '--',
      '*.md',
      '*.mdx',
      '*.yaml',
      '*.yml',
    ],
    { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 },
  );
  if (result.status !== 0) {
    throw new Error(`could not enumerate prose files: ${result.stderr || result.stdout}`);
  }

  return result.stdout
    .split('\n')
    .filter(Boolean)
    .filter((file) => {
      const extension = extname(file).toLowerCase();
      return (
        MARKDOWN_EXTENSIONS.has(extension) ||
        (YAML_EXTENSIONS.has(extension) && file.startsWith('src/content/'))
      );
    })
    .filter((file) => !file.startsWith('tests/fixtures/vale-'))
    .filter((file) => !isPropagatedMirror(file))
    .sort();
}

function frontmatterOf(source, file) {
  const lines = source.split(/\r?\n/);
  const openingIndex = lines.findIndex((line) => line.trim() !== '');

  if (openingIndex === -1 || lines[openingIndex] !== '---') {
    return { kind: 'none' };
  }

  const closingIndex = lines.findIndex((line, index) => index > openingIndex && line === '---');
  if (closingIndex === -1) {
    return {
      kind: 'unterminated',
      alert: {
        Action: { Name: '', Params: null },
        Span: [1, 3],
        Check: 'CMOS.Frontmatter',
        Description: '',
        Link: '',
        Message: 'Close the Markdown frontmatter block with an unindented --- delimiter.',
        Severity: 'error',
        Match: '---',
        Line: openingIndex + 1,
        Origin: 'frontmatter',
      },
      file,
    };
  }

  return {
    kind: 'complete',
    openingLine: openingIndex + 1,
    closingLine: closingIndex + 1,
    yaml: `${'\n'.repeat(openingIndex + 1)}${lines.slice(openingIndex + 1, closingIndex).join('\n')}\n`,
  };
}

function runVale(files) {
  if (files.length === 0) {
    return {};
  }

  const result = spawnSync('vale', ['--output=JSON', ...files], {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });

  let report;
  try {
    report = JSON.parse(result.stdout || '{}');
  } catch {
    throw new Error(`Vale returned invalid JSON: ${result.stderr || result.stdout}`);
  }

  if (result.status !== 0 && result.status !== 1) {
    const detail = report.Text || result.stderr || result.stdout || `exit ${result.status}`;
    throw new Error(`Vale failed: ${detail}`);
  }

  return report;
}

function mergeAlerts(target, file, alerts) {
  if (alerts.length === 0) {
    return;
  }
  target[file] ??= [];
  target[file].push(...alerts);
}

function alertKey(alert) {
  return [alert.Check, alert.Line, ...(alert.Span || []), alert.Message].join(':');
}

function mappingSeparatorOf(line) {
  let quote = null;
  let escaped = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (quote === '"' && character === '\\') {
      escaped = true;
      continue;
    }
    if (quote) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
    } else if (character === ':' && (line[index + 1] === undefined || /\s/.test(line[index + 1]))) {
      return index;
    }
  }

  return -1;
}

function yamlAlertIsProse(alert, source) {
  if (alert.Check !== 'CMOS.EmDash') return true;
  const line = source.split(/\r?\n/)[alert.Line - 1] || '';
  const matchDash = typeof alert.Match === 'string' ? alert.Match.indexOf('—') : -1;
  const dash =
    Array.isArray(alert.Span) && Number.isInteger(alert.Span[0]) && matchDash !== -1
      ? alert.Span[0] - 1 + matchDash
      : line.indexOf('—');
  if (dash === -1) return true;

  const separator = mappingSeparatorOf(line);
  if (separator !== -1 && dash < separator) return false;

  const structuralPrefix = separator === -1 ? /^\s*-\s*$/ : /^\s*$/;
  const valueStart = separator === -1 ? 0 : separator + 1;
  if (structuralPrefix.test(line.slice(valueStart, dash)) && !/^\s+\S/.test(line.slice(dash + 1))) {
    return false;
  }

  return true;
}

function sortAndDedupe(report) {
  const sorted = {};
  for (const file of Object.keys(report).sort()) {
    const seen = new Set();
    const alerts = report[file]
      .filter((alert) => {
        const key = alertKey(alert);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((left, right) => left.Line - right.Line || left.Span[0] - right.Span[0]);
    if (alerts.length > 0) sorted[file] = alerts;
  }
  return sorted;
}

function printHuman(report) {
  for (const [file, alerts] of Object.entries(report)) {
    for (const alert of alerts) {
      const span = Array.isArray(alert.Span) ? alert.Span.join(':') : alert.Span;
      console.log(`${file}:${alert.Line}:${span}: ${alert.Severity}: ${alert.Message} (${alert.Check})`);
    }
  }
}

function main() {
  let parsed;
  try {
    parsed = parseArguments(process.argv.slice(2));
    if (parsed.files.length === 0) parsed.files = discoverProseFiles();
  } catch (error) {
    console.error(`prose lint: ${error.message}`);
    process.exit(2);
  }

  if (parsed.listFiles) {
    console.log(parsed.files.join('\n'));
    process.exit(0);
  }

  const version = spawnSync('vale', ['--version'], { encoding: 'utf8' });
  if (version.status !== 0) {
    if (process.env.GITHUB_ACTIONS === 'true') {
      console.error('prose lint: Vale is required in CI but is not installed');
      process.exit(2);
    }
    console.warn('prose lint: Vale is not installed; skipping outside CI');
    process.exit(0);
  }

  const report = {};
  const frontmatter = new Map();
  const sources = new Map();
  const tempDirectory = mkdtempSync(join(tmpdir(), 'nathanpaynedotcom-vale-'));
  const extractedFiles = [];
  const extractedToSource = new Map();

  try {
    for (const [index, file] of parsed.files.entries()) {
      const source = readFileSync(file, 'utf8');
      sources.set(file, source);
      const extraction = MARKDOWN_EXTENSIONS.has(extname(file).toLowerCase())
        ? frontmatterOf(source, file)
        : { kind: 'none' };
      frontmatter.set(file, extraction);

      if (extraction.kind === 'unterminated') {
        mergeAlerts(report, file, [extraction.alert]);
      } else if (extraction.kind === 'complete') {
        const extracted = join(tempDirectory, `${index}.yaml`);
        writeFileSync(extracted, extraction.yaml);
        extractedFiles.push(extracted);
        extractedToSource.set(resolve(extracted), file);
      }
    }

    const markdownReport = runVale(parsed.files);
    for (const file of parsed.files) {
      const extraction = frontmatter.get(file);
      const alerts = markdownReport[file] || markdownReport[resolve(file)] || [];
      const bodyAlerts = alerts.filter(
        (alert) =>
          extraction.kind !== 'complete' ||
          alert.Line <= extraction.openingLine ||
          alert.Line >= extraction.closingLine,
      );
      mergeAlerts(report, file, bodyAlerts);
    }

    const yamlReport = runVale(extractedFiles);
    for (const [reportedPath, alerts] of Object.entries(yamlReport)) {
      const sourceFile = extractedToSource.get(resolve(reportedPath));
      if (!sourceFile) {
        throw new Error(`Vale reported an unknown extracted path: ${reportedPath}`);
      }
      mergeAlerts(
        report,
        sourceFile,
        alerts
          .filter((alert) => yamlAlertIsProse(alert, sources.get(sourceFile)))
          .map((alert) => ({ ...alert, Origin: 'frontmatter' })),
      );
    }
  } catch (error) {
    console.error(`prose lint: ${error.message}`);
    process.exitCode = 2;
    return;
  } finally {
    rmSync(tempDirectory, { recursive: true, force: true });
  }

  const result = sortAndDedupe(report);
  if (parsed.outputJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printHuman(result);
  }

  const hasErrors = Object.values(result).some((alerts) =>
    alerts.some((alert) => alert.Severity === 'error'),
  );
  process.exitCode = hasErrors ? 1 : 0;
}

main();
