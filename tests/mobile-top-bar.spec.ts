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

test.describe('phone size: the drawer and the trailing slot', () => {
  test.use({viewport: {width: 390, height: 844}, hasTouch: true});

  test('the trailing slot sits at the top right; the drawer starts at the top and has one close control', async ({page}) => {
    const errors = collectErrors(page);
    await presetTweaks(page, 'sidebar', {topBar: true, leftHanded: true, navigationFooter: true});
    await page.goto('/render/sidebar/profile');
    const end = page.locator('.sidebar-layout__top-bar-end');
    const avatar = end.getByRole('button', {name: /Account menu|User menu|menu/i});
    await expect(avatar).toBeVisible();
    const box = (await avatar.boundingBox())!;
    expect(box.x + box.width).toBeGreaterThan(370);
    expect(box.y).toBeLessThan(12);
    await drawerTrigger(page).tap();
    await waitForDrawerEdge(page, 'left');
    // The list starts right under the drawer's header, not at the bottom.
    const panel = (await page.locator('.mobile-navigation__drawer > div').boundingBox())!;
    const first = (await drawer(page).locator('.astryx-side-nav-section').first().boundingBox())!;
    expect(first.y - panel.y).toBeLessThan(120);
    // One close control: the X, 44px; the person is in the bar, not in the drawer (only the hand switch stays there).
    await expect(drawer(page).getByRole('button', {name: 'Close menu', exact: true})).toHaveCount(0);
    await expect(drawer(page).locator('.mobile-navigation__footer .user-menu__trigger')).toHaveCount(0);
    await expect(drawer(page).getByRole('switch', {name: 'Left-handed navigation'})).toBeVisible();
    const close = drawer(page).getByRole('button', {name: /close/i});
    await expect(close).toHaveCount(1);
    const closeBox = (await close.boundingBox())!;
    expect(closeBox.width).toBeGreaterThanOrEqual(44);
    expect(closeBox.height).toBeGreaterThanOrEqual(44);
    await close.tap();
    await expect(drawer(page)).toBeHidden();
    await expect(drawerTrigger(page)).toBeFocused();
    // The backdrop closes it too.
    await drawerTrigger(page).tap();
    await waitForDrawerEdge(page, 'left');
    await page.mouse.click(380, 400);
    await expect(drawer(page)).toBeHidden();
    expect(errors).toEqual([]);
  });

  test('the floating button keeps its drawer: list at the thumb, footer, and the close button', async ({page}) => {
    await presetTweaks(page, 'sidebar', {topBar: false, navigationFooter: true});
    await page.goto('/render/sidebar/profile');
    await expect(page.locator('.sidebar-layout__top-bar-end')).toHaveCount(0);
    await drawerTrigger(page).tap();
    await expect(drawer(page).getByRole('button', {name: 'Close menu', exact: true})).toBeVisible();
    await expect(drawer(page).locator('.mobile-navigation__footer')).toBeVisible();
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
