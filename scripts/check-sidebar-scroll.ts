import {chromium} from 'playwright';

const browser = await chromium.launch();
const base = process.env.UI_TEST_URL ?? 'http://localhost:5173';
function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
try {
  for (const [name, viewport] of Object.entries({desktop: {width: 1920, height: 1080}, mobile: {width: 390, height: 844}})) {
    const context = await browser.newContext({viewport, deviceScaleFactor: 1, hasTouch: name === 'mobile'});
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/sidebar/long-table`);
    const pane = page.locator('html');
    await page.getByTestId('record-DF-0500').waitFor({state: 'attached'});
    if (name === 'desktop') {
      assert(await page.locator('.settings-fixed-sidebar').evaluate(el => el.dispatchEvent(new WheelEvent('wheel', {deltaY: 100, bubbles: true, cancelable: true}))), 'Wheel input must remain native and uncancelled');
      assert(await pane.evaluate(el => el.scrollTop === 0), 'Synthetic wheel events must not manually move content');
      await page.mouse.move(120, 350);
      await page.mouse.wheel(0, 600);
      // Move the pointer to main content: infra does not forward sidebar input.
      await page.mouse.move(800, 350);
      assert(await pane.evaluate(el => el.scrollTop === 0), 'Short sidebar must not move main content');
      await page.mouse.wheel(0, 600);
      await page.waitForFunction(() => document.querySelector('html')!.scrollTop >= 600);
      assert(await page.locator('.settings-fixed-sidebar > div:last-child').evaluate(el => el.scrollTop === 0), 'Fitting sidebar must remain still');
      await page.mouse.move(800, 55);
      await page.mouse.wheel(0, 400);
      await page.waitForFunction(() => document.querySelector('html')!.scrollTop >= 1000);
      await pane.evaluate(el => { el.scrollTop = el.scrollHeight; });
      assert(await page.locator('.settings-fixed-sidebar').evaluate(el => Math.abs(el.getBoundingClientRect().top) < 1), 'Sidebar stays fixed at the bottom of the content');
      await pane.evaluate(el => { el.scrollTop = 0; });
      assert(await page.locator('.settings-fixed-sidebar').evaluate(el => el.getBoundingClientRect().top === 0), 'Navigation stays at the viewport edge');
      assert(await pane.evaluate(el => getComputedStyle(el).overscrollBehaviorY === 'contain'), 'Main pane should allow native boundary effects without chaining');
    }
    await page.getByRole('button', {name: 'Open UI library', exact: true}).click();
    const toggle = page.getByRole('switch', {name: '100 extra sidebar items'});
    await toggle.click();
    assert(await toggle.isChecked(), 'Tweak should be enabled');
    await page.screenshot({path: `artifacts/sidebar-tweaks-${name}.png`});
    await page.keyboard.press('Escape');
    if (name === 'mobile') {
      await page.getByRole('button', {name: 'Open settings navigation'}).click();
      await page.waitForFunction(() => Math.abs(document.querySelector('.settings-mobile-drawer > div')!.getBoundingClientRect().right - innerWidth) < 1);
    }
    const nav = page.locator(name === 'desktop' ? '.settings-fixed-sidebar > div:last-child' : '.settings-mobile-sections');
    assert(await nav.getByTestId(/extra-nav-/).count() === 100, 'Exactly 100 sample destinations');
    assert(await nav.evaluate(el => el.scrollHeight > el.clientHeight), 'Expanded navigation must overflow');
    const contentBefore = await pane.evaluate(el => el.scrollTop);
    const box = await nav.boundingBox();
    assert(box, 'Navigation must be visible');
    await page.mouse.move(box.x + 80, box.y + 100);
    await page.mouse.wheel(0, 700);
    await page.waitForFunction(selector => document.querySelector(selector)!.scrollTop > 0, name === 'desktop' ? '.settings-fixed-sidebar > div:last-child' : '.settings-mobile-sections');
    assert(await pane.evaluate(el => el.scrollTop) === contentBefore, 'Overflowing sidebar should scroll independently');
    await nav.evaluate(el => { el.scrollTop = el.scrollHeight; });
    await page.mouse.wheel(0, 700);
    assert(await pane.evaluate(el => el.scrollTop) === contentBefore, 'Sidebar boundary must not leak scroll to content');
    await page.getByTestId('extra-nav-100').waitFor();
    await page.screenshot({path: `artifacts/sidebar-overflow-${name}.png`});
    if (name === 'mobile') {
      await page.getByRole('button', {name: 'Close menu', exact: true}).click();
      await page.getByRole('dialog', {name: 'Settings navigation'}).waitFor({state: 'hidden'});
    }
    await page.reload();
    await page.getByRole('button', {name: 'Open UI library', exact: true}).click();
    assert(await toggle.isChecked(), 'Tweak survives reload');
    await toggle.click();
    await page.keyboard.press('Escape');
    assert(await page.getByTestId('extra-nav-1').count() === 0, 'Turning off removes test items');
    if (name === 'desktop') {
      await page.mouse.move(800, 350);
      await page.mouse.wheel(0, 600);
      await page.waitForFunction(() => document.querySelector('html')!.scrollTop >= 600);
      assert(await nav.evaluate(el => el.scrollTop === 0), 'Sidebar returns to fixed behavior after disabling');
    }
    await page.goto(`${base}/sidebar/long-paragraphs`);
    await page.getByRole('heading', {name: 'Long paragraphs', exact: true}).waitFor();
    assert(await page.locator('.settings-long-paragraphs > section').count() === 12, 'Railway notebook should render twelve chapters');
    assert(await pane.evaluate(el => el.scrollHeight > el.clientHeight * 5), 'Paragraphs should provide a long native scroll area');
    assert(await pane.evaluate(el => getComputedStyle(el).overscrollBehaviorY === 'contain'), 'Paragraphs should permit native overscroll');
    assert(await pane.evaluate(el => el.dispatchEvent(new WheelEvent('wheel', {deltaY: 100, bubbles: true, cancelable: true}))), 'Paragraphs must not cancel native wheel gestures');
    await page.screenshot({path: `artifacts/long-paragraphs-${name}.png`});
    await page.getByTestId('paragraphs-end').scrollIntoViewIfNeeded();
    await page.screenshot({path: `artifacts/long-paragraphs-end-${name}.png`});
    assert(await page.evaluate(() => scrollY > 0), 'Paragraphs should scroll the document');
    await page.locator('html').evaluate(el => el.style.setProperty('--settings-scroll-background', 'rgb(220, 230, 240)'));
    assert(await pane.evaluate(el => getComputedStyle(el).backgroundColor === 'rgb(220, 230, 240)'), 'Scroll background must be independently configurable');
    assert(errors.length === 0, errors.join('\n'));
    await context.close();
    console.log(`${name}: scroll routing, boundaries, extra items, persistence, and reset passed`);
  }
} finally { await browser.close(); }
