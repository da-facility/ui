import {chromium} from 'playwright';

const base = process.env.UI_TEST_URL ?? 'http://localhost:5173';
const browser = await chromium.launch();
function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
try {
  for (const [name, viewport] of Object.entries({desktop: {width: 1920, height: 1080}, mobile: {width: 390, height: 844}})) {
    const page = await browser.newPage({viewport, deviceScaleFactor: 1, hasTouch: name === 'mobile'});
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/sidebar/long-table`);
    await page.getByRole('heading', {name: 'Long table', exact: true}).waitFor();
    if (name === 'desktop') {
      await page.getByRole('button', {name: 'Open UI library', exact: true}).click();
      await page.getByRole('switch', {name: 'Left-handed navigation', exact: true}).click();
      await page.keyboard.press('Escape');
      assert(await page.locator('.sidebar-layout__rail').evaluate(el => el.getBoundingClientRect().left === 0), 'Handedness must not change desktop layout');
      await page.screenshot({path: `artifacts/navigation-handedness-${name}.png`});
      await page.getByRole('button', {name: 'Open UI library', exact: true}).click();
      await page.getByRole('switch', {name: 'Left-handed navigation', exact: true}).click();
      await page.keyboard.press('Escape');
      await page.screenshot({path: 'artifacts/navigation-right-desktop.png'});
      await page.getByRole('button', {name: 'Open UI library', exact: true}).click();
      await page.getByRole('switch', {name: '100 extra sidebar items'}).click();
      await page.keyboard.press('Escape');
      await page.getByTestId('extra-nav-100').scrollIntoViewIfNeeded();
      await page.screenshot({path: 'artifacts/navigation-long-desktop.png'});
    } else {
      const trigger = page.getByRole('button', {name: 'Open settings navigation'});
      const drawer = page.getByRole('dialog', {name: 'Settings navigation'});
      const panel = page.locator('.mobile-sidebar__drawer > div');
      const nav = page.getByRole('navigation', {name: 'Settings sections'});
      const close = page.getByRole('button', {name: 'Close menu', exact: true});
      async function aligned(side: 'right' | 'left') {
        await page.waitForFunction(side => {
          const r = document.querySelector('.mobile-sidebar__drawer > div')?.getBoundingClientRect();
          return r && Math.abs(side === 'right' ? r.right - innerWidth : r.left) < 1;
        }, side);
      }
      await page.evaluate(() => scrollTo(0, 1500));
      const scrollBefore = await page.evaluate(() => scrollY);
      assert((await trigger.boundingBox())!.x > 300, 'Default trigger is on the right');
      await trigger.tap();
      await aligned('right');
      assert(await nav.getByRole('button').evaluateAll(items => items.every(item => item.getBoundingClientRect().height >= 44)), 'Navigation targets are at least 44px');
      assert((await panel.boundingBox())!.x >= 48, 'Backdrop remains reachable');
      await page.screenshot({path: 'artifacts/navigation-right-mobile.png'});
      await drawer.getByRole('switch', {name: 'Left-handed navigation'}).click();
      await aligned('left');
      assert(await page.evaluate(() => scrollY) === scrollBefore, 'Changing side must preserve document position');
      await page.screenshot({path: 'artifacts/navigation-handedness-mobile.png'});
      await close.tap();
      await drawer.waitFor({state: 'hidden'});
      assert((await trigger.boundingBox())!.x < 30, 'Trigger moves to the left');
      assert(await trigger.evaluate(el => el === document.activeElement), 'Close restores trigger focus');
      assert(await page.evaluate(() => scrollY) === scrollBefore, 'Closing restores page position');
      await page.reload();
      await trigger.waitFor();
      assert((await trigger.boundingBox())!.x < 30, 'Example persists handedness');
      await trigger.tap();
      await aligned('left');
      await page.mouse.click(380, 300);
      await drawer.waitFor({state: 'hidden'});
      await trigger.focus();
      await page.keyboard.press('Enter');
      await aligned('left');
      await page.keyboard.press('Escape');
      await drawer.waitFor({state: 'hidden'});
      // RTL text must not reverse the user's physical hand preference.
      await page.locator('html').evaluate(el => el.setAttribute('dir', 'rtl'));
      await trigger.tap();
      await aligned('left');
      await close.tap();
      await drawer.waitFor({state: 'hidden'});
      await page.locator('html').evaluate(el => el.setAttribute('dir', 'ltr'));
      await page.getByRole('button', {name: 'Open UI library', exact: true}).click();
      await page.getByRole('switch', {name: '100 extra sidebar items'}).click();
      await page.keyboard.press('Escape');
      await trigger.tap();
      await aligned('left');
      await nav.getByTestId('extra-nav-100').scrollIntoViewIfNeeded();
      assert((await close.boundingBox())!.y > 650, 'Close stays in the thumb zone for long menus');
      await page.screenshot({path: 'artifacts/navigation-long-mobile.png'});
      await page.setViewportSize({width: 844, height: 390});
      await page.emulateMedia({reducedMotion: 'reduce'});
      assert(await nav.getByRole('button').evaluateAll(items => items.every(item => item.getBoundingClientRect().height >= 44)), 'Landscape preserves touch targets');
      assert((await close.boundingBox())!.y >= 0 && (await close.boundingBox())!.y < 390, 'Landscape close stays visible');
      await nav.getByRole('button', {name: 'Profile', exact: true}).scrollIntoViewIfNeeded();
      await nav.getByRole('button', {name: 'Profile', exact: true}).tap();
      await drawer.waitFor({state: 'hidden'});
      await page.getByRole('heading', {name: 'Profile', exact: true}).waitFor();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Landscape has no page overflow');
      await page.setViewportSize(viewport);
      assert(await page.getByRole('textbox', {name: 'Display name', exact: true}).evaluate(el => parseFloat(getComputedStyle(el).fontSize) >= 16), 'Mobile text fields avoid small type');
    }
    assert(errors.length === 0, errors.join('\n'));
    await page.close();
    console.log(`${name}: handedness, touch targets, persistence, dismissal, RTL, landscape and scroll preservation passed`);
  }
} finally { await browser.close(); }
