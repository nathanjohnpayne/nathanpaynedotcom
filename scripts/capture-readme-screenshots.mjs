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
 *
 * Each capture is then framed in device chrome drawn the way the
 * friends-and-family-billing and matchline wireframes draw it: a macOS window
 * bar with the page's address for desktop, an iPhone bezel for phone. The
 * chrome sits outside the capture, so the page pixels are untouched, and the
 * margin around it stays transparent for the README's light and dark themes.
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

// Chrome values follow friends-and-family-billing/plans/ffb-wireframes.html
// (.macbar, .fw.ph .frame) so the README shots and the wireframes read as one
// family.
const FRAME_CSS = `
  html,body{margin:0;background:transparent}
  .pad{display:inline-block;padding:40px}
  .win{display:flex;flex-direction:column;border-radius:10px;overflow:hidden;
    box-shadow:0 0 0 1px #b9b9c2,0 18px 44px rgba(0,0,0,.2)}
  .macbar{height:38px;flex:0 0 auto;background:linear-gradient(#f3f3f5,#e6e6ea);
    border-bottom:1px solid #cfcfd6;display:flex;align-items:center;padding:0 14px;gap:8px;position:relative}
  .macbar i{width:12px;height:12px;border-radius:50%;display:block;box-shadow:inset 0 0 0 .5px rgba(0,0,0,.15)}
  .macbar i:nth-child(1){background:#ff5f57}.macbar i:nth-child(2){background:#febc2e}
  .macbar i:nth-child(3){background:#28c840}
  .macbar .addr{position:absolute;left:50%;top:7px;transform:translateX(-50%);width:440px;height:24px;
    border-radius:7px;background:#fff;border:1px solid #d4d4d8;font:11.5px Inter,system-ui,sans-serif;
    color:#52525b;display:flex;align-items:center;justify-content:center}
  .phone{border-radius:44px;overflow:hidden;
    box-shadow:0 0 0 9px #17171a,0 0 0 10.5px #45454c,0 14px 34px rgba(0,0,0,.22)}
  img{display:block}
`;

function frameHtml(shot, png) {
  const { width, height } = shot.device;
  const img = `<img src="data:image/png;base64,${png.toString('base64')}" width="${width}" height="${height}" alt="">`;
  const body =
    shot.device === PHONE
      ? `<div class="phone">${img}</div>`
      : `<div class="win"><div class="macbar"><i></i><i></i><i></i><span class="addr">nathanpayne.com${shot.path}</span></div>${img}</div>`;
  return `<!doctype html><meta charset="utf-8"><style>${FRAME_CSS}</style><div class="pad">${body}</div>`;
}

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
    const png = await page.screenshot();
    await context.close();

    const frame = await browser.newPage({
      viewport: { width: shot.device.width + 200, height: shot.device.height + 200 },
      deviceScaleFactor: shot.device.deviceScaleFactor,
    });
    await frame.setContent(frameHtml(shot, png));
    await frame.locator('.pad').screenshot({ path: join(OUT, shot.file), omitBackground: true });
    await frame.close();
    console.log(`captured ${shot.file}`);
  }
} finally {
  await browser.close();
}
