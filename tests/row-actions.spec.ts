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
  // An item chosen at once, right after the menu was made by the press, acts.
  await page.getByRole('menuitem', {name: 'Send again'}).click();
  await expect(page.locator('.row-actions-example__said')).toHaveText('Sent again to ana@example.com.');
});

test('the rows of a list share one watcher of its width, and every list of the page the same one', async ({page}, info) => {
  test.skip(isMobile(info), 'the icons, and so the width, are for wide lists');
  // Every observer that watches one of the example's lists, told apart.
  await page.addInitScript(() => {
    const w = window as unknown as {__listWatchers: Set<ResizeObserver>};
    w.__listWatchers = new Set();
    const observe = ResizeObserver.prototype.observe;
    ResizeObserver.prototype.observe = function (this: ResizeObserver, target: Element, options?: ResizeObserverOptions) {
      if (target.classList?.contains('row-actions-example__table')) w.__listWatchers.add(this);
      return observe.call(this, target, options);
    };
  });
  await page.goto('/render/row-actions');
  await expect(lists(page).nth(0).getByRole('group', {name: 'Actions for Judges'})).toBeVisible();
  const rows = await page.locator('[data-row-actions="icons"]').count();
  expect(rows).toBeGreaterThan(3);
  // However many rows and lists: one observer (before, one per row).
  expect(await page.evaluate(() => (window as unknown as {__listWatchers: Set<unknown>}).__listWatchers.size)).toBe(1);
  // And it still follows a list's width: narrowed, its rows fold into the menu.
  await lists(page).nth(0).evaluate(table => ((table as HTMLElement).style.width = '360px'));
  await expect(lists(page).nth(0).getByRole('button', {name: 'Actions for Judges'})).toBeVisible();
});

test('2,000 rows: one form a row, no closed tooltip or menu until a row is pointed at, focused or opened', async ({page}, info) => {
  test.setTimeout(60_000);
  await page.goto('/render/row-actions/many');
  await expect(page.getByRole('button', {name: 'Actions for Person 2000'})).toBeVisible();
  const count = () => page.evaluate(() => ({
    nodes: document.querySelectorAll('.row-actions-example__table .row-actions *').length,
    document: document.getElementsByTagName('*').length,
    rows: document.querySelectorAll('.row-actions-example__table .row-actions').length,
    tooltips: document.querySelectorAll('[role="tooltip"]').length,
    menus: document.querySelectorAll('[role="menu"]').length,
    icons: document.querySelectorAll('.row-actions__icons').length,
    triggers: document.querySelectorAll('.row-actions__menu').length,
  }));
  const at = await count();
  console.log(`RowActions, 2,000 rows (${info.project.name}): ${JSON.stringify(at)}`);
  await info.attach('row-actions-2000.json', {body: JSON.stringify(at, null, 2), contentType: 'application/json'});
  expect(at.rows).toBe(2000);
  // One form a row: icons in half of them on a computer, else every row its "…".
  expect(at.icons + at.triggers).toBe(2000);
  expect(at.tooltips).toBe(0);
  expect(at.menus).toBe(0);
  // The page holds the drawn form only: 12.5 nodes a row on a computer, 10 on a phone (1.8.0: 19.5 in the row and 39,000
  // in all, both forms with two closed tooltips and a closed menu a row, about 29 a row with their layers).
  expect(at.nodes / at.rows, 'nodes a row').toBeLessThanOrEqual(13);
  expect(at.document / at.rows, 'nodes of the whole page a row (1.8.0: 41)').toBeLessThan(17);
  // Pointed at: the tooltip comes as before. Opened: the menu, with every action.
  if (!isMobile(info)) {
    const rename = page.getByRole('group', {name: 'Actions for Person 1', exact: true}).getByRole('button', {name: 'Rename…'});
    await rename.hover();
    await expect(page.getByRole('tooltip').filter({hasText: 'Rename…'})).toBeVisible();
    // By keyboard: focus to the next "…" and open it with Enter, the menu's first item focused; Escape gives focus back.
    await page.getByRole('button', {name: 'Actions for Person 2', exact: true}).focus();
    await expect(page.getByRole('button', {name: 'Actions for Person 2', exact: true})).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('menuitem', {name: 'Send again'})).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(page.getByRole('button', {name: 'Actions for Person 2', exact: true})).toBeFocused();
  } else {
    await page.getByRole('button', {name: 'Actions for Person 1', exact: true}).tap();
    await expect(page.getByRole('menuitem', {name: 'Rename…'})).toBeVisible();
  }
});

test('a keyboard reaches an icon’s tooltip and an off one’s reason, as before', async ({page}, info) => {
  test.skip(isMobile(info), 'the icons are for wide lists');
  await page.goto('/render/row-actions');
  const wide = lists(page).nth(0);
  await page.getByText('Nothing done yet.').click();
  // Tab into the first row's icons: the tooltip of the focused one shows.
  const rename = wide.getByRole('group', {name: 'Actions for Judges'}).getByRole('button', {name: 'Rename…'});
  while (!(await rename.evaluate(element => element === document.activeElement))) await page.keyboard.press('Tab');
  await expect(page.getByRole('tooltip').filter({hasText: 'Rename…'})).toBeVisible();
  const locked = wide.getByRole('group', {name: 'Actions for Sponsors'}).getByRole('button', {name: 'Remove group…'});
  await locked.focus();
  await expect(locked).toHaveAccessibleDescription('Locked. The agency shares galleries with this group, so only the agency can remove it.');
  await expect(locked).toHaveAttribute('aria-disabled', 'true');
});
