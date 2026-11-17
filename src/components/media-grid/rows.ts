/**
 * Justified rows for `MediaGrid`'s `layout="rows"`: every photo whole, at its
 * own shape, in rows of one height that fill the width; the last row of a
 * section keeps the target height instead of stretching. Pure functions, so
 * the whole layout of 10,000 photos is known (and tested) without the DOM.
 */

/**
 * A tile's shape stays within this range: a panorama wider than 3:1 gets a
 * 3:1 tile and a sliver taller than 1:2 a 1:2 one, with the whole photo shown
 * inside it (never cropped). So one panorama can't take a row's width from
 * its neighbours, and a row keeps its height.
 */
export const MIN_ASPECT = 0.5;
export const MAX_ASPECT = 3;
/** The shape of an item whose size isn't known: it never changes when the image arrives. */
export const DEFAULT_ASPECT = 3 / 2;
/** About this many rows share one block, the unit that is drawn or left empty. */
export const ROWS_PER_BLOCK = 6;

export type RowMetrics = {
  /** Width of the grid. */
  width: number;
  /** Height a row aims at; full rows are a little lower or higher so they fill the width exactly. */
  rowHeight: number;
  /** Space between tiles and between rows. */
  gap: number;
  /** Height of a section's heading, with the space under it. */
  headingHeight: number;
  /** Space above every section but the first. */
  sectionGap: number;
  /**
   * The narrowest a tile should be: a row that would make a tile narrower
   * goes to its next height instead (a photo moves to the next row). 0: no
   * smallest width.
   */
  minTileWidth?: number;
};

/** One tile's place inside its block. */
export type Placed = {left: number; top: number; width: number; height: number};

export type Row = {first: number; count: number; top: number; height: number};

export type Block = {
  /** Stable while the block holds the same items: `<section>:<n>`. */
  key: string;
  /** Distance from the top of the grid. */
  top: number;
  height: number;
  first: number;
  count: number;
  /** Places of its tiles, in order, relative to the block. */
  tiles: Placed[];
  rows: Row[];
  /** Grey stand-ins for items that aren't loaded yet. */
  isPlaceholder: boolean;
};

export type SectionLayout = {
  key: string;
  /** Index of the first item in the section heading list (`MediaGrid`'s sections). */
  heading: number | null;
  /** Distance of the section (its heading) from the top of the grid. */
  top: number;
  height: number;
  first: number;
  count: number;
  blocks: Block[];
};

export type GridLayout = {
  sections: SectionLayout[];
  height: number;
  /** For each loaded item: its block (index into `blocks`) and row (index into `rows`). */
  blockOf: Int32Array;
  rowOf: Int32Array;
  blocks: Block[];
  rows: (Row & {block: number})[];
  /** Places of loaded items relative to the grid: left, top, width, height. */
  place: (index: number) => Placed;
};

/** An item's shape for the layout: its width over its height, within the range above. */
export function aspectOf(width?: number, height?: number) {
  if (!width || !height || width <= 0 || height <= 0) return DEFAULT_ASPECT;
  return Math.min(MAX_ASPECT, Math.max(MIN_ASPECT, width / height));
}

/** How many items ahead a row's break looks. A row depends on these only, so rows already laid out never change when later items arrive. */
export const LOOKAHEAD = 48;
/** A row is never more than this many times its target height off (above it, or below its inverse). */
const MAX_STRETCH = 2.5;

/**
 * Breaks one section's shapes into rows that fill the width, each as close
 * to the target height as the shapes allow. Every row is chosen as the first
 * row of the best breaking of the next `LOOKAHEAD` items (the least sum of
 * squared relative distances from the target, a tile under `minTileWidth`
 * counting as far off as twice the target), so a hard shape is balanced
 * over the rows around it instead of the row it lands in, and a row depends
 * on nothing after that window. The last row keeps the target height and is
 * narrower than the grid; when more items of the section arrive, it takes
 * them in.
 */
export function justify(aspects: ArrayLike<number>, from: number, to: number, metrics: Pick<RowMetrics, 'width' | 'rowHeight' | 'gap' | 'minTileWidth'>) {
  const {width, rowHeight, gap} = metrics;
  const minTile = metrics.minTileWidth ?? 0;
  const rows: {first: number; count: number; height: number}[] = [];
  const window = LOOKAHEAD + 1;
  const best = new Float64Array(window + 1);
  const cut = new Int32Array(window + 1);
  const short = new Uint8Array(window + 1);
  let first = from;
  while (first < to) {
    const end = Math.min(to, first + LOOKAHEAD);
    const length = end - first;
    best.fill(Infinity, 0, length + 1);
    best[0] = 0;
    for (let a = 0; a < length; a++) {
      if (best[a] === Infinity) continue;
      let sum = 0;
      let narrowest = Infinity;
      for (let b = a + 1; b <= length; b++) {
        const aspect = aspects[first + b - 1];
        sum += aspect;
        narrowest = Math.min(narrowest, aspect);
        const count = b - a;
        const widthAtTarget = sum * rowHeight + (count - 1) * gap;
        // The window's end: a row that doesn't reach the width waits for more items, at the target height.
        if (b === length && widthAtTarget <= width) {
          if (best[a] < best[b]) {
            best[b] = best[a];
            cut[b] = a;
            short[b] = 1;
          }
          continue;
        }
        const height = (width - (count - 1) * gap) / sum;
        // Lower rows only get lower with more items.
        if (height * MAX_STRETCH < rowHeight && count > 1) break;
        if (height > rowHeight * MAX_STRETCH && b < length) continue;
        const off = (height - rowHeight) / rowHeight;
        let cost = off * off;
        if (narrowest * height < minTile) cost += 0.5 * (1 + (minTile - narrowest * height) / minTile);
        if (best[a] + cost < best[b]) {
          best[b] = best[a] + cost;
          cut[b] = a;
          short[b] = 0;
        }
      }
    }
    // The first row of the best breaking.
    let b = length;
    while (cut[b] !== 0) b = cut[b];
    if (short[b] && b === length && end === to) {
      rows.push({first, count: b, height: rowHeight});
    } else {
      let sum = 0;
      for (let index = first; index < first + b; index++) sum += aspects[index];
      rows.push({first, count: b, height: (width - (b - 1) * gap) / sum});
    }
    first += b;
  }
  return rows;
}

/**
 * Pixel places for one row: the tiles' edges are rounded once, so the row is
 * exactly as wide as computed and every gap is the same.
 */
function placeRow(aspects: ArrayLike<number>, row: {first: number; count: number; height: number}, top: number, gap: number, out: Placed[]) {
  const height = Math.round(row.height);
  let x = 0;
  for (let index = row.first; index < row.first + row.count; index++) {
    const left = Math.round(x);
    x += aspects[index] * row.height;
    const right = Math.round(x);
    out.push({left, top, width: Math.max(1, right - left), height});
    x += gap;
  }
  return height;
}

export type LayoutInput = {
  /** Shapes of the loaded items (`aspectOf`). */
  aspects: ArrayLike<number>;
  /** Where each section starts (indices into `aspects`, ascending, the first 0) and its key; none: one section without a heading. */
  sections: {start: number; key: string}[];
  /** Items not loaded yet, drawn as grey stand-ins after the loaded ones. */
  placeholders: number;
  /**
   * Their shapes, repeated in turn: the loaded items' own (`aspects`), so the
   * stand-ins break into rows as the real mix does and the estimated height
   * holds when they arrive. Empty: `DEFAULT_ASPECT`.
   */
  placeholderShapes?: ArrayLike<number>;
  metrics: RowMetrics;
};

/** The whole grid: sections, their blocks of rows and every tile's place. */
export function layoutRows({aspects, sections, placeholders, placeholderShapes = aspects, metrics}: LayoutInput): GridLayout {
  const n = aspects.length;
  const blockOf = new Int32Array(n);
  const rowOf = new Int32Array(n);
  const blocks: Block[] = [];
  const allRows: (Row & {block: number})[] = [];
  const out: SectionLayout[] = [];
  const hasHeadings = sections.length > 0;
  const spans = hasHeadings
    ? sections.map((s, i) => ({key: s.key, heading: i as number | null, first: s.start, end: i + 1 < sections.length ? sections[i + 1].start : n}))
    : n > 0 ? [{key: 'all', heading: null as number | null, first: 0, end: n}] : [];
  let top = 0;
  const addBlocks = (section: SectionLayout, rows: {first: number; count: number; height: number}[], shapes: ArrayLike<number>, offset: number, isPlaceholder: boolean) => {
    let y = 0;
    for (let start = 0; start < rows.length; start += ROWS_PER_BLOCK) {
      const tiles: Placed[] = [];
      const blockRows: Row[] = [];
      let height = 0;
      for (const row of rows.slice(start, start + ROWS_PER_BLOCK)) {
        if (height > 0) height += metrics.gap;
        const h = placeRow(shapes, row, height, metrics.gap, tiles);
        blockRows.push({first: row.first + offset, count: row.count, top: height, height: h});
        height += h;
      }
      const block: Block = {
        key: `${section.key}:${start / ROWS_PER_BLOCK}`,
        top: section.top + section.height + y,
        height,
        first: rows[start].first + offset,
        count: tiles.length,
        tiles,
        rows: blockRows,
        isPlaceholder,
      };
      const blockIndex = blocks.length;
      blocks.push(block);
      section.blocks.push(block);
      for (const row of blockRows) {
        const rowIndex = allRows.length;
        allRows.push({...row, block: blockIndex});
        if (!isPlaceholder)
          for (let index = row.first; index < row.first + row.count; index++) {
            blockOf[index] = blockIndex;
            rowOf[index] = rowIndex;
          }
      }
      y += height + metrics.gap;
    }
    section.height += Math.max(0, y - metrics.gap);
  };
  for (const span of spans) {
    if (out.length) top += metrics.sectionGap;
    const section: SectionLayout = {key: span.key, heading: span.heading, top, height: span.heading === null ? 0 : metrics.headingHeight, first: span.first, count: span.end - span.first, blocks: []};
    addBlocks(section, justify(aspects, span.first, span.end, metrics), aspects, 0, false);
    out.push(section);
    top += section.height;
  }
  if (placeholders > 0) {
    if (out.length) top += metrics.gap;
    const shapes = new Float64Array(placeholders);
    for (let index = 0; index < placeholders; index++)
      shapes[index] = placeholderShapes.length ? placeholderShapes[index % placeholderShapes.length] : DEFAULT_ASPECT;
    const section: SectionLayout = {key: 'placeholders', heading: null, top, height: 0, first: n, count: placeholders, blocks: []};
    addBlocks(section, justify(shapes, 0, placeholders, metrics), shapes, n, true);
    out.push(section);
    top += section.height;
  }
  return {
    sections: out,
    height: top,
    blockOf,
    rowOf,
    blocks,
    rows: allRows,
    place(index) {
      const block = blocks[blockOf[index]];
      const tile = block.tiles[index - block.first];
      return {...tile, top: block.top + tile.top};
    },
  };
}

/** The item in the row `rowIndex` whose middle is nearest `x`: moving up or down. */
export function nearestInRow(layout: GridLayout, rowIndex: number, x: number) {
  const row = layout.rows[rowIndex];
  const block = layout.blocks[row.block];
  let best = row.first;
  let distance = Infinity;
  for (let index = row.first; index < row.first + row.count; index++) {
    const tile = block.tiles[index - block.first];
    const d = Math.abs(tile.left + tile.width / 2 - x);
    if (d < distance) {
      distance = d;
      best = index;
    }
  }
  return best;
}
