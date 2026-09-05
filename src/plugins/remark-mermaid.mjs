import { visit } from 'unist-util-visit';

/**
 * Preserve the site's authoring contract without interpreting Mermaid itself.
 * Rendering and Mermaid syntax validation belong to rehype-mermaid.
 */
export default function remarkMermaidMetadata() {
  return (tree, file) => {
    visit(tree, 'code', (node) => {
      if (node.lang !== 'mermaid') return;

      assertSupportedContentFile(file);
      const { title, description, caption } = parseMermaidMetadata(node.meta);
      node.data ??= {};
      node.data.hProperties = {
        ...node.data.hProperties,
        dataMermaidTitle: title,
        dataMermaidDescription: description,
        // Written only when authored. An always-present empty string would
        // reach `rehypeMermaidFigures` indistinguishable from an authored one,
        // and the caption is the only one of the three that may be absent.
        ...(caption ? { dataMermaidCaption: caption } : {}),
      };
    });
  };
}

// Collections whose bodies may carry an inline Mermaid fence. Blog posts load
// with `pattern: '**/*.md'` so only `.md` can exist there; project pages load
// `**/*.{md,mdx}` and the case-study pages are `.mdx`, so both extensions are
// accepted for that collection. Every other collection and every standalone
// Markdown page still rejects, because the diagram CSS, the contrast test and
// the accessibility spec are only wired for these two.
const SUPPORTED_COLLECTION_PATHS = [
  /^blog\/(?:[^/]+\/)*[^/]+\.md$/,
  /^projects\/(?:[^/]+\/)*[^/]+\.mdx?$/,
];

// Matched against the path that follows the FIRST `src/content/` segment, not
// any of them. Anchoring on the last, or on `(^|/)src/content/…` anywhere in
// the string, lets an unsupported collection smuggle a supported one inside
// itself — `src/content/resume/src/content/projects/x.md` would pass.
const CONTENT_ROOT = 'src/content/';

function assertSupportedContentFile(file) {
  const filePath = String(file?.path ?? file?.history?.at(-1) ?? '').replaceAll('\\', '/');
  const rootIndex = filePath.indexOf(CONTENT_ROOT);
  const collectionPath = rootIndex === -1 ? '' : filePath.slice(rootIndex + CONTENT_ROOT.length);
  if (!collectionPath || !SUPPORTED_COLLECTION_PATHS.some((p) => p.test(collectionPath))) {
    throw new Error(
      `Mermaid code fences are only supported in src/content/blog and src/content/projects (received ${filePath || 'an unknown source'})`,
    );
  }
}

/**
 * The attributes a Mermaid fence may carry, and which of them are required.
 *
 * `title` and `description` are the diagram's accessible name and its
 * `aria-describedby` target; neither is ever shown to a sighted reader.
 * `caption` is the third thing and a different thing: visible contextual text
 * rendered as a real `<figcaption>` beside the graphic (#989). It is optional
 * because most diagrams do not need one, and it is a fence attribute at all
 * because a `sidebar` item has had one since the field existed while a body
 * fence — the wider column, and since #986 the home for any diagram too wide
 * for the sidebar — had no way to carry one.
 */
const FENCE_ATTRIBUTES = ['title', 'description', 'caption'];
const REQUIRED_ATTRIBUTES = ['title', 'description'];

export function parseMermaidMetadata(meta) {
  const requiredMessage = 'Mermaid code fences require title="..." description="..." metadata';
  const attributes = {};
  const source = (meta ?? '').trim();
  const pattern = /(?:^|\s+)([A-Za-z][\w-]*)="((?:\\["\\]|[^"\\])*)"/gy;
  let cursor = 0;

  while (cursor < source.length) {
    pattern.lastIndex = cursor;
    const match = pattern.exec(source);
    if (match == null || match.index !== cursor) throw new Error(requiredMessage);
    const [, key, value] = match;
    if (key in attributes || !FENCE_ATTRIBUTES.includes(key)) {
      throw new Error(requiredMessage);
    }
    attributes[key] = value.replace(/\\(["\\])/g, '$1').trim();
    cursor = pattern.lastIndex;
  }

  if (REQUIRED_ATTRIBUTES.some((key) => !attributes[key])) throw new Error(requiredMessage);
  // An authored `caption=""` is a mistake, not an omission, and dropping it
  // silently would render the fence as though the attribute were never typed.
  if ('caption' in attributes && !attributes.caption) {
    throw new Error('Mermaid code fence caption="..." must not be empty');
  }
  return attributes;
}
