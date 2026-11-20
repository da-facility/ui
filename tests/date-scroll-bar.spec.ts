import {expect, test, type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {collectErrors, isMobile, presetTweaks} from './helpers';

/**
 * `DateScrollBar` beside `MediaGrid` (`/media-grid/rows-dates`: 10,000 photos on 271 days of 37 from 1 January 2025,
 * loaded from photo 9,501 on): the day under the pointer named while it is dragged, a jump on release that brings the
 * day's section to the window's top through `scrollToSection`, the keyboard, and the phone's grip.
 */

const bar = (page: Page) => page.locator('.date-scroll-bar__track');
const bubble = (page: Page) => page.locator('.date-scroll-bar__bubble');
const runs = (page: Page) => page.evaluate(() => (window as unknown as {mediaGridRuns: {from: number; to: number}[]}).mediaGridRuns);
/** The section heading nearest the window's top, by its title. */
const topHeading = (page: Page) => page.evaluate(() => {
  const headings = [...document.querySelectorAll<HTMLElement>('.media-grid__section')]
    .map(section => ({title: section.querySelector('.media-grid__heading-title')?.textContent ?? '', top: section.getBoundingClientRect().top}))
    .filter(section => section.top >= -2 && section.top < innerHeight);
  return headings[0] ?? null;
});

test('a drag names the day under the pointer and, let go, loads that day and brings its heading to the top', async ({page}) => {
  test.skip(isMobile(test.info()), 'The phone has its grip, below');
  const errors = collectErrors(page);
  await page.goto('/render/media-grid/rows-dates');
  await expect(page.locator('.media-tile[aria-posinset="9501"]')).toBeVisible();
  const box = (await bar(page).boundingBox())!;
  // Year marks are too sparse here (nine months): months, each named once there is room.
  await expect(page.locator('.date-scroll-bar__mark').first()).toHaveText(/Jan.*2025/);
  await page.mouse.move(box.x + box.width / 2, box.y + 4);
  await page.mouse.down();
  // Halfway down: day 135 of 271, 15 May 2025.
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.5, {steps: 8});
  await expect(bubble(page)).toHaveText(/May.*2025/);
  const named = await bubble(page).textContent();
  await page.mouse.up();
  // One run more, starting at the day's first photo.
  await expect.poll(async () => (await runs(page)).length).toBe(2);
  const run = (await runs(page))[0]!;
  expect(run.from % 37).toBe(0);
  const day = run.from / 37;
  expect(Math.abs(day - 135)).toBeLessThanOrEqual(1);
  expect(named).toContain(String(new Date(Date.UTC(2025, 0, 1 + day)).getUTCDate()));
  // Its first photo at the top of the window, under its heading.
  const first = page.locator(`.media-tile[aria-posinset="${run.from + 1}"]`);
  await expect(first).toBeVisible();
  const heading = await topHeading(page);
  expect(heading).not.toBeNull();
  expect(Math.abs(heading!.top)).toBeLessThanOrEqual(2);
  // The window stays there as the run's pages arrive around it.
  const before = (await first.boundingBox())!.y;
  await page.waitForTimeout(800);
  expect(Math.abs((await first.boundingBox())!.y - before)).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
});

test('a click jumps too, the keyboard moves a day, a month, to the ends, and the slider says the day', async ({page}) => {
  test.skip(isMobile(test.info()), 'The phone has no track');
  await page.goto('/render/media-grid/rows-dates');
  await expect(page.locator('.media-tile[aria-posinset="9501"]')).toBeVisible();
  const box = (await bar(page).boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.25);
  await expect.poll(async () => (await runs(page)).length).toBe(2);
  await bar(page).focus();
  await page.keyboard.press('Home');
  await expect(bar(page)).toHaveAttribute('aria-valuenow', '0');
  await expect(bar(page)).toHaveAttribute('aria-valuetext', /January 1, 2025/);
  await page.keyboard.press('ArrowDown');
  await expect(bar(page)).toHaveAttribute('aria-valuetext', /January 2, 2025/);
  await page.keyboard.press('PageDown');
  await expect(bar(page)).toHaveAttribute('aria-valuetext', /February 1, 2025/);
  await page.keyboard.press('End');
  await expect(bar(page)).toHaveAttribute('aria-valuenow', '270');
  // The top run is loaded, with its first photo where the window is.
  await expect(page.locator('.media-tile[aria-posinset="9991"]')).toBeVisible();
});

test('at rest a rail and a grip to take, the hand over them, colour only when pointed at, the grip following the photos\' part', async ({page}) => {
  test.skip(isMobile(test.info()), 'The phone has its grip, below');
  await page.goto('/render/media-grid/rows-dates');
  await expect(page.locator('.media-tile[aria-posinset="9501"]')).toBeVisible();
  const track = (await bar(page).boundingBox())!;
  const rail = (await page.locator('.date-scroll-bar__rail').boundingBox())!;
  expect(rail.width).toBeGreaterThanOrEqual(6);
  expect(rail.height).toBeGreaterThan(track.height - 2);
  const grip = page.locator('.date-scroll-bar__grip');
  const g = (await grip.boundingBox())!;
  expect(g.width).toBeGreaterThanOrEqual(16);
  expect(g.height).toBeGreaterThanOrEqual(30);
  const style = (selector: string, property: string) => page.locator(selector).evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);
  expect(await style('.date-scroll-bar__track', 'cursor')).toBe('pointer');
  expect(await style('.date-scroll-bar__thumb', 'cursor')).toBe('grab');
  const accent = await page.evaluate(() => {
    const probe = document.createElement('span');
    probe.style.color = 'var(--color-accent)';
    document.body.append(probe);
    const colour = getComputedStyle(probe).color;
    probe.remove();
    return colour;
  });
  // Quiet at rest, the accent when pointed at.
  await page.mouse.move(10, 10);
  expect(await style('.date-scroll-bar__grip', 'border-top-color')).not.toBe(accent);
  await page.mouse.move(track.x + track.width - 12, track.y + track.height * 0.3);
  await expect.poll(() => style('.date-scroll-bar__grip', 'border-top-color')).toBe(accent);
  await page.mouse.move(10, 10);
  // The page's top: the grip at the first day, whatever stands above the photos. The photos' end in view: the last.
  const gripCentre = async () => {
    const b = (await grip.boundingBox())!;
    return b.y + b.height / 2;
  };
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(gripCentre).toBeLessThan(track.y + 20);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(gripCentre).toBeGreaterThan(track.y + track.height - 20);
});

test('on a phone a grip at the right edge, a thumb\'s size, drags along the whole height and jumps on release', async ({page}) => {
  test.skip(!isMobile(test.info()), 'The phone\'s form');
  await page.goto('/render/media-grid/rows-dates');
  await expect(page.locator('.media-tile[aria-posinset="9501"]')).toBeVisible();
  await expect(page.locator('.date-scroll-bar__mark').first()).toBeHidden();
  const grip = page.locator('.date-scroll-bar__thumb');
  const g = (await grip.boundingBox())!;
  expect(g.width).toBeGreaterThanOrEqual(44);
  expect(g.height).toBeGreaterThanOrEqual(44);
  expect(g.x + g.width).toBeGreaterThan(385);
  const track = (await bar(page).boundingBox())!;
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
  await page.mouse.down();
  await page.mouse.move(g.x + g.width / 2, track.y + track.height * 0.1, {steps: 6});
  await expect(bubble(page)).toBeVisible();
  // The grip follows the finger while it drags.
  expect(Math.abs((await grip.boundingBox())!.y + 24 - (track.y + track.height * 0.1))).toBeLessThan(6);
  await page.mouse.up();
  await expect.poll(async () => (await runs(page)).length).toBe(2);
  // The photos under the track still take taps: only the grip is the bar's.
  const tileUnder = await page.evaluate(() => document.elementFromPoint(370, 400)?.closest('.date-scroll-bar') === null);
  expect(tileUnder).toBe(true);
});

test('has no accessibility violations, light and dark, at rest and while pointed at', async ({page}) => {
  for (const darkMode of [false, true]) {
    await presetTweaks(page, 'media-grid', {}, {darkMode});
    await page.goto('/render/media-grid/rows-dates');
    await expect(page.locator('.media-tile[aria-posinset="9501"]')).toBeVisible();
    if (!isMobile(test.info())) {
      const box = (await bar(page).boundingBox())!;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.6);
      await expect(bubble(page)).toBeVisible();
    }
    const results = await new AxeBuilder({page}).include('.date-scroll-bar').analyze();
    expect(results.violations).toEqual([]);
  }
});
