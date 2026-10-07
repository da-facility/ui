import {expect, test} from '@playwright/test';
import {collectErrors, isMobile, setTweak} from './helpers';

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

test('the group appearance shows every state and chooses one directly', async ({page}) => {
  const errors = collectErrors(page);
  await page.goto('/render/cycle-button');
  const status = page.locator('.cycle-button-example > p');
  const group = page.getByRole('radiogroup', {name: 'View'}).first();
  await expect(group.getByRole('radio')).toHaveCount(4);
  await expect(group.getByRole('radio', {name: 'List'})).toBeChecked();

  await group.getByRole('radio', {name: 'Board'}).click();
  await expect(status).toHaveText('Sort ascending, system theme, board view.');
  await expect(page.getByRole('button', {name: 'View: Board'}), 'the cycle buttons follow').toHaveCount(2);
  await page.keyboard.press('ArrowRight');
  await expect(group.getByRole('radio', {name: 'Calendar'})).toBeChecked();
  await expect(status).toHaveText('Sort ascending, system theme, calendar view.');

  // Icon-only groups name each segment by its label.
  await page.getByRole('radiogroup', {name: 'Theme'}).last().getByRole('radio', {name: 'Dark'}).click();
  await expect(page.getByRole('radiogroup', {name: 'Theme'}).first().getByRole('radio', {name: 'Dark'})).toBeChecked();
  expect(await page.evaluate(() => [...document.querySelectorAll('.cycle-button-example__variants section')].every(section =>
    [...section.querySelectorAll('.cycle-button-group')].every(group => group.getBoundingClientRect().right <= section.getBoundingClientRect().right))), 'groups fit their cards').toBe(true);
  expect(errors).toEqual([]);
});

test('dragging across a group selects the segment under the pointer', async ({page, context}, testInfo) => {
  const errors = collectErrors(page);
  await page.goto('/render/cycle-button');
  const group = page.getByRole('radiogroup', {name: 'View'}).first();
  const status = page.locator('.cycle-button-example > p');
  const centre = async (name: string) => {
    const box = (await group.getByRole('radio', {name}).boundingBox())!;
    return {x: box.x + box.width / 2, y: box.y + box.height / 2};
  };
  const [list, grid, board, calendar] = await Promise.all(['List', 'Grid', 'Board', 'Calendar'].map(centre));

  if (isMobile(testInfo)) {
    const session = await context.newCDPSession(page);
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', point?: {x: number; y: number}) => session.send('Input.dispatchTouchEvent', {type, touchPoints: point ? [point] : []});
    await touch('touchStart', list);
    for (const point of [{x: list.x + 10, y: list.y}, grid, board]) await touch('touchMove', point);
    await expect(status).toHaveText('Sort ascending, system theme, board view.');
    await touch('touchMove', {x: calendar.x + 200, y: calendar.y});
    await touch('touchEnd');
  } else {
    await page.mouse.move(list.x, list.y);
    await page.mouse.down();
    await page.mouse.move(board.x, board.y, {steps: 8});
    await expect(status).toHaveText('Sort ascending, system theme, board view.');
    await page.mouse.move(calendar.x + 200, calendar.y, {steps: 4});
    await page.mouse.up();
  }
  await expect(status, 'past the end it stays on the last segment').toHaveText('Sort ascending, system theme, calendar view.');
  await expect(group.getByRole('radio', {name: 'Calendar'})).toBeChecked();

  // A tap is still a plain click.
  await group.getByRole('radio', {name: 'Grid'}).click();
  await expect(status).toHaveText('Sort ascending, system theme, grid view.');
  expect(await page.evaluate(() => window.scrollX), 'the page does not move sideways').toBe(0);
  expect(errors).toEqual([]);
});
