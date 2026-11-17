import {expect, test} from '@playwright/test';
import {aspectOf, DEFAULT_ASPECT, justify, layoutRows, LOOKAHEAD, nearestInRow, ROWS_PER_BLOCK, type RowMetrics} from '../src/components/media-grid/rows';

// Pure functions: no page needed, so they run once, in the desktop project.
test.beforeEach(({}, testInfo) => test.skip(testInfo.project.name !== 'desktop', 'runs once'));

const metrics: RowMetrics = {width: 1000, rowHeight: 180, gap: 6, headingHeight: 40, sectionGap: 20};
const landscape = 1.5;
const portrait = 2 / 3;

test('rows fill the width at about the target height, the last one keeps it', () => {
  const aspects = Array.from({length: 40}, (_, index) => (index % 4 === 3 ? portrait : landscape));
  const rows = justify(aspects, 0, aspects.length, metrics);
  expect(rows.reduce((n, row) => n + row.count, 0)).toBe(40);
  for (const row of rows.slice(0, -1)) {
    const width = aspects.slice(row.first, row.first + row.count).reduce((a, b) => a + b, 0) * row.height + (row.count - 1) * metrics.gap;
    expect(width).toBeCloseTo(metrics.width, 6);
    expect(row.height).toBeGreaterThan(metrics.rowHeight * 0.75);
    expect(row.height).toBeLessThan(metrics.rowHeight * 1.35);
  }
  expect(rows.at(-1)!.height).toBe(metrics.rowHeight);
});

test('placed tiles: one height per row, whole shapes, edges that meet the grid’s', () => {
  const aspects = Array.from({length: 30}, (_, index) => [landscape, portrait, 1, 16 / 9][index % 4]);
  const layout = layoutRows({aspects, sections: [], placeholders: 0, metrics});
  for (const row of layout.rows) {
    const places = Array.from({length: row.count}, (_, offset) => layout.place(row.first + offset));
    expect(new Set(places.map(p => p.height)).size).toBe(1);
    expect(places[0].left).toBe(0);
    for (let i = 1; i < places.length; i++) expect(places[i].left - (places[i - 1].left + places[i - 1].width)).toBeGreaterThanOrEqual(metrics.gap - 1);
    if (row !== layout.rows.at(-1)) expect(places.at(-1)!.left + places.at(-1)!.width).toBe(metrics.width);
    // Every tile keeps its photo's shape, within the rounding of a pixel.
    for (let i = 0; i < places.length; i++) expect(Math.abs(places[i].width / places[i].height - aspects[row.first + i])).toBeLessThan(0.02);
  }
});

test('sections start their own rows under a heading; blocks hold whole rows', () => {
  const aspects = Array.from({length: 100}, () => landscape);
  const layout = layoutRows({aspects, sections: [{start: 0, key: 'a'}, {start: 37, key: 'b'}], placeholders: 0, metrics});
  expect(layout.sections.map(s => [s.key, s.first, s.count])).toEqual([['a', 0, 37], ['b', 37, 63]]);
  const second = layout.sections[1];
  expect(second.top).toBe(layout.sections[0].top + layout.sections[0].height + metrics.sectionGap);
  expect(second.blocks[0].top).toBe(second.top + metrics.headingHeight);
  expect(layout.place(37).left).toBe(0);
  for (const block of layout.blocks) expect(block.rows.length).toBeLessThanOrEqual(ROWS_PER_BLOCK);
  // Blocks are in order and don't overlap: the grid can find the ones near the window by their tops.
  for (let i = 1; i < layout.blocks.length; i++) expect(layout.blocks[i].top).toBeGreaterThanOrEqual(layout.blocks[i - 1].top + layout.blocks[i - 1].height);
  expect(layout.height).toBe(second.top + second.height);
});

test('stand-ins for what isn’t loaded repeat the loaded shapes, so the height estimate holds', () => {
  const shape = (index: number) => [landscape, landscape, portrait, landscape, 1, portrait, landscape][(index * 5) % 7];
  const all = Array.from({length: 1000}, (_, index) => shape(index));
  const full = layoutRows({aspects: all, sections: [], placeholders: 0, metrics});
  const estimate = layoutRows({aspects: all.slice(0, 50), sections: [], placeholders: 950, metrics});
  const stand = estimate.sections.at(-1)!;
  expect(stand.key).toBe('placeholders');
  expect(stand.blocks.every(block => block.isPlaceholder)).toBe(true);
  expect(stand.blocks.reduce((n, block) => n + block.count, 0)).toBe(950);
  expect(Math.abs(estimate.height - full.height) / full.height).toBeLessThan(0.05);
  // Nothing loaded yet: the default shape.
  expect(layoutRows({aspects: [], sections: [], placeholders: 10, metrics}).blocks[0].isPlaceholder).toBe(true);
});

test('unknown and extreme sizes', () => {
  expect(aspectOf()).toBe(DEFAULT_ASPECT);
  expect(aspectOf(0, 100)).toBe(DEFAULT_ASPECT);
  expect(aspectOf(6000, 4000)).toBe(1.5);
  // A panorama gets a 3:1 tile and a sliver a 1:2 one; the tile shows the whole photo inside (data-fit).
  expect(aspectOf(20_000, 1000)).toBe(3);
  expect(aspectOf(100, 1000)).toBe(0.5);
});

test('up and down go to the nearest tile of the next row', () => {
  const aspects = [landscape, landscape, landscape, landscape, portrait, landscape, landscape, landscape];
  const layout = layoutRows({aspects, sections: [], placeholders: 0, metrics: {...metrics, width: 600}});
  expect(layout.rows.length).toBeGreaterThan(1);
  const first = layout.place(0);
  const below = nearestInRow(layout, 1, first.left + first.width / 2);
  expect(layout.rowOf[below]).toBe(1);
  expect(layout.place(below).left).toBeLessThan(first.left + first.width);
});

test('10,000 photos are laid out in milliseconds', () => {
  const aspects = new Float64Array(10_000).map((_, index) => (index % 5 === 0 ? portrait : landscape));
  const sections = Array.from({length: 30}, (_, i) => ({start: i * 333, key: String(i)}));
  const start = performance.now();
  const layout = layoutRows({aspects, sections, placeholders: 5000, metrics});
  expect(performance.now() - start).toBeLessThan(100);
  expect(layout.blockOf.length).toBe(10_000);
});

/** A gallery's mix as a photographer shoots it: mostly landscapes, a portrait in four, now and then a square or a panorama. */
function shotMix(length: number, seed = 7) {
  let state = seed;
  const random = () => (state = (state * 1103515245 + 12345) % 2147483648) / 2147483648;
  return Array.from({length}, () => {
    const r = random();
    return r < 0.6 ? landscape : r < 0.88 ? portrait : r < 0.96 ? 1 : aspectOf(4000 + random() * 8000, 1000);
  });
}

const heightsOf = (rows: {height: number}[]) => rows.slice(0, -1).map(row => row.height);
const share = (values: number[], test: (v: number) => boolean) => values.filter(test).length / values.length;

test('rows stay close to the target height, on a computer and on a phone', () => {
  const computer: RowMetrics = {width: 1120, rowHeight: 160, gap: 6, headingHeight: 40, sectionGap: 20, minTileWidth: 80};
  const phone: RowMetrics = {width: 374, rowHeight: 120, gap: 3, headingHeight: 40, sectionGap: 20, minTileWidth: 64};
  const quantile = (values: number[], q: number) => [...values].sort((a, b) => a - b)[Math.floor(q * (values.length - 1))];
  const offs = (m: RowMetrics) => {
    const aspects = shotMix(2000);
    return heightsOf(justify(aspects, 0, aspects.length, m)).map(h => Math.abs(h - m.rowHeight) / m.rowHeight);
  };
  // A computer's row holds about seven landscapes' worth: nine rows in ten within a tenth, all within a fifth.
  const wide = offs(computer);
  expect(share(wide, off => off <= 0.1)).toBeGreaterThan(0.9);
  expect(Math.max(...wide)).toBeLessThan(0.2);
  // A phone's holds about three and the photos keep their order: half within 5 %, two in three within a
  // tenth, nine in ten within a sixth. (The greedy breaking before: 72 to 116 px rows for 100 px.)
  const narrow = offs(phone);
  expect(quantile(narrow, 0.5)).toBeLessThan(0.05);
  expect(share(narrow, off => off <= 0.1)).toBeGreaterThan(0.65);
  expect(quantile(narrow, 0.9)).toBeLessThan(0.17);
  expect(Math.max(...narrow)).toBeLessThan(0.35);
});

test('a tile is never narrower than the smallest width while the photo can go to the next row', () => {
  const phone: RowMetrics = {width: 374, rowHeight: 120, gap: 3, headingHeight: 40, sectionGap: 20, minTileWidth: 64};
  const aspects = shotMix(1000, 11);
  const layout = layoutRows({aspects, sections: [], placeholders: 0, metrics: phone});
  for (let index = 0; index < aspects.length; index++) expect(layout.place(index).width).toBeGreaterThanOrEqual(phone.minTileWidth! - 1);
});

test('a panorama keeps the row’s height: it gets a 3:1 tile, not the row', () => {
  const m: RowMetrics = {width: 374, rowHeight: 120, gap: 3, headingHeight: 40, sectionGap: 20, minTileWidth: 72};
  const aspects = [landscape, portrait, aspectOf(12_000, 1000), landscape, landscape, portrait, portrait, landscape, landscape];
  const layout = layoutRows({aspects, sections: [], placeholders: 0, metrics: m});
  const panorama = layout.place(2);
  expect(panorama.width / panorama.height).toBeCloseTo(3, 1);
  expect(Math.abs(panorama.height - m.rowHeight) / m.rowHeight).toBeLessThan(0.15);
});

test('rows already laid out stay as they were when more items arrive', () => {
  const all = shotMix(600, 3);
  const m: RowMetrics = {width: 1120, rowHeight: 160, gap: 6, headingHeight: 40, sectionGap: 20, minTileWidth: 80};
  const whole = justify(all, 0, all.length, m);
  for (const loaded of [100, 232, 401]) {
    const part = justify(all, 0, loaded, m);
    // Every row that ends a window's length before what is loaded is final.
    const settled = part.filter(row => row.first + row.count + LOOKAHEAD <= loaded);
    expect(settled.length).toBeGreaterThan(0);
    expect(settled).toEqual(whole.slice(0, settled.length));
  }
});
