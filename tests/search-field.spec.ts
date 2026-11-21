import {expect, test} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {collectErrors, isMobile, presetTweaks} from './helpers';

/** `SearchField` (`/search-field`): the bar's search, a second way to search behind its toggle, the words found marked in the grid's captions. */

test('typing searches, the found words are marked in the captions, Enter submits, the clear button empties it', async ({page}) => {
  const errors = collectErrors(page);
  await page.goto('/render/search-field');
  const field = page.getByRole('searchbox', {name: 'Search photos'});
  const box = (await page.locator('.search-field').boundingBox())!;
  expect(box.height).toBe(isMobile(test.info()) ? 44 : 32);
  await field.fill('img_400');
  await expect(page.locator('.media-tile')).toHaveCount(10);
  // Every caption marks the word that matched, as written.
  const marks = await page.locator('.media-tile__term').allTextContents();
  expect(marks.length).toBeGreaterThan(0);
  for (const m of marks) expect(['IMG', '4000', '4001', '4002', '4003', '4004', '4005', '4006', '4007', '4008', '4009']).toContain(m);
  await field.press('Enter');
  await expect(page.locator('.search-field-example__status')).toContainText('Submitted: img_400.');
  await page.getByRole('button', {name: 'Clear the search'}).click();
  await expect(field).toHaveValue('');
  await expect(page.locator('.media-tile')).toHaveCount(24);
  await expect(page.getByRole('button', {name: 'Clear the search'})).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('the toggle is a pressed button that gives the field its star; on a phone its short text', async ({page}) => {
  await page.goto('/render/search-field');
  const toggle = page.getByRole('button', {name: 'AI search'});
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  expect((await toggle.innerText()).trim()).toBe(isMobile(test.info()) ? 'AI' : 'AI search');
  // On a phone each of its buttons is a touch target of the field's height.
  if (isMobile(test.info())) expect((await toggle.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.search-field')).toHaveAttribute('data-toggled', 'true');
  await expect(page.locator('.search-field__icon .search-field__star')).toBeVisible();
  await expect(page.locator('.search-field-example__status')).toContainText('by what is in the picture');
});

test('has no accessibility violations, light and dark, empty and searching', async ({page}) => {
  for (const darkMode of [false, true]) {
    await presetTweaks(page, 'search-field', {}, {darkMode});
    await page.goto('/render/search-field');
    expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
    await page.getByRole('searchbox', {name: 'Search photos'}).fill('img');
    await page.getByRole('button', {name: 'AI search'}).click();
    expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
  }
});

test('a marked word late in a long caption is seen whole in every tile, cut around; no result tile is narrower than a square', async ({page}) => {
  await page.goto('/render/search-field');
  await page.getByRole('searchbox', {name: 'Search photos'}).fill('sunset');
  await expect(page.locator('.media-tile').first()).toBeVisible();
  const tiles = page.locator('.media-tile');
  for (let i = 0; i < await tiles.count(); i++) {
    const tile = (await tiles.nth(i).boundingBox())!;
    const mark = (await tiles.nth(i).locator('.media-tile__term').first().boundingBox())!;
    expect(mark.x).toBeGreaterThanOrEqual(tile.x);
    expect(mark.x + mark.width).toBeLessThanOrEqual(tile.x + tile.width + 0.5);
    // What stood before it gave way, its start cut ("…").
    await expect(tiles.nth(i).locator('.media-tile__caption-lead')).toBeVisible();
  }
  // A tall photo (the lighthouse) gets a square tile, the photo whole inside it.
  await page.getByRole('searchbox', {name: 'Search photos'}).fill('lighthouse');
  const tall = page.locator('.media-tile').first();
  await expect(tall).toBeVisible();
  const box = (await tall.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(box.height - 1);
  await expect(tall).toHaveAttribute('data-fit', 'contain');
  await expect(tall.locator('.media-tile__caption')).toBeVisible();
});

test('a caption line that fits reads whole, with no cut', async ({page}) => {
  await page.goto('/render/search-field');
  await page.getByRole('searchbox', {name: 'Search photos'}).fill('img');
  const title = page.locator('.media-tile__caption-title').first();
  await expect(title).toBeVisible();
  await expect(title.locator('.media-tile__caption-lead')).toHaveCount(0);
});
