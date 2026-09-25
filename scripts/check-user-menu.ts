import {chromium} from 'playwright';

const base = process.env.UI_TEST_URL ?? 'http://localhost:5173';
const browser = await chromium.launch();
function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
try {
  for (const [name, viewport] of Object.entries({desktop: {width: 1920, height: 1080}, mobile: {width: 390, height: 844}})) {
    const page = await browser.newPage({viewport, deviceScaleFactor: 1});
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/user-menu`);
    const example = page.locator('.user-menu-example__variants section').first();
    const trigger = example.getByRole('button', {name: 'Account menu for Alex Johnson'});
    await page.locator('img').evaluateAll(async images => { await Promise.all(images.map(image => (image as HTMLImageElement).decode().catch(() => {}))); });
    assert(await trigger.locator('[tabindex="0"]').count() === 0, 'The avatar must not create a nested tab stop');
    await trigger.focus();
    await page.keyboard.press('Enter');
    const profile = page.getByRole('menuitem', {name: 'Profile', exact: true});
    await profile.waitFor();
    assert(await profile.evaluate(el => el === document.activeElement), 'Keyboard open should focus the first action');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.getByRole('status').filter({hasText: 'Settings selected'}).waitFor();
    await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Account menu for Alex Johnson');
    await trigger.click();
    await profile.waitFor();
    await page.waitForTimeout(300);
    await page.screenshot({path: `artifacts/user-menu-open-${name}.png`});
    await page.keyboard.press('Escape');
    await profile.waitFor({state: 'hidden'});
    await trigger.click();
    await profile.waitFor();
    await page.getByRole('heading', {name: 'User menu', exact: true}).click();
    await profile.waitFor({state: 'hidden'});
    await page.screenshot({path: `artifacts/user-menu-${name}.png`});
    await page.goto(`${base}/sidebar/long-paragraphs`);
    await page.getByRole('heading', {name: 'Long paragraphs', exact: true}).waitFor();
    assert(await page.getByRole('combobox', {name: 'Search settings'}).count() === 0, 'Search must be absent');
    assert(await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor === getComputedStyle(document.querySelector('.settings-desktop-panel,.settings-content-pane')!).backgroundColor), 'App and overscroll must share a background by default');
    const account = page.getByRole('button', {name: 'Account menu for Alex Johnson'});
    await account.click();
    await page.getByRole('menuitem', {name: 'Appearance', exact: true}).click();
    await page.getByRole('heading', {name: 'Appearance', exact: true}).waitFor();
    await page.goto(`${base}/sidebar/integrations`);
    await page.getByRole('heading', {name: 'Connected apps', exact: true}).waitFor();
    if (name === 'desktop') {
      await page.waitForFunction(() => getComputedStyle(document.documentElement).overscrollBehaviorY === 'none');
      assert(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1), 'Short page should fit');
      // A data load or expanded section must re-enable native bounce without navigation.
      await page.locator('main').evaluate(el => { const block = document.createElement('div'); block.id = 'overflow-probe'; block.style.height = '2500px'; el.append(block); });
      await page.waitForFunction(() => getComputedStyle(document.documentElement).overscrollBehaviorY === 'contain');
      await page.locator('#overflow-probe').evaluate(el => el.remove());
      await page.waitForFunction(() => getComputedStyle(document.documentElement).overscrollBehaviorY === 'none');
    }
    await page.screenshot({path: `artifacts/sidebar-header-${name}.png`});
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal page overflow');
    assert(errors.length === 0, errors.join('\n'));
    await page.close();
    console.log(`${name}: user menu keyboard, dismissal, actions, header, background, and overflow detection passed`);
  }
} finally { await browser.close(); }
