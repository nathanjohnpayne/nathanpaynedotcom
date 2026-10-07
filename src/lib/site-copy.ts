/**
 * Typed access to `src/content/site-copy/` entries (#1166). See
 * src/lib/site-copy-schema.ts for what each entry owns.
 */
import { getEntry } from 'astro:content';
import { SITE_COPY_SCHEMAS, type SiteCopy, type SiteCopyId } from './site-copy-schema';

export async function getSiteCopy<K extends SiteCopyId>(id: K): Promise<SiteCopy<K>> {
  const entry = await getEntry('siteCopy', id);
  if (!entry) {
    throw new Error(`Missing site-copy entry "${id}": expected src/content/site-copy/${id}.md`);
  }
  const parsed = SITE_COPY_SCHEMAS[id].safeParse(entry.data);
  if (!parsed.success) {
    throw new Error(
      `src/content/site-copy/${id}.md does not match its "${id}" schema: ${parsed.error.message}`,
    );
  }
  return parsed.data as SiteCopy<K>;
}

/** The published project count as a word, for the `{count}` placeholder. */
const NUMBER_WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
];

/**
 * Fills the projects description's `{count}` placeholder. Spelled out because
 * it reads mid-sentence; falls back to the numeral above nine. Capitalized when
 * the placeholder opens the sentence.
 */
export function fillProjectCount(template: string, count: number): string {
  const word = NUMBER_WORDS[count] ?? String(count);
  return template.replace(/\{count\}/g, (_match, offset: number) =>
    offset === 0 ? `${word.charAt(0).toUpperCase()}${word.slice(1)}` : word,
  );
}
