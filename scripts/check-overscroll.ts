import {chromium, type Page} from 'playwright';

const base = process.env.UI_TEST_URL ?? 'http://localhost:5173';
const nativeMac = process.platform === 'darwin';
const browser = await chromium.launch({headless: !nativeMac});
function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }

async function pixel(page: Page, png: Buffer, x: number, y: number) {
  return page.evaluate(async ({png, x, y}) => {
    const image = new Image();
    image.src = `data:image/png;base64,${png}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(image, 0, 0);
    return [...ctx.getImageData(x, y, 1, 1).data].slice(0, 3).join(',');
  }, {png: png.toString('base64'), x, y});
}

try {
  for (const [name, viewport] of Object.entries({desktop: {width: 1920, height: 1080}, mobile: {width: 390, height: 844}})) {
    const context = await browser.newContext({viewport, deviceScaleFactor: 1});
    const page = await context.newPage();
    const session = await context.newCDPSession(page);
    for (const route of ['long-paragraphs', 'long-table']) {
      await page.goto(`${base}/sidebar/${route}`);
      await page.getByRole('heading', {name: route === 'long-table' ? 'Long table' : 'Long paragraphs', exact: true}).waitFor();
      assert(await page.evaluate(() => document.documentElement.scrollHeight > innerHeight * 5), 'Document must own the long scroll range');
      assert(await page.locator('.settings-desktop-panel,.settings-content-pane').evaluate(el => getComputedStyle(el).overflowY === 'visible'), 'Main must not create a nested scroller');
      const fixed = page.locator(name === 'desktop' ? '.settings-sidebar-rail' : '.settings-mobile-header');
      assert(await fixed.evaluate(el => getComputedStyle(el).position === 'fixed'), 'Navigation must be viewport-fixed');
      for (const edge of ['top', 'bottom']) {
        await page.evaluate(edge => window.scrollTo({top: edge === 'top' ? 0 : document.documentElement.scrollHeight, behavior: 'instant'}), edge);
        const initialScroll = await page.evaluate(() => scrollY);
        assert(await page.locator('main').evaluate((el, edge) => el.dispatchEvent(new WheelEvent('wheel', {deltaY: edge === 'top' ? -180 : 180, bubbles: true, cancelable: true})), edge), 'Boundary wheel input must remain native');
        assert(await fixed.evaluate(el => el.getBoundingClientRect().top === 0), 'Navigation must stay at the viewport edge');
        if (nativeMac) {
          // A contrasting canvas makes the compositor's boundary displacement
          // measurable in pixels. It changes no geometry or input handling.
          await page.locator('html').evaluate(el => el.style.setProperty('--settings-scroll-background', 'rgb(255, 0, 255)'));
          const x = name === 'desktop' ? 280 : 12;
          const y = edge === 'bottom' ? viewport.height - 4 : name === 'desktop' ? 4 : Math.ceil((await fixed.boundingBox())!.height) + 4;
          const before = await page.screenshot();
          assert(await pixel(page, before, x, y) !== '255,0,255', 'Canvas should be covered at rest');
          // Unlike mouse.wheel, this sends explicit began/changed/ended phases.
          // Capture mid-gesture, because native stretch is compositor-only and
          // does not change DOM scrollTop or getBoundingClientRect values.
          const gesture = session.send('Input.synthesizeScrollGesture', {x: name === 'desktop' ? 1000 : 200, y: 300, yDistance: edge === 'top' ? 1500 : -1500, speed: 1000, gestureSourceType: 'mouse', preventFling: true});
          await page.waitForTimeout(600);
          const held = await page.screenshot({path: `artifacts/native-bounce-${route}-${edge}-${name}.png`});
          await gesture;
          assert(await pixel(page, held, x, y) === '255,0,255', `${route} ${edge}: native bounce must visibly expose the canvas`);
          assert(await pixel(page, before, 4, 4) === await pixel(page, held, 4, 4), 'Fixed navigation must continue covering the viewport corner');
          await page.waitForTimeout(900);
          assert(await pixel(page, await page.screenshot(), x, y) !== '255,0,255', 'Native bounce must settle back over the canvas');
          assert(await page.evaluate(() => scrollY) === initialScroll, 'Bounce must settle at the original boundary');
          await page.locator('html').evaluate(el => el.style.removeProperty('--settings-scroll-background'));
        }
      }
    }
    await page.goto(`${base}/login-split`);
    await page.getByRole('heading', {name: 'Welcome back'}).waitFor();
    assert(await page.evaluate(() => getComputedStyle(document.documentElement).overscrollBehaviorY === 'auto'), 'Settings viewport policy must not leak to other templates');
    await context.close();
    console.log(`${name}: document scroll, fixed navigation, uncancelled input${nativeMac ? ', visible native top/bottom bounce and settling on both pages' : ' (native macOS bounce not exercised on this OS)'} passed`);
  }
} finally { await browser.close(); }
