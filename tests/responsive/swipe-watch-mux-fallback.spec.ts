import { expect, test } from '@playwright/test';

test('Swipe Watch swaps to the Mux GIF fallback when the stream cannot autoplay', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'Desktop 1440', 'One viewport covers this media failure contract.');

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
});
