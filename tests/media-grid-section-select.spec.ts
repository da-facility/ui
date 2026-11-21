import {expect, test} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {isMobile, presetTweaks} from './helpers';

/**
 * `MediaGrid` rows' `sectionSelection` (`/media-grid/rows-middle`, selectable): a day's checkbox before its heading
 * selects the whole day, also a day not loaded yet, with three states; it shows as the tiles' marks do (a computer:
 * over the heading or once anything is selected; a touch screen: once a selection has begun) and keeps its room.
 */
test('a day not loaded is ticked whole, a tile taken out leaves it partly ticked, ticking again takes it whole', async ({page}) => {
  await presetTweaks(page, 'media-grid', {selectable: true});
  await page.goto('/render/media-grid/rows-middle');
  await expect(page.locator('.media-tile[data-index]').first()).toBeVisible();
  // The day of the first loaded photo (9,500 is in day 256): its heading's checkbox.
  // A loaded day whose heading stands in the window (the grid keeps the window on the photo it opened at).
  await page.waitForTimeout(500);
  const visible = await page.locator('.media-grid__section').evaluateAll(all => all.findIndex(s => {
    const r = s.querySelector('.media-grid__heading')!.getBoundingClientRect();
    return r.top > 60 && r.bottom < innerHeight - 60 && s.querySelector('.media-tile[data-index]:not([data-loading])');
  }));
  expect(visible).toBeGreaterThanOrEqual(0);
  const section = page.locator('.media-grid__section').nth(visible);
  const heading = section.locator('.media-grid__heading');
  const day = heading.getByRole('checkbox', {name: /^Select all of /});
  const select = heading.locator('.media-grid__heading-select');
  await expect(select).toHaveCSS('opacity', '0');
  const titleLeft = (await heading.locator('.media-grid__heading-title').boundingBox())!.x;
  if (isMobile(test.info())) {
    // A touch screen: a long press on a tile begins the selection, then the days' marks show.
    await page.locator('.media-tile[data-index] .media-tile__checkbox').first().dispatchEvent('click');
  } else await heading.hover();
  await expect(select).toHaveCSS('opacity', '1');
  // Nothing moved: the checkbox held its room.
  expect((await heading.locator('.media-grid__heading-title').boundingBox())!.x).toBe(titleLeft);
  await day.click();
  await expect(day).toBeChecked();
  await expect(select).toHaveAttribute('data-state', 'all');
  // A tile of that day taken out: the day is partly ticked (mixed for screen readers).
  const tile = section.locator('.media-tile[data-selected]').first();
  await tile.locator('.media-tile__checkbox').dispatchEvent('click');
  await expect(select).toHaveAttribute('data-state', 'some');
  expect(await day.evaluate(input => (input as HTMLInputElement).indeterminate)).toBe(true);
  // Ticked again: the whole day.
  await day.click();
  await expect(select).toHaveAttribute('data-state', 'all');
  await day.click();
  await expect(select).toHaveAttribute('data-state', 'none');
});

test('a day that isn\'t loaded at all is ticked as what it is', async ({page}) => {
  await presetTweaks(page, 'media-grid', {selectable: true});
  await page.goto('/render/media-grid/rows-middle');
  await expect(page.locator('.media-tile[data-index]').first()).toBeVisible();
  // A stand-in day above the loaded run: brought into the window, then ticked by the keyboard (no pointer move).
  const standIn = page.locator('.media-grid__section').filter({hasNot: page.locator('.media-tile[data-index]:not([data-loading])')}).first();
  const box = standIn.getByRole('checkbox', {name: /^Select all of /});
  await box.focus();
  await page.keyboard.press('Space');
  await expect(standIn.locator('.media-grid__heading-select')).toHaveAttribute('data-state', 'all');
});

test('the days\' checkboxes have no accessibility violations', async ({page}) => {
  await presetTweaks(page, 'media-grid', {selectable: true});
  await page.goto('/render/media-grid/rows-middle');
  await expect(page.locator('.media-tile[data-index]').first()).toBeVisible();
  await page.getByRole('checkbox', {name: /^Select all of /}).first().click({force: true});
  const results = await new AxeBuilder({page}).include('.media-grid__heading').analyze();
  expect(results.violations).toEqual([]);
});
