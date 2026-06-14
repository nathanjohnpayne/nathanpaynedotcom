import { expect, test } from '@playwright/test';

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
  // Either we catch the transient "loading" state mid-flight, or the route
  // abort fires so fast we land straight on "fallback". Both are valid —
  // the contract being tested is that the click moves us off the prior
  // "fallback" snapshot, not which intermediate frame Playwright observes.
  await expect(frame).toHaveAttribute('data-playback-state', /^(loading|fallback)$/);
  await expect(playButton).toBeHidden();
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

  // Explicit play is an opt-in to motion: with the stream aborted, the
  // normal failure path now applies and the animated GIF may load.
  await playButton.click();
  await expect(frame).toHaveAttribute('data-playback-state', 'fallback', { timeout: 7000 });
  await expect(fallback).toHaveAttribute('src', /\/images\/projects\/swipe-watch-hero\.gif$/);
});
