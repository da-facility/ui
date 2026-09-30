import {expect, test} from '@playwright/test';
import {collectErrors, isMobile} from './helpers';

test('a rejected sign-in shows its error, and a successful one completes', async ({page}) => {
  const errors = collectErrors(page);
  await page.goto('/render/login-split');
  const email = page.getByLabel('Email', {exact: true});
  const password = page.getByLabel('Password', {exact: true});
  const submit = page.getByRole('button', {name: 'Login', exact: true});

  await expect(email).toHaveAttribute('autocomplete', 'email');
  await expect(password).toHaveAttribute('autocomplete', 'current-password');
  await email.fill('taylor@example.com');
  await password.fill('wrong');
  await submit.click();
  await expect(page.getByRole('alert')).toHaveText('That password is incorrect. Try again.');
  await expect(password).toHaveAttribute('aria-invalid', 'true');

  await password.fill('correct');
  await submit.click();
  await expect(page.getByRole('status').filter({hasText: 'Signed in'})).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('the layout fits the screen with touch-friendly fields', async ({page}, testInfo) => {
  await page.goto('/render/login-split');
  await expect(page.getByRole('heading', {name: 'Welcome back'})).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const fontSize = await page.getByLabel('Email', {exact: true}).evaluate(input => parseFloat(getComputedStyle(input).fontSize));
  if (isMobile(testInfo)) expect(fontSize).toBeGreaterThanOrEqual(16);
  const cover = (await page.locator('.login-split__cover').boundingBox())!;
  const form = (await page.locator('.login-split__form').boundingBox())!;
  if (isMobile(testInfo)) expect(cover.y, 'the cover sits above the form').toBeLessThan(form.y);
  else expect(cover.x, 'the cover sits beside the form').toBeGreaterThan(form.x + form.width);
});
