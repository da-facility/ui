import {expect, test} from '@playwright/test';
import {collectErrors} from './helpers';

test('the user menu works with the keyboard and pointer', async ({page}) => {
  const errors = collectErrors(page);
  await page.goto('/render/user-menu');
  const trigger = page.locator('.user-menu-example__variants section').first().getByRole('button', {name: 'Account menu for Alex Johnson'});
  const profile = page.getByRole('menuitem', {name: 'Profile', exact: true});
  await expect(trigger.locator('[tabindex="0"]'), 'the avatar adds no tab stop').toHaveCount(0);

  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(profile).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status').filter({hasText: 'Settings selected.'})).toBeVisible();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(profile).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(profile).toBeHidden();

  await trigger.click();
  await expect(profile).toBeVisible();
  await page.getByRole('heading', {name: 'User menu', exact: true}).click();
  await expect(profile, 'clicking outside closes the menu').toBeHidden();
  expect(errors).toEqual([]);
});

test('compact and initials variants have accessible names', async ({page}) => {
  await page.goto('/render/user-menu');
  await expect(page.getByRole('button', {name: 'Account menu for Sam Rivera'})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Account menu for Alex Johnson'})).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
