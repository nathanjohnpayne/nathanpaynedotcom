#!/usr/bin/env node
/**
 * Header typography audit harness (#455). Builds the site, serves dist/ via
 * `astro preview`, measures the header stack (breadcrumbs, h1, deck/lead/
 * subtitle, first body h2, sidebar eyebrow) on seven pages at five viewport
 * widths, and screenshots each header region. Output (screenshots + minified
 * JSON records + markdown summary) lands in bugs/screenshots/headers/.
 *
 * Auto-flags — (a/c/d/e) fire on visible elements only; (b) is a font-loading
 * defect and fires regardless:
 *   left-drift   (a) content-left edges within one header differ by >1px
 *   faux-italic  (b) computed italic on Cormorant with no italic face loaded
 *   tiny-text    (c) computed font-size <11px
 *   contrast     (d) WCAG contrast <4.5:1 for text under 24px
 *   collide      (e) line-height <1 on an element that actually wraps
 */
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const ORIGIN = 'http://localhost:4321';
const OUT = 'bugs/screenshots/headers';
const WIDTHS = [1440, 1024, 768, 480, 390];
const PAGES = [
  { key: 'home', path: '/', header: '.panel--red .content-inner' },
  { key: 'blog-index', path: '/blog/', header: '.hero' },
  { key: 'blog-post', path: '/blog/six-prs-one-bug-agent-failure-modes/', header: '.blog-canvas-header' },
  { key: 'projects-index', path: '/projects/', header: '.hero' },
  { key: 'project-page', path: '/projects/matchline/', header: '.project-hero' },
  { key: 'resume', path: '/resume/', header: '.resume-canvas-header' },
  { key: '404', path: '/404', header: '.e-content' },
];

// Runs in the page. Returns one record per header-stack element.
function measure(headerSel) {
  const roles = [
    ['breadcrumbs', `${headerSel} .breadcrumbs`],
    ['h1', `${headerSel} h1`],
    ['deck', `${headerSel} .deck, ${headerSel} .lead, ${headerSel} .resume-title`],
    ['first-h2', 'main h2, article h2, .e-content h2, .mondrian h2'],
    // Sidebar eyebrow headings ride along (finding 2) — they sit outside the
    // header stack, so they are exempt from the left-drift check by role.
    ['eyebrow', '.blog-sidebar-heading, .resume-canvas-heading'],
  ];
  const parseColor = (s) => {
    const m = s.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
    return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] } : null;
  };
  // Composite the element's ancestor background stack bottom-up over white.
  const effectiveBg = (el) => {
    const stack = [];
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage !== 'none') return null; // gradient/image: skip contrast
      const c = parseColor(cs.backgroundColor);
      if (c && c.a > 0) {
        stack.unshift(c);
        if (c.a === 1) break;
      }
    }
    let bg = { r: 255, g: 255, b: 255 };
    for (const c of stack) {
      bg = {
        r: c.r * c.a + bg.r * (1 - c.a),
        g: c.g * c.a + bg.g * (1 - c.a),
        b: c.b * c.a + bg.b * (1 - c.a),
      };
    }
    return bg;
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => {
      v /= 255;
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const italicFamilies = new Set(
    [...document.fonts]
      .filter((f) => /italic|oblique/i.test(f.style))
      .map((f) => f.family.replace(/['"]/g, '')),
  );
  const lineCount = (el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const tops = [];
    for (const r of range.getClientRects()) {
      if (r.width < 1) continue;
      if (!tops.some((t) => Math.abs(t - r.top) < 2)) tops.push(r.top);
    }
    return tops.length;
  };
  const records = [];
  for (const [role, sel] of roles) {
    const el = document.querySelector(sel);
    if (!el) continue;
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const fontSize = parseFloat(cs.fontSize);
    const lineHeightPx = cs.lineHeight === 'normal' ? fontSize * 1.2 : parseFloat(cs.lineHeight);
    const text = parseColor(cs.color);
    const bg = effectiveBg(el);
    let contrast = null;
    if (text && bg) {
      const fg = {
        r: text.r * text.a + bg.r * (1 - text.a),
        g: text.g * text.a + bg.g * (1 - text.a),
        b: text.b * text.a + bg.b * (1 - text.a),
      };
      const [hi, lo] = [lum(fg), lum(bg)].sort((x, y) => y - x);
      contrast = (hi + 0.05) / (lo + 0.05);
    }
    const family = cs.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
    records.push({
      role,
      contentLeft: +(rect.left + parseFloat(cs.paddingLeft)).toFixed(2),
      top: +rect.top.toFixed(2),
      width: +rect.width.toFixed(2),
      fontFamily: family,
      fontSize: +fontSize.toFixed(2),
      fontWeight: cs.fontWeight,
      fontStyle: cs.fontStyle,
      lineHeight: +(lineHeightPx / fontSize).toFixed(3),
      letterSpacing: cs.letterSpacing,
      color: cs.color,
      background: bg ? `rgb(${Math.round(bg.r)}, ${Math.round(bg.g)}, ${Math.round(bg.b)})` : 'complex',
      contrast: contrast === null ? null : +contrast.toFixed(2),
      visible: el.checkVisibility
        ? el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
        : rect.width > 0,
      lines: lineCount(el),
      italicFaceLoaded: italicFamilies.has(family),
    });
  }
  return records;
}

function flagRecords(page, width, records) {
  const flags = [];
  const add = (flag, role, detail) => flags.push({ page, width, role, flag, detail });
  const stack = records.filter((r) => r.role !== 'first-h2' && r.role !== 'eyebrow' && r.visible);
  if (stack.length > 1) {
    const lefts = stack.map((r) => r.contentLeft);
    const drift = Math.max(...lefts) - Math.min(...lefts);
    if (drift > 1) {
      add('left-drift', stack.map((r) => r.role).join('+'),
        `content-left spans ${drift.toFixed(1)}px (${stack.map((r) => `${r.role}@${r.contentLeft}`).join(', ')})`);
    }
  }
  for (const r of records) {
    if (/italic|oblique/.test(r.fontStyle) && /Cormorant/.test(r.fontFamily) && !r.italicFaceLoaded) {
      add('faux-italic', r.role, `font-style ${r.fontStyle} on ${r.fontFamily} ${r.fontWeight} with no italic face loaded`);
    }
    if (!r.visible) continue;
    if (r.fontSize < 11) add('tiny-text', r.role, `computed ${r.fontSize}px`);
    if (r.contrast !== null && r.fontSize < 24 && r.contrast < 4.5) {
      add('contrast', r.role, `${r.contrast}:1 (${r.color} on ${r.background})`);
    }
    if (r.lineHeight < 1 && r.lines > 1) {
      add('collide', r.role, `line-height ${r.lineHeight} wrapping to ${r.lines} lines`);
    }
  }
  return flags;
}

async function waitForServer(url, ms = 30000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`preview server did not respond at ${url}`);
}

// A leftover server on the port would silently serve a stale build.
const stale = await fetch(ORIGIN).then(() => true).catch(() => false);
if (stale) {
  console.error(`A server is already running at ${ORIGIN} — stop it first so the audit measures a fresh build.`);
  process.exit(1);
}

const build = spawnSync('npm', ['run', 'build'], { stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status ?? 1);

const server = spawn('npm', ['run', 'preview', '--', '--port', '4321'], { stdio: 'ignore' });
try {
  await waitForServer(`${ORIGIN}/blog/`);
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const results = [];
  const allFlags = [];
  for (const { key, path, header } of PAGES) {
    for (const width of WIDTHS) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      await page.goto(`${ORIGIN}${path}`, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      const records = await page.evaluate(measure, header);
      const flags = flagRecords(key, width, records);
      const box = await page.locator(header).first().boundingBox();
      if (box) {
        await page.screenshot({
          path: `${OUT}/${key}-${width}.png`,
          clip: {
            x: Math.max(0, box.x - 8),
            y: Math.max(0, box.y - 8),
            width: Math.min(width - Math.max(0, box.x - 8), box.width + 16),
            height: box.height + 16,
          },
        });
      }
      results.push({ page: key, path, width, records });
      allFlags.push(...flags);
      await page.close();
    }
  }
  await browser.close();

  await writeFile(`${OUT}/header-audit.json`, JSON.stringify({ generated: 'header-audit.mjs', flags: allFlags, results }));

  const fmt = (r) => `${r.fontSize}px/${r.lineHeight} w${r.fontWeight} ${r.fontStyle === 'normal' ? '' : r.fontStyle + ' '}${r.fontFamily}`;
  let md = '# Header typography audit (#455)\n\n';
  md += `Pages × widths: ${PAGES.length} × ${WIDTHS.join('/')}. Flags: ${allFlags.length} (full detail in header-audit.json).\n\n`;
  md += '## Flags (grouped)\n\n| page | role | flag | widths | example |\n|---|---|---|---|---|\n';
  const groups = new Map();
  for (const f of allFlags) {
    const k = `${f.page}|${f.role}|${f.flag}`;
    if (!groups.has(k)) groups.set(k, { ...f, widths: [] });
    groups.get(k).widths.push(f.width);
  }
  for (const g of groups.values()) {
    md += `| ${g.page} | ${g.role} | ${g.flag} | ${g.widths.join(' ')} | ${g.detail} |\n`;
  }
  md += '\n## h1 treatments at 1440px\n\n| page | h1 | letter-spacing |\n|---|---|---|\n';
  for (const { page, width, records } of results) {
    if (width !== 1440) continue;
    const h1 = records.find((r) => r.role === 'h1');
    if (h1) md += `| ${page} | ${fmt(h1)} | ${h1.letterSpacing} |\n`;
  }
  md += '\n## First body h2 at 1440px\n\n| page | h2 | letter-spacing |\n|---|---|---|\n';
  for (const { page, width, records } of results) {
    if (width !== 1440) continue;
    const h2 = records.find((r) => r.role === 'first-h2');
    if (h2) md += `| ${page} | ${fmt(h2)} | ${h2.letterSpacing} |\n`;
  }
  await writeFile(`${OUT}/header-audit.md`, md);

  console.log(`\n${allFlags.length} flag(s). Report: ${OUT}/header-audit.{json,md}`);
  for (const f of allFlags) console.log(`  [${f.flag}] ${f.page}@${f.width} ${f.role}: ${f.detail}`);
} finally {
  server.kill();
}
