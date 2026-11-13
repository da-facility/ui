import {expect, test} from '@playwright/test';
import {collectErrors, isMobile, presetTweaks} from './helpers';

const luminance = (color: string) => {
  const [r, g, b] = color.match(/[\d.]+/g)!.map(Number);
  return (r + g + b) / 3;
};

test('the bar shows the count, summary and actions in a live region; Escape and the button clear', async ({page}) => {
  const errors = collectErrors(page);
  await page.goto('/render/selection-bar');
  const status = page.locator('.selection-bar');
  await expect(status).toHaveAttribute('role', 'status');
  await expect(status).toContainText('3 selected · up to 2400 px');
  await expect(status.getByRole('button', {name: 'Download'})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(status).toBeEmpty();
  await expect(status, 'the live region stays, ready to announce the next selection').toBeAttached();
  await page.getByRole('button', {name: 'Select 3 again'}).click();
  await expect(status).toContainText('3 selected');
  await status.getByRole('button', {name: 'Clear selection'}).click();
  await expect(status).toBeEmpty();
  expect(errors).toEqual([]);
});

test('without download the text says so and there is no Download button', async ({page}) => {
  await presetTweaks(page, 'selection-bar', {noDownload: true, many: true});
  await page.goto('/render/selection-bar');
  await expect(page.locator('.selection-bar')).toContainText('1,204 selected · downloading isn’t allowed');
  await expect(page.getByRole('button', {name: 'Download'})).toHaveCount(0);
});

// Croatian plurals follow the last digits: 1 odabrana, 3 and 1.204 odabrane (like 12 odabranih in the design).
test('Croatian counts take the right plural form and the locale’s grouping', async ({page}) => {
  for (const [tweaks, text] of [[{one: true}, '1 odabrana'], [{}, '3 odabrane'], [{many: true}, '1.204 odabrane']] as const) {
    await presetTweaks(page, 'selection-bar', tweaks, {croatian: true});
    await page.goto('/render/selection-bar');
    await expect(page.locator('.selection-bar')).toContainText(text);
    await expect(page.getByRole('button', {name: 'Poništi odabir'})).toBeVisible();
  }
});

test('the bar inverts the theme: dark in light mode, light in dark mode', async ({page}) => {
  for (const darkMode of [false, true]) {
    await presetTweaks(page, 'selection-bar', {}, {darkMode});
    await page.goto('/render/selection-bar');
    const bar = page.locator('.selection-bar__bar');
    const [background, text, body] = await bar.evaluate(element => [getComputedStyle(element).backgroundColor, getComputedStyle(element).color, getComputedStyle(document.body.querySelector('main')!.parentElement!).backgroundColor]);
    if (darkMode) expect(luminance(background)).toBeGreaterThan(180);
    else expect(luminance(background)).toBeLessThan(60);
    expect(Math.abs(luminance(background) - luminance(text))).toBeGreaterThan(120);
    void body;
  }
});

test('in the gallery it sticks to the bottom of the screen and rests after the last row', async ({page}, testInfo) => {
  await page.goto('/render/media-grid');
  await expect(page.locator('.media-tile:not([data-loading])').first()).toBeVisible();
  await page.locator('.media-tile[data-index="0"]').getByRole('checkbox').check({force: true});
  const bar = page.locator('.selection-bar__bar');
  await expect(bar).toBeVisible();
  const viewport = page.viewportSize()!;
  // Once it has slid in, 16px above the bottom of the screen.
  await expect.poll(async () => {
    const box = (await bar.boundingBox())!;
    return Math.round(viewport.height - (box.y + box.height));
  }).toBe(16);
  const box = (await bar.boundingBox())!;
  const grid = (await page.locator('.media-grid').boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(grid.x - 1);
  expect(box.x + box.width).toBeLessThanOrEqual(grid.x + grid.width + 1);

  // At the very end the bar sits below the grid, so the last row stays visible.
  await expect(async () => {
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await expect(page.getByText('All 240 photos are loaded.')).toBeVisible({timeout: 1000});
  }).toPass({timeout: 20_000});
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  const lastTile = (await page.locator('.media-tile').last().boundingBox())!;
  const rested = (await bar.boundingBox())!;
  expect(rested.y).toBeGreaterThan(lastTile.y + lastTile.height);
  if (isMobile(testInfo)) expect(rested.width).toBeLessThanOrEqual(390);
  await page.keyboard.press('Escape');
  await expect(page.locator('.media-tile[data-selected]')).toHaveCount(0);
});

test.describe('isPinned', () => {
  const bottomGap = async (page: import('@playwright/test').Page) => {
    const box = (await page.locator('.selection-bar__bar').boundingBox())!;
    return Math.round(page.viewportSize()!.height - (box.y + box.height));
  };

  test('on a short page the bar sits at the bottom of the window, not under the content', async ({page}) => {
    await presetTweaks(page, 'selection-bar', {pinned: true, short: true});
    await page.goto('/render/selection-bar');
    await expect(page.locator('.selection-bar__bar')).toBeVisible();
    await expect.poll(() => bottomGap(page)).toBe(16);
    const rows = (await page.locator('.selection-bar-example__rows').boundingBox())!;
    expect((await page.locator('.selection-bar__bar').boundingBox())!.y).toBeGreaterThan(rows.y + rows.height + 100);
  });

  test('on a long page it stays at the bottom and, at the end, leaves the last row uncovered', async ({page}) => {
    await presetTweaks(page, 'selection-bar', {pinned: true});
    await page.goto('/render/selection-bar');
    await expect.poll(() => bottomGap(page)).toBe(16);
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(() => bottomGap(page)).toBe(16);
    const last = (await page.locator('.selection-bar-example__rows > div').last().boundingBox())!;
    const bar = (await page.locator('.selection-bar__bar').boundingBox())!;
    expect(last.y + last.height).toBeLessThanOrEqual(bar.y);
    // Clearing gives the room back.
    await page.keyboard.press('Escape');
    await expect(page.locator('.selection-bar')).toHaveCSS('height', '0px');
  });

  test('in SidebarLayout it stays inside the content area, clear of the rail and of a floating menu button', async ({page}, testInfo) => {
    await presetTweaks(page, 'sidebar', {selectionBar: true});
    await page.goto('/render/sidebar/profile');
    const bar = page.locator('.selection-bar__bar');
    await expect(bar).toBeVisible();
    const box = (await bar.boundingBox())!;
    if (isMobile(testInfo)) {
      // The floating menu button keeps the thumb zone; the bar sits above it.
      const trigger = (await page.getByRole('button', {name: 'Open settings navigation', exact: true}).boundingBox())!;
      expect(box.y + box.height).toBeLessThanOrEqual(trigger.y);
      expect(box.x).toBe(16);
    } else {
      const rail = (await page.locator('.sidebar-layout__rail').boundingBox())!;
      expect(box.x).toBe(rail.x + rail.width + 16);
      await expect.poll(() => bottomGap(page)).toBe(16);
    }
  });

  test('with the phone top bar there is no floating button, so it sits at the bottom', async ({page}, testInfo) => {
    test.skip(!isMobile(testInfo), 'Mobile only');
    await presetTweaks(page, 'sidebar', {selectionBar: true, topBar: true});
    await page.goto('/render/sidebar/profile');
    await expect(page.locator('.selection-bar__bar')).toBeVisible();
    await expect.poll(() => bottomGap(page)).toBe(16);
  });
});

// The clear button has Astryx's default size, like an app's Button passed as an action.
test('the clear button and an action are one height on one line', async ({page}) => {
  for (const croatian of [false, true]) {
    await presetTweaks(page, 'selection-bar', {}, {croatian});
    await page.goto('/render/selection-bar');
    const bar = page.locator('.selection-bar__bar');
    // Measured once it has slid in.
    await bar.evaluate(element => Promise.all(element.getAnimations().map(animation => animation.finished)));
    const clear = (await bar.getByRole('button', {name: croatian ? 'Poništi odabir' : 'Clear selection'}).boundingBox())!;
    const action = (await bar.getByRole('button', {name: 'Download'}).boundingBox())!;
    expect(clear.height).toBe(action.height);
    expect(clear.y).toBe(action.y);
  }
});
