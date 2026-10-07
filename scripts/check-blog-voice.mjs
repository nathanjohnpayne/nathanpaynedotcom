#!/usr/bin/env node
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
class InputError extends Error {
  constructor(message) {
    super(message);
    this.exitCode = 2;
  }
}

const usage = `Usage: node scripts/check-blog-voice.mjs POST.md [--before BEFORE.md | --base REF [--base-path src/content/blog/nested/post.md]] [--json | --packet] [--proper-noun NAME] [--review-context CONTEXT.json]
Exit: 0 mechanical pass (warnings advisory); 1 mechanical violations; 2 invalid input/baseline; 3 execution/dependency failure.
Read-only: no rewriting, Git fetch/update, publishing, models, connectors or paid API calls. Complete manual meaning review remains required.`;
function readInput(file) {
  try {
    if (!statSync(file).isFile()) throw new Error('not a regular file');
    return readFileSync(file, 'utf8');
  } catch (error) {
    throw new InputError(`${file}: ${error.message}`);
  }
}
export async function main(args = process.argv.slice(2)) {
  const json = args.includes('--json');
  try {
    const options = { properNouns: [] };
    const paths = [];
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === '--help') {
        console.log(usage);
        return 0;
      }
      if (arg === '--json' || arg === '--packet') {
        options[arg.slice(2)] = true;
        continue;
      }
      if (
        ['--before', '--base', '--base-path', '--proper-noun', '--review-context'].includes(arg)
      ) {
        const value = args[++i];
        if (!value || value.startsWith('--')) throw new InputError(`${arg} needs a value`);
        if (arg === '--proper-noun') options.properNouns.push(value);
        else options[arg.slice(2)] = value;
      } else if (arg.startsWith('-')) throw new InputError(`Unknown argument ${arg}`);
      else paths.push(arg);
    }
    if (paths.length !== 1 || extname(paths[0]).toLowerCase() !== '.md')
      throw new InputError('Supply one blog Markdown (.md) file');
    if (options.before && options.base)
      throw new InputError('--before and --base are mutually exclusive');
    if (options['base-path'] && !options.base) throw new InputError('--base-path requires --base');
    if (options.json && options.packet)
      throw new InputError('--json already includes the complete packet; choose one output format');
    const file = resolve(paths[0]);
    const source = readInput(file);
    const { checkVoice, hash, readGit, readableReport, repositoryRoot } =
      await import('./lib/blog-voice.mjs');
    let baseline = { kind: 'new-post', commit: null };
    let beforeSource = null;
    if (options.before) {
      const path = resolve(options.before);
      if (extname(path).toLowerCase() !== '.md')
        throw new InputError('--before must be a Markdown (.md) file');
      beforeSource = readInput(path);
      baseline = {
        kind: 'file',
        path,
        commit: null,
        sha256: hash(beforeSource),
        reason: 'Explicit file; no Git commit provenance asserted.',
      };
    }
    if (options.base) {
      const path = (options['base-path'] ?? relative(repositoryRoot, file)).replaceAll('\\', '/');
      if (
        !path.startsWith('src/content/blog/') ||
        path.split('/').some((part) => ['.', '..', ''].includes(part)) ||
        extname(path) !== '.md'
      )
        throw new InputError('Git baseline path must be a repository-relative blog Markdown path');
      const commit = readGit([
        'rev-parse',
        '--verify',
        '--end-of-options',
        `${options.base}^{commit}`,
      ]).trim();
      beforeSource = readGit(['show', `${commit}:${path}`]);
      baseline = {
        kind: 'git',
        requestedRef: options.base,
        commit,
        path,
        sha256: hash(beforeSource),
      };
    }
    let reviewContext = {};
    if (options['review-context']) {
      try {
        reviewContext = JSON.parse(readInput(resolve(options['review-context'])));
      } catch (error) {
        throw new InputError(`Invalid review context: ${error.message}`);
      }
    }
    if (!reviewContext || typeof reviewContext !== 'object' || Array.isArray(reviewContext))
      throw new InputError('Review context must be a JSON object');
    const report = await checkVoice({
      source,
      file,
      beforeSource,
      baseline,
      properNouns: options.properNouns,
      reviewContext,
    });
    console.log(
      options.json ? JSON.stringify(report, null, 2) : readableReport(report, options.packet),
    );
    return report.exitCode;
  } catch (error) {
    const exitCode = error.exitCode ?? 3;
    if (json)
      console.log(
        JSON.stringify({
          schemaVersion: 1,
          manualMeaningReviewRequired: true,
          exitCode,
          error: { reason: error.message },
        }),
      );
    else console.error(`Blog voice checker: ${error.message}\n${usage}`);
    return exitCode;
  }
}
if (
  process.argv[1] &&
  existsSync(process.argv[1]) &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
)
  process.exitCode = await main();
