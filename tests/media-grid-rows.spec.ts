import {expect, test, type Page} from '@playwright/test';
import {collectErrors, isMobile, presetTweaks} from './helpers';

/** `layout="rows"`: whole photos in rows of equal height, sections, captions, and only the rows near the window drawn. */

const grid = (page: Page) => page.getByRole('group', {name: 'Photos'});
const tile = (page: Page, index: number) => page.locator(`.media-tile[data-index="${index}"]`);
const link = (page: Page, index: number) => tile(page, index).locator('.media-tile__link');
const boxes = (page: Page) => page.locator('.media-tile:not([data-loading])').evaluateAll(elements => elements.map(element => {
  const box = element.getBoundingClientRect();
  return {index: Number((element as HTMLElement).dataset.index), top: Math.round(box.top + scrollY), left: box.left, width: box.width, height: box.height};
}));

test('whole photos: portraits narrower, landscapes wider, one height per row; lower rows on phones', async ({page}, testInfo) => {
  const errors = collectErrors(page);
  await presetTweaks(page, 'media-grid', {rows: true, selectable: true});
  await page.goto('/render/media-grid');
  await expect(tile(page, 20)).toBeVisible();
  const all = await boxes(page);
  const rows = new Map<number, typeof all>();
  for (const box of all) rows.set(box.top, [...(rows.get(box.top) ?? []), box]);
  const heights = [...rows.values()].map(row => row[0].height);
  for (const row of rows.values()) expect(new Set(row.map(box => Math.round(box.height))).size).toBe(1);
  // The stand-in scenes are 3:2 and 2:3: both shapes, whole.
  const shapes = all.map(box => box.width / box.height);
  expect(shapes.some(shape => shape < 0.75)).toBe(true);
  expect(shapes.some(shape => shape > 1.4)).toBe(true);
  for (const shape of shapes) expect(Math.min(Math.abs(shape - 1.5), Math.abs(shape - 2 / 3))).toBeLessThan(0.06);
  const median = [...heights].sort((a, b) => a - b)[Math.floor(heights.length / 2)];
  if (isMobile(testInfo)) expect(median).toBeLessThan(140);
  else expect(median).toBeGreaterThan(150);
  await expect(tile(page, 0).locator('img')).toHaveCSS('object-fit', 'cover');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('10,000 photos: only the rows near the window are in the document, the scrollbar covers them all', async ({page}) => {
  await page.goto('/render/media-grid/rows-large');
  await expect(tile(page, 0)).toBeVisible();
  const atTop = await page.evaluate(() => ({nodes: document.getElementsByTagName('*').length, tiles: document.querySelectorAll('.media-tile').length, height: document.documentElement.scrollHeight}));
  expect(atTop.nodes, 'document nodes').toBeLessThan(5000);
  expect(atTop.tiles).toBeLessThan(400);
  expect(atTop.height, 'the height of all 10,000').toBeGreaterThan(100_000);
  // The end: the last photo is drawn, with its place in the set for screen readers.
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await expect(tile(page, 9999)).toBeVisible();
  await expect(tile(page, 9999)).toHaveAttribute('role', 'listitem');
  await expect(tile(page, 9999)).toHaveAttribute('aria-posinset', '10000');
  await expect(tile(page, 9999)).toHaveAttribute('aria-setsize', '10000');
  // Far from the window, only the tile holding the grid's tab stop (the first) stays drawn.
  await expect(tile(page, 100)).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(atTop.height);
  // The middle, reached in one jump as with the scrollbar.
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight / 2));
  await expect(page.locator('.media-tile[aria-posinset]').nth(1)).toBeAttached();
  const middle = await page.evaluate(() => Math.min(...[...document.querySelectorAll<HTMLElement>('.media-tile[aria-posinset]')]
    .filter(element => { const box = element.getBoundingClientRect(); return box.bottom > 0 && box.top < innerHeight; })
    .map(element => Number(element.getAttribute('aria-posinset')))));
  expect(middle).toBeGreaterThan(4000);
  expect(middle).toBeLessThan(6000);
});

test('keyboard and selection reach rows that aren’t drawn', async ({page}) => {
  await presetTweaks(page, 'media-grid', {selectable: true});
  await page.goto('/render/media-grid/rows-large');
  await expect(grid(page).locator('.media-tile__link[tabindex="0"]')).toHaveCount(1);
  await link(page, 0).focus();
  await page.keyboard.press('ArrowRight');
  await expect(link(page, 1)).toBeFocused();
  const before = (await tile(page, 1).boundingBox())!;
  await page.keyboard.press('ArrowDown');
  const focused = page.locator('.media-tile:has(.media-tile__link:focus)');
  const below = (await focused.boundingBox())!;
  expect(below.y).toBeGreaterThan(before.y + before.height - 1);
  expect(below.x).toBeLessThan(before.x + before.width);
  expect(below.x + below.width).toBeGreaterThan(before.x);
  // Ctrl+End: the last photo, drawn and focused, 10,000 rows down.
  await page.keyboard.press('ControlOrMeta+End');
  await expect(link(page, 9999)).toBeFocused();
  await expect(link(page, 9999)).toBeInViewport();
  await page.keyboard.press('ControlOrMeta+Home');
  await expect(link(page, 0)).toBeFocused();
  // Ctrl+A takes all 10,000; Shift-click a range.
  await page.keyboard.press('ControlOrMeta+a');
  await expect(grid(page).getByRole('status')).toHaveText('Selected all 10,000 loaded.');
  await page.keyboard.press('Space');
  await expect(tile(page, 0)).not.toHaveAttribute('data-selected');
});

test('Shift-click selects a range, the tiles are links to the photo', async ({page}, testInfo) => {
  await presetTweaks(page, 'media-grid', {rows: true, selectable: true});
  await page.goto('/render/media-grid');
  await expect(link(page, 0)).toHaveAttribute('href', '#photo-0');
  if (!isMobile(testInfo)) await tile(page, 1).hover();
  await tile(page, 1).getByRole('checkbox').click();
  await link(page, 5).click({modifiers: ['Shift']});
  await expect(page.locator('.media-tile[data-selected]')).toHaveCount(5);
  await expect(page).not.toHaveURL(/#photo/);
});

test('captions: two lines on hover and keyboard focus, or always', async ({page}, testInfo) => {
  test.skip(isMobile(testInfo), 'hover');
  await presetTweaks(page, 'media-grid', {rows: true});
  await page.goto('/render/media-grid');
  const caption = tile(page, 3).locator('.media-tile__caption');
  await expect(caption).toHaveCSS('opacity', '0');
  await expect(caption.locator('.media-tile__caption-title')).toHaveText('IMG_4003.JPG');
  await expect(caption.locator('.media-tile__caption-text')).toHaveText(/ · Ana Horvat$/);
  await tile(page, 3).hover();
  await expect(caption).toHaveCSS('opacity', '1');
  await page.mouse.move(0, 0);
  await link(page, 0).focus();
  await page.keyboard.press('ArrowRight');
  await expect(tile(page, 1).locator('.media-tile__caption')).toHaveCSS('opacity', '1');
  await presetTweaks(page, 'media-grid', {rows: true, captionsAlways: true});
  await page.goto('/render/media-grid');
  await expect(tile(page, 7).locator('.media-tile__caption')).toHaveCSS('opacity', '1');
});

test('sections: a heading with its count, rows starting under it; sticky as an option', async ({page}) => {
  await presetTweaks(page, 'media-grid', {rows: true, sections: true, reserve: true});
  await page.goto('/render/media-grid');
  const section = page.getByRole('group', {name: 'Monday 15 June 2026'});
  await expect(section).toBeVisible();
  await expect(section.getByRole('heading', {level: 2})).toHaveText('Monday 15 June 2026');
  await expect(section.locator('.media-grid__heading-meta')).toHaveText('37 photos');
  await expect(section.getByRole('listitem')).toHaveCount(37);
  // The second day starts a row of its own.
  await page.getByRole('group', {name: 'Tuesday 16 June 2026'}).scrollIntoViewIfNeeded();
  await expect(tile(page, 37)).toBeVisible();
  const [first, last] = await Promise.all([tile(page, 37).boundingBox(), tile(page, 36).boundingBox()]);
  expect(first!.y).toBeGreaterThan(last!.y + last!.height);
  const box = (await page.locator('.media-grid').boundingBox())!;
  expect(Math.round(first!.x)).toBe(Math.round(box.x));
  // Not sticky by default; sticky with the option.
  const heading = section.locator('.media-grid__heading');
  await expect(heading).toHaveCSS('position', 'static');
  await presetTweaks(page, 'media-grid', {rows: true, sections: true, sticky: true, reserve: true});
  await page.goto('/render/media-grid');
  await expect(page.getByRole('group', {name: 'Monday 15 June 2026'}).locator('.media-grid__heading')).toHaveCSS('position', 'sticky');
});

test('the room for what isn’t loaded is reserved: grey tiles, and a height that barely moves as pages arrive', async ({page}) => {
  await presetTweaks(page, 'media-grid', {rows: true, reserve: true, slowNetwork: true});
  await page.goto('/render/media-grid');
  await expect(page.locator('.media-grid__placeholders .media-tile[data-loading]').first()).toBeVisible();
  await expect(page.locator('.media-tile[data-index="0"]:not([data-loading])')).toBeVisible({timeout: 10_000});
  const first = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await expect(page.getByText('All 240 photos are loaded.')).toBeVisible({timeout: 30_000});
  const last = await page.evaluate(() => document.documentElement.scrollHeight);
  // The stand-ins take the loaded photos' average shape, so the estimate holds within a few rows.
  expect(Math.abs(last - first) / last).toBeLessThan(0.12);
  await expect(page.locator('.media-tile[data-loading]')).toHaveCount(0);
});

test('closing the photo brings back the same tile at the same place, focused', async ({page}) => {
  await presetTweaks(page, 'media-grid', {selectable: true});
  await page.goto('/render/media-grid/rows-large');
  await page.evaluate(() => scrollTo(0, 50_000));
  await page.waitForTimeout(300);
  const index = await page.evaluate(() => {
    const visible = [...document.querySelectorAll<HTMLElement>('.media-tile')].find(element => element.getBoundingClientRect().top > 200);
    return Number(visible!.dataset.index);
  });
  const before = (await tile(page, index).boundingBox())!;
  await link(page, index).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', {name: 'Close'}).click();
  await expect(link(page, index)).toBeFocused();
  const after = (await tile(page, index).boundingBox())!;
  expect(Math.abs(after.y - before.y)).toBeLessThan(1);
});

test('the phone viewer: the position on its own line, whole, the file name under it', async ({page}, testInfo) => {
  test.skip(!isMobile(testInfo), 'phones');
  await page.goto('/render/media-grid/large#photo-5000');
  const position = page.locator('.media-viewer__position');
  const title = page.locator('.media-viewer__title');
  await expect(position).toHaveText(/5,001 \/ 20,000$/);
  const [p, t] = await Promise.all([position.boundingBox(), title.boundingBox()]);
  expect(t!.y).toBeGreaterThanOrEqual(p!.y + p!.height - 1);
  expect(await position.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
});

test('an image that doesn’t load: the tile says so and still opens; the viewer says so with Try again', async ({page}) => {
  await presetTweaks(page, 'media-grid', {rows: true, selectable: true});
  let failing = true;
  await page.route(/\?size=(thumb|preview)/, route => (failing ? route.abort() : route.continue()));
  await page.goto('/render/media-grid');
  await expect(tile(page, 0)).toHaveAttribute('data-state', 'failed');
  await expect(link(page, 0)).toHaveAccessibleName(/, couldn’t be loaded$/);
  await expect(tile(page, 0).locator('.media-tile__mark')).toBeVisible();
  await link(page, 0).click();
  const alert = page.getByRole('dialog').getByRole('alert');
  await expect(alert).toContainText('The image couldn’t be loaded.');
  failing = false;
  await alert.getByRole('button', {name: 'Try again'}).click();
  await expect(alert).toHaveCount(0);
  await expect(page.locator('.media-viewer__image--preview')).toHaveAttribute('data-loaded', 'true');
});

test('a jump into what isn’t loaded yet stays where the person put it while the pages arrive', async ({page}) => {
  await presetTweaks(page, 'media-grid', {rows: true, reserve: true});
  await page.goto('/render/media-grid');
  await expect(page.locator('.media-tile[data-index="0"]:not([data-loading])')).toBeVisible();
  const target = await page.evaluate(() => Math.round(document.documentElement.scrollHeight * 0.6));
  await page.evaluate(y => scrollTo(0, y), target);
  // Every page arrives above the window (240 photos, 60 a page).
  await expect(page.getByText('All 240 photos are loaded.')).toBeAttached({timeout: 20_000});
  const y = await page.evaluate(() => scrollY);
  expect(Math.abs(y - target)).toBeLessThan(800);
});
