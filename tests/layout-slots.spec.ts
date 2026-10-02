import {expect, test, type Page} from '@playwright/test';
import {collectErrors, drawer, drawerTrigger, isMobile, presetTweaks, scrollY} from './helpers';

// SidebarLayout's optional parts, switched on through the sidebar example's tweaks.

const box = async (page: Page, selector: string) => (await page.locator(selector).boundingBox())!;
const rail = '.sidebar-layout__rail';

test('CSS alone picks the desktop or phone layout, so server-rendered pages start right', async ({page}, testInfo) => {
  await page.goto('/render/sidebar/profile');
  // Both halves are in the page; CSS shows one.
  const trigger = page.locator('.mobile-navigation__trigger');
  await expect(page.locator(rail)).toBeAttached();
  await expect(trigger).toBeAttached();
  if (isMobile(testInfo)) {
    await expect(page.locator(rail)).toBeHidden();
    await expect(trigger).toBeVisible();
  } else {
    await expect(page.locator(rail)).toBeVisible();
    await expect(trigger).toBeHidden();
  }
  // Crossing the breakpoint switches without a reload.
  await page.setViewportSize(isMobile(testInfo) ? {width: 1280, height: 800} : {width: 390, height: 844});
  await expect(page.locator(rail)).toBeVisible({visible: isMobile(testInfo)});
  await expect(trigger).toBeVisible({visible: !isMobile(testInfo)});
});

test('the status bar sits above everything and pushes the layout down', async ({page}, testInfo) => {
  await presetTweaks(page, 'sidebar', {statusBar: true});
  await page.goto('/render/sidebar/long-table');
  const bar = page.locator('.sidebar-layout__status-bar .status-bar');
  await expect(bar).toHaveAttribute('aria-label', 'Staging');
  expect((await bar.boundingBox())!).toMatchObject({y: 0, height: 32});
  expect((await box(page, '.sidebar-layout__header')).y).toBe(32);
  if (!isMobile(testInfo)) expect((await box(page, rail)).y).toBe(32);

  // It stays put while the page scrolls.
  await page.evaluate(() => window.scrollTo(0, 2000));
  expect((await bar.boundingBox())!.y).toBe(0);
  await expect(bar, 'dark text on a light bar').toHaveCSS('color', 'oklch(0.2 0 0)');
});

test('without a title the page header goes away and content moves up', async ({page}, testInfo) => {
  await presetTweaks(page, 'sidebar', {header: false});
  await page.goto('/render/sidebar/profile');
  await expect(page.locator('.sidebar-layout__header')).toHaveCount(0);
  const heading = (await page.getByRole('heading', {name: 'Profile', exact: true}).boundingBox())!;
  expect(heading.y).toBeLessThan(isMobile(testInfo) ? 60 : 40);
});

test('the page footer stays pinned and the last content scrolls clear of it', async ({page}) => {
  await presetTweaks(page, 'sidebar', {footer: true});
  await page.goto('/render/sidebar/long-table');
  const footer = page.locator('.sidebar-layout__footer');
  await expect(footer.getByRole('button', {name: 'Done'})).toBeVisible();
  const viewport = page.viewportSize()!;
  const pinned = (await footer.boundingBox())!;
  expect(Math.round(pinned.y + pinned.height)).toBe(viewport.height);

  await page.evaluate(() => window.scrollTo({top: document.documentElement.scrollHeight, behavior: 'instant'}));
  expect(await footer.boundingBox()).toEqual(pinned);
  const lastRow = (await page.getByTestId('record-DF-0500').boundingBox())!;
  expect(lastRow.y + lastRow.height).toBeLessThanOrEqual(pinned.y + 1);
});

test.describe('assistant', () => {
  test.beforeEach(async ({page}) => {
    await presetTweaks(page, 'sidebar', {assistant: true});
  });

  test('the bar waits unobtrusively at the bottom, below a full-screen page', async ({page}, testInfo) => {
    await page.goto('/render/sidebar/profile');
    const bar = page.locator('.assistant');
    const viewport = page.viewportSize()!;
    const closed = (await bar.boundingBox())!;
    expect(closed.height).toBe(40);
    expect(closed.y + closed.height).toBe(viewport.height);
    if (!isMobile(testInfo)) {
      expect(await box(page, rail)).toMatchObject({x: 0, y: 0, height: viewport.height - 40});
      // Full screen, with the bottom corners already round above the bar.
      await expect(page.locator('.sidebar-layout__frame')).toHaveCSS('border-radius', '0px 0px 12px 12px');
    }
    await expect(page.getByRole('textbox', {name: 'Ask anything'})).toBeHidden();
  });

  test('on desktop, opening it contracts the page into a card above the chat', async ({page}, testInfo) => {
    test.skip(isMobile(testInfo), 'Desktop only');
    const errors = collectErrors(page);
    await page.goto('/render/sidebar/long-table');
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.getByRole('button', {name: 'Ask anything'}).click();

    const input = page.getByRole('textbox', {name: 'Ask anything'});
    await expect(input).toBeFocused();
    // The page rises and shrinks into a card with a small margin and rounded corners.
    await expect.poll(async () => (await box(page, rail)).x).toBe(8);
    const card = await box(page, rail);
    expect(card.y).toBe(8);
    expect(card.y + card.height).toBeLessThan(page.viewportSize()!.height - 440);
    await expect(page.locator('.sidebar-layout__frame')).toHaveCSS('border-radius', '12px');
    // The chat sits right below the card throughout, never ahead of it.
    expect((await box(page, '.assistant')).y).toBe(card.y + card.height + 8);
    expect(await scrollY(page), 'opening the chat keeps the page position').toBe(600);

    // Suggestions send straight away; the app renders the conversation.
    await page.getByRole('button', {name: /Where can I find old invoices/}).click();
    await expect(page.locator('.example-assistant [data-from="you"]')).toHaveText('Where can I find old invoices?');
    // Shift+Enter starts a new line; Enter sends.
    await input.fill('Hello');
    await input.press('Shift+Enter');
    await input.pressSequentially('there');
    await expect(input).toHaveValue('Hello\nthere');
    await input.press('Enter');
    await expect(page.locator('.example-assistant [data-from="you"]')).toHaveCount(2);
    await expect(input).toHaveValue('');

    // The page behind still scrolls natively.
    await page.mouse.move(900, 300);
    await page.mouse.wheel(0, 400);
    await expect.poll(() => scrollY(page)).toBeGreaterThan(600);

    await input.press('Escape');
    await expect.poll(async () => (await box(page, rail)).height).toBe(page.viewportSize()!.height - 40);
    const toggle = page.getByRole('button', {name: 'Ask anything'});
    await expect(toggle).toBeFocused();

    // The bar button toggles; while open, hovering it says it will close the chat.
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await toggle.hover();
    await expect(toggle.getByText('Close chat')).toHaveCSS('opacity', '1');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect.poll(async () => (await box(page, rail)).x).toBe(0);
    expect(errors).toEqual([]);
  });

  test('on phones, it opens as a bottom sheet', async ({page}, testInfo) => {
    test.skip(!isMobile(testInfo), 'Mobile only');
    await page.goto('/render/sidebar/profile');
    await page.getByRole('button', {name: 'Ask anything'}).click();
    const sheet = page.getByRole('dialog', {name: 'Ask anything'});
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole('button', {name: /Why won’t my settings save/})).toBeVisible();
    await sheet.getByRole('textbox', {name: 'Ask anything'}).fill('Hi');
    await sheet.getByRole('button', {name: 'Send'}).click();
    await expect(sheet.locator('[data-from="you"]')).toHaveText('Hi');
    await sheet.getByRole('button', {name: 'Close chat'}).click();
    await expect(sheet).toBeHidden();
    await expect(drawer(page)).toBeHidden();
  });
});

test('the sidebar header can be left out entirely', async ({page}, testInfo) => {
  await presetTweaks(page, 'sidebar', {navigationHeader: false});
  await page.goto('/render/sidebar/profile');
  if (isMobile(testInfo)) {
    await drawerTrigger(page).click();
    await expect(drawer(page).getByRole('button', {name: /^Projects:/})).toHaveCount(0);
    await expect(drawer(page).getByText('Settings navigation', {exact: true})).toHaveCount(0);
  } else {
    const firstChild = page.locator('.sidebar-layout__navigation > *').first();
    // Without a header, SideNav's first child is the navigation list itself.
    await expect(firstChild.locator('.astryx-side-nav-section').first()).toBeAttached();
    await expect(page.locator(rail).getByRole('button', {name: /^Projects:/})).toHaveCount(0);
  }
});

test('navigation fade and bounce can be switched off', async ({page}, testInfo) => {
  await presetTweaks(page, 'sidebar', {extraNavigation: true, navigationFade: false, navigationBounce: false});
  await page.goto('/render/sidebar/profile');
  if (isMobile(testInfo)) {
    await drawerTrigger(page).click();
    await expect(drawer(page)).toBeVisible();
  }
  const list = page.locator(isMobile(testInfo) ? '.mobile-navigation__sections' : '.sidebar-layout__navigation > div:last-child');
  expect(await list.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);
  await expect.poll(() => list.evaluate(element => {
    const style = getComputedStyle(element);
    return [style.getPropertyValue('--scroll-area-end'), style.overscrollBehaviorY];
  })).toEqual(['0px', 'none']);
});

test('page bounce can be switched off', async ({page}) => {
  await presetTweaks(page, 'sidebar', {pageBounce: false});
  await page.goto('/render/sidebar/long-table');
  await expect(page.locator('html')).toHaveCSS('overscroll-behavior-y', 'none');
});

test('dark mode reaches the page, the sidebar and the overscroll area', async ({page}, testInfo) => {
  await presetTweaks(page, 'sidebar', {}, {darkMode: true});
  await page.goto('/sidebar/long-table');
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(38, 38, 38)');
  await expect(page.locator('.sidebar-layout__surface')).toHaveCSS('background-color', 'rgb(38, 38, 38)');
  await expect(page.locator('.sidebar-layout__header')).toHaveCSS('background-color', 'rgb(38, 38, 38)');
  if (!isMobile(testInfo)) await expect(page.locator(rail)).toHaveCSS('background-color', 'rgb(38, 38, 38)');
});
