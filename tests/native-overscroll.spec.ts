import {expect, test, type Page} from '@playwright/test';
import {isMobile, scrollY} from './helpers';

// Native rubber-banding is compositor-only: it never changes scrollTop or layout,
// so the only way to observe it is in pixels. A magenta overscroll background is
// exposed when the page visibly bounces. This needs real macOS scrolling, which
// only headed Chromium provides.
test.skip(process.platform !== 'darwin', 'Native rubber-banding needs macOS');
test.use({headless: false});
// One window per viewport at a time keeps the mid-gesture captures reliable.
test.describe.configure({mode: 'serial'});

const MAGENTA = '255,0,255';

async function pixel(page: Page, screenshot: Buffer, x: number, y: number) {
  return page.evaluate(async ({png, x, y}) => {
    const image = new Image();
    image.src = `data:image/png;base64,${png}`;
    await image.decode();
    const canvas = Object.assign(document.createElement('canvas'), {width: image.width, height: image.height});
    const context = canvas.getContext('2d')!;
    context.drawImage(image, 0, 0);
    return [...context.getImageData(x, y, 1, 1).data].slice(0, 3).join(',');
  }, {png: screenshot.toString('base64'), x, y});
}

/** Scrolls with explicit gesture phases and captures the screen mid-gesture. */
async function screenshotDuringGesture(page: Page, yDistance: number) {
  const session = await page.context().newCDPSession(page);
  const viewport = page.viewportSize()!;
  const gesture = session.send('Input.synthesizeScrollGesture', {
    x: viewport.width / 2, y: 300, yDistance, speed: 1000, gestureSourceType: 'mouse', preventFling: true,
  });
  await page.waitForTimeout(600);
  const screenshot = await page.screenshot();
  await gesture;
  return screenshot;
}

const showCanvas = (page: Page) => page.locator('html').evaluate(html => html.style.setProperty('--page-overscroll-background', 'rgb(255, 0, 255)'));

for (const path of ['long-paragraphs', 'long-table']) {
  for (const edge of ['top', 'bottom'] as const) {
    test(`${path}: the ${edge} edge bounces natively and settles`, async ({page}, testInfo) => {
      await page.goto(`/render/sidebar/${path}`);
      await expect(page.locator('main h2').first()).toBeVisible();
      await page.evaluate(edge => window.scrollTo({top: edge === 'top' ? 0 : document.documentElement.scrollHeight, behavior: 'instant'}), edge);
      const initial = await scrollY(page);
      await showCanvas(page);

      const viewport = page.viewportSize()!;
      const headerHeight = isMobile(testInfo) ? Math.ceil((await page.locator('.sidebar-layout__header').boundingBox())!.height) : 64;
      const x = isMobile(testInfo) ? 12 : 280;
      const y = edge === 'bottom' ? viewport.height - 4 : headerHeight + 4;

      const atRest = await page.screenshot();
      expect(await pixel(page, atRest, x, y), 'content covers the canvas at rest').not.toBe(MAGENTA);
      const held = await screenshotDuringGesture(page, edge === 'top' ? 1500 : -1500);
      await testInfo.attach('mid-bounce', {body: held, contentType: 'image/png'});
      expect(await pixel(page, held, x, y), 'the bounce exposes the canvas').toBe(MAGENTA);
      expect(await pixel(page, held, 4, 4), 'fixed navigation does not move').toBe(await pixel(page, atRest, 4, 4));

      await page.waitForTimeout(900);
      expect(await pixel(page, await page.screenshot(), x, y), 'the bounce settles').not.toBe(MAGENTA);
      expect(await scrollY(page)).toBe(initial);
    });
  }
}

test('a page that fits does not bounce', async ({page}, testInfo) => {
  await page.goto('/render/sidebar/integrations');
  await expect(page.locator('html')).toHaveCSS('overscroll-behavior-y', 'none');
  await showCanvas(page);
  const x = isMobile(testInfo) ? 12 : 280;
  const held = await screenshotDuringGesture(page, 1500);
  expect(await pixel(page, held, x, 68)).not.toBe(MAGENTA);
  expect(await scrollY(page)).toBe(0);
});

/** Captures the list mid-gesture at its top edge and reports whether its content moved. */
async function listBouncesAtTop(page: Page, list: import('@playwright/test').Locator) {
  const box = (await list.boundingBox())!;
  const clip = {x: box.x, y: box.y, width: box.width, height: Math.min(box.height, 200)};
  // A real pointer is over the list while scrolling it; the synthetic gesture does not move it.
  await page.mouse.move(box.x + box.width / 2, box.y + 150);
  const atRest = await page.screenshot({clip});
  const session = await page.context().newCDPSession(page);
  const gesture = session.send('Input.synthesizeScrollGesture', {
    x: box.x + box.width / 2, y: box.y + 150, yDistance: 1500, speed: 1000, gestureSourceType: 'mouse', preventFling: true,
  });
  await page.waitForTimeout(500);
  const held = await page.screenshot({clip});
  await gesture;
  await page.waitForTimeout(900);
  const settled = await page.screenshot({clip});
  return {moved: !atRest.equals(held), settled: atRest.equals(settled)};
}

for (const extraItems of [true, false]) {
  test(`the navigation list bounces exactly when it overflows (${extraItems ? '100 extra items' : 'default items'})`, async ({page}, testInfo) => {
    await page.addInitScript(extra => localStorage.setItem('da-ui-catalogue:tweaks', JSON.stringify({sidebar: {extraNavigation: extra}})), extraItems);
    await page.goto('/render/sidebar/profile');
    await expect(page.getByRole('heading', {name: 'Profile', exact: true})).toBeVisible();
    if (isMobile(testInfo)) {
      await page.getByRole('button', {name: 'Open settings navigation'}).click();
      await page.waitForTimeout(600);
    }
    const list = page.locator(isMobile(testInfo) ? '.mobile-navigation__sections' : '.sidebar-layout__navigation > div:last-child');
    const overflows = await list.evaluate(element => element.scrollHeight > element.clientHeight);
    if (extraItems) expect(overflows).toBe(true);
    const {moved, settled} = await listBouncesAtTop(page, list);
    expect(moved, overflows ? 'an overflowing list bounces' : 'a list that fits stays still').toBe(overflows);
    expect(settled, 'the list settles where it started').toBe(true);
    expect(await list.evaluate(element => element.scrollTop)).toBe(0);
    expect(await scrollY(page), 'the page never moves').toBe(0);
  });
}
