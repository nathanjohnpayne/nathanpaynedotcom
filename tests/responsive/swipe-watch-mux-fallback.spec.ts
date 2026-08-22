import { expect, test } from '@playwright/test';
import type { Locator } from '@playwright/test';

async function expectLoadingOrFastFallback(frame: Locator) {
  await expect
    .poll(() =>
      frame.evaluate((shell) => {
        const state = shell.getAttribute('data-playback-state');
        const playButton = shell.querySelector<HTMLButtonElement>('[data-mux-play]');

        return (
          (state === 'fallback' && playButton?.hidden === false) ||
          (state === 'loading' && playButton?.hidden === true)
        );
      }),
    )
    .toBe(true);
}

test('Swipe Watch swaps to the Mux GIF fallback when the stream cannot autoplay', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'Desktop 1440',
    'One viewport covers this media failure contract.',
  );

  await page.route('https://stream.mux.com/**', (route) => route.abort());
  await page.goto('/projects/swipe-watch/');

  const frame = page.locator('.project-screenshot__mux-shell');
  await expect(frame).toHaveAttribute('data-playback-state', 'fallback', { timeout: 7000 });

  const fallback = frame.locator('.project-screenshot__mux-gif-fallback');
  await expect(fallback).toHaveAttribute('src', /\/images\/projects\/swipe-watch-hero\.gif$/);
  await expect(fallback).toHaveCSS('opacity', '1');

  const playButton = frame.locator('.project-screenshot__mux-play');
  await expect(playButton).toBeVisible();
  await expect(playButton).toHaveAttribute('aria-label', 'Play Swipe Watch demo');

  await playButton.click();
  // The button is hidden while loading, but a fast route failure may settle
  // straight back to fallback and re-show it before Playwright observes that
  // transient state. Assert either coherent DOM snapshot atomically.
  await expectLoadingOrFastFallback(frame);
  await expect(frame).toHaveAttribute('data-playback-state', 'fallback', { timeout: 7000 });
  await expect(playButton).toBeVisible();
});

test('Swipe Watch hero honors prefers-reduced-motion: no autoplay, poster + play button, GIF only after explicit play (#468)', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'Desktop 1440', 'One viewport covers this media contract.');

  // Abort the stream like the fallback test so the run is deterministic and
  // offline-safe; the reduced-motion contract is about state choreography,
  // not real playback.
  await page.route('https://stream.mux.com/**', (route) => route.abort());
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/projects/swipe-watch/');

  const frame = page.locator('.project-screenshot__mux-shell');
  const playButton = frame.locator('.project-screenshot__mux-play');
  const fallback = frame.locator('.project-screenshot__mux-gif-fallback');

  // No autoplay: the hero parks on the poster with playback available on
  // request, and the looping GIF is NOT lazy-loaded.
  await expect(frame).toHaveAttribute('data-playback-state', 'paused', { timeout: 7000 });
  await expect(playButton).toBeVisible();
  expect(await fallback.getAttribute('src')).toBeNull();
  expect(
    await page.evaluate(() => {
      const v = document.querySelector('mux-background-video')?.shadowRoot?.querySelector('video');
      return v ? v.paused : null;
    }),
  ).toBe(true);

  // Force the failure to settle in the microtask immediately after click so
  // this test covers the valid loading-to-fallback race deterministically.
  await page.evaluate(() => {
    const video = document
      .querySelector('mux-background-video')
      ?.shadowRoot?.querySelector('video');
    if (!video) throw new Error('Mux shadow video was not available');
    video.play = () => Promise.reject(new DOMException('Simulated playback failure'));
  });

  // Explicit play is an opt-in to motion: with the stream aborted, the
  // normal failure path now applies and the animated GIF may load.
  await playButton.click();
  await expectLoadingOrFastFallback(frame);
  await expect(frame).toHaveAttribute('data-playback-state', 'fallback', { timeout: 7000 });
  await expect(fallback).toHaveAttribute('src', /\/images\/projects\/swipe-watch-hero\.gif$/);
  await expect(playButton).toBeVisible();
});
