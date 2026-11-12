import {expect, test} from '@playwright/test';
import {collectErrors, isMobile, presetTweaks} from './helpers';

test('breadcrumbs, one title, a meta line, actions and filter chips', async ({page}) => {
  const errors = collectErrors(page);
  await page.goto('/render/page-header');
  const header = page.locator('header.page-header');
  await expect(page.getByRole('heading', {level: 1})).toHaveText('Final');
  await expect(page.getByRole('heading', {level: 1})).toHaveCount(1);

  const crumbs = page.getByRole('navigation', {name: /breadcrumb/i});
  await expect(crumbs.getByRole('link')).toHaveText(['Northern League', 'Finals 2026']);
  await expect(crumbs.getByText('Final', {exact: true})).toHaveAttribute('aria-current', 'page');

  await expect(header.locator('.page-header__meta')).toHaveText('Main Arena · June 14, 2026 · 1,204 photos · 6 photographers');
  await expect(header.getByRole('button', {name: 'Download all'})).toBeVisible();

  const filters = page.getByRole('group', {name: 'Filters'});
  const trophy = filters.getByRole('button', {name: 'Trophy'});
  await expect(trophy).toHaveAttribute('aria-pressed', 'true');
  const coach = filters.getByRole('button', {name: 'Coach'});
  await coach.focus();
  await page.keyboard.press('Enter');
  await expect(coach).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Space');
  await expect(coach).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('textbox', {name: 'Search photos'}).fill('trophy');
  await expect(page.getByRole('textbox', {name: 'Search photos'})).toHaveValue('trophy');
  expect(errors).toEqual([]);
});

test('actions sit beside the title on desktop and wrap under it on phones', async ({page}, testInfo) => {
  await page.goto('/render/page-header');
  const title = (await page.locator('.page-header__title').boundingBox())!;
  const actions = (await page.locator('.page-header__actions').boundingBox())!;
  if (isMobile(testInfo)) expect(actions.y).toBeGreaterThanOrEqual(title.y + title.height);
  else expect(actions.x).toBeGreaterThan(title.x + title.width);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('parts can be left out, and the chosen chip follows dark mode', async ({page}) => {
  await presetTweaks(page, 'page-header', {breadcrumbs: false, actions: false, tools: false});
  await page.goto('/render/page-header');
  await expect(page.getByRole('heading', {name: 'Final'})).toBeVisible();
  await expect(page.locator('.page-header__breadcrumbs, .page-header__actions, .page-header__tools')).toHaveCount(0);

  await page.goto('about:blank');
  await presetTweaks(page, 'page-header', {}, {darkMode: true, croatian: true});
  await page.goto('/render/page-header');
  await expect(page.getByRole('group', {name: 'Filtri'})).toBeVisible();
  const chosen = page.getByRole('button', {name: 'Trophy'});
  const [background, color] = await chosen.evaluate(element => [getComputedStyle(element).backgroundColor, getComputedStyle(element).color]);
  expect(background).not.toBe(color);
});
