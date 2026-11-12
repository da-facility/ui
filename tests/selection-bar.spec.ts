import {expect, test} from '@playwright/test';
import {collectErrors, isMobile, presetTweaks} from './helpers';

const luminance = (color: string) => {
  const [r, g, b] = color.match(/[\d.]+/g)!.map(Number);
  return (r + g + b) / 3;
};

test('the bar shows the count, summary and actions in a live region; Escape and the button clear', async ({page}) => {
  const errors = collectErrors(page);
  await page.goto('/render/selection-bar');
  const status = page.locator('.selection-bar');
  await expect(status).toHaveAttribute('role', 'status');
  await expect(status).toContainText('3 selected · up to 2400 px');
  await expect(status.getByRole('button', {name: 'Download'})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(status).toBeEmpty();
  await expect(status, 'the live region stays, ready to announce the next selection').toBeAttached();
  await page.getByRole('button', {name: 'Select 3 again'}).click();
  await expect(status).toContainText('3 selected');
  await status.getByRole('button', {name: 'Clear selection'}).click();
  await expect(status).toBeEmpty();
  expect(errors).toEqual([]);
});

test('without download the text says so and there is no Download button', async ({page}) => {
  await presetTweaks(page, 'selection-bar', {noDownload: true, many: true});
  await page.goto('/render/selection-bar');
  await expect(page.locator('.selection-bar')).toContainText('1,204 selected · downloading isn’t allowed');
  await expect(page.getByRole('button', {name: 'Download'})).toHaveCount(0);
});

// Croatian plurals follow the last digits: 1 odabrana, 3 and 1.204 odabrane (like 12 odabranih in the design).
test('Croatian counts take the right plural form and the locale’s grouping', async ({page}) => {
  for (const [tweaks, text] of [[{one: true}, '1 odabrana'], [{}, '3 odabrane'], [{many: true}, '1.204 odabrane']] as const) {
    await presetTweaks(page, 'selection-bar', tweaks, {croatian: true});
    await page.goto('/render/selection-bar');
    await expect(page.locator('.selection-bar')).toContainText(text);
    await expect(page.getByRole('button', {name: 'Poništi odabir'})).toBeVisible();
  }
});

test('the bar inverts the theme: dark in light mode, light in dark mode', async ({page}) => {
  for (const darkMode of [false, true]) {
    await presetTweaks(page, 'selection-bar', {}, {darkMode});
    await page.goto('/render/selection-bar');
    const bar = page.locator('.selection-bar__bar');
    const [background, text, body] = await bar.evaluate(element => [getComputedStyle(element).backgroundColor, getComputedStyle(element).color, getComputedStyle(document.body.querySelector('main')!.parentElement!).backgroundColor]);
    if (darkMode) expect(luminance(background)).toBeGreaterThan(180);
    else expect(luminance(background)).toBeLessThan(60);
    expect(Math.abs(luminance(background) - luminance(text))).toBeGreaterThan(120);
    void body;
  }
});

test('in the gallery it sticks to the bottom of the screen and rests after the last row', async ({page}, testInfo) => {
  await page.goto('/render/media-grid');
  await expect(page.locator('.media-tile:not([data-loading])').first()).toBeVisible();
  await page.locator('.media-tile[data-index="0"]').getByRole('checkbox').check({force: true});
  const bar = page.locator('.selection-bar__bar');
  await expect(bar).toBeVisible();
  const viewport = page.viewportSize()!;
  // Once it has slid in, 16px above the bottom of the screen.
  await expect.poll(async () => {
    const box = (await bar.boundingBox())!;
    return Math.round(viewport.height - (box.y + box.height));
  }).toBe(16);
  const box = (await bar.boundingBox())!;
  const grid = (await page.locator('.media-grid').boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(grid.x - 1);
  expect(box.x + box.width).toBeLessThanOrEqual(grid.x + grid.width + 1);

  // At the very end the bar sits below the grid, so the last row stays visible.
  await expect(async () => {
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await expect(page.getByText('All 240 photos are loaded.')).toBeVisible({timeout: 1000});
  }).toPass({timeout: 20_000});
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  const lastTile = (await page.locator('.media-tile').last().boundingBox())!;
  const rested = (await bar.boundingBox())!;
  expect(rested.y).toBeGreaterThan(lastTile.y + lastTile.height);
  if (isMobile(testInfo)) expect(rested.width).toBeLessThanOrEqual(390);
  await page.keyboard.press('Escape');
  await expect(page.locator('.media-tile[data-selected]')).toHaveCount(0);
});
