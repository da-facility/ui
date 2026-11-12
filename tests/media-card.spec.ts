import {expect, test} from '@playwright/test';
import {collectErrors, isMobile, presetTweaks} from './helpers';

test('each card is one link with its title, meta lines and a worded new dot', async ({page}) => {
  const errors = collectErrors(page);
  await page.goto('/render/media-card');
  const finals = page.getByRole('link', {name: /^Finals 2026/});
  await expect(finals).toHaveAttribute('href', '#finals');
  await expect(finals).toHaveAccessibleName('Finals 2026 5 galleries · 2,004 photos New: New photos 12 min ago');
  await expect(finals.locator('.media-card__dot')).toBeVisible();
  await expect(page.getByRole('link', {name: /^Regular season/}).locator('.media-card__dot')).toHaveCount(0);
  await expect(page.getByRole('link')).toHaveCount(5);

  await finals.focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', {name: /^Regular season/})).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#season$/);
  expect(errors).toEqual([]);
});

test('the cover fills with one to three images, and is an empty well without', async ({page}) => {
  await page.goto('/render/media-card');
  const cover = (name: RegExp) => page.getByRole('link', {name}).locator('.media-card__cover');
  const ratio = async (name: RegExp) => {
    const box = (await cover(name).boundingBox())!;
    return box.width / box.height;
  };
  expect(await ratio(/^Finals/)).toBeCloseTo(16 / 9, 1);
  const [large, small] = await cover(/^Finals/).locator('img').evaluateAll(images => images.slice(0, 2).map(image => image.getBoundingClientRect().width));
  expect(large).toBeGreaterThan(small * 1.8);
  const single = await cover(/^Media day/).evaluate(element => [element.getBoundingClientRect().width, element.querySelector('img')!.getBoundingClientRect().width]);
  expect(single[1]).toBeCloseTo(single[0], 0);
  await expect(cover(/^Official portraits/).locator('img')).toHaveCount(0);
  expect(await ratio(/^Official portraits/)).toBeCloseTo(16 / 9, 1);
});

test('cards share a row on desktop, stack on phones, and follow dark mode', async ({page}, testInfo) => {
  await presetTweaks(page, 'media-card', {}, {darkMode: true});
  await page.goto('/render/media-card');
  const boxes = await page.locator('.media-card').evaluateAll(cards => cards.map(card => card.getBoundingClientRect().top));
  if (isMobile(testInfo)) expect(new Set(boxes).size).toBe(5);
  else expect(new Set(boxes).size).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const background = await page.locator('.media-card').first().evaluate(card => getComputedStyle(card).backgroundColor);
  const [r, g, b] = background.match(/\d+/g)!.map(Number);
  expect((r + g + b) / 3, 'a dark card in dark mode').toBeLessThan(80);
});

test('an empty cover can say so instead of looking like an image that failed', async ({page}) => {
  await presetTweaks(page, 'media-card', {emptyLabel: true});
  await page.goto('/render/media-card');
  const card = page.getByRole('link', {name: /^Official portraits/});
  const cover = card.locator('.media-card__cover');
  await expect(cover.locator('img')).toHaveCount(0);
  await expect(cover).toHaveText('No photos yet');
  const [label, well] = [(await cover.locator('.media-card__empty').boundingBox())!, (await cover.boundingBox())!];
  expect(Math.abs(label.y + label.height / 2 - (well.y + well.height / 2))).toBeLessThan(2);
  // Read after the title, so the link's name still starts with it.
  await expect(card).toHaveAccessibleName(/^Official portraits No photos yet/);
  // Cards with images never show it.
  await expect(page.locator('.media-card__empty')).toHaveCount(1);
});
