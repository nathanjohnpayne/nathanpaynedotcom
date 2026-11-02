#!/usr/bin/env node
/**
 * Print the current stamp hash for one blog post or case study (#1492, #1510):
 * the hash of its reader-facing content and its `aiUse.statement`, which is the
 * value its `aiUse.reviewed.content` must hold.
 *
 *   npm run --silent ai-use:hash -- src/content/blog/<slug>.md
 *
 * Prints the lowercase hex digest and nothing else, so it can be pasted or
 * captured. The definition lives in src/lib/ai-use-stamp.mjs. Printing a hash
 * is not a review: re-stamp only after confirming the entry's statement still
 * describes its text. The hash covers the statement, so print it only once the
 * statement is final. An entry with `aiUse` but no statement exits 1.
 */
import { readFileSync } from 'node:fs';
import { aiUseContentHash, aiUseHashCommand } from '../src/lib/ai-use-stamp.mjs';

const args = process.argv.slice(2);
if (args.length !== 1 || args[0].startsWith('-')) {
  console.error(`usage: ${aiUseHashCommand('<path to a .md or .mdx entry>')}`);
  process.exit(2);
}

const [entryPath] = args;
try {
  console.log(aiUseContentHash(readFileSync(entryPath, 'utf8')));
} catch (error) {
  console.error(`ai-use:hash: ${entryPath}: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
