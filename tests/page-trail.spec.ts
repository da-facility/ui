import {expect, test, type Locator, type Page} from '@playwright/test';
import {collectErrors, isMobile, presetTweaks} from './helpers';

const levels = [
  'Coastal Rowing Club',
  'Traditional boat regatta and the opening of the swimming season',
  'Day one of the regatta: races from the harbour to the lighthouse',
  'Morning race',
];
const current = 'Finish and prize-giving on the waterfront';
const trail = (page: Page, box: string) => page.getByRole('navigation', {name: `Breadcrumb, ${box}`, exact: true});
const isWhole = (locator: Locator) => locator.evaluate(element => element.scrollWidth <= element.clientWidth);
/** The trail measures itself when its room changes, before the next frame is painted. */
const frames = (page: Page) => page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));

/** Every level above, once and in order: on the line, or in the "…" menu right after the first. */
async function expectEveryLevel(page: Page, nav: Locator, message: string) {
  const more = nav.getByRole('button', {name: 'Show the levels in between'});
  const shown = await nav.locator('a:visible').allTextContents();
  if (!await more.isVisible()) return expect(shown, message).toEqual(levels);
  await more.click();
  const menu = page.getByRole('menu');
  await expect(menu.getByRole('menuitem').first()).toBeVisible();
  const inMenu = await menu.getByRole('menuitem').allTextContents();
  expect([shown[0], ...inMenu, ...shown.slice(1)], message).toEqual(levels);
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(more).toBeFocused();
}

test.describe('desktop', () => {
  test.beforeEach(({}, testInfo) => test.skip(isMobile(testInfo), 'the phone form is tested below'));

  test('with room, every level above is a link on one line and the page is marked', async ({page}) => {
    const errors = collectErrors(page);
    await page.goto('/render/page-trail');
    const nav = trail(page, 'Full width');
    await expect(nav.locator('a:visible')).toHaveText(levels);
    await expect(nav.getByRole('button', {name: 'Show the levels in between'})).toHaveCount(0);
    await expect(nav.locator('[aria-current=page]:visible')).toHaveText(current);
    expect((await nav.boundingBox())!.height).toBeLessThan(30);
    await nav.getByRole('link', {name: 'Morning race'}).click();
    await expect(page).toHaveURL(/#morning$/);
    expect(errors).toEqual([]);
  });

  test('without room, the first level and the page stay whole and the rest collapse into a menu, also on resize', async ({page}) => {
    await page.goto('/render/page-trail');
    // 820 px is the narrowest desktop width; at 768 px and below the phone form shows.
    for (const width of [1920, 1200, 1000, 820, 1920]) {
      await page.setViewportSize({width, height: 1080});
      await frames(page);
      for (const box of ['Full width', '720 px', '480 px']) {
        const nav = trail(page, box);
        const message = `${box} at ${width} px`;
        if (box !== 'Full width' || width === 820) await expect(nav.getByRole('button', {name: 'Show the levels in between'}), message).toBeVisible();
        const first = nav.getByRole('link', {name: levels[0], exact: true});
        await expect(first, message).toBeVisible();
        expect(await isWhole(first), `first level cut: ${message}`).toBe(true);
        const page_ = nav.locator('[aria-current=page]:visible');
        await expect(page_).toHaveText(current);
        expect(await isWhole(page_), `page cut: ${message}`).toBe(true);
        expect((await nav.boundingBox())!.height, `one line: ${message}`).toBeLessThan(30);
        await expectEveryLevel(page, nav, message);
      }
    }
  });

  test('a level from the menu opens, and the menu works with the keyboard', async ({page}) => {
    await page.goto('/render/page-trail');
    const nav = trail(page, '480 px');
    const more = nav.getByRole('button', {name: 'Show the levels in between'});
    await more.focus();
    await page.keyboard.press('Enter');
    const item = page.getByRole('menuitem', {name: levels[1]});
    await expect(item).toBeFocused();
    await item.click();
    await expect(page).toHaveURL(/#regatta$/);
  });

  test('a level without a page is plain text, on the line and in the menu', async ({page}) => {
    await presetTweaks(page, 'page-trail', {textLevel: true});
    await page.goto('/render/page-trail');
    const wide = trail(page, 'Full width');
    await expect(wide.getByText(levels[1], {exact: true}).filter({visible: true})).toBeVisible();
    await expect(wide.getByRole('link', {name: levels[1]})).toHaveCount(0);
    await expect(wide.locator('a:visible')).toHaveCount(3);
    await trail(page, '480 px').getByRole('button', {name: 'Show the levels in between'}).click();
    await expect(page.getByRole('menuitem', {name: levels[1]})).toBeDisabled();
  });

  test('the unseen measuring copy adds no tab stops and nothing to read', async ({page}) => {
    await page.goto('/render/page-trail');
    const nav = trail(page, '480 px');
    await expect(nav.getByRole('link')).toHaveCount(await nav.locator('a:visible').count());
    expect(await nav.locator('.page-trail__measure').evaluate(element => (element as HTMLElement).inert)).toBe(true);
  });
});

test.describe('phones', () => {
  test.beforeEach(({}, testInfo) => test.skip(!isMobile(testInfo), 'the desktop form is tested above'));

  test('a back link to the parent, and a list of every level above two taps away', async ({page}) => {
    const errors = collectErrors(page);
    await page.goto('/render/page-trail');
    const nav = trail(page, 'Full width');
    await expect(nav.locator('ol').filter({visible: true})).toHaveCount(0);
    const back = nav.getByRole('link', {name: 'Morning race'});
    await expect(back).toBeVisible();
    expect((await back.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    const all = nav.getByRole('button', {name: 'All levels above'});
    const box = (await all.boundingBox())!;
    expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
    await all.click();
    const menu = page.getByRole('menu');
    await expect(menu.getByRole('menuitem')).toHaveText(levels);
    await menu.getByRole('menuitem', {name: levels[0]}).click();
    await expect(page).toHaveURL(/#club$/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });

  test('one level above: the back link alone', async ({page}) => {
    await presetTweaks(page, 'page-trail', {shallow: true});
    await page.goto('/render/page-trail');
    const nav = trail(page, 'Full width');
    await expect(nav.getByRole('link', {name: levels[0]})).toBeVisible();
    await expect(nav.getByRole('button')).toHaveCount(0);
  });
});
