#!/usr/bin/env node
/**
 * Capture the README screenshots in docs/images/readme/.
 *
 * The shots are the real site, not mockups: build it, serve the build, then
 * run this against the served origin.
 *
 *   npm run build
 *   npx astro preview --port 4450 &
 *   node scripts/capture-readme-screenshots.mjs http://localhost:4450
 *   npx astro preview stop
 *
 * Each page opens with the privacy notice already dismissed (the same stored
 * choice tests/desktop-composition.test.js seeds), so the notice card does not
 * cover the page. Phone shots are 390×844 at 2x; desktop shots are 1440×900
 * at 1x. Only the first viewport is captured, which is what a visitor sees
 * on arrival.
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const BASE = (process.argv[2] || 'http://localhost:4450').replace(/\/$/, '');
const OUT = join(process.cwd(), 'docs', 'images', 'readme');

const PHONE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const DESKTOP = { width: 1440, height: 900, deviceScaleFactor: 1 };

const SHOTS = [
  { file: 'home-desktop.png', path: '/', device: DESKTOP },
  { file: 'home-desktop-about-open.png', path: '/', device: DESKTOP, open: 'about' },
  { file: 'home-phone.png', path: '/', device: PHONE },
  { file: 'blog-phone.png', path: '/blog/', device: PHONE },
  { file: 'article-phone.png', path: '/blog/the-product-did-not-travel/', device: PHONE },
  { file: 'projects-phone.png', path: '/projects/', device: PHONE },
  { file: 'project-desktop.png', path: '/projects/five-across/', device: DESKTOP },
  { file: 'resume-desktop.png', path: '/resume/', device: DESKTOP },
];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
try {
  for (const shot of SHOTS) {
    const { width, height, ...device } = shot.device;
    const context = await browser.newContext({
      viewport: { width, height },
      reducedMotion: 'reduce',
      ...device,
    });
    await context.addInitScript(() => {
      try {
        localStorage.setItem(
          'np-privacy',
          JSON.stringify({ v: 1, choice: 'unset', noticeDismissed: true }),
        );
      } catch {
        // Storage blocked: the notice shows, and the shot is retaken.
      }
    });
    const page = await context.newPage();
    await page.goto(BASE + shot.path, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    if (shot.open) {
      await page.hover(`.panel[data-panel="${shot.open}"]`);
      await page.waitForSelector(`.panel[data-panel="${shot.open}"].is-content-visible`);
    }
    await page.screenshot({ path: join(OUT, shot.file) });
    console.log(`captured ${shot.file}`);
    await context.close();
  }
} finally {
  await browser.close();
}
