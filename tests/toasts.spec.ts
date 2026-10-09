import {expect, test, type Page} from '@playwright/test';
import {collectErrors, presetTweaks} from './helpers';

/** Visible toast cards; each message is also repeated in Sonner's live region. */
const toasts = (page: Page) => page.locator('[data-sonner-toast]');
const button = (page: Page, name: string) => page.locator('.toasts-example__group').getByRole('button', {name, exact: true});
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

/**
 * Records where the shooting star's head is on each frame, from the trail
 * canvas, from the moment it appears until it is removed, so a test can check
 * the flight without racing it. Installed before the click that launches it.
 */
async function trackStar(page: Page) {
  await page.evaluate(() => {
    const track: {x: number; y: number}[] = [];
    Object.assign(window, {__starTrack: track, __starSeen: false});
    const sample = () => {
      const trail = document.querySelector<HTMLElement>('.da-toast-trail');
      if (!trail) return;
      const [x, y] = (trail.dataset.head ?? '').split(',').map(Number);
      if (Number.isFinite(x) && Number.isFinite(y)) track.push({x, y});
      requestAnimationFrame(sample);
    };
    new MutationObserver(() => {
      if ((window as {__starSeen?: boolean}).__starSeen || !document.querySelector('.da-toast-trail')) return;
      Object.assign(window, {__starSeen: true});
      sample();
    }).observe(document.body, {childList: true});
  });
}

const starTrack = (page: Page) => page.evaluate(() => {
  const {__starTrack, __starSeen} = window as unknown as {__starTrack: {x: number; y: number}[]; __starSeen: boolean};
  return {__starTrack, __starSeen};
});

test('each button shows its toast, where the position control puts it', async ({page}) => {
  const errors = collectErrors(page);
  await page.goto('/render/toasts');

  await button(page, 'Default').click();
  const plain = toasts(page).filter({hasText: 'Event has been created'});
  await expect(plain).toBeVisible();
  expect((await plain.boundingBox())!.y, 'bottom right by default').toBeGreaterThan(page.viewportSize()!.height / 2);

  await button(page, 'Error').click();
  await expect(toasts(page).filter({hasText: 'Could not save your changes'})).toHaveAttribute('data-type', 'error');

  await page.getByRole('radiogroup', {name: 'Toast position'}).getByRole('radio', {name: 'Top left'}).click();
  await button(page, 'Persistent').click();
  const persistent = toasts(page).filter({hasText: 'This one waits for you'});
  await expect(persistent).toBeVisible();
  expect((await persistent.boundingBox())!.y).toBeLessThan(page.viewportSize()!.height / 2);
  await expect(persistent.getByRole('button', {name: 'Close notification'})).toBeVisible();

  await button(page, 'Action and cancel').click();
  const confirm = toasts(page).filter({hasText: 'Delete 3 files?'});
  await expect(confirm.getByText('This cannot be undone.')).toBeVisible();
  await confirm.getByRole('button', {name: 'Delete'}).click();
  await expect(toasts(page).filter({hasText: '3 files deleted'})).toBeVisible();
  await expect(confirm).toHaveCount(0);

  await button(page, 'Custom JSX').click();
  await expect(toasts(page).getByText('New report', {exact: true})).toBeVisible();
  await toasts(page).getByRole('button', {name: 'Open', exact: true}).click();
  await expect(toasts(page).getByText('New report', {exact: true})).toHaveCount(0);
  await expect(page.locator('.toasts-example__status')).toHaveText('“Custom JSX” was hidden by dismissing it.');
  expect(await noOverflow(page)).toBe(true);
  expect(errors).toEqual([]);
});

test('promises, replacing by id, dismissing from code, and the visible limit', async ({page}) => {
  await page.goto('/render/toasts');

  await button(page, 'Promise that resolves').click();
  await expect(toasts(page).filter({hasText: 'Uploading…'})).toBeVisible();
  await expect(toasts(page).filter({hasText: 'report.pdf uploaded'})).toHaveAttribute('data-type', 'success');
  await button(page, 'Promise that rejects').click();
  await expect(toasts(page).filter({hasText: 'Upload failed: Connection lost'})).toHaveAttribute('data-type', 'error');

  await button(page, 'Replace the same toast').click();
  await button(page, 'Replace the same toast').click();
  await expect(toasts(page).filter({hasText: 'Synced 2 times'})).toBeVisible();
  await expect(toasts(page).filter({hasText: /^Synced \d/})).toHaveCount(1);

  await button(page, 'Dismissed from code').click();
  const uploading = toasts(page).filter({hasText: 'Uploading…'});
  await expect(uploading).toBeVisible();
  await expect(uploading).toHaveCount(0, {timeout: 5000});

  await page.getByRole('radiogroup', {name: 'Visible toasts'}).getByRole('radio', {name: '1'}).click();
  await button(page, 'Six at once').click();
  const six = toasts(page).filter({hasText: /^Notification \d of 6$/});
  await expect(six).toHaveCount(6);
  await expect(six.and(page.locator('[data-visible="true"]'))).toHaveCount(1);
  expect(await noOverflow(page)).toBe(true);
});

test('a shooting star is drawn from the button to the toast, which grows out of its impact', async ({page}) => {
  const errors = collectErrors(page);
  await page.goto('/render/toasts');
  await trackStar(page);

  const trigger = button(page, 'Success');
  await trigger.scrollIntoViewIfNeeded();
  const start = (await trigger.boundingBox())!;
  await trigger.click();
  const toast = toasts(page).filter({hasText: 'Changes saved'});
  await expect(toast).toBeVisible();
  await expect(page.locator('.da-toast-stand-in, .da-toast-trail'), 'the trail and shape are removed afterwards').toHaveCount(0);
  await expect(toast).not.toHaveClass(/da-toast--arriving/);
  await expect(toast).toHaveCSS('clip-path', 'none');

  const {__starTrack: track, __starSeen: seen} = await starTrack(page);
  expect(seen, 'a trail was drawn').toBe(true);
  expect(track.length).toBeGreaterThan(2);
  const first = track[0];
  const last = track[track.length - 1];
  const end = (await toast.boundingBox())!;
  const centre = {x: end.x + end.width / 2, y: end.y + end.height / 2};
  const distance = (point: {x: number; y: number}) => Math.hypot(point.x - centre.x, point.y - centre.y);
  expect(Math.abs(first.x - (start.x + start.width / 2)), 'leaves the button').toBeLessThan(start.width);
  expect(Math.abs(first.y - (start.y + start.height / 2))).toBeLessThan(start.height);
  expect(distance(last), 'arrives at the toast').toBeLessThan(distance(first) / 2);
  expect(errors).toEqual([]);
});

test('with reduced motion there is no shooting star, and the toast still shows', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto('/render/toasts');
  await trackStar(page);

  await button(page, 'Info').click();
  const toast = toasts(page).filter({hasText: 'A new version is available'});
  await expect(toast).toBeVisible();
  await expect(toast).not.toHaveClass(/da-toast--arriving/);
  await expect(page.locator('.da-toast-stand-in, .da-toast-trail')).toHaveCount(0);
  expect((await starTrack(page)).__starSeen).toBe(false);
});

test('toasts take the dark theme and Croatian from the app', async ({page}) => {
  await presetTweaks(page, 'toasts', {}, {darkMode: true, croatian: true});
  await page.goto('/render/toasts');

  await button(page, 'Persistent').click();
  const toast = toasts(page).filter({hasText: 'This one waits for you'});
  await expect(toast).toBeVisible();
  await expect(toast.getByRole('button', {name: 'Zatvori obavijest'})).toBeVisible();
  await expect(page.getByRole('region', {name: /^Obavijesti/})).toBeAttached();

  const popover = await page.evaluate(() => {
    const probe = document.createElement('div');
    probe.style.background = 'var(--color-background-popover)';
    document.body.append(probe);
    const colour = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return colour;
  });
  expect(popover, 'the theme is dark').not.toBe('rgb(255, 255, 255)');
  await expect(toast).toHaveCSS('background-color', popover);
});

/** Paints the trail at a moment of the flight (on the page's fake clock) and reads it back. */
async function trailAt(page: Page, label: string, ms: number) {
  const trigger = button(page, label);
  await trigger.scrollIntoViewIfNeeded();
  const cover = (await trigger.boundingBox())!;
  await trigger.click();
  await page.clock.runFor(ms);
  return page.evaluate(cover => {
    const canvas = document.querySelector<HTMLCanvasElement>('.da-toast-trail')!;
    const context = canvas.getContext('2d')!;
    const box = canvas.getBoundingClientRect();
    const ratio = canvas.width / box.width;
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let underButton = 0;
    let brightest = {alpha: 0, rgb: [0, 0, 0]};
    for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * 4;
      const alpha = pixels[i + 3];
      if (!alpha) continue;
      const cx = box.left + x / ratio;
      const cy = box.top + y / ratio;
      if (cx > cover.x + 1 && cx < cover.x + cover.width - 1 && cy > cover.y + 1 && cy < cover.y + cover.height - 1) underButton++;
      if (alpha > brightest.alpha) brightest = {alpha, rgb: [pixels[i], pixels[i + 1], pixels[i + 2]]};
    }
    return {underButton, brightest};
  }, cover);
}

test('the star starts behind its button, tinted red for errors and yellow for warnings', async ({page}) => {
  await page.clock.install();
  await page.goto('/render/toasts');
  await page.clock.runFor(500);

  const error = await trailAt(page, 'Error', 120);
  expect(error.underButton, 'the trail is hidden behind the button').toBe(0);
  expect(error.brightest.alpha).toBeGreaterThan(100);
  const [r, g, b] = error.brightest.rgb;
  expect(r, 'red').toBeGreaterThan(Math.max(g, b) + 60);

  await page.clock.runFor(2000);
  const warning = await trailAt(page, 'Warning', 120);
  const [wr, wg, wb] = warning.brightest.rgb;
  expect(Math.min(wr, wg), 'yellow').toBeGreaterThan(wb + 60);

  await page.clock.runFor(2000);
  const info = await trailAt(page, 'Info', 120);
  const [ir, ig, ib] = info.brightest.rgb;
  expect(ib, 'other toasts keep the trail colour (blue on this page)').toBeGreaterThan(Math.max(ir, ig));
});

test('the toast’s text waits for the card to open, then fades in', async ({page}) => {
  await page.goto('/render/toasts');
  await button(page, 'Success').click();
  const toast = toasts(page).filter({hasText: 'Changes saved'});
  const content = toast.locator('[data-content]');
  await expect(toast).toHaveClass(/da-toast--arriving/);
  await expect(content).toHaveCSS('opacity', '0');
  await expect(toast).not.toHaveClass(/da-toast--arriving/);
  await expect(content).toHaveCSS('opacity', '1');
});

test('an action that shows a toast replaces its own toast in place with a wave', async ({page}) => {
  const errors = collectErrors(page);
  await page.goto('/render/toasts');
  await button(page, 'Action and cancel').click();
  const question = toasts(page).filter({hasText: 'Delete 3 files?'});
  await expect(question).not.toHaveClass(/da-toast--arriving/);
  const before = (await question.boundingBox())!;

  await question.getByRole('button', {name: 'Delete', exact: true}).click();
  await expect(page.locator('.da-toast-wave'), 'a wave wipes the card').toHaveCount(1);
  await expect(page.locator('.da-toast-trail'), 'no new star flies in').toHaveCount(0);
  const replaced = toasts(page).filter({hasText: '3 files deleted'});
  await expect(replaced).toBeVisible();
  await expect(page.locator('.da-toast-wave')).toHaveCount(0);
  await expect(replaced).not.toHaveClass(/da-toast--arriving/);
  await expect(toasts(page), 'the toast was replaced, not added').toHaveCount(1);
  await expect(replaced.getByText('This cannot be undone.'), 'nothing of the old toast carries over').toHaveCount(0);
  await expect(replaced.getByRole('button')).toHaveCount(0);
  const after = (await replaced.boundingBox())!;
  expect(Math.abs(after.x - before.x), 'it stays where it was').toBeLessThan(1);
  expect(Math.abs(after.y + after.height - (before.y + before.height))).toBeLessThan(2);
  expect(errors).toEqual([]);
});
