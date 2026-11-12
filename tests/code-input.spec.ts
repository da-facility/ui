import {expect, test} from '@playwright/test';
import {collectErrors, isMobile, presetTweaks} from './helpers';

const input = (page: import('@playwright/test').Page) => page.getByRole('textbox', {name: 'One-time code'});
const boxes = (page: import('@playwright/test').Page) => page.locator('.code-input__box');

test('one real input takes typing, Backspace and a pasted code, and completes on the last digit', async ({page}) => {
  const errors = collectErrors(page);
  await page.goto('/render/code-input');
  const field = input(page);
  await expect(field).toBeFocused();
  await expect(field).toHaveAttribute('inputmode', 'numeric');
  await expect(field).toHaveAttribute('autocomplete', 'one-time-code');
  await expect(boxes(page)).toHaveCount(6);

  await page.keyboard.type('41');
  await expect(boxes(page)).toHaveText(['4', '1', '', '', '', '']);
  await expect(boxes(page).nth(2), 'the next box is active').toHaveAttribute('data-active', 'true');
  await page.keyboard.press('Backspace');
  await expect(boxes(page)).toHaveText(['4', '', '', '', '', '']);
  await page.keyboard.press('Backspace');

  // Pasting (or the browser's autofill) puts the whole code in at once; separators are dropped.
  await page.keyboard.insertText('419-070');
  await expect(boxes(page)).toHaveText(['4', '1', '9', '0', '7', '0']);
  await expect(field, 'read-only while checking').toHaveAttribute('readonly', '');
  const alert = page.getByRole('alert');
  await expect(alert).toHaveText('That code isn’t right. Check your email or request a new code.');
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  await expect(field).toHaveAttribute('aria-describedby', await alert.getAttribute('id') ?? '');
  await expect(boxes(page).first()).toHaveCSS('border-top-color', await page.evaluate(() => {
    const probe = document.createElement('div');
    probe.style.color = 'var(--color-error)';
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  }));

  // After an error the digits are selected, so typing starts over.
  await page.keyboard.type('419072');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveText('Signed in.');
  expect(errors).toEqual([]);
});

test('the caret stays after the last digit', async ({page}) => {
  await page.goto('/render/code-input');
  await page.keyboard.type('123');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Home');
  await page.keyboard.type('4');
  await expect(boxes(page)).toHaveText(['1', '2', '3', '4', '', '']);
});

test('checking, disabled and shorter codes', async ({page}) => {
  await presetTweaks(page, 'code-input', {checking: true, fourDigits: true});
  await page.goto('/render/code-input');
  await expect(boxes(page)).toHaveCount(4);
  await expect(input(page)).toHaveAttribute('readonly', '');
  await page.goto('about:blank');
  await presetTweaks(page, 'code-input', {disabled: true});
  await page.goto('/render/code-input');
  await expect(input(page)).toBeDisabled();
});

test('the boxes fit a phone, are touch-sized, and follow dark mode', async ({page}, testInfo) => {
  await page.goto('/render/code-input');
  const box = (await boxes(page).first().boundingBox())!;
  expect(box.height).toBe(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  // 16px text keeps iOS from zooming in when the field is focused.
  await expect(input(page)).toHaveCSS('font-size', '16px');
  const field = (await page.locator('.code-input__field').boundingBox())!;
  if (isMobile(testInfo)) expect(field.width).toBeLessThanOrEqual(390 - 2 * 24);
  const light = await boxes(page).first().evaluate(element => getComputedStyle(element).backgroundColor);
  await presetTweaks(page, 'code-input', {}, {darkMode: true});
  await page.reload();
  const dark = await boxes(page).first().evaluate(element => getComputedStyle(element).backgroundColor);
  expect(dark).not.toBe(light);
});
