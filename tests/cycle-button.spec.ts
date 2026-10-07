import {expect, test} from '@playwright/test';
import {collectErrors, setTweak} from './helpers';

test('a cycle button steps through its states and wraps around', async ({page}) => {
  const errors = collectErrors(page);
  await page.goto('/render/cycle-button');
  const status = page.locator('.cycle-button-example > p');
  const theme = page.getByRole('button', {name: 'Theme: System'}).first();
  const width = await theme.evaluate(button => button.getBoundingClientRect().width);

  await theme.click();
  await expect(status).toHaveText('Sort ascending, light theme, list view.');
  const light = page.getByRole('button', {name: 'Theme: Light'}).first();
  await expect(light).toBeFocused();

  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', {name: 'Theme: System'}), 'the labelled and icon-only buttons share state').toHaveCount(2);
  await expect(status).toHaveText('Sort ascending, system theme, list view.');
  expect(await theme.evaluate(button => button.getBoundingClientRect().width), 'the width fits the longest label').toBe(width);
  expect(errors).toEqual([]);
});

test('two and four states, icon-only and disabled buttons', async ({page}) => {
  await page.goto('/render/cycle-button');
  await page.getByRole('button', {name: 'Sort: Ascending'}).last().click();
  await page.getByRole('button', {name: 'Sort: Descending'}).last().click();
  await expect(page.getByRole('button', {name: 'Sort: Ascending'})).toHaveCount(2);

  const view = page.getByRole('button', {name: /^View: /}).first();
  for (const state of ['Grid', 'Board', 'Calendar', 'List']) {
    await view.click();
    await expect(view).toHaveAccessibleName(`View: ${state}`);
  }
  await expect(view.locator('.cycle-button__step')).toHaveCount(4);

  await page.goto('/cycle-button');
  await setTweak(page, 'Disabled', true);
  await expect(page.getByRole('button', {name: /^View: /}).first()).toBeDisabled();
  await setTweak(page, 'Disabled', false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
