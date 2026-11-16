import {expect, test} from '@playwright/test';
import {aspectOf, DEFAULT_ASPECT, justify, layoutRows, nearestInRow, ROWS_PER_BLOCK, type RowMetrics} from '../src/components/media-grid/rows';

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
  expect(aspectOf(20_000, 1000)).toBe(5);
  expect(aspectOf(100, 1000)).toBe(0.25);
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
