import {expect, test} from '@playwright/test';
import {collectErrors, presetTweaks} from './helpers';

const background = (locator: import('@playwright/test').Locator) => locator.evaluate(element => getComputedStyle(element).backgroundColor);

test('the page is only a Pocket ID button, centred, until it has a title', async ({page}) => {
  const errors = collectErrors(page);
  await page.goto('/render/login-pocket-id');
  const main = page.getByRole('main', {name: 'Sign in', exact: true});
  const button = main.getByRole('button', {name: 'Sign in with Pocket ID', exact: true});
  await expect(button).toBeVisible();
  await expect(main.getByRole('heading')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  const box = (await button.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(Math.abs(box.x + box.width / 2 - viewport.width / 2)).toBeLessThan(4);
  expect(Math.abs(box.y + box.height / 2 - viewport.height / 2)).toBeLessThan(4);
  expect(box.height, 'touch-sized').toBeGreaterThanOrEqual(44);

  await button.click();
  await expect(page.getByRole('status')).toHaveText(/Pocket ID would open here/);
  expect(errors).toEqual([]);
});

test('a titled page explains itself, and a page without a way forward has no button', async ({page}) => {
  await presetTweaks(page, 'login-pocket-id', {expired: true});
  await page.goto('/render/login-pocket-id');
  const main = page.getByRole('main', {name: 'Sign-in took too long'});
  await expect(main.getByRole('heading', {name: 'Sign-in took too long'})).toBeVisible();
  await expect(main.getByRole('button', {name: 'Try again', exact: true})).toBeVisible();

  await presetTweaks(page, 'login-pocket-id', {noAccess: true});
  await page.goto('/render/login-pocket-id');
  await expect(page.getByRole('heading', {name: 'No access to this app'})).toBeVisible();
  await expect(page.getByRole('main').getByRole('button')).toHaveCount(0);
  await expect(page.getByRole('main').getByRole('link')).toHaveCount(0);
});

test('the button is Pocket ID’s black pill, light in dark mode', async ({page}) => {
  await page.goto('/render/pocket-id-button');
  const button = page.getByRole('main').getByRole('button', {name: 'Sign in with Pocket ID'}).first();
  expect(await background(button)).toBe('rgb(23, 23, 23)');
  await expect(button.locator('svg')).toHaveAttribute('aria-hidden', 'true');
  expect(await button.evaluate(element => getComputedStyle(element).borderRadius)).toBe('9999px');

  await presetTweaks(page, 'pocket-id-button', {}, {darkMode: true});
  await page.goto('/render/pocket-id-button');
  expect(await background(page.getByRole('main').getByRole('button', {name: 'Sign in with Pocket ID'}).first())).toBe('rgb(229, 229, 229)');
});

test('with an href the button is a link, and full width fills its container', async ({page}) => {
  await page.goto('/render/pocket-id-button');
  const link = page.getByRole('link', {name: 'Continue with Pocket ID', exact: true});
  await expect(link).toHaveAttribute('href', '#sign-in');
  const full = page.locator('section').filter({hasText: 'Full width'});
  const section = (await full.boundingBox())!;
  const button = (await full.getByRole('button').boundingBox())!;
  expect(button.width).toBeGreaterThan(section.width - 60);
});

test('the default label follows the provider’s locale', async ({page}) => {
  await presetTweaks(page, 'login-pocket-id', {}, {croatian: true});
  await page.goto('/render/login-pocket-id');
  await expect(page.getByRole('main', {name: 'Prijava', exact: true}).getByRole('button', {name: 'Prijava putem Pocket ID-a'})).toBeVisible();
});
