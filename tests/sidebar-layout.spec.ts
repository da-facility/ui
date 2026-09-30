import {expect, test, type Page} from '@playwright/test';
import {choosePage, collectErrors, drawer, drawerPanel, drawerTrigger, isMobile, navigation, scrollY, setTweak, waitForDrawerEdge} from './helpers';

// The layout's contract: the document is the only content scroller, so momentum
// and overscroll stay native, and fixed navigation never moves with it.

const root = (page: Page) => page.locator('html');
const railList = (page: Page) => page.locator('.sidebar-layout__navigation > div:last-child');

test.describe('document scrolling', () => {
  for (const [path, heading] of [['long-table', 'Long table'], ['long-paragraphs', 'Long paragraphs']]) {
    test(`${heading}: the document scrolls and navigation stays fixed`, async ({page}, testInfo) => {
      const errors = collectErrors(page);
      await page.goto(`/render/sidebar/${path}`);
      await expect(page.getByRole('heading', {name: heading, exact: true})).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollHeight > innerHeight * 5)).toBe(true);
      await expect(page.locator('.sidebar-example__content')).toHaveCSS('overflow-y', 'visible');
      await expect(root(page)).toHaveCSS('overscroll-behavior-y', 'contain');

      const fixed = page.locator(isMobile(testInfo) ? '.mobile-sidebar__header' : '.sidebar-layout__rail');
      await expect(fixed).toHaveCSS('position', 'fixed');
      const notCancelled = await page.locator('main').evaluate(main => main.dispatchEvent(new WheelEvent('wheel', {deltaY: 100, bubbles: true, cancelable: true})));
      expect(notCancelled, 'wheel input must stay native').toBe(true);

      await page.evaluate(() => window.scrollTo({top: document.documentElement.scrollHeight, behavior: 'instant'}));
      expect(await scrollY(page)).toBeGreaterThan(1000);
      expect(await fixed.evaluate(element => element.getBoundingClientRect().top)).toBe(0);
      expect(errors).toEqual([]);
    });
  }

  test('a page that fits does not bounce until its content grows', async ({page}) => {
    await page.goto('/render/sidebar/integrations');
    await expect(page.getByRole('heading', {name: 'Connected apps', exact: true})).toBeVisible();
    await expect(root(page)).toHaveCSS('overscroll-behavior-y', 'none');
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true);

    // A data load or expanding section must re-enable native bounce without navigation.
    await page.locator('main').evaluate(main => {
      const block = Object.assign(document.createElement('div'), {id: 'overflow-probe'});
      block.style.height = '2500px';
      main.append(block);
    });
    await expect(root(page)).toHaveCSS('overscroll-behavior-y', 'contain');
    await page.locator('#overflow-probe').evaluate(block => block.remove());
    await expect(root(page)).toHaveCSS('overscroll-behavior-y', 'none');
  });

  test('the page background also fills the overscroll area, which can be set separately', async ({page}) => {
    await page.goto('/render/sidebar/long-paragraphs');
    await expect(page.locator('.sidebar-example__content')).toHaveCSS('background-color', 'rgb(250, 248, 242)');
    await expect(root(page)).toHaveCSS('background-color', 'rgb(250, 248, 242)');
    await root(page).evaluate(html => html.style.setProperty('--app-overscroll-background', 'rgb(220, 230, 240)'));
    await expect(root(page)).toHaveCSS('background-color', 'rgb(220, 230, 240)');
  });

  test('document styles are restored when the layout unmounts', async ({page}) => {
    await page.goto('/sidebar/long-table');
    await expect(root(page)).toHaveCSS('overscroll-behavior-y', 'contain');
    await page.getByRole('button', {name: 'Open catalogue', exact: true}).click();
    await page.getByRole('link', {name: /^Login split/}).click();
    await expect(page.getByRole('heading', {name: 'Welcome back'})).toBeVisible();
    await expect(root(page)).toHaveCSS('overscroll-behavior-y', 'auto');
    expect(await root(page).evaluate(html => html.style.getPropertyValue('--app-background'))).toBe('');
  });

  test('every row of the long table renders and the last one is reachable', async ({page}) => {
    await page.goto('/render/sidebar/long-table');
    await expect(page.getByRole('table', {name: 'Workspace records'}).locator('tbody tr')).toHaveCount(500);
    await page.getByTestId('record-DF-0500').scrollIntoViewIfNeeded();
    expect(await scrollY(page)).toBeGreaterThan(10_000);
  });

  test('changing page starts at the top', async ({page}) => {
    await page.goto('/render/sidebar/long-table');
    await page.evaluate(() => window.scrollTo(0, 3000));
    await choosePage(page, 'Developer');
    expect(await scrollY(page)).toBe(0);
  });

  test('no page overflows horizontally', async ({page}) => {
    for (const path of ['profile', 'appearance', 'long-paragraphs']) {
      await page.goto(`/render/sidebar/${path}`);
      await expect(page.locator('main h2').first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path).toBe(true);
    }
  });
});

test.describe('desktop navigation rail', () => {
  test.beforeEach(({}, testInfo) => test.skip(isMobile(testInfo), 'Desktop only'));

  test('a rail that fits stays still, and wheel input moves only the page', async ({page}) => {
    await page.goto('/render/sidebar/long-table');
    await page.getByTestId('record-DF-0500').waitFor({state: 'attached'});
    const notCancelled = await page.locator('.sidebar-layout__navigation').evaluate(nav => nav.dispatchEvent(new WheelEvent('wheel', {deltaY: 100, bubbles: true, cancelable: true})));
    expect(notCancelled).toBe(true);

    await page.mouse.move(120, 350);
    await page.mouse.wheel(0, 600);
    // Move to the content before checking: input over the rail is never forwarded.
    await page.mouse.move(800, 350);
    expect(await scrollY(page)).toBe(0);
    await page.mouse.wheel(0, 600);
    await page.waitForFunction(() => window.scrollY >= 600);
    expect(await railList(page).evaluate(list => list.scrollTop)).toBe(0);

    // The fixed header scrolls the page too.
    await page.mouse.move(800, 32);
    await page.mouse.wheel(0, 400);
    await page.waitForFunction(() => window.scrollY >= 1000);
    await page.evaluate(() => window.scrollTo({top: document.documentElement.scrollHeight, behavior: 'instant'}));
    expect(await page.locator('.sidebar-layout__navigation').evaluate(nav => nav.getBoundingClientRect().top)).toBe(0);
  });

  test('an overflowing rail scrolls on its own and never chains into the page', async ({page}) => {
    await page.goto('/sidebar/long-table');
    await setTweak(page, '100 extra navigation items', true);
    await expect(railList(page).getByTestId(/^extra-nav-/)).toHaveCount(100);
    expect(await railList(page).evaluate(list => list.scrollHeight > list.clientHeight)).toBe(true);

    const box = (await railList(page).boundingBox())!;
    await page.mouse.move(box.x + 80, box.y + 100);
    await page.mouse.wheel(0, 700);
    await expect.poll(() => railList(page).evaluate(list => list.scrollTop)).toBeGreaterThan(0);
    expect(await scrollY(page)).toBe(0);
    await railList(page).evaluate(list => { list.scrollTop = list.scrollHeight; });
    await page.mouse.wheel(0, 700);
    expect(await scrollY(page), 'the rail boundary must not leak into the page').toBe(0);

    await page.reload();
    await expect(railList(page).getByTestId('extra-nav-100')).toBeAttached();
    await setTweak(page, '100 extra navigation items', false);
    await expect(page.getByTestId('extra-nav-1')).toHaveCount(0);
    await page.mouse.move(800, 350);
    await page.mouse.wheel(0, 600);
    await page.waitForFunction(() => window.scrollY >= 600);
    expect(await railList(page).evaluate(list => list.scrollTop)).toBe(0);
  });

  test('the footer stays pinned while the list scrolls underneath it', async ({page}) => {
    await page.goto('/sidebar/profile');
    await setTweak(page, '100 extra navigation items', true);
    const footer = page.locator('.sidebar-layout__footer');
    await expect(footer.getByRole('button', {name: 'Account menu for Alex Johnson'})).toBeVisible();
    const rail = (await page.locator('.sidebar-layout__rail').boundingBox())!;
    const before = (await footer.boundingBox())!;
    expect(before.y + before.height).toBe(rail.y + rail.height);
    await railList(page).evaluate(list => { list.scrollTop = list.scrollHeight / 2; });
    expect(await footer.boundingBox()).toEqual(before);
    const list = (await railList(page).boundingBox())!;
    expect(list.y + list.height, 'the list ends where the footer starts').toBeLessThanOrEqual(before.y + 1);
  });

  test('the list fades under its edges and bounces only while it overflows', async ({page}) => {
    const edges = () => railList(page).evaluate(list => {
      const style = getComputedStyle(list);
      return [style.getPropertyValue('--scroll-edges-start'), style.getPropertyValue('--scroll-edges-end'), style.overscrollBehaviorY];
    });
    await page.goto('/sidebar/profile');
    expect(await edges(), 'a list that fits neither fades nor bounces').toEqual(['0px', '0px', 'none']);

    await setTweak(page, '100 extra navigation items', true);
    expect(await edges(), 'at the top, only the bottom edge fades').toEqual(['0px', '10px', 'contain']);
    await railList(page).evaluate(list => { list.scrollTop = list.scrollHeight / 2; });
    await expect.poll(edges).toEqual(['10px', '10px', 'contain']);
    await railList(page).evaluate(list => { list.scrollTop = list.scrollHeight; });
    await expect.poll(edges).toEqual(['10px', '0px', 'contain']);
    expect(await scrollY(page), 'the page never moves').toBe(0);
  });

  test('handedness only affects mobile', async ({page}) => {
    await page.goto('/sidebar/long-table');
    await setTweak(page, 'Left-handed navigation', true);
    expect(await page.locator('.sidebar-layout__rail').evaluate(rail => rail.getBoundingClientRect().left)).toBe(0);
  });
});

test.describe('mobile navigation drawer', () => {
  test.beforeEach(({}, testInfo) => test.skip(!isMobile(testInfo), 'Mobile only'));

  test('the menu button sits in the thumb zone and the drawer opens from the right', async ({page}) => {
    await page.goto('/render/sidebar/long-table');
    const trigger = (await drawerTrigger(page).boundingBox())!;
    expect(trigger.x).toBeGreaterThan(300);
    expect(trigger.y).toBeGreaterThan(650);
    await drawerTrigger(page).tap();
    await expect(drawer(page)).toHaveAttribute('data-side', 'end');
    await waitForDrawerEdge(page, 'right');
    expect((await drawerPanel(page).boundingBox())!.x, 'the backdrop stays reachable').toBeGreaterThanOrEqual(48);
    expect(await navigation(page).getByRole('button').evaluateAll(items => items.every(item => item.getBoundingClientRect().height >= 44))).toBe(true);
  });

  test('switching hands moves the drawer and button without moving the page', async ({page}) => {
    await page.goto('/sidebar/long-table');
    await page.evaluate(() => window.scrollTo(0, 1500));
    const before = await scrollY(page);

    await drawerTrigger(page).tap();
    await waitForDrawerEdge(page, 'right');
    await drawer(page).getByRole('switch', {name: 'Left-handed navigation'}).click();
    await waitForDrawerEdge(page, 'left');
    expect(await scrollY(page)).toBe(before);

    await page.getByRole('button', {name: 'Close menu', exact: true}).tap();
    await expect(drawer(page)).toBeHidden();
    expect((await drawerTrigger(page).boundingBox())!.x).toBeLessThan(30);
    await expect(drawerTrigger(page), 'closing returns focus to the menu button').toBeFocused();
    expect(await scrollY(page)).toBe(before);

    await page.reload();
    expect((await drawerTrigger(page).boundingBox())!.x, 'the catalogue remembers the hand').toBeLessThan(30);
    await drawerTrigger(page).tap();
    await waitForDrawerEdge(page, 'left');
    await page.mouse.click(380, 300);
    await expect(drawer(page), 'tapping the backdrop closes the drawer').toBeHidden();

    await drawerTrigger(page).focus();
    await page.keyboard.press('Enter');
    await waitForDrawerEdge(page, 'left');
    await page.keyboard.press('Escape');
    await expect(drawer(page)).toBeHidden();

    // Right-to-left text must not reverse a physical hand preference.
    await root(page).evaluate(html => html.setAttribute('dir', 'rtl'));
    await drawerTrigger(page).tap();
    await waitForDrawerEdge(page, 'left');
  });

  test('a long drawer list scrolls on its own and keeps the close button in reach', async ({page}) => {
    await page.goto('/sidebar/long-table');
    await setTweak(page, '100 extra navigation items', true);
    await drawerTrigger(page).tap();
    await waitForDrawerEdge(page, 'right');
    const list = page.locator('.mobile-sidebar__sections');
    await expect(list.getByTestId(/^extra-nav-/)).toHaveCount(100);
    expect(await list.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);

    const before = await scrollY(page);
    const box = (await list.boundingBox())!;
    await page.mouse.move(box.x + 80, box.y + 100);
    await page.mouse.wheel(0, 700);
    await expect.poll(() => list.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
    expect(await scrollY(page)).toBe(before);
    await list.evaluate(element => { element.scrollTop = element.scrollHeight; });
    await page.mouse.wheel(0, 700);
    expect(await scrollY(page)).toBe(before);

    await expect(list.getByTestId('extra-nav-100')).toBeInViewport();
    expect((await page.getByRole('button', {name: 'Close menu', exact: true}).boundingBox())!.y).toBeGreaterThan(650);
  });

  test('the drawer pins the header and footer around a fading list', async ({page}) => {
    await page.goto('/sidebar/profile');
    await setTweak(page, '100 extra navigation items', true);
    await drawerTrigger(page).tap();
    await waitForDrawerEdge(page, 'right');
    await expect(drawer(page).getByRole('button', {name: /^Projects:/})).toBeVisible();
    await expect(drawer(page).getByRole('button', {name: 'Account menu for Alex Johnson'})).toBeVisible();
    const list = page.locator('.mobile-sidebar__sections');
    await list.evaluate(element => { element.scrollTop = element.scrollHeight / 2; });
    await expect.poll(() => list.evaluate(element => getComputedStyle(element).getPropertyValue('--scroll-edges-start'))).toBe('10px');
    expect(await list.evaluate(element => getComputedStyle(element).overscrollBehaviorY)).toBe('contain');
  });

  test('landscape keeps touch targets, and choosing a page closes the drawer', async ({page}) => {
    await page.goto('/render/sidebar/long-table');
    await page.setViewportSize({width: 844, height: 390});
    await page.emulateMedia({reducedMotion: 'reduce'});
    await drawerTrigger(page).tap();
    await expect(drawer(page)).toBeVisible();
    expect(await navigation(page).getByRole('button').evaluateAll(items => items.every(item => item.getBoundingClientRect().height >= 44))).toBe(true);
    await expect(page.getByRole('button', {name: 'Close menu', exact: true})).toBeInViewport();

    const profile = navigation(page).getByRole('button', {name: 'Profile', exact: true});
    await profile.scrollIntoViewIfNeeded();
    await profile.tap();
    await expect(drawer(page)).toBeHidden();
    await expect(page.getByRole('heading', {name: 'Profile', exact: true})).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    await page.setViewportSize({width: 390, height: 844});
    const fontSize = await page.getByRole('textbox', {name: 'Display name', exact: true}).evaluate(input => parseFloat(getComputedStyle(input).fontSize));
    expect(fontSize, 'mobile fields use 16px text so iOS does not zoom').toBeGreaterThanOrEqual(16);
  });
});

test.describe('settings example', () => {
  test('every page has a real path, a heading, and history', async ({page}) => {
    await page.goto('/sidebar');
    await expect(page.getByRole('heading', {name: 'Profile', exact: true})).toBeVisible();
    for (const label of ['Login & security', 'Billing', 'Appearance', 'Notifications', 'Keyboard shortcuts', 'Language & region', 'Privacy', 'Connected apps', 'Long table', 'Developer']) {
      await choosePage(page, label);
    }
    expect(new URL(page.url()).pathname).toBe('/sidebar/developer');
    await page.goBack();
    await expect(page.getByRole('heading', {name: 'Long table', exact: true})).toBeVisible();
    await page.goForward();
    await expect(page.getByRole('heading', {name: 'Developer', exact: true})).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', {name: 'Developer', exact: true})).toBeVisible();
  });

  test('settings survive page changes', async ({page}) => {
    await page.goto('/render/sidebar/profile');
    const name = page.getByRole('textbox', {name: 'Display name', exact: true});
    const localTime = page.getByRole('switch', {name: 'Show my local time', exact: true});
    await name.fill('Local preview');
    await localTime.click();
    await expect(localTime).not.toBeChecked();
    await choosePage(page, 'Appearance');
    await choosePage(page, 'Profile');
    await expect(name).toHaveValue('Local preview');
    await expect(localTime).not.toBeChecked();
  });

  test('the account menu in the navigation footer navigates between pages', async ({page}, testInfo) => {
    await page.goto('/render/sidebar/long-paragraphs');
    if (isMobile(testInfo)) await drawerTrigger(page).tap();
    await page.getByRole('button', {name: 'Account menu for Alex Johnson'}).click();
    await page.getByRole('menuitem', {name: 'Appearance', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Appearance', exact: true})).toBeVisible();
  });
});
