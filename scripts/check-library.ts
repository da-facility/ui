import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';

const base = process.env.UI_TEST_URL ?? 'http://localhost:5173';
const browser = await chromium.launch({headless: true});
const errors: string[] = [];
const output = new URL('../artifacts/', import.meta.url).pathname;
await mkdir(output, {recursive: true});
function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
try {
  for (const [name, viewport] of Object.entries({desktop: {width: 1920, height: 1080}, mobile: {width: 390, height: 844}})) {
    const context = await browser.newContext({viewport, deviceScaleFactor: 1, hasTouch: name === 'mobile'});
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${base}/login-split`);
    await page.getByRole('heading', {name: 'Welcome back'}).waitFor();
    assert(await page.locator('iframe').count() === 0, 'Layouts should render directly');
    await page.getByRole('button', {name: 'Open UI library', exact: true}).click();
    await page.getByRole('searchbox', {name: 'Find a layout'}).fill('missing');
    await page.getByText('No layouts match').waitFor();
    await page.getByRole('searchbox', {name: 'Find a layout'}).fill('');
    assert(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme === 'light'), 'The floating menu dark theme must not change the page theme');
    await page.locator('.login-split__cover img').evaluate(async (image) => { await Promise.race([(image as HTMLImageElement).decode().catch(() => {}), new Promise((resolve) => setTimeout(resolve, 10000))]); });
    await page.screenshot({path: `${output}library-login-${name}.png`, fullPage: true});
    await page.getByRole('link', {name: 'Sidebar Template'}).click();
    await page.getByRole('heading', {name: 'Profile', exact: true}).waitFor();
    assert(new URL(page.url()).pathname === '/sidebar', 'Navigation should update URL');
    await page.goBack();
    await page.getByRole('heading', {name: 'Welcome back'}).waitFor();
    await page.goForward();
    await page.getByRole('heading', {name: 'Profile', exact: true}).waitFor();
    await page.getByLabel('Move menu to corner').selectOption('top-left');
    const handle = page.getByRole('button', {name: 'Move UI library menu'});
    await handle.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');
    let box = await page.locator('.library-menu').boundingBox();
    assert(box && box.x === 22 && box.y === 22, 'Keyboard movement should work');
    const before = await handle.boundingBox();
    assert(before, 'Missing drag handle');
    if (name === 'desktop') {
      await page.mouse.move(before.x + 10, before.y + 10);
      await page.mouse.down();
      await page.mouse.move(before.x + 110, before.y + 110, {steps: 10});
      await page.mouse.up();
    } else {
      const session = await context.newCDPSession(page);
      await session.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: before.x + 10, y: before.y + 10}]});
      await session.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: before.x + 60, y: before.y + 110}]});
      await session.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
      await session.detach();
    }
    box = await page.locator('.library-menu').boundingBox();
    assert(box && box.x > 22 && box.y > 22, 'Pointer drag should move menu');
    await page.reload();
    const restored = await page.locator('.library-menu').boundingBox();
    assert(restored && restored.x === box.x && restored.y === box.y, 'Position should survive reload');
    await page.getByLabel('Move menu to corner').selectOption('bottom-right');
    await page.screenshot({path: `${output}library-sidebar-${name}.png`, fullPage: true});
    await page.keyboard.press('Escape');
    assert(await page.locator('#library-panel').count() === 0, 'Escape should close menu');
    const navigation = page.getByRole('navigation', {name: 'Settings sections'});
    async function selectSection(label: string) {
      const trigger = page.getByRole('button', {name: 'Open settings navigation', exact: true});
      const mobile = await trigger.count() > 0;
      if (mobile) await trigger.click();
      await navigation.getByRole('button', {name: label, exact: true}).click();
      if (mobile) await page.getByRole('dialog', {name: 'Settings navigation', exact: true}).waitFor({state: 'hidden'});
    }
    if (name === 'desktop') {
      const before = await navigation.boundingBox();
      await page.mouse.move(120, 300);
      await page.mouse.wheel(0, 700);
      assert(await navigation.evaluate((element) => Array.from(element.children).every((child) => child.scrollTop === 0)), 'Sidebar must not scroll');
      const after = await navigation.boundingBox();
      assert(before?.y === after?.y, 'Sidebar must stay fixed');
    } else {
      const trigger = await page.getByRole('button', {name: 'Open settings navigation'}).boundingBox();
      assert(trigger && trigger.x > 300 && trigger.y > 650, 'Mobile menu must be reachable at the lower right');
      await page.getByRole('button', {name: 'Open settings navigation'}).click();
      const drawer = page.getByRole('dialog', {name: 'Settings navigation', exact: true});
      await drawer.waitFor();
      assert(await drawer.getAttribute('data-side') === 'end', 'Drawer must open from the right');
      await page.keyboard.press('Escape');
      await drawer.waitFor({state: 'hidden'});
    }
    const displayName = page.getByRole('textbox' , {name: 'Display name', exact: true});
    await displayName.fill('Local preview');
    const localTime = page.getByRole('switch', {name: 'Show my local time', exact: true});
    await localTime.click();
    assert(!(await localTime.isChecked()), 'Astryx switch should change state');
    await selectSection('Appearance');
    await page.getByRole('heading', {name: 'Appearance', exact: true}).waitFor();
    await selectSection('Profile');
    assert(await displayName.inputValue() === 'Local preview', 'Settings should survive panel navigation');
    assert(!(await localTime.isChecked()), 'Switch should retain its state');
    const settingsSearch = page.getByRole('combobox', {name: 'Search settings', exact: true});
    await settingsSearch.fill('quiet');
    await page.getByRole('option', {name: /Quiet hours/}).waitFor();
    await settingsSearch.press('ArrowDown');
    await settingsSearch.press('Enter');
    await page.getByRole('heading', {name: 'Notifications', exact: true}).waitFor();
    for (const label of ['Login & security', 'Billing', 'Keyboard shortcuts', 'Language & region', 'Privacy', 'Connected apps', 'Long paragraphs', 'Developer']) {
      await selectSection(label);
      await page.getByRole('heading', {name: label, exact: true}).waitFor();
    }
    await selectSection('Long table');
    await page.getByRole('heading', {name: 'Long table', exact: true}).waitFor();
    assert(new URL(page.url()).pathname === '/sidebar/long-table', 'Sidebar pages should have real paths');
    assert(new URL(page.url()).search === '', 'Navigation should not use querystrings');
    assert(await page.getByRole('table', {name: 'Workspace records'}).locator('tbody tr').count() === 500, 'All 500 table rows must render without pagination');
    await page.screenshot({path: `${output}long-table-${name}.png`});
    const pane = page.locator('html');
    assert(await pane.evaluate((element) => element.scrollHeight > element.clientHeight * 10), 'Long table should force vertical scrolling');
    await page.getByTestId('record-DF-0500').scrollIntoViewIfNeeded();
    assert(await pane.evaluate((element) => element.scrollTop > 10000), 'Last table row must be reachable in the content pane');
    assert(await page.locator(name === 'desktop' ? '.settings-fixed-sidebar' : '.settings-mobile-header').evaluate(el => el.getBoundingClientRect().top === 0), 'Navigation should stay fixed while the document scrolls');
    if (name === 'mobile') {
      const scrollBefore = await pane.evaluate((element) => element.scrollTop);
      await page.getByRole('button', {name: 'Open settings navigation'}).click();
      await page.getByRole('dialog', {name: 'Settings navigation'}).waitFor();
      await page.waitForFunction(() => {
        const drawer = document.querySelector('.settings-mobile-drawer > div')?.getBoundingClientRect();
        return drawer && Math.abs(drawer.right - innerWidth) < 1;
      });
      await page.screenshot({path: `${output}sidebar-navigation-${name}.png`});
      await page.getByRole('button', {name: 'Close menu', exact: true}).click();
      await page.getByRole('dialog', {name: 'Settings navigation'}).waitFor({state: 'hidden'});
      assert(await pane.evaluate((element) => element.scrollTop) === scrollBefore, 'Closing the drawer should preserve table scroll');
    } else {
      await page.screenshot({path: `${output}sidebar-navigation-${name}.png`});
    }
    await page.reload();
    await page.getByRole('heading', {name: 'Long table', exact: true}).waitFor();
    await page.goBack();
    await page.getByRole('heading', {name: 'Developer', exact: true}).waitFor();
    await page.goForward();
    await page.getByRole('heading', {name: 'Long table', exact: true}).waitFor();
    await page.keyboard.press('Control+k');
    await page.getByRole('region', {name: 'UI library', exact: true}).waitFor();
    await page.getByLabel('Move menu to corner').selectOption('bottom-right');
    await page.setViewportSize({width: 320, height: 480});
    await page.waitForFunction(() => {
      const menu = document.querySelector('.library-menu')?.getBoundingClientRect();
      const panel = document.querySelector('#library-panel')?.getBoundingClientRect();
      return menu && panel && menu.left >= 0 && menu.right <= innerWidth && panel.top >= 0 && panel.bottom <= innerHeight;
    });
    const menu = await page.locator('.library-menu').boundingBox();
    const panel = await page.locator('#library-panel').boundingBox();
    assert(menu && panel && menu.x >= 0 && menu.x + menu.width <= 320 && panel.y >= 0 && panel.y + panel.height <= 480, 'Menu should remain in resized viewport');
    await page.keyboard.press('Escape');
    await page.getByRole('button', {name: 'Open settings navigation'}).click();
    await page.waitForFunction(() => {
      const drawer = document.querySelector('.settings-mobile-drawer > div')?.getBoundingClientRect();
      return drawer && Math.abs(drawer.right - innerWidth) < 1;
    });
    assert(await navigation.getByRole('button').evaluateAll((buttons) => buttons.every((button) => {
      const box = button.getBoundingClientRect();
      return box.top >= 0 && box.bottom <= innerHeight && box.left >= 0 && box.right <= innerWidth;
    })), 'Every navigation destination should fit on a short screen');
    await page.goto(`${base}/render/sidebar`);
    await page.getByRole('heading', {name: 'Profile', exact: true}).waitFor();
    assert(await page.locator('.library-menu').count() === 0, 'Clean render must omit menu');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Mobile layout should not overflow');
    await page.goto(`${base}/?template=sidebar`);
    await page.getByRole('heading', {name: 'Profile', exact: true}).waitFor();
    assert(new URL(page.url()).pathname === '/sidebar' && !new URL(page.url()).search, 'Old shared links should redirect to real paths');
    await page.goto(`${base}/render/sidebar/long-table`);
    await page.getByRole('heading', {name: 'Long table', exact: true}).waitFor();
    assert(await page.locator('.library-menu').count() === 0, 'Clean page routes should preserve the selected panel');
    await context.close();
    console.log(`${name}: navigation, dragging, keyboard, persistence, responsive layout, clean render passed`);
  }
  assert(errors.length === 0, `Browser errors: ${errors.join(', ')}`);
} finally { await browser.close(); }
