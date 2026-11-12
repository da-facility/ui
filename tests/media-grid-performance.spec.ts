import {expect, test, type Page} from '@playwright/test';
import {isMobile} from './helpers';

/**
 * Measures MediaGrid with 20,000 photos loaded (/media-grid/large), with its
 * windowing (row blocks with `content-visibility: auto`) and without it, and
 * attaches the numbers to the report. Bounds are loose: headless browsers
 * render in software, so absolute times vary by machine.
 */

// Tracing snapshots the 20,000-tile document and would distort the timings.
test.use({trace: 'off'});

type Run = {mount: number; renderedBlocks: number; blocks: number; tiles: number; loadedImages: number; /** Before scrolling. */ relayout: number; frames: {median: number; p95: number; max: number}; longTasks: number; selectAll: number};

async function measure(page: Page, windowed: boolean): Promise<Run> {
  await page.addInitScript(() => {
    (window as unknown as {longTasks: number}).longTasks = 0;
    new PerformanceObserver(list => { (window as unknown as {longTasks: number}).longTasks += list.getEntries().length; }).observe({type: 'longtask', buffered: true});
  });
  if (!windowed) await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const style = document.createElement('style');
      style.textContent = '.media-grid__chunk { content-visibility: visible !important; }';
      document.head.append(style);
    });
  });
  await page.goto('/render/media-grid/large');
  await page.waitForFunction(() => document.querySelectorAll('.media-tile').length === 20_000, undefined, {timeout: 60_000});
  // Time from navigation to the frame after all 20,000 tiles are in.
  const mount = await page.evaluate(() => new Promise<number>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(performance.now())))));
  const counts = await page.evaluate(() => {
    const blocks = [...document.querySelectorAll('.media-grid__chunk')];
    return {
      blocks: blocks.length,
      tiles: document.querySelectorAll('.media-tile').length,
      renderedBlocks: blocks.filter(block => block.firstElementChild!.checkVisibility({contentVisibilityAuto: true})).length,
    };
  });
  const loadedImages = await page.evaluate(async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return [...document.images].filter(image => image.complete && image.naturalWidth > 0).length;
  });
  // A change that invalidates the page's layout, such as a resize, then a read of it.
  const relayout = await page.evaluate(() => {
    const main = document.querySelector<HTMLElement>('.media-grid-example')!;
    const start = performance.now();
    main.style.paddingInline = '33px';
    void document.documentElement.scrollHeight;
    const time = performance.now() - start;
    main.style.paddingInline = '';
    return time;
  });
  // Scroll 30,000px in 200px steps, one step a frame, timing every frame.
  const frames = await page.evaluate(() => new Promise<number[]>(resolve => {
    const times: number[] = [];
    let last = performance.now();
    let step = 0;
    const tick = (now: number) => {
      times.push(now - last);
      last = now;
      if (step++ === 150) return resolve(times.slice(1));
      scrollBy(0, 200);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }));
  const sorted = [...frames].sort((a, b) => a - b);
  // Select all 20,000 and wait for the frame that shows it.
  await page.locator('.media-tile__link').filter({visible: true}).first().focus();
  const selectAll = await page.evaluate(() => new Promise<number>(resolve => {
    const start = performance.now();
    document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', {key: 'a', ctrlKey: true, bubbles: true}));
    requestAnimationFrame(() => requestAnimationFrame(() => resolve(performance.now() - start)));
  }));
  expect(await page.locator('.media-tile[data-selected]').count()).toBe(20_000);
  return {
    mount: Math.round(mount),
    ...counts,
    loadedImages,
    relayout: Math.round(relayout * 10) / 10,
    frames: {median: Math.round(sorted[Math.floor(sorted.length / 2)] * 10) / 10, p95: Math.round(sorted[Math.floor(sorted.length * 0.95)] * 10) / 10, max: Math.round(sorted[sorted.length - 1] * 10) / 10},
    longTasks: await page.evaluate(() => (window as unknown as {longTasks: number}).longTasks),
    selectAll: Math.round(selectAll),
  };
}

test('20,000 photos: only the blocks near the screen are laid out and painted', async ({browser}, testInfo) => {
  test.setTimeout(240_000);
  const options = {viewport: isMobile(testInfo) ? {width: 390, height: 844} : {width: 1920, height: 1080}, deviceScaleFactor: 1};
  const windowedPage = await browser.newPage(options);
  const windowed = await measure(windowedPage, true);
  await windowedPage.close();
  const plainPage = await browser.newPage(options);
  const plain = await measure(plainPage, false);
  await plainPage.close();

  const results = {viewport: options.viewport, windowed, withoutWindowing: plain};
  console.log(`MediaGrid with 20,000 photos (${testInfo.project.name}):\n${JSON.stringify(results, null, 2)}`);
  await testInfo.attach('media-grid-20000.json', {body: JSON.stringify(results, null, 2), contentType: 'application/json'});

  expect(windowed.tiles).toBe(20_000);
  expect(windowed.renderedBlocks, 'only blocks near the screen are rendered').toBeLessThanOrEqual(4);
  expect(windowed.relayout, 'a relayout costs a fraction of laying out every tile').toBeLessThan(plain.relayout);
  expect(windowed.frames.median, 'scrolling takes less time a frame than with every tile laid out').toBeLessThan(plain.frames.median);
  expect(windowed.loadedImages, 'images far off screen are not loaded').toBeLessThan(600);
});
