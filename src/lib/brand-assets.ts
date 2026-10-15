/**
 * The logo system as `/brand/` lists it (specs/brand-page.md).
 *
 * Every file in `public/images/brand/` belongs to exactly one family here, and
 * the page, its JSON-LD and `tests/brand.test.js` all read this list. The test
 * compares it against the directory, so a regenerated asset that is added,
 * renamed or dropped fails until the list says so. The files themselves stay
 * where `scripts/brand/build-logo-assets.mjs` writes them: the web manifest and
 * the root favicon copies depend on those paths (specs/seo-metadata.md § Site
 * icons), so the page links them in place rather than moving them.
 *
 * Descriptions condense docs/brand-logo-usage.md, which stays the full guide.
 */

/** The page's path. */
export const BRAND_PAGE_PATH = '/brand/';

/**
 * The page's headline: its `<h1>`, breadcrumb, `ItemList` name and share-card
 * heading.
 */
export const BRAND_TITLE = 'Brand assets';

/** Where the logo system is served from. */
export const BRAND_ASSET_DIR = '/images/brand/';

/** A file's URL on the site. */
export function brandAssetUrl(file: string): string {
  return `${BRAND_ASSET_DIR}${file}`;
}

export interface BrandFile {
  /** File name inside `public/images/brand/`. */
  file: string;
  /** The download link's text: format, then variant or size. */
  label: string;
}

export interface BrandFamily {
  /** Stable id: the card's anchor and its JSON-LD fragment. */
  id: string;
  title: string;
  /** When to use it. */
  description: string;
  preview: {
    /** One of the family's own files. */
    file: string;
    width: number;
    height: number;
    alt: string;
  };
  files: BrandFile[];
}

export const BRAND_FAMILIES: BrandFamily[] = [
  {
    id: 'mark',
    title: 'Mark',
    description:
      'The primary square mark: the NP monogram in the cream field, the red plane at right, and the yellow, charcoal and blue planes along the bottom. It is full-bleed and survives a circular crop, so use it for avatars and app icons. Below 24px, use the small-size tile instead.',
    preview: { file: 'np-mark.svg', width: 64, height: 64, alt: 'The NP mark' },
    files: [
      { file: 'np-mark.svg', label: 'SVG' },
      ...[16, 32, 48, 64, 128, 180, 192, 256, 512, 1024].map((size) => ({
        file: `np-mark-${size}.png`,
        label: `PNG ${size}`,
      })),
    ],
  },
  {
    id: 'mark-tile',
    title: 'Small-size tile',
    description:
      'The mark without the monogram, for sizes below 24px such as a 16px favicon, where the letters would blur. The composition alone carries recognition. Never show it at a size where the monogram would be legible.',
    preview: {
      file: 'np-mark-tile.svg',
      width: 64,
      height: 64,
      alt: 'The NP mark without its monogram',
    },
    files: [{ file: 'np-mark-tile.svg', label: 'SVG' }],
  },
  {
    id: 'mark-keyline',
    title: 'Keyline mark',
    description:
      'The mark framed by an ink keyline the weight of its grid lines, only for cream or near-cream surfaces where the field would otherwise vanish. Not for avatars: a circular crop cuts the frame.',
    preview: {
      file: 'np-mark-keyline.svg',
      width: 72,
      height: 72,
      alt: 'The NP mark with an ink keyline',
    },
    files: [
      { file: 'np-mark-keyline.svg', label: 'SVG' },
      { file: 'np-mark-keyline-512.png', label: 'PNG 512' },
    ],
  },
  {
    id: 'mark-mono',
    title: 'One-color mark',
    description:
      'The mark for one-color reproduction: print, engraving and grayscale interfaces. The planes become tints of the ink.',
    preview: {
      file: 'np-mark-mono.svg',
      width: 64,
      height: 64,
      alt: 'The NP mark in one color',
    },
    files: [
      { file: 'np-mark-mono.svg', label: 'SVG' },
      { file: 'np-mark-mono-512.png', label: 'PNG 512' },
    ],
  },
  {
    id: 'lockup-horizontal',
    title: 'Horizontal lockup',
    description:
      'The primary lockup: the mark, the name and NATHANPAYNE.COM beneath. Use it at 320px wide or more; below that the domain line stops being readable, so use the compact lockup, then the mark alone. The dark version sets the type in cream for dark backgrounds, and the transparent PNGs suit email signatures, documents and slides.',
    preview: {
      file: 'np-lockup-horizontal.svg',
      width: 394,
      height: 64,
      alt: 'The horizontal lockup: the NP mark beside the name Nathan Payne and the domain',
    },
    files: [
      { file: 'np-lockup-horizontal.svg', label: 'SVG' },
      { file: 'np-lockup-horizontal-dark.svg', label: 'SVG dark' },
      { file: 'np-lockup-horizontal-mono.svg', label: 'SVG one-color' },
      { file: 'np-lockup-horizontal-light-800.png', label: 'PNG 800' },
      { file: 'np-lockup-horizontal-light-1600.png', label: 'PNG 1600' },
      { file: 'np-lockup-horizontal-dark-800.png', label: 'PNG dark 800' },
      { file: 'np-lockup-horizontal-dark-1600.png', label: 'PNG dark 1600' },
      { file: 'np-lockup-horizontal-transparent-800.png', label: 'PNG transparent 800' },
      { file: 'np-lockup-horizontal-transparent-1600.png', label: 'PNG transparent 1600' },
    ],
  },
  {
    id: 'lockup-stacked',
    title: 'Stacked lockup',
    description:
      'The mark above the name and domain, for square and portrait placements: social posts, slide title cards and print.',
    preview: {
      file: 'np-lockup-stacked.svg',
      width: 268,
      height: 176,
      alt: 'The stacked lockup: the NP mark above the name Nathan Payne and the domain',
    },
    files: [
      { file: 'np-lockup-stacked.svg', label: 'SVG' },
      { file: 'np-lockup-stacked-dark.svg', label: 'SVG dark' },
      { file: 'np-lockup-stacked-mono.svg', label: 'SVG one-color' },
      { file: 'np-lockup-stacked-light-1200.png', label: 'PNG 1200' },
      { file: 'np-lockup-stacked-dark-1200.png', label: 'PNG dark 1200' },
      { file: 'np-lockup-stacked-transparent-1200.png', label: 'PNG transparent 1200' },
    ],
  },
  {
    id: 'lockup-compact',
    title: 'Compact lockup',
    description:
      'The mark and the name, without the domain, for placements between about 160px and 320px wide, where the domain line would be too small to read.',
    preview: {
      file: 'np-lockup-compact.svg',
      width: 402,
      height: 70,
      alt: 'The compact lockup: the NP mark beside the name Nathan Payne',
    },
    files: [{ file: 'np-lockup-compact.svg', label: 'SVG' }],
  },
  {
    id: 'wordmark',
    title: 'Wordmark',
    description:
      'The name and domain without the mark, for places where the mark already appears nearby.',
    preview: {
      file: 'np-wordmark.svg',
      width: 310,
      height: 64,
      alt: 'The wordmark: the name Nathan Payne above the domain',
    },
    files: [
      { file: 'np-wordmark.svg', label: 'SVG' },
      { file: 'np-wordmark-dark.svg', label: 'SVG dark' },
      { file: 'np-wordmark-transparent-1600.png', label: 'PNG transparent 1600' },
    ],
  },
  {
    id: 'social',
    title: 'Social images',
    description:
      'A logo-only landscape card for social posts, and a square version with the stacked lockup on white. Neither is the site’s link-preview image; each page generates its own.',
    preview: {
      file: 'np-social-1200x630.png',
      width: 1200,
      height: 630,
      alt: 'The landscape social image: the horizontal lockup on white',
    },
    files: [
      { file: 'np-social-1200x630.png', label: 'PNG 1200×630' },
      { file: 'np-social-square-1080.png', label: 'PNG 1080 square' },
    ],
  },
  {
    id: 'google-workspace',
    title: 'Google Workspace logo',
    description:
      'Laid out for Google Workspace’s 320×132 organization-logo frame: the full-height mark at left and the name on two lines beside it, so it fills the frame instead of shrinking. Upload it from your device; the console’s URL importer refuses this host.',
    preview: {
      file: 'np-google-workspace-logo-320x132-transparent.png',
      width: 320,
      height: 132,
      alt: 'The Google Workspace logo: the NP mark beside the name on two lines',
    },
    files: [
      { file: 'np-google-workspace-logo-320x132.png', label: 'PNG 320×132' },
      {
        file: 'np-google-workspace-logo-320x132-transparent.png',
        label: 'PNG transparent 320×132',
      },
      { file: 'np-google-workspace-logo-640x264.png', label: 'PNG 640×264' },
      { file: 'np-google-workspace-lockup.svg', label: 'SVG' },
    ],
  },
  {
    id: 'profile',
    title: 'Profile picture',
    description:
      'The mark as a square avatar for a Google Account, GitHub, LinkedIn, X, Bluesky, Slack or Threads. Each platform crops it to its own shape, and the monogram clears a circle with margin.',
    preview: {
      file: 'np-google-profile-720.png',
      width: 720,
      height: 720,
      alt: 'The NP mark as a square profile picture',
    },
    files: [
      { file: 'np-google-profile-720.png', label: 'PNG 720' },
      { file: 'np-google-profile-1024.png', label: 'PNG 1024' },
    ],
  },
  {
    id: 'icons',
    title: 'Browser icons',
    description:
      'The favicon, whose 16px size is the small-size tile and whose 32px and 48px sizes carry the monogram, and the 180px Apple touch icon, which iOS rounds itself.',
    preview: {
      file: 'np-apple-touch-icon-180.png',
      width: 180,
      height: 180,
      alt: 'The Apple touch icon: the NP mark at 180 pixels',
    },
    files: [
      { file: 'np-favicon.ico', label: 'ICO 16, 32, 48' },
      { file: 'np-apple-touch-icon-180.png', label: 'PNG 180' },
    ],
  },
];

/**
 * The 1930-register palette the exported files are drawn in, as the closing
 * band lists it. Each hex is a fill in `np-mark.svg` and a key of
 * `MARK_FILL_TOKENS` (src/lib/og-mark.ts); the test holds it to both.
 */
export const BRAND_COLORS = [
  { name: 'Red', hex: '#da2418' },
  { name: 'Yellow', hex: '#f0c800' },
  { name: 'Blue', hex: '#0a5c9e' },
  { name: 'Ink', hex: '#11100d' },
  { name: 'Cream', hex: '#f5f0e4' },
] as const;

/**
 * A card's kicker: the formats a family ships in and how many files, such as
 * `SVG · PNG · 11 files`. Formats keep their first-seen order.
 */
export function formatFamilyKicker(files: BrandFile[]): string {
  if (files.length === 0) throw new Error('a brand family needs at least one file');
  const formats = [
    ...new Set(files.map(({ file }) => file.slice(file.lastIndexOf('.') + 1).toUpperCase())),
  ];
  const count = files.length === 1 ? '1 file' : `${files.length} files`;
  return [...formats, count].join(' · ');
}
