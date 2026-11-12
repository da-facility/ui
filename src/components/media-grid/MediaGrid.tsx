import {memo, useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent} from 'react';
import {useMessages} from '../../i18n';
import {Tile, type MediaTileState} from './MediaTile';
import './media-grid.css';

export type MediaGridItem = {
  /** Stable id, used for selection and to find the item again after a remount. */
  id: string;
  /** The small rendition shown in the tile. */
  src?: string;
  /**
   * Why there is no image, for an item that exists: `pending` while it is
   * being made, `failed` when it can't be. The tile can still be opened and
   * selected, and shows a quiet well (with a broken-image mark when failed).
   * Ignored when `src` is set.
   */
  state?: MediaTileState;
  /** Text for the image, such as a headline, caption or file name. */
  alt: string;
  /** Intrinsic size of the image. */
  width?: number;
  height?: number;
};

export type MediaGridProps<Item extends MediaGridItem> = {
  /** Everything loaded so far, in the order to show. New pages go at the end; the grid never reorders. */
  items: readonly Item[];
  /** Each tile's link, such as the viewer's route for that item. Read when its part of the grid renders. */
  getHref: (item: Item, index: number) => string;
  /**
   * The selected ids. The page keeps the selection, so it survives paging
   * and remounts. Leave out with `onSelectionChange` for a grid without selection.
   */
  selectedIds?: ReadonlySet<string>;
  /**
   * Called with the new selection: the circle, Space, Shift-click or
   * Shift+Space for a range from the last toggled tile, a long press on touch
   * screens, and Ctrl/Cmd+A for everything loaded.
   */
  onSelectionChange?: (selectedIds: Set<string>) => void;
  /** Called when a tile's link is followed, before it navigates. Call `event.preventDefault()` to open it yourself. */
  onOpen?: (item: Item, index: number, event: MouseEvent<HTMLAnchorElement>) => void;
  /**
   * Asks for the next page once the end of the grid is within two screens.
   * Return a promise, or set `isLoading`, while it loads. Pages may be
   * shorter than asked; the grid keeps asking until `isDone`.
   */
  onLoadMore?: () => void | Promise<unknown>;
  /** No more pages to load. */
  isDone?: boolean;
  /** A page is loading: a row of empty wells shows where it will go. */
  isLoading?: boolean;
  /**
   * Item to focus and bring into view when the grid mounts, such as the one
   * the viewer showed last. Without it, the grid returns to the tile that was
   * opened, at the same place on screen, when it remounts after opening it.
   */
  focusId?: string;
  /** Accessible name of the grid. Defaults to "Gallery". */
  label?: string;
  /** Key under which the opened tile is remembered for returning to it. Defaults to the page's path and query. */
  restoreKey?: string;
};

type Layout = {columns: number; tileHeight: number; gap: number};

/** About this many tiles share one block that the browser skips while it is off screen. */
const CHUNK_TILES = 96;
/** Tiles rendered before the columns are measured: more than a large screen holds. */
const FIRST_TILES = 240;
/** The last measured layout, so a remounted grid starts with the right blocks and height. */
let lastLayout: Layout | null = null;
/** Tiles opened from a grid, by page, to return to when the grid comes back. */
const opened = new Map<string, {id: string; top: number; at: number}>();

/**
 * Images as an even grid of 3:2 tiles that loads more as the person scrolls.
 *
 * It stays smooth with tens of thousands of items without scroll listeners:
 * every tile is in the document, so find in page, tab order and screen readers
 * work, but tiles are grouped into blocks of whole rows with
 * `content-visibility: auto` and an exact `contain-intrinsic-size`, so the
 * browser lays out and paints only the blocks near the screen. The column
 * count comes from the CSS grid itself (a `ResizeObserver` reads it), and an
 * `IntersectionObserver` asks for more.
 */
export function MediaGrid<Item extends MediaGridItem>({
  items,
  getHref,
  selectedIds,
  onSelectionChange,
  onOpen,
  onLoadMore,
  isDone = false,
  isLoading = false,
  focusId,
  label,
  restoreKey,
}: MediaGridProps<Item>) {
  const t = useMessages();
  const rootRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<Layout | null>(lastLayout);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPending, setPending] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const anchor = useRef<number | null>(null);
  const isSelectable = Boolean(onSelectionChange);
  const selected = selectedIds ?? EMPTY;

  // Handlers read the latest props through a ref, so tiles get the same
  // functions on every render and only the tiles that change re-render.
  const latest = useRef({items, selected, onSelectionChange, onOpen, getHref, layout, restoreKey});
  latest.current = {items, selected, onSelectionChange, onOpen, getHref, layout, restoreKey};

  // The columns are whatever the CSS grid makes of the width; read them, and
  // again whenever the width changes.
  useLayoutEffect(() => {
    const probe = probeRef.current!;
    const measure = () => {
      const style = getComputedStyle(probe);
      const columns = style.gridTemplateColumns.split(' ').filter(track => track.endsWith('px')).length;
      if (columns === 0) return;
      // The track count comes from the grid; the width from the box itself,
      // because engines round an empty grid's tracks differently.
      const gap = parseFloat(style.columnGap) || 0;
      const content = probe.getBoundingClientRect().width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const width = (content - (columns - 1) * gap) / columns;
      const next = {columns, tileHeight: round(width * 2 / 3), gap};
      lastLayout = next;
      setLayout(current => current && current.columns === next.columns && current.tileHeight === next.tileHeight && current.gap === next.gap ? current : next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(probe);
    return () => observer.disconnect();
  }, []);

  const isWaiting = isLoading || isPending || (!isDone && items.length === 0 && Boolean(onLoadMore));
  const columns = layout?.columns ?? 0;
  const wells = !isWaiting || isDone ? 0 : columns ? (columns - items.length % columns) % columns + columns : 6;
  const total = items.length + wells;

  // Load more when the end comes within two screens. A new observer after
  // every page reports straight away if the end is still close, so short
  // pages keep the loading going until the grid fills or the source is done.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !onLoadMore || isDone || isLoading || isPending) return;
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      const result = onLoadMore();
      if (result && typeof (result as Promise<unknown>).then === 'function') {
        setPending(true);
        (result as Promise<unknown>).catch(() => {}).finally(() => setPending(false));
      }
    }, {rootMargin: '0px 0px 200% 0px'});
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [onLoadMore, isDone, isLoading, isPending, items.length, layout]);

  const tileLink = useCallback((index: number) =>
    rootRef.current?.querySelector<HTMLAnchorElement>(`.media-tile[data-index="${index}"] .media-tile__link`) ?? null, []);

  // Coming back after a tile was opened: the same tile at the same place on
  // screen, focused. Or the tile the app names, such as the viewer's last.
  useLayoutEffect(() => {
    const key = restoreKey ?? currentPath();
    const entry = opened.get(key);
    const targetId = focusId ?? entry?.id;
    opened.delete(key);
    if (!targetId) return;
    const index = items.findIndex(item => item.id === targetId);
    const link = index < 0 ? null : tileLink(index);
    if (!link) return;
    if (entry && entry.id === targetId) window.scrollBy(0, link.getBoundingClientRect().top - entry.top);
    else link.scrollIntoView({block: 'nearest'});
    setActiveIndex(index);
    link.focus({preventScroll: true});
    // Only on mount: later changes to `focusId` are the app following along.
  }, []);

  const toggle = useCallback((index: number, isRange: boolean) => {
    const {items, selected, onSelectionChange} = latest.current;
    const item = items[index];
    if (!item || !onSelectionChange) return;
    const next = new Set(selected);
    if (isRange && anchor.current != null && items[anchor.current]) {
      const [from, to] = [Math.min(anchor.current, index), Math.max(anchor.current, index)];
      for (let at = from; at <= to; at++) next.add(items[at].id);
    } else {
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
    }
    anchor.current = index;
    setActiveIndex(index);
    onSelectionChange(next);
  }, []);

  const open = useCallback((index: number, event: MouseEvent<HTMLAnchorElement>) => {
    const {items, onOpen, restoreKey} = latest.current;
    setActiveIndex(index);
    if (event.metaKey || event.ctrlKey || event.altKey || event.button !== 0) return;
    opened.set(restoreKey ?? currentPath(), {id: items[index].id, top: event.currentTarget.getBoundingClientRect().top, at: Date.now()});
    onOpen?.(items[index], index, event);
  }, []);

  const keyDown = useCallback((index: number, event: KeyboardEvent<HTMLAnchorElement>) => {
    const {items, layout, onSelectionChange} = latest.current;
    const columns = layout?.columns ?? 1;
    const last = items.length - 1;
    const isCommand = event.ctrlKey || event.metaKey;
    const move = (to: number) => {
      const target = Math.max(0, Math.min(last, to));
      event.preventDefault();
      setActiveIndex(target);
      tileLink(target)?.focus();
    };
    const rowStart = index - index % columns;
    switch (event.key) {
      case 'ArrowRight': return move(index + 1);
      case 'ArrowLeft': return move(index - 1);
      case 'ArrowDown': return index + columns <= last ? move(index + columns) : undefined;
      case 'ArrowUp': return index - columns >= 0 ? move(index - columns) : undefined;
      case 'Home': return move(isCommand ? 0 : rowStart);
      case 'End': return move(isCommand ? last : rowStart + columns - 1);
      case ' ':
        if (!onSelectionChange || isCommand || event.altKey) return;
        event.preventDefault();
        return toggle(index, event.shiftKey);
      case 'a':
      case 'A':
        if (!onSelectionChange || !isCommand || event.altKey || event.shiftKey) return;
        event.preventDefault();
        onSelectionChange(new Set(items.map(item => item.id)));
        setAnnouncement(t('@da-facility.mediaGrid.selectedAll', {count: items.length}));
    }
  }, [t, tileLink, toggle]);

  // Rows grouped into blocks. Before the first measurement (and on the
  // server) the first tiles render as one plain grid, enough to fill a screen;
  // the rest follow once the columns are known.
  const rowsPerChunk = columns ? Math.max(4, Math.ceil(CHUNK_TILES / columns)) : 0;
  const chunkSize = columns ? rowsPerChunk * columns : FIRST_TILES;
  const shown = columns ? total : Math.min(total, FIRST_TILES);
  const chunks: number[] = [];
  for (let start = 0; start < shown; start += chunkSize) chunks.push(start);
  const active = Math.min(activeIndex, Math.max(0, items.length - 1));

  return <div
    ref={rootRef}
    className="media-grid"
    role="group"
    aria-label={label ?? t('@da-facility.mediaGrid.label')}
    aria-busy={isWaiting || undefined}
    data-selecting={selected.size > 0 || undefined}
  >
    <div ref={probeRef} className="media-grid__probe" aria-hidden="true" />
    <div className="media-grid__chunks">
      {chunks.map(start => <Chunk
        key={start}
        items={items}
        start={start}
        end={Math.min(start + chunkSize, shown)}
        layout={layout}
        selected={selected}
        isSelectable={isSelectable}
        isSelecting={selected.size > 0}
        active={active}
        getHref={getHref}
        onToggle={toggle}
        onOpen={open}
        onKeyDown={keyDown}
      />)}
    </div>
    <div ref={sentinelRef} className="media-grid__sentinel" />
    <div className="media-grid__announcer" role="status">{announcement}</div>
  </div>;
}

type ChunkProps = {
  items: readonly MediaGridItem[];
  start: number;
  end: number;
  layout: Layout | null;
  selected: ReadonlySet<string>;
  isSelectable: boolean;
  isSelecting: boolean;
  active: number;
  getHref: (item: never, index: number) => string;
  onToggle: (index: number, isRange: boolean) => void;
  onOpen: (index: number, event: MouseEvent<HTMLAnchorElement>) => void;
  onKeyDown: (index: number, event: KeyboardEvent<HTMLAnchorElement>) => void;
};

/** A block of whole rows that the browser skips while it is off screen. */
const Chunk = memo(function Chunk({items, start, end, layout, selected, isSelectable, isSelecting, active, getHref, onToggle, onOpen, onKeyDown}: ChunkProps) {
  const tiles = [];
  for (let index = start; index < end; index++) {
    const item = items[index];
    tiles.push(item
      ? <Tile
          key={item.id}
          index={index}
          src={item.src}
          state={item.state}
          alt={item.alt}
          width={item.width}
          height={item.height}
          href={(getHref as (item: MediaGridItem, index: number) => string)(item, index)}
          isSelected={selected.has(item.id)}
          isSelectable={isSelectable}
          isSelecting={isSelecting}
          tabIndex={index === active ? 0 : -1}
          onToggle={onToggle}
          onOpen={onOpen}
          onKeyDown={onKeyDown}
        />
      : <Tile key={`well-${index}`} index={index} alt="" href="" isSelectable={false} />);
  }
  let style: CSSProperties | undefined;
  if (layout) {
    const rows = Math.ceil((end - start) / layout.columns);
    style = {containIntrinsicHeight: `auto ${round(rows * layout.tileHeight + (rows - 1) * layout.gap)}px`};
  }
  return <div className="media-grid__chunk" data-windowed={layout ? true : undefined} style={style}>{tiles}</div>;
}, (previous, next) => {
  if (previous.start !== next.start || previous.end !== next.end || previous.layout !== next.layout
    || previous.isSelectable !== next.isSelectable || previous.isSelecting !== next.isSelecting
    || previous.onToggle !== next.onToggle || previous.onOpen !== next.onOpen || previous.onKeyDown !== next.onKeyDown) return false;
  const inRange = (index: number) => index >= next.start && index < next.end;
  if (previous.active !== next.active && (inRange(previous.active) || inRange(next.active))) return false;
  for (let index = next.start; index < next.end; index++) {
    const before = previous.items[index];
    const after = next.items[index];
    if (before !== after) return false;
    if (after && previous.selected.has(after.id) !== next.selected.has(after.id)) return false;
  }
  return true;
});

const EMPTY: ReadonlySet<string> = new Set();

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function currentPath() {
  return typeof location === 'undefined' ? '' : location.pathname + location.search;
}
