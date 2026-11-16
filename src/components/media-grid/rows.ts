/**
 * Justified rows for `MediaGrid`'s `layout="rows"`: every photo whole, at its
 * own shape, in rows of one height that fill the width; the last row of a
 * section keeps the target height instead of stretching. Pure functions, so
 * the whole layout of 10,000 photos is known (and tested) without the DOM.
 */

/** Shapes outside this range (panoramas, slivers) are drawn at its edge, cropped a little. */
export const MIN_ASPECT = 0.25;
export const MAX_ASPECT = 5;
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

/**
 * Breaks one section's shapes into rows. A row takes items until it is as
 * wide as the grid at the target height, then is scaled to fill the width
 * exactly; it ends before or after the item that crosses the edge, whichever
 * keeps its height closer to the target. The last row keeps the target height
 * and is narrower than the grid; when more items of the section arrive, it
 * takes them in.
 */
export function justify(aspects: ArrayLike<number>, from: number, to: number, metrics: Pick<RowMetrics, 'width' | 'rowHeight' | 'gap'>) {
  const {width, rowHeight, gap} = metrics;
  const rows: {first: number; count: number; height: number}[] = [];
  let first = from;
  let sum = 0;
  for (let index = from; index < to; index++) {
    sum += aspects[index];
    const count = index - first + 1;
    const widthAtTarget = sum * rowHeight + (count - 1) * gap;
    if (widthAtTarget < width) continue;
    // Too wide with this item: end the row here, or just before it.
    const withIt = (width - (count - 1) * gap) / sum;
    const without = count > 1 ? (width - (count - 2) * gap) / (sum - aspects[index]) : Infinity;
    if (count > 1 && Math.abs(without - rowHeight) < Math.abs(withIt - rowHeight)) {
      rows.push({first, count: count - 1, height: without});
      first = index;
      sum = aspects[index];
      // The item starts the next row; it may already fill it on its own.
      if (sum * rowHeight >= width) {
        rows.push({first, count: 1, height: width / sum});
        first = index + 1;
        sum = 0;
      }
    } else {
      rows.push({first, count, height: withIt});
      first = index + 1;
      sum = 0;
    }
  }
  if (first < to) rows.push({first, count: to - first, height: rowHeight});
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
