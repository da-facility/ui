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
  /** Stable while the block holds the same items (`keyOf` of its first item, else its place). */
  key: string;
  /** Distance from the top of the grid. */
  top: number;
  height: number;
  /** Its first item: the index of a loaded item, or (stand-ins) its place in the whole list. */
  first: number;
  /** The place of its first tile in the whole list, stand-ins counted. */
  position: number;
  count: number;
  /** Places of its tiles, in order, relative to the block. */
  tiles: Placed[];
  rows: Row[];
  /** Grey stand-ins for items that aren't loaded yet. */
  isPlaceholder: boolean;
};

export type SectionLayout = {
  key: string;
  /** Whether it has a heading (the section of `key`). */
  isTitled: boolean;
  /** Distance of the section (its heading) from the top of the grid. */
  top: number;
  height: number;
  /** Its first place in the whole list, and how many it holds, stand-ins counted. */
  first: number;
  count: number;
  blocks: Block[];
};

/** Where a stretch that isn't loaded stands, in pixels from the top of the grid. */
export type GapExtent = {
  /** Index into the input's `gaps`; -1 for `placeholders`. */
  gap: number;
  /** The loaded item after it (`aspects.length`: none). */
  at: number;
  /** Its first place in the whole list. */
  position: number;
  count: number;
  top: number;
  bottom: number;
};

export type GridLayout = {
  sections: SectionLayout[];
  height: number;
  /** For each loaded item: its block (index into `blocks`) and row (index into `rows`). */
  blockOf: Int32Array;
  rowOf: Int32Array;
  /** For each loaded item: its place in the whole list, the stand-ins before it counted. */
  positionOf: Int32Array;
  /** How many places the whole list has, stand-ins counted. */
  size: number;
  blocks: Block[];
  rows: (Row & {block: number})[];
  /** The stretches not loaded, in order. */
  gaps: GapExtent[];
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

/**
 * `justify` from the end: the rows end exactly at `to`, and the short row
 * (at the target height) is the first. For items that arrive before a place
 * the grid holds: the rows next to that place never change when more arrive
 * above them.
 */
export function justifyBackward(aspects: ArrayLike<number>, from: number, to: number, metrics: Pick<RowMetrics, 'width' | 'rowHeight' | 'gap' | 'minTileWidth'>) {
  const reversed = new Float64Array(to - from);
  for (let index = from; index < to; index++) reversed[to - 1 - index] = aspects[index];
  return justify(reversed, 0, reversed.length, metrics)
    .reverse()
    .map(row => ({first: to - (row.first + row.count), count: row.count, height: row.height}));
}

/** A stretch of the list that isn't loaded, for `layoutRows`. */
export type LayoutGap = {
  /** Where it stands: just before the loaded item `at` (`aspects.length`: after the last). */
  at: number;
  /** How many items it holds, exact or estimated. */
  count: number;
  /** Its items by section, in order, the counts adding up to `count`. None: the section around it. */
  sections?: {key: string; count: number}[];
};

/**
 * Where rows of loaded items must start (indices into `aspects`), and how
 * the rows from there to the next one are laid out: `forward` from it (its
 * last row short, at the target height), or `backward` from the next one
 * (its first row short). Rows between two such places depend only on the
 * items between them.
 */
export type LayoutPins = ReadonlyMap<number, 'forward' | 'backward'>;

export type LayoutInput = {
  /** Shapes of the loaded items (`aspectOf`), in the list's order. */
  aspects: ArrayLike<number>;
  /** Where each section starts among the loaded items (indices into `aspects`, ascending) and its key; none: one section without a heading. */
  sections: {start: number; key: string}[];
  /** Items not loaded yet, drawn as grey stand-ins after everything else, without a heading. */
  placeholders: number;
  /**
   * Stretches not loaded yet between, before or after the loaded items, in
   * the order they stand. Stand-ins take their room, under their sections'
   * headings; a section that goes on from a stretch into loaded items (the
   * same key) has one heading.
   */
  gaps?: readonly LayoutGap[];
  /**
   * Places where rows start (`LayoutPins`). Without them, a run of loaded
   * items that follows a stretch not loaded is laid out from its first item.
   */
  pins?: LayoutPins;
  /** A loaded item's stable key, for the key of the block it starts. */
  keyOf?: (index: number) => string;
  /**
   * The stand-ins' shapes, repeated in turn: the loaded items' own
   * (`aspects`), so the stand-ins break into rows as the real mix does and
   * the estimated height holds when they arrive. Empty: `DEFAULT_ASPECT`.
   */
  placeholderShapes?: ArrayLike<number>;
  metrics: RowMetrics;
};

type Part =
  | {kind: 'items'; from: number; to: number; position: number; afterGap: boolean}
  | {kind: 'gap'; gap: number; at: number; count: number; position: number};
type Span = {key: string; isTitled: boolean; parts: Part[]};

/**
 * The whole grid: sections, their blocks of rows and every tile's place.
 * Places in the whole list count the stand-ins of every stretch before them,
 * so an item's place never depends on what is loaded.
 */
export function layoutRows({aspects, sections, placeholders, gaps = [], pins, keyOf, placeholderShapes = aspects, metrics}: LayoutInput): GridLayout {
  const n = aspects.length;
  const blockOf = new Int32Array(n);
  const rowOf = new Int32Array(n);
  const positionOf = new Int32Array(n);
  const blocks: Block[] = [];
  const allRows: (Row & {block: number})[] = [];
  const out: SectionLayout[] = [];
  const extents: GapExtent[] = [];
  const hasHeadings = sections.length > 0;

  // The list as spans (one per section) of parts: runs of loaded items and stretches of stand-ins.
  const starts = new Map(sections.map(s => [s.start, s.key]));
  const byAt = new Map<number, number[]>();
  gaps.forEach((gap, index) => { if (gap.count > 0) byAt.set(gap.at, [...(byAt.get(gap.at) ?? []), index]); });
  const spans: Span[] = [];
  let current: Span | null = null;
  let leading: Part[] = [];
  let position = 0;
  let itemKey = hasHeadings ? sections[0]?.key ?? 'all' : 'all';
  const open = (key: string, isTitled: boolean) => {
    current = {key, isTitled, parts: leading};
    leading = [];
    spans.push(current);
    return current;
  };
  for (let at = 0; at <= n; at++) {
    for (const index of byAt.get(at) ?? []) {
      const gap = gaps[index];
      const parts = hasHeadings && gap.sections?.length ? gap.sections.filter(s => s.count > 0) : [{key: null, count: gap.count}];
      for (const part of parts) {
        const piece: Part = {kind: 'gap', gap: index, at, count: part.count, position};
        position += part.count;
        if (part.key === null) {
          if (current) (current as Span).parts.push(piece);
          else leading.push(piece);
        } else {
          const span: Span = current && (current as Span).key === part.key ? current : open(part.key, true);
          span.parts.push(piece);
        }
      }
    }
    if (at === n) break;
    if (hasHeadings && starts.has(at)) itemKey = starts.get(at)!;
    const span: Span = current && (current as Span).key === itemKey ? current : open(itemKey, hasHeadings);
    const last = span.parts.at(-1);
    positionOf[at] = position;
    if (last?.kind === 'items' && last.to === at) last.to = at + 1;
    else span.parts.push({kind: 'items', from: at, to: at + 1, position, afterGap: last?.kind === 'gap'});
    position++;
  }
  if (leading.length) open('all', false);
  if (placeholders > 0) {
    spans.push({key: 'placeholders', isTitled: false, parts: [{kind: 'gap', gap: -1, at: n, count: placeholders, position}]});
    position += placeholders;
  }

  const shapesFor = (from: number, count: number) => {
    const shapes = new Float64Array(count);
    for (let index = 0; index < count; index++)
      shapes[index] = placeholderShapes.length ? placeholderShapes[(from + index) % placeholderShapes.length] : DEFAULT_ASPECT;
    return shapes;
  };

  let top = 0;
  for (const span of spans) {
    if (out.length) top += span.key === 'placeholders' ? metrics.gap : metrics.sectionGap;
    const first = span.parts[0];
    const section: SectionLayout = {key: span.key, isTitled: span.isTitled, top, height: span.isTitled ? metrics.headingHeight : 0, first: first ? first.position : position, count: 0, blocks: []};
    let y = 0;
    // Rows, cut into blocks of whole rows (from the end for rows laid out backward, so the blocks next to the place they keep stay the same).
    const addRows = (rows: {first: number; count: number; height: number}[], shapes: ArrayLike<number>, offset: number, isPlaceholder: boolean, fromEnd: boolean, positionOfFirst: number) => {
      const chunks: (typeof rows)[] = [];
      if (fromEnd) for (let end = rows.length; end > 0; end -= ROWS_PER_BLOCK) chunks.unshift(rows.slice(Math.max(0, end - ROWS_PER_BLOCK), end));
      else for (let start = 0; start < rows.length; start += ROWS_PER_BLOCK) chunks.push(rows.slice(start, start + ROWS_PER_BLOCK));
      for (const chunk of chunks) {
        if (y > 0) y += metrics.gap;
        const tiles: Placed[] = [];
        const blockRows: Row[] = [];
        let height = 0;
        for (const row of chunk) {
          if (height > 0) height += metrics.gap;
          const h = placeRow(shapes, row, height, metrics.gap, tiles);
          blockRows.push({first: row.first + offset, count: row.count, top: height, height: h});
          height += h;
        }
        const firstIndex = chunk[0].first + offset;
        const blockPosition = positionOfFirst + chunk[0].first;
        const block: Block = {
          key: isPlaceholder ? `${span.key}:p${blockPosition}` : keyOf ? `i:${keyOf(firstIndex)}` : `${span.key}:${firstIndex}`,
          top: section.top + section.height + y,
          height,
          first: isPlaceholder ? blockPosition : firstIndex,
          position: blockPosition,
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
        y += height;
      }
    };
    for (const part of span.parts) {
      section.count += part.kind === 'gap' ? part.count : part.to - part.from;
      if (part.kind === 'gap') {
        const shapes = shapesFor(part.position, part.count);
        const before = blocks.length;
        addRows(justify(shapes, 0, part.count, metrics), shapes, 0, true, false, part.position);
        const own = blocks.slice(before);
        const extent = {gap: part.gap, at: part.at, position: part.position, count: part.count, top: own[0].top, bottom: own.at(-1)!.top + own.at(-1)!.height};
        const previous = extents.at(-1);
        if (previous && previous.gap === part.gap && previous.gap !== -1) {
          previous.count += part.count;
          previous.bottom = extent.bottom;
        } else extents.push(extent);
        continue;
      }
      // A run of loaded items, cut where rows must start.
      const cuts = [part.from];
      if (pins) for (let index = part.from + 1; index < part.to; index++) if (pins.has(index)) cuts.push(index);
      cuts.push(part.to);
      for (let c = 0; c + 1 < cuts.length; c++) {
        const [from, to] = [cuts[c], cuts[c + 1]];
        const backward = pins?.has(from) ? pins.get(from) === 'backward' : c === 0 && part.afterGap && cuts.length > 2;
        const rows = backward ? justifyBackward(aspects, from, to, metrics) : justify(aspects, from, to, metrics);
        addRows(rows, aspects, 0, false, backward, part.position - part.from);
      }
    }
    section.height += y;
    out.push(section);
    top += section.height;
  }
  return {
    sections: out,
    height: top,
    blockOf,
    rowOf,
    positionOf,
    size: position,
    blocks,
    rows: allRows,
    gaps: extents,
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
