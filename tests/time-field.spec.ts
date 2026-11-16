import AxeBuilder from '@axe-core/playwright';
import {expect, test, type Page} from '@playwright/test';
import {collectErrors, isMobile, presetTweaks} from './helpers';

const startTime = (page: Page) => page.getByRole('textbox', {name: 'Start time'});
const endTime = (page: Page) => page.getByRole('textbox', {name: 'End time'});
const start = (page: Page) => page.getByTestId('time-field-start');
const end = (page: Page) => page.getByTestId('time-field-end');
const croatian = {croatian: true};

async function expectNoAxeViolations(page: Page, skipped: string[] = []) {
  const results = await new AxeBuilder({page}).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).disableRules(skipped).analyze();
  expect(results.violations.map(violation => `${violation.id}: ${violation.nodes.map(node => node.target.join(' ')).join(', ')}`)).toEqual([]);
}

test.describe('with a mouse and keyboard', () => {
  test.beforeEach(({}, testInfo) => test.skip(isMobile(testInfo), 'a finger gets the phone’s picker, tested below'));

  test('typed times on a 24-hour clock in Croatian: "17", "1700", "17:00" and "17.00"', async ({page}) => {
    const errors = collectErrors(page);
    await presetTweaks(page, 'time-field', {}, croatian);
    await page.goto('/render/time-field');
    await expect(startTime(page)).toHaveValue('17:00');
    await expect(endTime(page)).toHaveValue('');
    await expect(endTime(page)).toHaveAttribute('placeholder', 'end of day');

    for (const [typed, time] of [['9', '09:00'], ['1715', '17:15'], ['8:05', '08:05'], ['17.30', '17:30'], ['9.45', '09:45'], ['18.', '18:00']]) {
      await endTime(page).fill(typed);
      await endTime(page).press('Enter');
      await expect(end(page)).toHaveText(`Ends: 2026-12-02 ${time}`);
      // The field shows the time in the locale's form once it is left.
      await endTime(page).press('Tab');
      await expect(endTime(page)).toHaveValue(time);
    }

    // Leaving the field commits too.
    await endTime(page).fill('20.15');
    await endTime(page).press('Tab');
    await expect(end(page)).toHaveText('Ends: 2026-12-02 20:15');
    await expect(endTime(page)).toHaveValue('20:15');

    // A time that doesn't exist changes nothing.
    await endTime(page).fill('25.00');
    await endTime(page).press('Tab');
    await expect(end(page)).toHaveText('Ends: 2026-12-02 20:15');
    await expect(endTime(page)).toHaveValue('20:15');
    expect(errors).toEqual([]);
  });

  test('empty is a state of its own: the clear button, deleted text, and the placeholder', async ({page}) => {
    const errors = collectErrors(page);
    await presetTweaks(page, 'time-field', {}, croatian);
    await page.goto('/render/time-field');

    await page.getByRole('button', {name: 'Očisti: Start time'}).click();
    await expect(start(page)).toHaveText('Starts: 2026-11-22 start of day');
    await expect(startTime(page)).toBeFocused();
    await expect(startTime(page)).toHaveValue('');
    // Focused and empty, the field says how to write a time, in the locale's words.
    await expect(startTime(page)).toHaveAttribute('placeholder', 'npr. 14:30');
    await expect(page.getByRole('button', {name: 'Očisti: Start time'})).toHaveCount(0);
    await startTime(page).press('Tab');
    await expect(startTime(page)).toHaveAttribute('placeholder', 'start of day');

    // Deleting the text and leaving the field empties it.
    await endTime(page).fill('17:00');
    await expect(end(page)).toHaveText('Ends: 2026-12-02 17:00');
    await endTime(page).fill('');
    await endTime(page).press('Tab');
    await expect(end(page)).toHaveText('Ends: 2026-12-02 end of day');
    await expect(endTime(page)).toHaveAttribute('placeholder', 'end of day');

    // So does Enter, at once.
    await endTime(page).fill('8');
    await endTime(page).press('Enter');
    await expect(end(page)).toHaveText('Ends: 2026-12-02 08:00');
    await endTime(page).fill('');
    await endTime(page).press('Enter');
    await expect(end(page)).toHaveText('Ends: 2026-12-02 end of day');
    expect(errors).toEqual([]);
  });

  test('arrow keys step the minutes, by minuteStep when it is set', async ({page}) => {
    await presetTweaks(page, 'time-field', {}, croatian);
    await page.goto('/render/time-field');
    await startTime(page).focus();
    await page.keyboard.press('ArrowUp');
    await expect(start(page)).toHaveText('Starts: 2026-11-22 17:01');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect(start(page)).toHaveText('Starts: 2026-11-22 16:59');

    await presetTweaks(page, 'time-field', {quarterHours: true}, croatian);
    await page.reload();
    await startTime(page).focus();
    await page.keyboard.press('ArrowUp');
    await expect(start(page)).toHaveText('Starts: 2026-11-22 17:15');
    await expect(startTime(page)).toHaveValue('17:15');
  });

  test('min and max: a time outside them isn’t taken', async ({page}) => {
    await presetTweaks(page, 'time-field', {limits: true}, croatian);
    await page.goto('/render/time-field');
    await endTime(page).fill('21.00');
    await endTime(page).press('Tab');
    await expect(end(page)).toHaveText('Ends: 2026-12-02 end of day');
    await endTime(page).fill('19.30');
    await endTime(page).press('Tab');
    await expect(end(page)).toHaveText('Ends: 2026-12-02 19:30');
  });

  test('English uses a 12-hour clock and keeps the value on 24 hours', async ({page}) => {
    await page.goto('/render/time-field');
    await expect(startTime(page)).toHaveValue(/^5:00\s?PM$/);
    await endTime(page).focus();
    await expect(endTime(page)).toHaveAttribute('placeholder', 'e.g., 2:30 PM');
    await endTime(page).fill('9:15 pm');
    await endTime(page).press('Tab');
    await expect(end(page)).toHaveText('Ends: 2026-12-02 21:15');
    await expect(endTime(page)).toHaveValue(/^9:15\s?PM$/);
  });

  test('disabled with a reason that keyboard users can read', async ({page}) => {
    await presetTweaks(page, 'time-field', {disabled: true}, croatian);
    await page.goto('/render/time-field');
    await expect(startTime(page)).toHaveAttribute('aria-disabled', 'true');
    await startTime(page).focus();
    await expect(page.getByRole('tooltip')).toHaveText('Only the folder’s owner can change this.');
    await page.keyboard.press('ArrowUp');
    await expect(start(page)).toHaveText('Starts: 2026-11-22 17:00');
    await expect(page.getByRole('button', {name: 'Očisti: Start time'})).toHaveCount(0);
  });

  test('an error shows its message and marks the field', async ({page}) => {
    await presetTweaks(page, 'time-field', {error: true}, croatian);
    await page.goto('/render/time-field');
    await expect(endTime(page)).toHaveAttribute('aria-invalid', 'true');
    await expect(endTime(page)).toHaveAccessibleDescription('End after the start.');
  });
});

test('no axe violations, empty and filled, light and dark', async ({page}) => {
  for (const darkMode of [false, true]) {
    await presetTweaks(page, 'time-field', {error: true}, {...croatian, darkMode});
    await page.goto('/render/time-field');
    await expect(page.getByText('Ends: 2026-12-02 end of day')).toBeVisible();
    await expectNoAxeViolations(page);
    // A disabled field is greyed on purpose: WCAG leaves inactive controls out of the contrast rule.
    await presetTweaks(page, 'time-field', {disabled: true}, {...croatian, darkMode});
    await page.reload();
    await expect(startTime(page)).toHaveAttribute('aria-disabled', 'true');
    await expectNoAxeViolations(page, ['color-contrast']);
  }
});

test.describe('with a finger', () => {
  test.beforeEach(({}, testInfo) => test.skip(!isMobile(testInfo), 'phones only'));

  test('the phone’s own time picker, on 24 hours, emptied with the clear button', async ({page}) => {
    const errors = collectErrors(page);
    await presetTweaks(page, 'time-field', {}, croatian);
    await page.goto('/render/time-field');
    const native = page.locator('.time-field input[type="time"]');
    await expect(native).toHaveCount(2);
    // While empty, the placeholder shows over the phone's control.
    await expect(page.getByText('end of day', {exact: true})).toBeVisible();
    await expect(page.getByText('17:00', {exact: true})).toBeVisible();

    await native.nth(1).fill('09:15');
    await expect(end(page)).toHaveText('Ends: 2026-12-02 09:15');
    // The phone's picker closes, which leaves the field.
    await native.nth(1).blur();
    await expect(page.getByText('09:15', {exact: true})).toBeVisible();
    const clear = page.getByRole('button', {name: 'Očisti: End time'});
    const box = await clear.boundingBox();
    expect(box!.width).toBeGreaterThan(0);
    await clear.tap();
    await expect(end(page)).toHaveText('Ends: 2026-12-02 end of day');
    await expect(page.getByText('end of day', {exact: true})).toBeVisible();
    expect(errors).toEqual([]);
  });
});
