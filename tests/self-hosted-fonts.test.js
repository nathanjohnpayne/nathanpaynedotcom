import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { BUILD_CHROMIUM_ARGS } from '../src/lib/build-chromium.mjs';

// The typefaces are bundled, and the build renders them the same way on every
// platform (#1250). Before this, the résumé PDF built on the Linux CI runner
// embedded different font names, a system-font fallback, and wrapped about six
// lines differently from a Mac build, because the faces came from Google Fonts
// (a different variable-font file per user agent) and Chromium hinted glyph
// advances on Linux only.
//
// These read the already-built dist/ (`npm test` builds first).

const ROOT = resolve(__dirname, '..');
const DIST = join(ROOT, 'dist');
const FONT_DIR = join(ROOT, 'public/fonts/site');

const FACES = [
  ['Cormorant Garamond', 'normal', '400', 'cormorant-garamond-400'],
  ['Cormorant Garamond', 'normal', '500', 'cormorant-garamond-500'],
  ['Cormorant Garamond', 'normal', '600', 'cormorant-garamond-600'],
  ['Cormorant Garamond', 'normal', '700', 'cormorant-garamond-700'],
  ['Cormorant Garamond', 'italic', '400', 'cormorant-garamond-italic-400'],
  ['Cormorant Garamond', 'italic', '600', 'cormorant-garamond-italic-600'],
  ['Inter', 'normal', '400', 'inter-400'],
  ['Inter', 'normal', '500', 'inter-500'],
  ['Inter', 'normal', '600', 'inter-600'],
  ['Inter', 'normal', '700', 'inter-700'],
];

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Every @font-face block of the source stylesheet, as declaration maps. */
function fontFaceBlocks() {
  const css = stripComments(readFileSync(join(ROOT, 'src/styles/global.css'), 'utf-8'));
  return [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((m) =>
    Object.fromEntries(
      m[1]
        .split(';')
        .map((d) => d.trim())
        .filter(Boolean)
        .map((d) => [d.slice(0, d.indexOf(':')).trim(), d.slice(d.indexOf(':') + 1).trim()]),
    ),
  );
}

function listFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full));
    else out.push(full);
  }
  return out;
}

describe('self-hosted site fonts', () => {
  it('global.css declares exactly the faces the site used to request from Google', () => {
    const blocks = fontFaceBlocks();
    const declared = blocks.map((b) => [
      b['font-family'].replace(/['"]/g, ''),
      b['font-style'],
      b['font-weight'],
    ]);
    expect(declared).toEqual(FACES.map(([family, style, weight]) => [family, style, weight]));
  });

  it('each face points at one bundled woff2 on the same origin, with no local() lookup', () => {
    const blocks = fontFaceBlocks();
    expect(blocks).toHaveLength(FACES.length);
    blocks.forEach((block, i) => {
      const stem = FACES[i][3];
      // A local() source would make the build depend on whatever is installed
      // on the machine that runs it; a remote one on the network.
      expect(block.src, stem).toBe(`url('/fonts/site/${stem}.woff2') format('woff2')`);
      expect(block['font-display'], stem).toBe('swap');
      const file = join(FONT_DIR, `${stem}.woff2`);
      expect(existsSync(file), `${stem}.woff2 is missing`).toBe(true);
      // The woff2 signature: a renamed or truncated download fails here.
      expect(readFileSync(file).subarray(0, 4).toString('latin1'), stem).toBe('wOF2');
    });
  });

  it('ships the license text beside the fonts it covers', () => {
    for (const name of ['OFL-Cormorant-Garamond.txt', 'OFL-Inter.txt']) {
      const text = readFileSync(join(ROOT, 'public/fonts', name), 'utf-8');
      expect(text, name).toContain('SIL OPEN FONT LICENSE Version 1.1');
      expect(text, name).toMatch(/^Copyright /);
    }
  });

  it('no layout, stylesheet or built page reaches Google Fonts', () => {
    const hosts = /fonts\.googleapis\.com|fonts\.gstatic\.com/;
    for (const rel of [
      'src/layouts/BaseLayout.astro',
      'src/layouts/OgCard.astro',
      'src/styles/global.css',
    ]) {
      expect(readFileSync(join(ROOT, rel), 'utf-8'), rel).not.toMatch(hosts);
    }
    const built = listFiles(DIST).filter((f) => /\.(html|css|js)$/.test(f));
    expect(built.length).toBeGreaterThan(0);
    const offenders = built.filter((f) => hosts.test(readFileSync(f, 'utf-8')));
    expect(offenders.map((f) => f.slice(DIST.length + 1))).toEqual([]);
  });

  it('the policy that serves them still allows same-origin styles and fonts', () => {
    const config = JSON.parse(readFileSync(join(ROOT, 'firebase.json'), 'utf-8'));
    const csp = JSON.stringify(config);
    expect(csp).toMatch(/font-src 'self'/);
    expect(csp).toMatch(/style-src 'self'/);
  });
});

describe('build Chromium', () => {
  it('renders text from unhinted advances, so Linux and macOS lay lines out alike', () => {
    expect(BUILD_CHROMIUM_ARGS).toContain('--font-render-hinting=none');
    const og = readFileSync(join(ROOT, 'src/integrations/og-images.mjs'), 'utf-8');
    // The résumé PDF and the OG cards share this one launch.
    expect(og).toContain('chromium.launch({ args: BUILD_CHROMIUM_ARGS })');
  });
});

describe('résumé PDF fonts', () => {
  // The PDF is the oracle for glyph coverage: a character the bundled faces
  // lack falls through to a system face (DejaVu Sans on Linux, SF on macOS),
  // which shows up here as a font that is not one of ours. `→` was the one the
  // résumé used (#1250); Google's Latin subsets omit it.
  const BUNDLED =
    /^(CormorantGaramond|Inter)-(Regular|Medium|SemiBold|Bold|Italic|SemiBoldItalic)$/;

  function pdfFontNames() {
    let output;
    try {
      output = execFileSync('pdffonts', [join(DIST, 'Nathan-Payne-Resume.pdf')], {
        encoding: 'utf-8',
      });
    } catch (error) {
      throw new Error(
        'pdffonts (poppler) is required: `brew install poppler` or ' +
          '`sudo apt-get install -y poppler-utils`. ' +
          `Original error: ${error.message}`,
        { cause: error },
      );
    }
    return output
      .split('\n')
      .slice(2)
      .filter(Boolean)
      .map((line) =>
        line
          .trim()
          .split(/\s+/)[0]
          .replace(/^[A-Z]{6}\+/, ''),
      );
  }

  it('embeds only the bundled faces, under the same names on every platform', () => {
    const names = [...new Set(pdfFontNames())];
    expect(names.filter((n) => !BUNDLED.test(n))).toEqual([]);
    // Static instances carry their own PostScript names. A variable font is
    // named from the platform's scaler (`-Light` on Linux, `-SemiBold` on a
    // Mac), which is how the two builds disagreed.
    expect(names).toEqual(
      expect.arrayContaining([
        'CormorantGaramond-SemiBold',
        'CormorantGaramond-Italic',
        'Inter-Regular',
        'Inter-SemiBold',
      ]),
    );
  });
});
