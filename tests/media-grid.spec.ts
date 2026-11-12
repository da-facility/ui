import {expect, test, type Page} from '@playwright/test';
import {collectErrors, isMobile, presetTweaks} from './helpers';

const grid = (page: Page) => page.getByRole('group', {name: 'Photos'});
const tiles = (page: Page) => page.locator('.media-tile:not([data-loading])');
const tile = (page: Page, index: number) => page.locator(`.media-tile[data-index="${index}"]`);
const link = (page: Page, index: number) => tile(page, index).locator('.media-tile__link');
/** Scrolls to the end until every page is loaded, then back to the top. */
async function loadAll(page: Page) {
  await expect(async () => {
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await expect(page.getByText('All 240 photos are loaded.')).toBeVisible({timeout: 1000});
  }).toPass({timeout: 20_000});
  await expect(tiles(page)).toHaveCount(240);
  await page.evaluate(() => scrollTo(0, 0));
}
const selectedCount = (page: Page) => page.locator('.media-tile[data-selected]').count();

test('even 3:2 tiles, as links, many columns on desktop and three on phones', async ({page}, testInfo) => {
  const errors = collectErrors(page);
  await page.goto('/render/media-grid');
  await expect(tiles(page).first()).toBeVisible();
  const boxes = await tiles(page).evaluateAll(elements => elements.slice(0, 12).map(element => element.getBoundingClientRect().toJSON() as DOMRect));
  for (const box of boxes) expect(box.width / box.height).toBeCloseTo(1.5, 1);
  const firstRow = boxes.filter(box => Math.abs(box.top - boxes[0].top) < 1);
  if (isMobile(testInfo)) {
    expect(firstRow).toHaveLength(3);
    expect(Math.round(firstRow[1].left - firstRow[0].right)).toBe(3);
  } else {
    expect(firstRow.length).toBeGreaterThan(8);
    expect(Math.round(firstRow[1].left - firstRow[0].right)).toBe(6);
  }
  await expect(link(page, 0)).toHaveAttribute('href', '#photo-0');
  const image = tile(page, 0).locator('img');
  await expect(image).toHaveAttribute('loading', 'lazy');
  await expect(image).toHaveAttribute('alt', /\w/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('pages load as the end comes near, short pages included, with wells while loading', async ({page}) => {
  await presetTweaks(page, 'media-grid', {shortPages: true, slowNetwork: true});
  await page.goto('/render/media-grid');
  const wells = page.locator('.media-tile[data-loading]');
  await expect(wells.first(), 'empty wells stand in for the first page').toBeVisible();
  await expect(grid(page)).toHaveAttribute('aria-busy', 'true');
  // The well row completes the last row and adds one more.
  const columns = await page.evaluate(() => getComputedStyle(document.querySelector('.media-grid__probe')!).gridTemplateColumns.split(' ').length);
  expect(await wells.count()).toBe(columns);
  await expect(tiles(page)).toHaveCount(13, {timeout: 10_000});
  // Short pages (13 of 60 here) don't stop the loading while the end is close.
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await expect(page.getByText('All 240 photos are loaded.')).toBeVisible({timeout: 30_000});
  await expect(tiles(page)).toHaveCount(240 - 2 * 47);
  await expect(wells).toHaveCount(0);
  await expect(grid(page)).not.toHaveAttribute('aria-busy');
});

test('selection: the circle, Space, Shift ranges and select all', async ({page}, testInfo) => {
  await page.goto('/render/media-grid');
  await loadAll(page);
  const checkbox = (index: number) => tile(page, index).getByRole('checkbox');
  await expect(checkbox(1)).toHaveAccessibleName(/^Select /);

  if (!isMobile(testInfo)) await tile(page, 1).hover();
  await checkbox(1).click();
  await expect(checkbox(1)).toBeChecked();
  await expect(tile(page, 1)).toHaveAttribute('data-selected', 'true');
  await expect(link(page, 1)).toHaveAccessibleName(/, selected$/);

  // Shift-click selects the range from the last toggled tile.
  await link(page, 4).click({modifiers: ['Shift']});
  expect(await selectedCount(page)).toBe(4);
  await expect(page, 'Shift-click selects instead of opening').not.toHaveURL(/#photo/);

  // Space toggles the focused tile; Ctrl/Cmd+A takes everything loaded.
  await link(page, 4).focus();
  await page.keyboard.press('Space');
  expect(await selectedCount(page)).toBe(3);
  await page.keyboard.press('ControlOrMeta+a');
  expect(await selectedCount(page)).toBe(240);
  await expect(grid(page).getByRole('status')).toHaveText('Selected all 240 loaded.');
});

test('one tab stop; arrow keys move between tiles; Enter opens', async ({page}) => {
  await page.goto('/render/media-grid');
  await loadAll(page);
  await expect(grid(page).locator('.media-tile__link[tabindex="0"]')).toHaveCount(1);
  await link(page, 0).focus();
  const columns = await page.evaluate(() => getComputedStyle(document.querySelector('.media-grid__probe')!).gridTemplateColumns.split(' ').length);
  await page.keyboard.press('ArrowRight');
  await expect(link(page, 1)).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(link(page, 1 + columns)).toBeFocused();
  await expect(link(page, 1 + columns)).toHaveAttribute('tabindex', '0');
  await expect(link(page, 0)).toHaveAttribute('tabindex', '-1');
  await page.keyboard.press('End');
  await expect(link(page, 2 * columns - 1)).toBeFocused();
  await page.keyboard.press('Home');
  await expect(link(page, columns)).toBeFocused();
  await page.keyboard.press('ControlOrMeta+End');
  await expect(link(page, 239)).toBeFocused();
  // The focus ring is drawn in the theme's text colour.
  await expect(tile(page, 239)).toHaveCSS('outline-style', 'solid');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#photo-239$/);
});

test('closing the photo brings back the same tile at the same place, focused', async ({page}) => {
  await page.goto('/render/media-grid');
  await loadAll(page);
  await page.evaluate(() => scrollTo(0, 900));
  const index = await page.evaluate(() => {
    const visible = [...document.querySelectorAll<HTMLElement>('.media-tile')].find(element => element.getBoundingClientRect().top > 200);
    return Number(visible!.dataset.index);
  });
  const before = (await tile(page, index).boundingBox())!;
  await link(page, index).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(grid(page), 'the grid unmounts while the photo is open').toHaveCount(0);
  await page.getByRole('button', {name: 'Close'}).click();
  await expect(link(page, index)).toBeFocused();
  const after = (await tile(page, index).boundingBox())!;
  expect(Math.abs(after.y - before.y)).toBeLessThan(1);
});

test('each block’s reserved height matches its real height, so nothing shifts as blocks render', async ({page}) => {
  await page.goto('/render/media-grid');
  await loadAll(page);
  // Render every block once, then compare its laid-out height with the reserved one.
  const blocks = await page.locator('.media-grid__chunk').evaluateAll(elements => elements.map(element => {
    element.scrollIntoView();
    const style = getComputedStyle(element);
    const content = element.getBoundingClientRect().height - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    const reserved = parseFloat((element as HTMLElement).style.containIntrinsicHeight.replace('auto', ''));
    return {content, reserved};
  }));
  expect(blocks.length).toBeGreaterThan(1);
  for (const block of blocks) expect(Math.abs(block.content - block.reserved)).toBeLessThan(0.5);
});

test('a long press selects on touch screens, and then every circle shows', async ({page, context}, testInfo) => {
  test.skip(!isMobile(testInfo), 'touch only');
  await page.goto('/render/media-grid');
  await expect(tiles(page).first()).toBeVisible();
  const box = (await tile(page, 2).boundingBox())!;
  const session = await context.newCDPSession(page);
  const point = {x: box.x + box.width / 2, y: box.y + box.height / 2};
  await session.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [point]});
  await page.waitForTimeout(700);
  await session.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
  await expect(tile(page, 2)).toHaveAttribute('data-selected', 'true');
  await expect(page, 'the long press does not open the photo').not.toHaveURL(/#photo/);
  await expect(tile(page, 5).locator('.media-tile__select')).toHaveCSS('opacity', '1');
});

test('selection rings follow the theme in dark mode', async ({page}) => {
  await presetTweaks(page, 'media-grid', {}, {darkMode: true});
  await page.goto('/render/media-grid');
  await expect(tiles(page).first()).toBeVisible();
  await tile(page, 0).getByRole('checkbox').check({force: true});
  const [ring, accent] = await tile(page, 0).evaluate(element => {
    const probe = document.createElement('div');
    probe.style.color = 'var(--color-accent)';
    document.body.append(probe);
    const accent = getComputedStyle(probe).color;
    probe.remove();
    return [getComputedStyle(element).outlineColor, accent];
  });
  expect(ring).toBe(accent);
});
