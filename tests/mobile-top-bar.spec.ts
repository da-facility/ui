import {expect, test} from '@playwright/test';
import {collectErrors, drawer, drawerTrigger, presetTweaks, scrollY, waitForDrawerEdge} from './helpers';

// SidebarLayout with mobileNavigationTrigger="top-bar": on phones a bar across
// the top holds the menu button and a title instead of the floating button.

test.describe('phone size', () => {
  // A phone in every project (desktop Chromium, mobile Chromium, WebKit).
  test.use({viewport: {width: 390, height: 844}, hasTouch: true});

  test('phones get a top bar with the menu button at the drawer\'s edge and the title; nothing floats', async ({page}) => {
    const errors = collectErrors(page);
    await presetTweaks(page, 'sidebar', {topBar: true, leftHanded: true, header: false});
    await page.goto('/render/sidebar/long-table');
    const header = page.locator('.sidebar-layout__header');
    const bar = (await header.boundingBox())!;
    expect([bar.x, bar.y, bar.width, bar.height]).toEqual([0, 0, 390, 56]);
    const trigger = (await drawerTrigger(page).boundingBox())!;
    expect(trigger.x, 'top left').toBeLessThan(20);
    expect(trigger.y).toBeLessThan(10);
    expect(trigger.width).toBeGreaterThanOrEqual(44);
    expect(trigger.height).toBeGreaterThanOrEqual(44);
    await expect(header.locator('.sidebar-layout__mobile-title')).toHaveText('Long table');
    await expect(page.locator('.mobile-navigation__trigger')).toHaveCount(0);
    // The page starts below the bar, and the document is still the only scroller.
    const heading = (await page.getByRole('main').getByRole('heading', {name: 'Long table'}).boundingBox())!;
    expect(heading.y).toBeGreaterThanOrEqual(56);
    await page.evaluate(() => window.scrollTo(0, 800));
    expect(await scrollY(page)).toBe(800);
    expect((await header.boundingBox())!.y, 'the bar stays put').toBe(0);

    await drawerTrigger(page).tap();
    await expect(drawer(page)).toHaveAttribute('data-side', 'start');
    await waitForDrawerEdge(page, 'left');
    await page.keyboard.press('Escape');
    await expect(drawer(page)).toBeHidden();
    await expect(drawerTrigger(page), 'closing returns focus to the menu button').toBeFocused();
    expect(await scrollY(page), 'opening and closing doesn\'t move the page').toBe(800);
    expect(errors).toEqual([]);
  });

  test('on the right, the button sits at the right end of the bar and the drawer opens from the right', async ({page}) => {
    await presetTweaks(page, 'sidebar', {topBar: true, leftHanded: false, header: true});
    await page.goto('/render/sidebar/profile');
    const trigger = (await drawerTrigger(page).boundingBox())!;
    expect(trigger.x + trigger.width).toBeGreaterThan(370);
    expect(trigger.y).toBeLessThan(10);
    // The page title replaces the layout's title in the bar; there is one bar, not two.
    await expect(page.locator('.sidebar-layout__mobile-title')).toHaveText('Profile');
    await expect(page.locator('.sidebar-layout__title')).toBeHidden();
    await drawerTrigger(page).tap();
    await waitForDrawerEdge(page, 'right');
  });
});

test.describe('wider screens', () => {
  test.use({viewport: {width: 1280, height: 800}, hasTouch: false});

  test('wider screens keep the rail and show no top bar without a title', async ({page}) => {
    await presetTweaks(page, 'sidebar', {topBar: true, header: false});
    await page.goto('/render/sidebar/long-table');
    await expect(page.locator('.sidebar-layout__header')).toBeHidden();
    await expect(drawerTrigger(page)).toBeHidden();
    await expect(page.locator('.sidebar-layout__rail')).toBeVisible();
    expect((await page.getByRole('main').boundingBox())!.y).toBe(0);
  });
});
