import {expect, test, type Page} from '@playwright/test';
import {collectErrors, isMobile} from './helpers';

/**
 * `layout="rows"` with `gaps`: a list loaded from the middle (`/media-grid/rows-middle`, 10,000 photos by day of 37,
 * loaded from photo 9,501 on, pages of 100 on both sides), as an app returning to a far photo.
 */

type Request = {side: 'before' | 'after'; index: number} | {side: 'inside'; position: number};
const START = 9500;

const byPlace = (page: Page, place: number) => page.locator(`.media-tile[aria-posinset="${place}"]`);
const requests = (page: Page) => page.evaluate(() => (window as unknown as {mediaGridRequests: Request[]}).mediaGridRequests ?? []);
const release = (page: Page) => page.evaluate(() => {
  const hooks = window as unknown as {mediaGridRelease?: () => void};
  const answer = hooks.mediaGridRelease;
  hooks.mediaGridRelease = undefined;
  answer?.();
});
/** Answers are held until the test releases them. */
const hold = (page: Page) => page.addInitScript(() => { (window as unknown as {mediaGridHold: boolean}).mediaGridHold = true; });
/** Where the tile at a place in the list stands on screen. */
const place = (page: Page, at: number) => byPlace(page, at).evaluate(element => {
  const box = element.getBoundingClientRect();
  return {top: box.top, left: box.left};
});
/** The first tile whose bottom is below the window's top, its place in the list and its top on screen. */
const topTile = (page: Page) => page.evaluate(() => {
  const tiles = [...document.querySelectorAll<HTMLElement>('.media-tile[aria-posinset]')]
    .map(element => ({place: Number(element.getAttribute('aria-posinset')), box: element.getBoundingClientRect()}))
    .filter(tile => tile.box.bottom > 0 && tile.box.top < innerHeight)
    .sort((a, b) => a.box.top - b.box.top || a.box.left - b.box.left);
  return tiles[0] ? {place: tiles[0].place, top: tiles[0].box.top, left: tiles[0].box.left} : null;
});

test('starts at the place it returns to: the photo where it was, the stretch above as stand-ins under its days', async ({page}) => {
  const errors = collectErrors(page);
  await hold(page);
  await page.goto('/render/media-grid/rows-middle');
  const photo = byPlace(page, START + 1);
  await expect(photo).toBeVisible();
  // Where the app put it (200 px from the window's top), its place in the whole list for screen readers.
  expect(Math.abs((await photo.boundingBox())!.y - 200)).toBeLessThanOrEqual(1);
  await expect(photo).toHaveAttribute('aria-setsize', '10000');
  await expect(photo.locator('.media-tile__link')).toBeFocused();
  // The scrollbar covers all 10,000 from the first paint: the stand-ins above take their room.
  const scroll = await page.evaluate(() => ({y: scrollY, height: document.documentElement.scrollHeight}));
  expect(scroll.y).toBeGreaterThan(50_000);
  expect(scroll.height).toBeGreaterThan(scroll.y + 2_000);
  // The days above have their headings, with stand-ins (not links) under them.
  const day = Math.floor(START / 37);
  await expect(page.locator('.media-grid__heading-title').filter({hasText: /\(\d+\)$/})).not.toHaveCount(0);
  const headings = await page.locator('.media-grid__section').count();
  expect(headings).toBeGreaterThanOrEqual(day);
  await expect(page.locator('.media-grid__block[aria-hidden="true"] .media-tile[data-loading]').first()).toBeAttached();
  // The photo's own day is one section, from the stand-ins before it to the photos after.
  const ownDay = page.locator('.media-grid__section').filter({has: photo});
  await expect(ownDay).toHaveCount(1);
  await expect(ownDay.locator('.media-tile[data-loading]').first()).toBeAttached();
  // Its arrows stay within what is loaded: the stretch before it isn't.
  await page.keyboard.press('ArrowLeft');
  await expect(photo.locator('.media-tile__link')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(byPlace(page, START + 2).locator('.media-tile__link')).toBeFocused();
  expect(errors).toEqual([]);
});

test('pages that arrive above the window move nothing: the tile at its top stays within 1 px', async ({page}) => {
  await hold(page);
  await page.goto('/render/media-grid/rows-middle');
  await expect(byPlace(page, START + 1)).toBeVisible();
  // The window a little above the photo, in the stand-ins, so pages arrive above and inside it.
  await page.mouse.wheel(0, -150);
  await page.waitForTimeout(200);
  for (let round = 1; round <= 3; round++) {
    // Up toward the stretch until the grid asks for its next page (held back meanwhile).
    for (let step = 0; (await requests(page)).filter(r => r.side === 'before').length < round; step++) {
      expect(step, 'the grid asks for the page above').toBeLessThan(20);
      await page.mouse.wheel(0, -600);
      await page.waitForTimeout(150);
    }
    const before = await topTile(page);
    expect(before).not.toBeNull();
    await release(page);
    // The page is there (its photos replaced the stand-ins above): the tile that was at the top is where it was.
    await expect(byPlace(page, START + 1 - 100 * round)).toBeAttached({attached: true}).catch(() => {});
    await page.waitForTimeout(100);
    const after = await place(page, before!.place);
    expect(Math.abs(after.top - before!.top), `round ${round}`).toBeLessThanOrEqual(1);
    expect(Math.abs(after.left - before!.left)).toBeLessThanOrEqual(1);
  }
});

test('the window coming near a stretch asks for it once, not on every frame', async ({page}) => {
  await hold(page);
  await page.goto('/render/media-grid/rows-middle');
  await expect(byPlace(page, START + 1)).toBeVisible();
  await expect.poll(async () => (await requests(page)).length).toBeGreaterThan(0);
  // Scrolling to and fro near it, the answer held back: still one request for each end.
  for (let step = 0; step < 12; step++) {
    await page.mouse.wheel(0, step % 2 ? 300 : -300);
    await page.waitForTimeout(60);
  }
  const asked = await requests(page);
  const keys = asked.map(r => r.side === 'inside' ? `inside:${r.position}` : `${r.side}:${r.index}`);
  expect(new Set(keys).size).toBe(keys.length);
  expect(asked.filter(r => r.side === 'before')).toEqual([{side: 'before', index: 0}]);
  // Once it is answered, the next page is asked for (from the new first item) as the window comes near it.
  await release(page);
  for (let step = 0; (await requests(page)).filter(r => r.side === 'before').length < 2; step++) {
    expect(step).toBeLessThan(20);
    await page.mouse.wheel(0, -500);
    await page.waitForTimeout(150);
  }
  const second = (await requests(page)).filter(r => r.side === 'before');
  expect(second).toHaveLength(2);
});

test('the top is a run of its own, a jump into the middle starts one there, and every tile keeps its place in the list', async ({page}, testInfo) => {
  test.setTimeout(60_000);
  const errors = collectErrors(page);
  await page.goto('/render/media-grid/rows-middle');
  await expect(byPlace(page, START + 1)).toBeVisible();
  // To the top in one jump, as with the scrollbar: photo 1 comes, with nothing loaded between it and the run below.
  await page.evaluate(() => scrollTo(0, 0));
  await expect(byPlace(page, 1)).toBeVisible();
  expect((await requests(page)).some(r => r.side === 'after' && r.index === -1)).toBe(true);
  await expect(byPlace(page, 1)).toHaveAttribute('aria-setsize', '10000');
  // Into the middle, far from both runs: the grid says where, and the run that starts there has its places.
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight / 2));
  await expect.poll(async () => (await requests(page)).some(r => r.side === 'inside')).toBe(true);
  const inside = (await requests(page)).find(r => r.side === 'inside') as {position: number};
  expect(inside.position).toBeGreaterThan(3000);
  expect(inside.position).toBeLessThan(7000);
  await expect(byPlace(page, inside.position + 1)).toBeAttached();
  const shown = await topTile(page);
  expect(Math.abs(shown!.place - inside.position)).toBeLessThan(isMobile(testInfo) ? 40 : 120);
  expect(errors).toEqual([]);
});

/** Every tile in the window: its place in the list and where it stands. */
const shownTiles = async (page: Page) => new Map(await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.media-tile[aria-posinset]')]
  .map(element => ({place: Number(element.getAttribute('aria-posinset')), box: element.getBoundingClientRect()}))
  .filter(tile => tile.box.bottom > 0 && tile.box.top < innerHeight)
  .map(tile => [tile.place, {top: tile.box.top, left: tile.box.left}] as const)));
const runs = (page: Page) => page.evaluate(() => (window as unknown as {mediaGridRuns: {from: number; to: number}[]}).mediaGridRuns);

/** Answers what the grid asked for, and checks that no tile in the window moved. */
async function releaseAndCheck(page: Page, label: string) {
  const before = await shownTiles(page);
  await release(page);
  await page.waitForTimeout(120);
  const after = await shownTiles(page);
  for (const [place, box] of before) {
    const now = after.get(place);
    expect(now, `${label}: tile ${place} stays drawn`).toBeDefined();
    expect(Math.abs(now!.top - box.top), `${label}: tile ${place} top`).toBeLessThanOrEqual(1);
    expect(Math.abs(now!.left - box.left), `${label}: tile ${place} left`).toBeLessThanOrEqual(1);
  }
}

for (const direction of ['down', 'up'] as const)
  test(`runs that meet move nothing in the window (walking ${direction} into the other run)`, async ({page}) => {
    test.setTimeout(120_000);
    await hold(page);
    await page.goto('/render/media-grid/rows-middle');
    await expect(byPlace(page, START + 1)).toBeVisible();
    await releaseAndCheck(page, 'first pages');
    const height = await page.evaluate(() => innerHeight);
    const returned = await page.evaluate(() => scrollY);
    // A jump far above the photo, as with the scrollbar: a run starts there.
    await page.evaluate(y => scrollTo(0, y), returned - 12 * height);
    await expect.poll(async () => (await requests(page)).some(r => r.side === 'inside')).toBe(true);
    await releaseAndCheck(page, 'inside');
    expect((await runs(page)).length).toBeGreaterThanOrEqual(2);
    // Down from there, or back at the photo and up, a screen a step, every page answered, until the two runs are one.
    if (direction === 'up') {
      await page.evaluate(y => scrollTo(0, y), returned);
      await releaseAndCheck(page, 'back');
    }
    const started = (await runs(page)).find(run => run.from !== 0 && !(run.from <= START && run.to > START))!;
    for (let step = 0; ; step++) {
      if ((await runs(page)).some(run => run.from <= started.from && run.to > START)) break;
      expect(step, 'the runs meet').toBeLessThan(40);
      await page.mouse.wheel(0, direction === 'down' ? height * 0.8 : -height * 0.8);
      await page.waitForTimeout(200);
      await releaseAndCheck(page, `step ${step}`);
    }
  });
