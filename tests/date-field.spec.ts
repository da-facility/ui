import AxeBuilder from '@axe-core/playwright';
import {expect, test, type Page} from '@playwright/test';
import {collectErrors, isMobile, presetTweaks} from './helpers';

const field = (page: Page) => page.getByRole('combobox', {name: 'Valid until'});
const value = (page: Page) => page.getByTestId('date-field-value');
const croatian = {croatian: true};

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({page}).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.violations.map(violation => `${violation.id}: ${violation.nodes.map(node => node.target.join(' ')).join(', ')}`)).toEqual([]);
}

test.describe('with a mouse and keyboard', () => {
  test.beforeEach(({}, testInfo) => test.skip(isMobile(testInfo), 'a finger opens the sheet, tested below'));

  test('a typed date is read in the locale’s order', async ({page}) => {
    const errors = collectErrors(page);
    await presetTweaks(page, 'date-field', {}, croatian);
    await page.goto('/render/date-field');
    await expect(field(page)).toHaveValue('20. studenoga 2026.');
    await expect(field(page)).toHaveAttribute('placeholder', 'Odaberite ili upišite datum');

    // The way dates are written in Croatian: spaces and a closing dot.
    await field(page).fill('3. 12. 2026.');
    await field(page).press('Enter');
    await expect(value(page)).toHaveText('Value: 2026-12-03');
    await expect(field(page)).toHaveValue('3. prosinca 2026.');

    // The field's own display, edited, and leaving the field commits it.
    await field(page).fill('21. studenoga 2026.');
    await field(page).press('Tab');
    await expect(value(page)).toHaveText('Value: 2026-11-21');

    await field(page).fill('4.1.2027');
    await field(page).press('Enter');
    await expect(value(page)).toHaveText('Value: 2027-01-04');

    // A day that doesn't exist changes nothing.
    await field(page).fill('31. 2. 2027.');
    await field(page).press('Enter');
    await expect(value(page)).toHaveText('Value: 2027-01-04');
    expect(errors).toEqual([]);
  });

  test('English reads month first', async ({page}) => {
    await page.goto('/render/date-field');
    await expect(field(page)).toHaveValue('November 20, 2026');
    await field(page).fill('12/3/2026');
    await field(page).press('Enter');
    await expect(value(page)).toHaveText('Value: 2026-12-03');
  });

  test('the calendar: Monday first in Croatian, arrow keys, Page Up and Down by month, Escape back to the field', async ({page}) => {
    await presetTweaks(page, 'date-field', {}, croatian);
    await page.goto('/render/date-field');
    await field(page).focus();
    await page.keyboard.press('ArrowDown');
    const calendar = page.getByRole('dialog', {name: 'Odabir datuma'});
    await expect(calendar).toBeVisible();
    await expect(calendar.getByRole('columnheader')).toHaveText(['pon', 'uto', 'sri', 'čet', 'pet', 'sub', 'ned']);
    await expect(calendar.getByRole('grid')).toHaveAccessibleName('studeni 2026.');

    const selected = calendar.getByRole('button', {name: 'petak, 20. studenoga 2026., odabrano'});
    await selected.focus();
    await page.keyboard.press('ArrowRight');
    await expect(calendar.getByRole('button', {name: 'subota, 21. studenoga 2026.'})).toBeFocused();
    await page.keyboard.press('PageDown');
    await expect(calendar.getByRole('button', {name: 'ponedjeljak, 21. prosinca 2026.'})).toBeFocused();
    await expect(calendar.getByRole('grid')).toHaveAccessibleName('prosinac 2026.');
    await page.keyboard.press('Shift+PageDown');
    await expect(calendar.getByRole('button', {name: 'utorak, 21. prosinca 2027.'})).toBeFocused();
    await page.keyboard.press('Shift+PageUp');
    await page.keyboard.press('PageUp');
    await expect(calendar.getByRole('button', {name: 'subota, 21. studenoga 2026.'})).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(calendar).toBeHidden();
    await expect(value(page)).toHaveText('Value: 2026-11-28');
    await expect(field(page)).toBeFocused();

    await page.keyboard.press('ArrowDown');
    await expect(calendar).toBeVisible();
    await calendar.getByRole('button', {name: /28\. studenoga 2026\./}).focus();
    await page.keyboard.press('Escape');
    await expect(calendar).toBeHidden();
    await expect(field(page)).toBeFocused();
    await expect(value(page)).toHaveText('Value: 2026-11-28');
  });

  test('limits: days outside them and disabled days can’t be chosen, and Page Down stops at the last month', async ({page}) => {
    await presetTweaks(page, 'date-field', {limits: true}, croatian);
    await page.goto('/render/date-field');
    await page.getByRole('button', {name: 'Otvori kalendar'}).click();
    const calendar = page.getByRole('dialog', {name: 'Odabir datuma'});
    await expect(calendar.getByRole('button', {name: 'Prethodni mjesec'})).toBeDisabled();
    // Before the first day, and weekends.
    for (const name of ['nedjelja, 15. studenoga 2026.', 'subota, 21. studenoga 2026.']) {
      await expect(calendar.getByRole('button', {name, exact: true})).toHaveAttribute('aria-disabled', 'true');
    }
    await calendar.getByRole('button', {name: 'petak, 20. studenoga 2026., odabrano'}).focus();
    await page.keyboard.press('PageDown');
    await expect(calendar.getByRole('grid')).toHaveAccessibleName('prosinac 2026.');
    await expect(page.locator(':focus')).toHaveAttribute('data-date', '2026-12-16');
    await page.keyboard.press('PageDown');
    await expect(calendar.getByRole('grid')).toHaveAccessibleName('prosinac 2026.');

    // A typed date outside the limits isn't taken.
    await page.keyboard.press('Escape');
    await field(page).fill('5. 1. 2027.');
    await field(page).press('Enter');
    await expect(value(page)).toHaveText('Value: 2026-11-20');
  });

  test('a time beside the date, on a 24-hour clock in Croatian, and the clear button', async ({page}) => {
    const errors = collectErrors(page);
    await presetTweaks(page, 'date-field', {withTime: true}, croatian);
    await page.goto('/render/date-field');
    const time = page.getByRole('textbox', {name: 'Valid until, vrijeme'});
    await expect(time).toHaveValue('17:30');
    await time.fill('9:05');
    await time.press('Enter');
    await expect(value(page)).toHaveText('Value: 2026-11-20T09:05');
    await field(page).fill('3. 12. 2026.');
    await field(page).press('Enter');
    await expect(value(page)).toHaveText('Value: 2026-12-03T09:05');

    await page.getByRole('button', {name: 'Očisti: Valid until'}).click();
    await expect(value(page)).toHaveText('Value: none');
    await expect(field(page)).toBeFocused();
    expect(errors).toEqual([]);
  });

  test('English uses a 12-hour clock and Sunday first', async ({page}) => {
    await presetTweaks(page, 'date-field', {withTime: true});
    await page.goto('/render/date-field');
    await expect(page.getByRole('textbox', {name: 'Valid until, time'})).toHaveValue(/5:30\s?PM/);
    await page.getByRole('button', {name: 'Open calendar'}).click();
    await expect(page.getByRole('dialog').getByRole('columnheader').first()).toHaveText('Su');
  });

  test('disabled with a reason that keyboard users can read', async ({page}) => {
    await presetTweaks(page, 'date-field', {disabled: true}, croatian);
    await page.goto('/render/date-field');
    await expect(field(page)).toHaveAttribute('aria-disabled', 'true');
    await field(page).focus();
    await expect(page.getByRole('tooltip')).toHaveText('Only the folder’s owner can change this.');
    await expect(page.getByRole('button', {name: 'Otvori kalendar'})).toBeDisabled();
  });
});

test('no axe violations, closed and open, light and dark', async ({page}, testInfo) => {
  for (const darkMode of [false, true]) {
    await presetTweaks(page, 'date-field', {limits: true}, {...croatian, darkMode});
    await page.goto('/render/date-field');
    await expect(field(page)).toBeVisible();
    await expectNoAxeViolations(page);
    if (isMobile(testInfo)) await field(page).tap();
    else await page.getByRole('button', {name: 'Otvori kalendar'}).click();
    await expect(page.getByRole('dialog', {name: 'Odabir datuma'})).toBeVisible();
    // Let the sheet or popover finish arriving, so colours are final.
    await page.waitForTimeout(500);
    await expectNoAxeViolations(page);
  }
});

test.describe('with a finger', () => {
  test.beforeEach(({}, testInfo) => test.skip(!isMobile(testInfo), 'phones only'));

  test('a tap opens the month calendar in a sheet; a day and Save choose it', async ({page}) => {
    const errors = collectErrors(page);
    await presetTweaks(page, 'date-field', {}, croatian);
    await page.goto('/render/date-field');
    await field(page).tap();
    const sheet = page.getByRole('dialog', {name: 'Odabir datuma'});
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText('pon', {exact: true})).toBeVisible();
    const day = sheet.getByRole('button', {name: 'četvrtak, 26. studenoga 2026.', exact: true});
    // Big enough for a finger.
    const box = await day.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(36);
    expect(box!.height).toBeGreaterThanOrEqual(36);
    await day.tap();
    await sheet.getByRole('button', {name: 'Spremi'}).tap();
    await expect(sheet).toBeHidden();
    await expect(value(page)).toHaveText('Value: 2026-11-26');
    expect(errors).toEqual([]);
  });

  test('the phone’s own picker on request', async ({page}) => {
    await presetTweaks(page, 'date-field', {nativeTouch: true}, croatian);
    await page.goto('/render/date-field');
    await expect(page.locator('.date-field input[type="date"]')).toHaveCount(1);
  });
});
