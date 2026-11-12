import {expect, test, type Page} from '@playwright/test';
import {collectErrors, isMobile, presetTweaks} from './helpers';

const viewer = (page: Page) => page.getByRole('dialog');
const preview = (page: Page) => page.locator('.media-viewer__image--preview');
const luminance = (color: string) => {
  const [r, g, b] = color.match(/[\d.]+/g)!.map(Number);
  return (r + g + b) / 3;
};

test('a modal dialog with the title, position and close; focus returns on close', async ({page}) => {
  const errors = collectErrors(page);
  await page.goto('/render/media-viewer');
  await expect(viewer(page)).toBeVisible();
  await expect(viewer(page)).toHaveAccessibleName('IMG_4013.JPG');
  await expect(page.locator('.media-viewer__heading')).toHaveText('IMG_4013.JPG · 14 / 1,204');
  expect(await page.evaluate(() => document.querySelector('dialog')!.matches(':modal'))).toBe(true);
  await page.getByRole('button', {name: 'Close'}).click();
  await expect(viewer(page)).toHaveCount(0);

  const opener = page.getByRole('button', {name: 'Open the viewer'});
  await opener.click();
  await expect(viewer(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(viewer(page)).toHaveCount(0);
  await expect(opener).toBeFocused();
  expect(errors).toEqual([]);
});

test('the image fits the stage without cropping, landscape and portrait', async ({page}) => {
  await page.goto('/render/media-viewer');
  for (const step of [0, 1]) {
    if (step) {
      // Find a portrait photo by moving on until one shows.
      for (let tries = 0; tries < 9; tries++) {
        const ratio = await page.locator('.media-viewer__photo').evaluate(element => element.clientWidth / element.clientHeight);
        if (ratio < 1) break;
        await page.keyboard.press('ArrowRight');
      }
    }
    const [photo, stage, natural] = await page.evaluate(() => {
      const box = (selector: string) => document.querySelector(selector)!.getBoundingClientRect().toJSON() as DOMRect;
      const image = document.querySelector<HTMLImageElement>('.media-viewer__image--preview')!;
      return [box('.media-viewer__photo'), box('.media-viewer__stage'), image.naturalWidth / image.naturalHeight];
    });
    expect(photo.left).toBeGreaterThanOrEqual(stage.left - 0.5);
    expect(photo.right).toBeLessThanOrEqual(stage.right + 0.5);
    expect(photo.top).toBeGreaterThanOrEqual(stage.top - 0.5);
    expect(photo.bottom).toBeLessThanOrEqual(stage.bottom + 0.5);
    const touchesSides = Math.abs(photo.width - stage.width) < 1 || Math.abs(photo.height - stage.height) < 1;
    expect(touchesSides, 'as large as the stage allows').toBe(true);
    expect(photo.width / photo.height).toBeCloseTo(natural, 1);
  }
});

test('the thumbnail shows until the preview loads, and neighbours are preloaded', async ({page}) => {
  const requested: string[] = [];
  page.on('request', request => requested.push(request.url()));
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route(/size=preview/, async route => {
    if (route.request().frame() === page.mainFrame() && route.request().resourceType() === 'image' && !route.request().isNavigationRequest()) await held;
    await route.continue();
  });
  await page.goto('/render/media-viewer');
  await expect(page.locator('.media-viewer__image--thumb')).toBeVisible();
  await expect(preview(page)).toHaveCSS('opacity', '0');
  release();
  await expect(preview(page)).toHaveAttribute('data-loaded', 'true');
  await expect(preview(page)).toHaveCSS('opacity', '1');
  await expect(page.locator('.media-viewer__image--thumb')).toHaveCount(0);
  // Photos 13, 14 and 15 are three different scenes.
  expect(new Set(requested.filter(url => url.includes('size=preview'))).size, 'this preview and both neighbours').toBe(3);
});

test('previous and next: buttons and arrow keys, announced, hidden at the ends', async ({page}) => {
  await page.goto('/render/media-viewer');
  await page.getByRole('button', {name: 'Next'}).click();
  await expect(page.locator('.media-viewer__position')).toHaveText(' · 15 / 1,204');
  await expect(viewer(page).getByRole('status')).toHaveText(/, 15 of 1,204$/);
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('.media-viewer__position')).toHaveText(' · 13 / 1,204');
  for (let index = 0; index < 12; index++) await page.keyboard.press('ArrowLeft');
  await expect(page.locator('.media-viewer__position')).toHaveText(' · 1 / 1,204');
  await expect(page.getByRole('button', {name: 'Previous'})).toHaveCount(0);
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('.media-viewer__position')).toHaveText(' · 1 / 1,204');
});

test('a click or + zooms into the larger image; drag and arrows pan; Escape returns', async ({page}, testInfo) => {
  test.skip(isMobile(testInfo), 'mouse and keyboard');
  const fullRequests: string[] = [];
  page.on('request', request => { if (request.url().includes('size=full')) fullRequests.push(request.url()); });
  await page.goto('/render/media-viewer');
  await expect(preview(page)).toHaveAttribute('data-loaded', 'true');
  const zoomButton = page.getByRole('button', {name: 'Zoom in'});
  await page.locator('.media-viewer__photo').click();
  const zoomed = page.locator('.media-viewer__zoomed');
  await expect(zoomed).toBeVisible();
  await expect(page.getByRole('button', {name: 'Fit to screen'})).toHaveAttribute('aria-pressed', 'true');
  expect(fullRequests.length).toBeGreaterThan(0);
  const size = await zoomed.evaluate(element => [element.clientWidth, element.clientHeight]);
  expect(size).toEqual([3000, 2000]);

  const position = () => zoomed.evaluate(element => new DOMMatrix(getComputedStyle(element).transform).m41);
  const before = await position();
  await page.keyboard.press('ArrowLeft');
  expect(await position()).toBeGreaterThan(before);
  await expect(page.locator('.media-viewer__position'), 'arrows pan while zoomed').toHaveText(' · 14 / 1,204');
  const box = (await page.locator('.media-viewer__stage').boundingBox())!;
  const dragged = await position();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 200, box.y + box.height / 2, {steps: 5});
  await page.mouse.up();
  expect(await position()).toBeLessThan(dragged);
  await expect(zoomed, 'a drag pans and does not return to fit').toBeVisible();

  await page.keyboard.press('Escape');
  await expect(zoomed).toHaveCount(0);
  await expect(viewer(page), 'the first Escape only returns to fit').toBeVisible();
  await page.keyboard.press('+');
  await expect(zoomed).toBeVisible();
  await page.locator('.media-viewer__stage').click();
  await expect(zoomed).toHaveCount(0);
  await expect(zoomButton).toBeVisible();
});

test('without a larger image there is no zoom', async ({page}) => {
  await presetTweaks(page, 'media-viewer', {noZoom: true});
  await page.goto('/render/media-viewer');
  await expect(page.getByRole('button', {name: 'Zoom in'})).toHaveCount(0);
  await page.locator('.media-viewer__photo').click();
  await page.keyboard.press('+');
  await expect(page.locator('.media-viewer__zoomed')).toHaveCount(0);
});

test('the panel is 272px beside the image on desktop and a sheet under it on phones; I toggles it', async ({page}, testInfo) => {
  await page.goto('/render/media-viewer');
  const panel = page.getByRole('complementary', {name: 'Details'});
  await expect(panel).toBeVisible();
  const box = (await panel.boundingBox())!;
  const stage = (await page.locator('.media-viewer__stage').boundingBox())!;
  if (isMobile(testInfo)) {
    expect(box.y).toBeGreaterThan(stage.y + stage.height - 1);
    expect(box.width).toBe(390);
  } else {
    expect(box.width).toBe(272);
    expect(box.x).toBeGreaterThan(stage.x + stage.width);
  }
  await page.keyboard.press('i');
  await expect(panel).toBeHidden();
  await expect(page.getByRole('button', {name: 'Details'})).toHaveAttribute('aria-expanded', 'false');
  const wider = (await page.locator('.media-viewer__stage').boundingBox())!;
  if (!isMobile(testInfo)) expect(wider.width).toBeGreaterThan(stage.width);
  await page.keyboard.press('I');
  await expect(panel).toBeVisible();
});

test('Tab stays inside the viewer', async ({page}) => {
  await page.goto('/render/media-viewer');
  const inside = () => page.evaluate(() => document.querySelector('dialog')!.contains(document.activeElement));
  for (let index = 0; index < 8; index++) {
    await page.keyboard.press('Tab');
    expect(await inside()).toBe(true);
  }
  for (let index = 0; index < 8; index++) {
    await page.keyboard.press('Shift+Tab');
    expect(await inside()).toBe(true);
  }
});

test('a swipe moves on touch screens', async ({page, context}, testInfo) => {
  test.skip(!isMobile(testInfo), 'touch only');
  await page.goto('/render/media-viewer');
  const box = (await page.locator('.media-viewer__stage').boundingBox())!;
  const session = await context.newCDPSession(page);
  const swipe = async (from: number, to: number) => {
    const y = box.y + box.height / 2;
    await session.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: from, y}]});
    for (let step = 1; step <= 6; step++) await session.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: from + (to - from) * step / 6, y}]});
    await session.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
  };
  await swipe(box.x + box.width * 0.8, box.x + box.width * 0.2);
  await expect(page.locator('.media-viewer__position')).toHaveText(' · 15 / 1,204');
  await swipe(box.x + box.width * 0.2, box.x + box.width * 0.8);
  await expect(page.locator('.media-viewer__position')).toHaveText(' · 14 / 1,204');
});

test('the canvas is dark in light mode and dark mode alike, and the page behind stays put', async ({page}) => {
  for (const darkMode of [false, true]) {
    await presetTweaks(page, 'media-viewer', {}, {darkMode});
    await page.goto('/render/media-viewer');
    const background = await viewer(page).evaluate(element => getComputedStyle(element).backgroundColor);
    expect(luminance(background)).toBeLessThan(50);
    const text = await page.locator('.media-viewer__title').evaluate(element => getComputedStyle(element).color);
    expect(luminance(text)).toBeGreaterThan(200);
    await expect(page.locator('html')).toHaveCSS('overflow', 'hidden');
  }
});

test('from the grid: a route the app owns; moving replaces the address and one Back returns to the tile', async ({page}) => {
  await page.goto('/render/media-grid');
  await expect(page.locator('.media-tile:not([data-loading])').first()).toBeVisible();
  const start = await page.evaluate(() => history.length);
  await page.locator('.media-tile[data-index="2"] .media-tile__link').click();
  await expect(viewer(page)).toBeVisible();
  await expect(page).toHaveURL(/#photo-2$/);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(page).toHaveURL(/#photo-4$/);
  expect(await page.evaluate(() => history.length)).toBe(start + 1);
  await page.keyboard.press('Escape');
  await expect(viewer(page)).toHaveCount(0);
  await expect(page).not.toHaveURL(/#photo/);
  await expect(page.locator('.media-tile[data-index="4"] .media-tile__link'), 'focus returns to the photo shown last').toBeFocused();
});
