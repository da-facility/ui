import {expect, test} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {collectErrors, isMobile, presetTweaks} from './helpers';

/** `PanelButton` (`/panel-button`): a popover under the button on a computer, a sheet from the bottom on a phone, the count after its label. */

test('opens its panel, applies a choice at once, says how many are chosen, and closes with Escape', async ({page}) => {
  const errors = collectErrors(page);
  await page.goto('/render/panel-button');
  const button = page.getByRole('button', {name: /^Filters/});
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  // Closed, the panel isn't in the page at all.
  await expect(page.locator('.panel-button__panel, .panel-button__sheet')).toHaveCount(0);
  await expect(page.getByText('Last 7 days')).toHaveCount(0);
  const box = (await button.boundingBox())!;
  expect(box.height).toBe(isMobile(test.info()) ? 44 : 32);
  await button.click();
  const panel = page.getByRole('dialog', {name: 'Filters'});
  await expect(panel).toBeVisible();
  // Measured once it has come in: mid-slide it stands a pixel or so off.
  await page.waitForFunction(() => document.getAnimations().every(a => a.playState !== 'running'));
  const p = (await panel.boundingBox())!;
  if (isMobile(test.info())) {
    // A sheet from the bottom, as wide as the window, its title at its top.
    expect(Math.round(p.y + p.height)).toBeGreaterThanOrEqual(page.viewportSize()!.height - 2);
    await expect(panel.getByRole('heading', {name: 'Filters'})).toBeVisible();
  } else {
    // Under the button, its end at the button's end.
    expect(p.y).toBeGreaterThan(box.y + box.height - 1);
    expect(Math.abs(p.x + p.width - (box.x + box.width))).toBeLessThanOrEqual(8);
  }
  await panel.getByRole('radio', {name: 'Today'}).click();
  await expect(page.locator('.panel-button-example__status')).toHaveText('1 filter: added today, shape all.');
  await expect(button).toContainText('1');
  await expect(button).toHaveClass(/panel-button--active/);
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  expect(errors).toEqual([]);
});

test('on a phone the sheet scrolls inside itself and its closing button stays at its bottom edge, saying what the person gets', async ({page}) => {
  test.skip(!isMobile(test.info()), 'the sheet is the phone\'s form');
  // A short screen: the sheet's choices are taller than it.
  const H = 330;
  await page.setViewportSize({width: 390, height: H});
  await page.goto('/render/panel-button');
  const button = page.getByRole('button', {name: /^Filters/});
  await button.click();
  const panel = page.getByRole('dialog', {name: 'Filters'});
  const done = panel.getByRole('button', {name: 'Show photos'});
  await expect(done).toBeVisible();
  await page.waitForFunction(() => document.getAnimations().every(a => a.playState !== 'running'));
  const bar = panel.locator('.panel-button__done');
  const inView = async () => {
    const b = (await bar.boundingBox())!;
    expect(Math.round(b.y + b.height)).toBe(H);
  };
  // The choices are taller than the sheet: its body scrolls.
  expect(await panel.locator('.panel-button__sheet').evaluate(el => {
    let box: HTMLElement | null = el.parentElement;
    while (box && box.scrollHeight <= box.clientHeight) box = box.parentElement;
    return Boolean(box && box !== document.documentElement);
  })).toBe(true);
  await inView();
  // The last choice is reached by scrolling the sheet, the button still at its edge, then a choice changes its words.
  const portrait = panel.getByRole('radio', {name: 'Portrait'});
  await portrait.scrollIntoViewIfNeeded();
  await portrait.click();
  await inView();
  await expect(panel.getByRole('button', {name: 'Show 480 photos'})).toBeVisible();
  await panel.getByRole('button', {name: 'Show 480 photos'}).click();
  await expect(panel).toBeHidden();
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await expect(button).toBeFocused();
});

test('has no accessibility violations, light and dark, closed and open', async ({page}) => {
  for (const darkMode of [false, true]) {
    await presetTweaks(page, 'panel-button', {}, {darkMode});
    await page.goto('/render/panel-button');
    await page.getByRole('button', {name: /^Filters/}).click();
    await expect(page.getByRole('dialog', {name: 'Filters'})).toBeVisible();
    // Once the sheet or popover has finished coming in: colours mid-fade aren't its colours.
    await page.waitForFunction(() => document.getAnimations().every(a => a.playState !== 'running'));
    await page.waitForTimeout(200);
    const results = await new AxeBuilder({page}).analyze();
    expect(results.violations).toEqual([]);
  }
});
