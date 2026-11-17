import {expect, test} from '@playwright/test';
import {collectErrors, isMobile} from './helpers';

const lists = (page: import('@playwright/test').Page) => page.locator('.row-actions-example__table');

test('two actions with plain icons are icons where the list is wide, the menu where it is narrow or on a phone', async ({page}, info) => {
  const errors = collectErrors(page);
  await page.goto('/render/row-actions');
  const [wide, narrow] = [lists(page).nth(0), lists(page).nth(1)];
  if (isMobile(info)) {
    // A phone: the menu, from the first paint.
    await expect(wide.getByRole('button', {name: 'Actions for Judges'})).toBeVisible();
    await expect(wide.getByRole('button', {name: 'Rename…'})).toHaveCount(0);
  } else {
    const row = wide.getByRole('group', {name: 'Actions for Judges'});
    await expect(row.getByRole('button', {name: 'Rename…'})).toBeVisible();
    await expect(row.getByRole('button', {name: 'Remove group…'})).toBeVisible();
    await expect(wide.getByRole('button', {name: 'Actions for Judges'})).toHaveCount(0);
    for (const button of await row.getByRole('button').all()) expect((await button.boundingBox())!.height).toBe(32);
    // The narrow list folds them into its menu, never icons and the menu in one row.
    await expect(narrow.getByRole('button', {name: 'Actions for Judges'})).toBeVisible();
    await expect(narrow.getByRole('button', {name: 'Rename…'})).toHaveCount(0);
    await narrow.getByRole('button', {name: 'Actions for Judges'}).click();
    await expect(page.getByRole('menuitem', {name: 'Rename…'})).toBeVisible();
    await page.keyboard.press('Escape');
  }
  expect(errors).toEqual([]);
});

test('the icon that removes is quiet at rest and destructive when pointed at; an off one says why', async ({page}, info) => {
  test.skip(isMobile(info), 'the icons are for wide lists');
  await page.goto('/render/row-actions');
  const wide = lists(page).nth(0);
  const remove = wide.getByRole('group', {name: 'Actions for Judges'}).getByRole('button', {name: 'Remove group…'});
  const rename = wide.getByRole('group', {name: 'Actions for Judges'}).getByRole('button', {name: 'Rename…'});
  const colour = (button: typeof remove) => button.evaluate(element => getComputedStyle(element).color);
  const error = await page.evaluate(() => {
    const probe = document.body.appendChild(document.createElement('span'));
    probe.style.color = 'var(--color-error)';
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  });
  expect(await colour(remove)).toBe(await colour(rename));
  expect(await colour(remove)).not.toBe(error);
  await remove.hover();
  await expect.poll(() => colour(remove)).toBe(error);
  // Locked: the same icon, off, its reason read with it.
  const locked = wide.getByRole('group', {name: 'Actions for Sponsors'}).getByRole('button', {name: 'Remove group…'});
  await expect(locked).toBeDisabled();
  await expect(locked).toHaveAccessibleDescription('Locked. The agency shares galleries with this group, so only the agency can remove it.');
  // One click acts.
  await rename.click();
  await expect(page.locator('.row-actions-example__said')).toHaveText('Rename Judges.');
});

test('more than two actions, or one without a plain icon: the menu with all of them', async ({page}) => {
  await page.goto('/render/row-actions');
  const invited = lists(page).nth(2);
  await expect(invited.getByRole('button', {name: 'Actions for ana@example.com'})).toBeVisible();
  await expect(invited.getByRole('button', {name: 'Send again'})).toHaveCount(0);
  await invited.getByRole('button', {name: 'Actions for ana@example.com'}).click();
  await expect(page.getByRole('menuitem')).toHaveText(['Send again', 'Extend access…', 'Withdraw the invitation…']);
});
