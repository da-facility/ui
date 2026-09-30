import {expect, test, type Page} from '@playwright/test';

// The bounce switches are CSS: a scroll timeline animates a registered custom
// property that overscroll-behavior reads. Safari does not animate
// overscroll-behavior itself, so this runs in WebKit as well as Chromium.

const pageOverscroll = (page: Page) => page.evaluate(() => getComputedStyle(document.documentElement).overscrollBehaviorY);
const listOverscroll = (page: Page) => page.locator('.sidebar-layout__navigation > div:last-child').evaluate(list => getComputedStyle(list).overscrollBehaviorY);

test('the page bounces only while it overflows', async ({page}) => {
  await page.goto('/render/sidebar/integrations');
  await expect(page.getByRole('heading', {name: 'Connected apps', exact: true})).toBeVisible();
  await expect.poll(() => pageOverscroll(page)).toBe('none');
  await page.goto('/render/sidebar/long-table');
  await expect(page.getByRole('heading', {name: 'Long table', exact: true})).toBeVisible();
  await expect.poll(() => pageOverscroll(page)).toBe('contain');
});

test('the navigation list bounces only while it overflows', async ({page}) => {
  await page.goto('/render/sidebar/profile');
  await expect.poll(() => listOverscroll(page)).toBe('none');
  await page.evaluate(() => localStorage.setItem('da-ui-catalogue:tweaks', JSON.stringify({sidebar: {extraNavigation: true}})));
  await page.reload();
  await expect.poll(() => listOverscroll(page)).toBe('contain');
});

test('ScrollArea fades by its fade prop and bounces only while it overflows', async ({page}) => {
  await page.goto('/render/scroll-area');
  const area = (name: string) => page.getByTestId(name);
  const state = (name: string) => area(name).evaluate(element => {
    const style = getComputedStyle(element);
    return [style.getPropertyValue('--scroll-area-end'), style.overscrollBehaviorY];
  });
  await expect.poll(() => state('Default fade (10px)')).toEqual(['10px', 'contain']);
  await expect.poll(() => state('Wide fade (32px)')).toEqual(['32px', 'contain']);
  await expect.poll(() => state('Fits, so no fade or bounce')).toEqual(['0px', 'none']);
});
