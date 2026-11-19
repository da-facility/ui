import {createElement, memo, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent} from 'react';
import {useMessages} from '../../i18n';
import {Tile} from './MediaTile';
import {aspectOf, layoutRows, nearestInRow, type Block, type GridLayout, type LayoutGap, type RowMetrics} from './rows';
import {currentPath, opened} from './restore';
import type {MediaGridGap, MediaGridGapRequest, MediaGridItem, MediaGridProps, MediaGridSection} from './MediaGrid';

/** Blocks within this many screens above and below the window are drawn. */
const DRAWN_SCREENS = 1;
/** Before the grid is measured (and on the server), this many tiles are drawn in plain rows. */
const FIRST_TILES = 60;
/** The last measured metrics, so a remounted grid starts with the right layout and height. */
let lastMetrics: RowMetrics | null = null;

type Section = {start: number; key: string; title: string; meta?: string};

/**
 * `MediaGrid` with `layout="rows"`: whole images in justified rows, sections
 * with headings, and only the blocks of rows near the window in the document.
 *
 * Every tile's place is computed (rows.ts), so the grid knows its full height,
 * also of what isn't loaded yet (grey stand-ins for `total`, in the loaded
 * items' shapes), and draws only
 * the blocks within a screen of the window; the others are empty boxes of the
 * same height. An `IntersectionObserver` on the blocks says when the window
 * crossed one, which is when the drawn set is worked out again; another on
 * the stand-ins asks for more while they are within `loadAhead` screens.
 *
 * What is loaded may start anywhere (`gaps`): stretches not loaded yet take
 * their room as stand-ins under their sections' headings, a tile's place in
 * the set is its place in the whole list, the window crossing a block asks
 * for a stretch it comes near (`onLoadGap`), and when rows above the window
 * change (items arrive there, an estimate becomes real rows) the window
 * moves with them, so the tile at its top stays where it was.
 */
export function RowsGrid<Item extends MediaGridItem>({
  items,
  getHref,
  selectedIds,
  onSelectionChange,
  onOpen,
  onLoadMore,
  isDone = false,
  isLoading = false,
  focusId,
  focusOffset,
  label,
  restoreKey,
  total,
  isTotalExact = false,
  sectionOf,
  stickySections = false,
  sectionHeadingLevel = 2,
  captions = 'hover',
  loadAhead = 3,
  gaps,
  onLoadGap,
}: MediaGridProps<Item>) {
  const t = useMessages();
  const headingId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);
  const aheadRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState<RowMetrics | null>(lastMetrics);
  // The tile that holds the grid's tab stop, by id: items may arrive before it.
  const [activeId, setActiveId] = useState<string | null>(null);
  const [focusTarget, setFocusTarget] = useState<number | null>(null);
  const [isPending, setPending] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [drawn, setDrawn] = useState<ReadonlySet<string>>(EMPTY_KEYS);
  const anchor = useRef<string | null>(null);
  const isSelectable = Boolean(onSelectionChange);
  const selected = selectedIds ?? EMPTY;

  // What the grid is made of: the row height, gaps and heading come from CSS
  // (media queries pick the phone's), the width from the grid itself.
  useLayoutEffect(() => {
    const root = rootRef.current!;
    const probe = probeRef.current!;
    const measure = () => {
      const style = getComputedStyle(probe);
      const width = root.getBoundingClientRect().width;
      if (width <= 0) return;
      const next: RowMetrics = {
        width: Math.floor(width),
        rowHeight: parseFloat(style.height) || 180,
        gap: parseFloat(style.columnGap) || 0,
        headingHeight: parseFloat(style.paddingTop) || 0,
        sectionGap: parseFloat(style.marginTop) || 0,
        minTileWidth: parseFloat(style.minWidth) || 0,
      };
      lastMetrics = next;
      setMetrics(current => current && sameMetrics(current, next) ? current : next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    observer.observe(probe);
    return () => observer.disconnect();
  }, []);

  const sections = useMemo(() => {
    if (!sectionOf) return [];
    const out: Section[] = [];
    let key: string | null = null;
    items.forEach((item, index) => {
      const section = sectionOf(item, index);
      if (section.key === key) return;
      key = section.key;
      out.push({start: index, ...section});
    });
    return out;
  }, [items, sectionOf]);

  // Headings by section key: the loaded items' and the stretches'.
  const titles = useMemo(() => {
    const out = new Map<string, MediaGridSection>();
    for (const gap of gaps ?? []) for (const section of gap.sections ?? []) out.set(section.key, section);
    for (const section of sections) out.set(section.key, section);
    return out;
  }, [sections, gaps]);
  const gapSum = useMemo(() => (gaps ?? []).reduce((n, gap) => n + Math.max(0, gap.count), 0), [gaps]);
  const hasEndGap = Boolean(gaps?.some(gap => gap.at >= items.length && gap.count > 0));

  const isWaiting = isLoading || isPending || (!isDone && items.length === 0 && gapSum === 0 && Boolean(onLoadMore));
  // The stand-ins at the end: what `total` says is still to come (beside the stretches of `gaps`), or one row while a page loads.
  const placeholders = isDone || hasEndGap ? 0 : total !== undefined ? Math.max(0, total - items.length - gapSum) : isWaiting ? 8 : 0;

  // Where rows of loaded items start, by item id: the first item of a run that began after a stretch not loaded,
  // so the rows from there on never change when items arrive above it (rows.ts, `LayoutPins`).
  const pinIds = useRef(new Map<string, 'forward' | 'backward'>());
  const runStarts = useRef(new Set<string>());
  /** The first loaded tile in the window when it was last worked out. */
  const windowItem = useRef<string | null>(null);

  // The layout, with the blocks that didn't change taken over from the last
  // one, so a page that arrives redraws only the blocks it touches.
  const previous = useRef<Map<string, Block>>(new Map());
  // The layout on screen and what it was made of: the window keeps its rows (below) and its place (further below).
  const shown = useRef<{layout: GridLayout; items: readonly Item[]; metrics: RowMetrics} | null>(null);
  const layout = useMemo<GridLayout | null>(() => {
    if (!metrics) return null;
    const aspects = new Float64Array(items.length);
    items.forEach((item, index) => { aspects[index] = aspectOf(item.width, item.height); });
    const layoutGaps: LayoutGap[] = (gaps ?? []).map(gap => ({at: Math.min(gap.at, items.length), count: Math.max(0, gap.count), sections: gap.sections}));
    const pins = new Map<number, 'forward' | 'backward'>();
    if (layoutGaps.length || pinIds.current.size) {
      const indexOf = new Map<string, number>();
      items.forEach((item, index) => indexOf.set(item.id, index));
      // Runs that start after a stretch not loaded, by their first item.
      const starts = new Set(layoutGaps.filter(gap => gap.count > 0 && gap.at < items.length).map(gap => items[gap.at].id));
      const runEnd = (at: number) => {
        let end = at + 1;
        while (end < items.length && !starts.has(items[end].id)) end++;
        return end;
      };
      const pinnedIn = (from: number, to: number) => {
        for (const id of pinIds.current.keys()) {
          const index = indexOf.get(id);
          if (index !== undefined && index >= from && index < to) return true;
        }
        return false;
      };
      // A stretch closed before a run whose rows were laid out backward from a place it holds: they stay so when
      // the window is in them or below (a row there never moves), else the rows above go on forward through them.
      for (const id of runStarts.current) {
        const at = indexOf.get(id);
        if (at === undefined || starts.has(id) || pinIds.current.has(id)) continue;
        const windowAt = windowItem.current === null ? undefined : indexOf.get(windowItem.current);
        if (windowAt !== undefined && windowAt >= at && pinnedIn(at + 1, runEnd(at))) pinIds.current.set(id, 'backward');
      }
      // A new run after a stretch: its rows start at its first item.
      for (const id of starts) {
        const at = indexOf.get(id)!;
        if (!pinnedIn(at, runEnd(at))) pinIds.current.set(id, 'forward');
      }
      runStarts.current = starts;
      for (const [id, direction] of pinIds.current) {
        const index = indexOf.get(id);
        if (index !== undefined) pins.set(index, direction);
      }
    }
    // The rows in and near the window keep their breaks and heights when items arrive (a page above, a run that
    // meets another): only rows away from the window may break anew, and the window moves with them (below).
    const fixed = new Map<number, {count: number; height: number; blockStart: boolean; blockEnd: boolean}>();
    const before = shown.current;
    const root = rootRef.current;
    if (layoutGaps.length && before && root && sameMetrics(before.metrics, metrics) && typeof window !== 'undefined') {
      const top = -root.getBoundingClientRect().top;
      const indexOf = new Map<string, number>();
      items.forEach((item, index) => indexOf.set(item.id, index));
      for (const block of blocksBetween(before.layout, top - window.innerHeight, top + 2 * window.innerHeight)) {
        if (block.isPlaceholder) continue;
        block.rows.forEach((row, r) => {
          const first = indexOf.get(before.items[row.first]?.id ?? '');
          if (first === undefined || row.exact === undefined) return;
          let same = true;
          for (let k = 0; k < row.count && same; k++) same = items[first + k]?.id === before.items[row.first + k]?.id;
          if (same) fixed.set(first, {count: row.count, height: row.exact, blockStart: r === 0, blockEnd: r === block.rows.length - 1});
        });
      }
    }
    const next = layoutRows({
      aspects,
      sections: sections.map(s => ({start: s.start, key: s.key})),
      placeholders,
      gaps: layoutGaps,
      pins,
      fixed,
      keyOf: layoutGaps.length ? index => items[index].id : undefined,
      metrics,
    });
    const kept = new Map<string, Block>();
    for (const block of next.blocks) {
      const before = previous.current.get(block.key);
      if (before && sameTiles(before, block)) block.tiles = before.tiles;
      kept.set(block.key, block);
    }
    previous.current = kept;
    return next;
  }, [items, sections, placeholders, metrics, gaps]);

  // Handlers read the latest props through a ref, so tiles get the same
  // functions on every render and only the tiles that change re-render.
  const latest = useRef({items, selected, onSelectionChange, onOpen, layout, restoreKey, onLoadGap, loadAhead});
  latest.current = {items, selected, onSelectionChange, onOpen, layout, restoreKey, onLoadGap, loadAhead};

  // Whether the grid has come back to its place (below): until then the window isn't where the person will be.
  const restored = useRef(false);
  // Stretches asked for (`onLoadGap`), so one is asked for once: until its answer settles or items arrive.
  const asked = useRef({items: null as readonly Item[] | null, keys: new Set<string>()});
  const ask = useCallback((key: string, request: MediaGridGapRequest) => {
    const {onLoadGap, items} = latest.current;
    if (asked.current.items !== items) asked.current = {items, keys: new Set()};
    if (!onLoadGap || asked.current.keys.has(key)) return;
    const keys = asked.current.keys;
    keys.add(key);
    const result = onLoadGap(request);
    if (result && typeof (result as Promise<unknown>).then === 'function')
      (result as Promise<unknown>).catch(() => {}).finally(() => keys.delete(key));
  }, []);

  /** Works out which blocks are near the window, from the layout and where the grid is. */
  const updateDrawn = useCallback(() => {
    const root = rootRef.current;
    const {layout} = latest.current;
    if (!root || !layout) return;
    const top = root.getBoundingClientRect().top;
    const screen = window.innerHeight;
    const from = -top - DRAWN_SCREENS * screen;
    const to = -top + (1 + DRAWN_SCREENS) * screen;
    const next = new Set<string>();
    for (const block of blocksBetween(layout, from, to)) next.add(block.key);
    setDrawn(current => sameKeys(current, next) ? current : next);
    const {items, onLoadGap, loadAhead} = latest.current;
    const view = {top: -top, bottom: -top + screen};
    const atTop = topTile(layout, view.top);
    windowItem.current = atTop && !atTop.block.isPlaceholder ? items[atTop.index]?.id ?? null : null;
    if (!onLoadGap || !restored.current) return;
    // The stretches near the window: the end next to the window is asked for, or (the window inside one, far
    // from both ends) the place at the window's top.
    const reach = loadAhead * screen;
    for (const gap of layout.gaps) {
      if (gap.gap < 0 || gap.bottom < view.top - reach || gap.top > view.bottom + reach) continue;
      const nearBottom = gap.bottom <= view.bottom + reach;
      const nearTop = gap.top >= view.top - reach;
      if (nearBottom && gap.at < items.length) ask(`before:${items[gap.at].id}`, {side: 'before', index: gap.at});
      if (nearTop) ask(`after:${gap.at > 0 ? items[gap.at - 1].id : ''}`, {side: 'after', index: gap.at - 1});
      if (!nearTop && !nearBottom && atTop?.block.isPlaceholder) ask(`inside:${atTop.block.key}`, {side: 'inside', position: atTop.position});
    }
  }, [ask]);

  // Rows above the window changed (items arrived there, an estimate became real rows): the window moves with
  // them, so the tile at its top stays where it was on screen. Before the drawn set is worked out again.
  useLayoutEffect(() => {
    const before = shown.current;
    shown.current = layout && metrics ? {layout, items, metrics} : null;
    const root = rootRef.current;
    if (!before || !layout || !root || before.layout === layout || !metrics || !sameMetrics(before.metrics, metrics)) return;
    const old = before.layout;
    const viewTop = -root.getBoundingClientRect().top;
    if (viewTop <= 0) return;
    const anchor = topTile(old, viewTop, true);
    if (!anchor) return;
    const id = before.items[anchor.index]?.id;
    const index = id === undefined ? -1 : items[anchor.index]?.id === id ? anchor.index : items.findIndex(item => item.id === id);
    if (index < 0) return;
    const delta = layout.place(index).top - old.place(anchor.index).top;
    if (Math.abs(delta) >= 0.5) window.scrollBy({top: delta, behavior: 'instant'});
  }, [layout, items, metrics]);

  // Before the first paint and after every change of layout: the blocks near the window.
  useLayoutEffect(updateDrawn, [layout, updateDrawn]);

  // The window crossing a block's edge (scrolling, a jump with the scrollbar) works it out again.
  const blockObserver = useRef<IntersectionObserver | null>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(updateDrawn, {rootMargin: '100% 0px', threshold: [0, 1]});
    blockObserver.current = observer;
    rootRef.current?.querySelectorAll('.media-grid__block').forEach(block => observer.observe(block));
    return () => observer.disconnect();
  }, [updateDrawn]);
  const observeBlock = useCallback((element: HTMLDivElement | null) => {
    if (!element) return;
    blockObserver.current?.observe(element);
    return () => blockObserver.current?.unobserve(element);
  }, []);

  // Load more while the stand-ins (or the end) are within `loadAhead` screens.
  // A new observer after every page reports at once if they still are, so the
  // loading keeps ahead of the person, also across short pages.
  useEffect(() => {
    const ahead = aheadRef.current;
    if (!ahead || !onLoadMore || isDone || isLoading || isPending || hasEndGap) return;
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      const result = onLoadMore();
      if (result && typeof (result as Promise<unknown>).then === 'function') {
        setPending(true);
        (result as Promise<unknown>).catch(() => {}).finally(() => setPending(false));
      }
    }, {rootMargin: `0px 0px ${Math.round(loadAhead * 100)}% 0px`});
    observer.observe(ahead);
    return () => observer.disconnect();
  }, [onLoadMore, isDone, isLoading, isPending, items.length, layout, loadAhead, hasEndGap]);

  const tileLink = useCallback((index: number) =>
    rootRef.current?.querySelector<HTMLAnchorElement>(`.media-tile[data-index="${index}"] .media-tile__link`) ?? null, []);

  /** Brings a tile into view (drawing its block first) and focuses it. */
  const focusIndex = useCallback((index: number) => {
    setActiveId(latest.current.items[index]?.id ?? null);
    setFocusTarget(index);
  }, []);

  useLayoutEffect(() => {
    if (focusTarget === null) return;
    const link = tileLink(focusTarget);
    if (!link) return;
    link.focus({preventScroll: true});
    const box = link.getBoundingClientRect();
    if (box.top < 0 || box.bottom > window.innerHeight) link.scrollIntoView({block: 'nearest'});
    setFocusTarget(null);
  });

  // Coming back after a tile was opened: the same tile at the same place on
  // screen, focused. Or the tile the app names, such as the viewer's last.
  useLayoutEffect(() => {
    if (restored.current || !layout || !rootRef.current) return;
    const key = restoreKey ?? currentPath();
    const entry = opened.get(key);
    const targetId = focusId ?? entry?.id;
    const index = targetId ? items.findIndex(item => item.id === targetId) : -1;
    // Wait for the item's page; without a target there is nothing to do.
    if (targetId && index < 0 && !isDone) return;
    restored.current = true;
    opened.delete(key);
    if (index < 0) return updateDrawn();
    const place = layout.place(index);
    const gridTop = rootRef.current.getBoundingClientRect().top + window.scrollY;
    // Where it was on screen, when that is known; else where it is, if that is in view; else the middle.
    const offset = entry && entry.id === targetId ? entry.top : focusOffset;
    const onScreen = gridTop + place.top - window.scrollY;
    if (offset !== undefined) window.scrollTo({top: gridTop + place.top - offset, behavior: 'instant'});
    else if (onScreen < 0 || onScreen + place.height > window.innerHeight)
      window.scrollTo({top: gridTop + place.top - Math.max(0, (window.innerHeight - place.height) / 2), behavior: 'instant'});
    updateDrawn();
    focusIndex(index);
  }, [layout, items, isDone, focusId, focusOffset, restoreKey, focusIndex, updateDrawn]);

  const toggle = useCallback((index: number, isRange: boolean) => {
    const {items, selected, onSelectionChange} = latest.current;
    const item = items[index];
    if (!item || !onSelectionChange) return;
    const next = new Set(selected);
    const anchorIndex = anchor.current === null ? -1 : items.findIndex(other => other.id === anchor.current);
    if (isRange && anchorIndex >= 0) {
      const [from, to] = [Math.min(anchorIndex, index), Math.max(anchorIndex, index)];
      for (let at = from; at <= to; at++) next.add(items[at].id);
    } else {
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
    }
    anchor.current = item.id;
    setActiveId(latest.current.items[index]?.id ?? null);
    onSelectionChange(next);
  }, []);

  const open = useCallback((index: number, event: MouseEvent<HTMLAnchorElement>) => {
    const {items, onOpen, restoreKey} = latest.current;
    setActiveId(latest.current.items[index]?.id ?? null);
    if (event.metaKey || event.ctrlKey || event.altKey || event.button !== 0) return;
    opened.set(restoreKey ?? currentPath(), {id: items[index].id, top: event.currentTarget.getBoundingClientRect().top, at: Date.now()});
    onOpen?.(items[index], index, event);
  }, []);

  const keyDown = useCallback((index: number, event: KeyboardEvent<HTMLAnchorElement>) => {
    const {items, layout, onSelectionChange} = latest.current;
    if (!layout) return;
    const last = items.length - 1;
    const isCommand = event.ctrlKey || event.metaKey;
    const move = (to: number, acrossGaps = false) => {
      event.preventDefault();
      const target = Math.max(0, Math.min(last, to));
      // Arrows stay within what is loaded around the tile: a stretch not loaded yet stands between it and the next run.
      if (!acrossGaps && Math.abs(layout.positionOf[target] - layout.positionOf[index]) !== Math.abs(target - index)) return;
      focusIndex(target);
    };
    const rowIndex = layout.rowOf[index];
    const row = layout.rows[rowIndex];
    const vertical = (step: number) => {
      const target = layout.rows[rowIndex + step];
      if (!target || layout.blocks[target.block].isPlaceholder || target.first > last) return;
      const place = layout.place(index);
      move(nearestInRow(layout, rowIndex + step, place.left + place.width / 2));
    };
    switch (event.key) {
      case 'ArrowRight': return move(index + 1);
      case 'ArrowLeft': return move(index - 1);
      case 'ArrowDown': return vertical(1);
      case 'ArrowUp': return vertical(-1);
      case 'Home': return move(isCommand ? 0 : row.first, isCommand);
      case 'End': return move(isCommand ? last : row.first + row.count - 1, isCommand);
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
  }, [t, toggle, focusIndex]);

  const activeIndex = useMemo(() => activeId === null ? -1 : items.findIndex(item => item.id === activeId), [items, activeId]);
  const active = activeIndex >= 0 ? activeIndex : 0;
  const setSize = isDone && gapSum === 0 ? items.length : isTotalExact && total !== undefined ? total : -1;
  // The block of the tile with focus stays drawn, so focus never falls out of the grid.
  const pinned = layout && items.length ? layout.blocks[layout.blockOf[focusTarget ?? active]]?.key : undefined;
  const lead = (gaps ?? []).reduce((n, gap) => n + (gap.at <= 0 ? Math.max(0, gap.count) : 0), 0);
  const tileProps = {items, getHref, selected, isSelectable, isSelecting: selected.size > 0, active, setSize, onToggle: toggle, onOpen: open, onKeyDown: keyDown};

  return <div
    ref={rootRef}
    className="media-grid"
    data-layout="rows"
    data-captions={captions}
    data-sticky={stickySections || undefined}
    role="group"
    aria-label={label ?? t('@da-facility.mediaGrid.label')}
    aria-busy={isWaiting || undefined}
    data-selecting={selected.size > 0 || undefined}
  >
    <div ref={probeRef} className="media-grid__rows-probe" aria-hidden="true" />
    {layout
      ? layout.sections.map((section, sectionIndex) => {
          const blocks = section.blocks.map((block, blockIndex) => <BlockView
            key={block.key}
            block={block}
            isDrawn={drawn.has(block.key) || block.key === pinned}
            marginTop={blockIndex === 0 ? 0 : metrics!.gap}
            observe={observeBlock}
            {...tileProps}
          />);
          const marginTop = sectionIndex === 0 ? 0 : section.key === 'placeholders' ? metrics!.gap : metrics!.sectionGap;
          if (section.key === 'placeholders')
            return <div key="placeholders" ref={aheadRef} className="media-grid__placeholders" aria-hidden="true" style={{marginTop}}>{blocks}</div>;
          const heading = section.isTitled ? titles.get(section.key) : undefined;
          if (!heading) return <div key={section.key} role="list" className="media-grid__list" style={{marginTop}}>{blocks}</div>;
          const id = `${headingId}-${sectionIndex}`;
          return <div key={section.key} role="group" aria-labelledby={id} className="media-grid__section" style={{marginTop}}>
            <div className="media-grid__heading" style={{height: metrics!.headingHeight}}>
              {createElement(`h${sectionHeadingLevel}`, {id, className: 'media-grid__heading-title'}, heading.title)}
              {heading.meta && <span className="media-grid__heading-meta">{heading.meta}</span>}
            </div>
            <div role="list" className="media-grid__list">{blocks}</div>
          </div>;
        })
      : <div role="list" className="media-grid__first">
          {items.slice(0, FIRST_TILES).map((item, index) => !gapsBefore(gaps, index) && <Tile
            key={item.id}
            index={index}
            src={item.src}
            state={item.state}
            alt={item.alt}
            width={item.width}
            height={item.height}
            href={(getHref as (item: MediaGridItem, index: number) => string)(item, index)}
            place={{flexGrow: aspectOf(item.width, item.height), flexBasis: `calc(${aspectOf(item.width, item.height)} * var(--media-grid-row-height))`}}
            caption={item.caption}
            position={lead + index + 1}
            setSize={setSize}
            isSelected={selected.has(item.id)}
            isSelectable={isSelectable}
            tabIndex={index === active ? 0 : -1}
          />)}
        </div>}
    {(!layout || placeholders === 0) && !hasEndGap && <div ref={aheadRef} className="media-grid__sentinel" />}
    <div className="media-grid__announcer" role="status">{announcement}</div>
  </div>;
}

type BlockProps = {
  block: Block;
  isDrawn: boolean;
  marginTop: number;
  observe: (element: HTMLDivElement | null) => void;
  items: readonly MediaGridItem[];
  getHref: (item: never, index: number) => string;
  selected: ReadonlySet<string>;
  isSelectable: boolean;
  isSelecting: boolean;
  active: number;
  setSize: number;
  onToggle: (index: number, isRange: boolean) => void;
  onOpen: (index: number, event: MouseEvent<HTMLAnchorElement>) => void;
  onKeyDown: (index: number, event: KeyboardEvent<HTMLAnchorElement>) => void;
};

/** A block of rows: its tiles while it is near the window, else an empty box of its height. */
const BlockView = memo(function BlockView({block, isDrawn, marginTop, observe, items, getHref, selected, isSelectable, isSelecting, active, setSize, onToggle, onOpen, onKeyDown}: BlockProps) {
  const tiles = [];
  if (isDrawn)
    for (let offset = 0; offset < block.count; offset++) {
      const index = block.first + offset;
      const place = block.tiles[offset];
      const item = block.isPlaceholder ? undefined : items[index];
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
            place={place}
            caption={item.caption}
            position={block.position + offset + 1}
            setSize={setSize}
            isSelected={selected.has(item.id)}
            isSelectable={isSelectable}
            isSelecting={isSelecting}
            tabIndex={index === active ? 0 : -1}
            onToggle={onToggle}
            onOpen={onOpen}
            onKeyDown={onKeyDown}
          />
        : <Tile key={`well-${index}`} index={index} alt="" href="" place={place} isSelectable={false} />);
    }
  return <div ref={observe} className="media-grid__block" data-block={block.key} aria-hidden={block.isPlaceholder || undefined} style={{height: block.height, marginTop}}>{tiles}</div>;
}, (previous, next) => {
  if (previous.block.tiles !== next.block.tiles || previous.block.height !== next.block.height || previous.marginTop !== next.marginTop
    || previous.block.position !== next.block.position || previous.block.first !== next.block.first
    || previous.isDrawn !== next.isDrawn || previous.block.isPlaceholder !== next.block.isPlaceholder) return false;
  // An empty box stays empty whatever else changed.
  if (!next.isDrawn) return true;
  if (previous.isSelectable !== next.isSelectable || previous.isSelecting !== next.isSelecting || previous.setSize !== next.setSize
    || previous.getHref !== next.getHref || previous.onToggle !== next.onToggle || previous.onOpen !== next.onOpen || previous.onKeyDown !== next.onKeyDown) return false;
  const {first, count} = next.block;
  const inRange = (index: number) => index >= first && index < first + count;
  if (previous.active !== next.active && (inRange(previous.active) || inRange(next.active))) return false;
  for (let index = first; index < first + count; index++) {
    const before = previous.items[index];
    const after = next.items[index];
    if (before !== after) return false;
    if (after && previous.selected.has(after.id) !== next.selected.has(after.id)) return false;
  }
  return true;
});

/**
 * The first tile whose bottom is below `y` (pixels from the grid's top), within a screen of it: its block, its index
 * (a loaded item's, or a stand-in's place) and its place in the whole list. `loadedOnly`: the first loaded one.
 */
function topTile(layout: GridLayout, y: number, loadedOnly = false) {
  for (const block of blocksBetween(layout, y, y + (typeof window === 'undefined' ? 0 : window.innerHeight))) {
    if (loadedOnly && block.isPlaceholder) continue;
    for (let offset = 0; offset < block.tiles.length; offset++) {
      const tile = block.tiles[offset];
      if (block.top + tile.top + tile.height > y) return {block, index: block.first + offset, position: block.position + offset};
    }
  }
  return null;
}

/** Blocks that overlap the band from `from` to `to` (pixels from the top of the grid). Blocks are in order, so a binary search finds the first. */
function blocksBetween(layout: GridLayout, from: number, to: number) {
  const {blocks} = layout;
  let low = 0;
  let high = blocks.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (blocks[middle].top + blocks[middle].height < from) low = middle + 1;
    else high = middle;
  }
  const out: Block[] = [];
  for (let index = low; index < blocks.length && blocks[index].top <= to; index++) out.push(blocks[index]);
  return out;
}

/** Whether a stretch not loaded stands before the loaded item `index`: before the grid is measured, only the first run is drawn. */
function gapsBefore(gaps: readonly MediaGridGap[] | undefined, index: number) {
  return Boolean(gaps?.some(gap => gap.count > 0 && gap.at > 0 && gap.at <= index));
}

function sameTiles(a: Block, b: Block) {
  if (a.first !== b.first || a.count !== b.count || a.tiles.length !== b.tiles.length) return false;
  for (let index = 0; index < a.tiles.length; index++) {
    const x = a.tiles[index];
    const y = b.tiles[index];
    if (x.left !== y.left || x.top !== y.top || x.width !== y.width || x.height !== y.height) return false;
  }
  return true;
}

function sameMetrics(a: RowMetrics, b: RowMetrics) {
  return a.width === b.width && a.rowHeight === b.rowHeight && a.gap === b.gap && a.headingHeight === b.headingHeight && a.sectionGap === b.sectionGap && a.minTileWidth === b.minTileWidth;
}

function sameKeys(a: ReadonlySet<string>, b: ReadonlySet<string>) {
  if (a.size !== b.size) return false;
  for (const key of a) if (!b.has(key)) return false;
  return true;
}

const EMPTY: ReadonlySet<string> = new Set();
const EMPTY_KEYS: ReadonlySet<string> = new Set();
