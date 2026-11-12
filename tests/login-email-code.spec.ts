import {expect, test, type Page} from '@playwright/test';
import {collectErrors, isMobile, presetTweaks} from './helpers';

const email = (page: Page) => page.getByRole('textbox', {name: 'Email', exact: true});
const code = (page: Page) => page.getByRole('textbox', {name: 'One-time code'});

async function toCodeStep(page: Page) {
  await email(page).fill('taylor@example.com');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', {name: 'Enter the code'})).toBeVisible();
  await expect(code(page)).toBeFocused();
}

test('an email, then the code: wrong, expired and right codes', async ({page}) => {
  const errors = collectErrors(page);
  await page.goto('/render/login-email-code');
  await expect(page.getByRole('heading', {name: 'Sign in', exact: true})).toBeVisible();
  await expect(email(page)).toBeFocused();
  await expect(email(page)).toHaveAttribute('autocomplete', 'username email');
  await toCodeStep(page);
  await expect(page.getByText('We sent a code to taylor@example.com.')).toBeVisible();

  await page.keyboard.type('123456');
  await expect(code(page)).toHaveAttribute('readonly', '');
  await expect(page.getByRole('alert')).toHaveText('That code isn’t right. Check your email or request a new code.');
  await page.keyboard.type('000000');
  await expect(page.getByRole('alert')).toHaveText('That code has expired. Request a new code.');
  await page.keyboard.type('419072');
  await expect(page.getByRole('status')).toHaveText('Signed in as taylor@example.com.');
  await expect(code(page), 'stays read-only while the app navigates away').toHaveAttribute('readonly', '');

  // The email step is one click back, with the address kept.
  await page.reload();
  await toCodeStep(page);
  await page.getByRole('button', {name: 'Use a different email'}).click();
  await expect(email(page)).toBeFocused();
  await expect(email(page)).toHaveValue('taylor@example.com');
  expect(errors).toEqual([]);
});

test('a new code can be requested once the cool-down has passed', async ({page}) => {
  await page.clock.install();
  await page.goto('/render/login-email-code');
  await email(page).fill('taylor@example.com');
  await page.keyboard.press('Enter');
  await page.clock.runFor(1000);
  const resend = page.getByRole('button', {name: /new code/});
  await expect(resend).toHaveText('Send a new code in 30 s');
  await expect(resend).toBeDisabled();
  await page.clock.runFor(10_000);
  await expect(resend).toHaveText('Send a new code in 20 s');
  await page.clock.runFor(20_000);
  await expect(resend).toHaveText('Send a new code');
  await resend.click();
  await page.clock.runFor(1000);
  await expect(page.getByRole('status')).toHaveText('We sent a new code.');
  await expect(resend).toBeDisabled();
});

test('too many attempts locks the page and counts down the minutes', async ({page}) => {
  await page.clock.install();
  await presetTweaks(page, 'login-email-code', {locked: true});
  await page.goto('/render/login-email-code');
  await email(page).fill('taylor@example.com');
  await page.keyboard.press('Enter');
  await page.clock.runFor(1000);
  await expect(page.getByRole('alert')).toHaveText('Too many attempts. Try again in 15 min.');
  await expect(email(page)).toBeDisabled();
  await expect(page.getByRole('button', {name: 'Send code'})).toBeDisabled();
  await page.clock.runFor(60_000);
  await expect(page.getByRole('alert')).toHaveText('Too many attempts. Try again in 14 min.');
  await page.clock.runFor(14 * 60_000);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(email(page)).toBeEnabled();
});

test('a locked code step turns the boxes and resend off', async ({page}) => {
  await presetTweaks(page, 'login-email-code', {locked: true, codeStep: true});
  await page.goto('/render/login-email-code');
  await code(page).focus();
  await page.keyboard.type('419072');
  await expect(page.getByRole('alert')).toHaveText('Too many attempts. Try again in 15 min.');
  await expect(code(page)).toBeDisabled();
  await expect(page.getByRole('button', {name: 'Send a new code'})).toBeDisabled();
});

test('Croatian text, and the brand panel stays dark in light mode', async ({page}) => {
  await presetTweaks(page, 'login-email-code', {}, {croatian: true});
  await page.goto('/render/login-email-code');
  await expect(page.getByRole('heading', {name: 'Prijava'})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Pošalji kod'})).toBeVisible();
  await page.getByRole('textbox', {name: 'E-mail adresa'}).fill('ana@example.com');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', {name: 'Upišite kod'})).toBeVisible();
  await expect(page.getByRole('textbox', {name: 'Jednokratni kod'})).toBeFocused();

  const panel = page.locator('.login-email-code__panel');
  const luminance = await panel.evaluate(element => {
    const [r, g, b] = getComputedStyle(element).backgroundColor.match(/\d+/g)!.map(Number);
    return (r + g + b) / 3;
  });
  expect(luminance, 'the panel uses the dark canvas').toBeLessThan(60);
});

test('the panel sits beside the form on desktop and above it on phones', async ({page}, testInfo) => {
  await page.goto('/render/login-email-code');
  const panel = (await page.locator('.login-email-code__panel').boundingBox())!;
  const form = (await page.locator('.login-email-code__step').boundingBox())!;
  if (isMobile(testInfo)) {
    expect(panel.y + panel.height).toBeLessThanOrEqual(form.y);
    await expect(email(page)).toHaveCSS('font-size', '16px');
    expect((await email(page).boundingBox())!.height).toBe(44);
  } else {
    expect(panel.x + panel.width).toBeLessThanOrEqual(form.x);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
