import {expect, test} from '@playwright/test';
import {collectErrors, isMobile} from './helpers';

const menu = (page: import('@playwright/test').Page) => page.locator('.catalogue-menu');

test('the menu switches examples and keeps the URL and history in sync', async ({page}) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(page.getByRole('heading', {name: 'Profile', exact: true}), 'the first example opens by default').toBeVisible();
  await expect(page.locator('iframe'), 'examples render directly').toHaveCount(0);

  await page.getByRole('button', {name: 'Open catalogue', exact: true}).click();
  const search = page.getByRole('searchbox', {name: 'Find an example'});
  await expect(search).toBeFocused();
  await search.fill('missing');
  await expect(page.getByText('No examples match')).toBeVisible();
  await search.fill('login');
  await page.getByRole('link', {name: /^Login split/}).click();
  await expect(page.getByRole('heading', {name: 'Welcome back'})).toBeVisible();
  expect(new URL(page.url()).pathname).toBe('/login-split');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme), 'the dark menu does not theme the page').toBe('light');

  await page.goBack();
  await expect(page.getByRole('heading', {name: 'Profile', exact: true})).toBeVisible();
  await page.goForward();
  await expect(page.getByRole('heading', {name: 'Welcome back'})).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('region', {name: 'Catalogue'})).toHaveCount(0);
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('region', {name: 'Catalogue'})).toBeVisible();
  expect(errors).toEqual([]);
});

test('tweaks are listed only for the example that declares them', async ({page}) => {
  await page.goto('/user-menu');
  await page.getByRole('button', {name: 'Open catalogue', exact: true}).click();
  await expect(page.getByRole('region', {name: 'Tweaks'})).toHaveCount(0);
  await page.getByRole('link', {name: /^Sidebar/}).click();
  await expect(page.getByRole('switch', {name: 'Left-handed navigation'})).toBeVisible();
  await expect(page.getByRole('switch', {name: '100 extra navigation items'})).toBeVisible();
});

test('the menu can be moved, docked, and remembers its place', async ({page, context}, testInfo) => {
  await page.goto('/sidebar');
  await page.getByRole('button', {name: 'Open catalogue', exact: true}).click();
  await page.getByLabel('Move menu to corner').selectOption('top-left');
  const handle = page.getByRole('button', {name: 'Move catalogue menu'});
  await handle.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  expect(await menu(page).boundingBox()).toMatchObject({x: 22, y: 22});

  const start = (await handle.boundingBox())!;
  if (isMobile(testInfo)) {
    const session = await context.newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: start.x + 10, y: start.y + 10}]});
    await session.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: start.x + 60, y: start.y + 110}]});
    await session.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
  } else {
    await page.mouse.move(start.x + 10, start.y + 10);
    await page.mouse.down();
    await page.mouse.move(start.x + 110, start.y + 110, {steps: 10});
    await page.mouse.up();
  }
  const moved = (await menu(page).boundingBox())!;
  expect(moved.x).toBeGreaterThan(22);
  expect(moved.y).toBeGreaterThan(22);
  await page.reload();
  expect(await menu(page).boundingBox()).toMatchObject({x: moved.x, y: moved.y});
});

test('the menu stays on screen when the viewport shrinks', async ({page}) => {
  await page.goto('/sidebar/long-table');
  await page.keyboard.press('Control+k');
  await page.getByLabel('Move menu to corner').selectOption('bottom-right');
  await page.setViewportSize({width: 320, height: 480});
  await expect.poll(() => page.evaluate(() => {
    const bar = document.querySelector('.catalogue-menu')!.getBoundingClientRect();
    const panel = document.querySelector('#catalogue-panel')!.getBoundingClientRect();
    return bar.left >= 0 && bar.right <= innerWidth && panel.top >= 0 && panel.bottom <= innerHeight;
  })).toBe(true);
});

test('the clean view shows the example alone', async ({page}) => {
  await page.goto('/render/sidebar/long-table');
  await expect(page.getByRole('heading', {name: 'Long table', exact: true})).toBeVisible();
  await expect(menu(page)).toHaveCount(0);
  await page.goto('/render/nothing-here');
  await expect(page.getByText('No example called “nothing-here”.')).toBeVisible();
});

test('the menu stays anchored while a mobile toolbar resizes the viewport', async ({page}) => {
  await page.goto('/sidebar/long-table');
  const viewport = page.viewportSize()!;
  const gapBelow = () => page.evaluate(() => innerHeight - document.querySelector('.catalogue-menu')!.getBoundingClientRect().bottom);
  expect(await gapBelow(), 'docked bottom-right by default').toBe(12);
  expect(await menu(page).evaluate(bar => [bar.style.top, bar.style.bottom !== '']), 'positioned from the bottom edge').toEqual(['', true]);

  // A collapsing toolbar grows the viewport; the bar must follow the bottom edge
  // in the same frame, without waiting for a resize handler.
  await page.setViewportSize({width: viewport.width, height: viewport.height + 80});
  expect(await gapBelow()).toBe(12);
  await page.setViewportSize(viewport);
  expect(await gapBelow()).toBe(12);
});
