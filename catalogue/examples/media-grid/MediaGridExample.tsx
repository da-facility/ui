import {useCallback, useMemo, useRef, useState, useSyncExternalStore} from 'react';
import {Button, DateScrollBar, MediaGrid, MediaViewer, PageHeader, SelectionBar, useLocale, type MediaGridGapRequest} from '@da-facility/ui';
import {PhotoDetails} from '../shared/PhotoDetails';
import {viewerItem} from '../media-viewer/MediaViewerExample';
import {demoPhoto, demoPhotos, type DemoPhoto} from '../shared/photos';
import type {ExampleProps} from '../../types';
import './media-grid-example.css';

/** `/media-grid/large` starts with this many photos loaded, to measure the grid. */
export const LARGE = 20_000;
/** `/media-grid/rows-large`: whole photos in rows, by day, all loaded. */
export const ROWS_LARGE = 10_000;
const TOTAL = 240;
const PAGE = 60;

type Tile = {id: string; src?: string; state?: 'pending' | 'failed'; alt: string; width: number; height: number; placeholder: string; caption: {title: string; text: string}; day: number; photo: DemoPhoto};
/** Photos per made-up day, for the sections. */
const PER_DAY = 37;
const toTile = (photo: DemoPhoto, index: number): Tile => ({
  id: photo.id, src: photo.thumbUrl, alt: photo.alt, width: photo.width, height: photo.height, placeholder: photo.color,
  caption: {title: photo.fileName, text: `${photo.alt} · Ana Horvat`},
  day: Math.floor(index / PER_DAY), photo,
});
const DAYS = ['Monday 15 June 2026', 'Tuesday 16 June 2026', 'Wednesday 17 June 2026', 'Thursday 18 June 2026'];
const dayTitle = (day: number) => DAYS[day % DAYS.length] + (day >= DAYS.length ? ` (${Math.floor(day / DAYS.length) + 1})` : '');

/** The open photo lives in the URL's hash, as an app's route would hold it. */
function useOpenPhoto() {
  return useSyncExternalStore(onChange => {
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, () => location.hash.startsWith('#photo-') ? location.hash.slice(1) : null, () => null);
}

export function MediaGridExample({page, tweaks}: ExampleProps) {
  if (page === 'rows-middle' || page === 'rows-dates') return <MiddleExample tweaks={tweaks} withDates={page === 'rows-dates'} />;
  return <PagedExample page={page} tweaks={tweaks} />;
}

/** The test hooks of `/media-grid/rows-middle`: what the grid asked for, and holding answers back. */
type MiddleHooks = {mediaGridRequests: unknown[]; mediaGridRuns?: {from: number; to: number}[]; mediaGridPage?: number; mediaGridHold?: boolean; mediaGridRelease?: () => void};
const MIDDLE_PAGE = 100;
/** `/media-grid/rows-middle` starts at this photo, as an app returning to it would. */
export const MIDDLE_START = 9500;

/**
 * `/media-grid/rows-middle`: 10,000 photos by day, loaded from photo 9,501 on,
 * as an app that comes back to a photo far down: what lies before it is a
 * stretch of stand-ins under its days' headings, and pages arrive on both
 * sides as the window comes near (`gaps`, `onLoadGap`). Its top is a run of
 * its own once the window reaches it, and a jump into the middle starts one
 * there.
 */
function MiddleExample({tweaks, withDates = false}: Pick<ExampleProps, 'tweaks'> & {withDates?: boolean}) {
  const all = useMemo(() => demoPhotos(ROWS_LARGE).map(toTile), []);
  const [runs, setRuns] = useState<{from: number; to: number}[]>([{from: MIDDLE_START, to: MIDDLE_START + MIDDLE_PAGE}]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const items = useMemo(() => runs.flatMap(run => all.slice(run.from, run.to)), [runs, all]);
  const dayOf = (position: number) => Math.floor(position / PER_DAY);
  const sectionOf = useCallback((item: Tile) => ({key: String(item.day), title: dayTitle(item.day), meta: `${Math.min(PER_DAY, ROWS_LARGE - item.day * PER_DAY)} photos`}), []);
  // The stretches between the runs, by day.
  const gaps = useMemo(() => {
    const out: {at: number; count: number; sections: {key: string; title: string; meta: string; count: number}[]}[] = [];
    let at = 0;
    let end = 0;
    for (const run of [...runs, {from: ROWS_LARGE, to: ROWS_LARGE}]) {
      if (run.from > end) {
        const sections = [];
        for (let position = end; position < run.from;) {
          const day = dayOf(position);
          const next = Math.min(run.from, (day + 1) * PER_DAY);
          sections.push({key: String(day), title: dayTitle(day), meta: `${Math.min(PER_DAY, ROWS_LARGE - day * PER_DAY)} photos`, count: next - position});
          position = next;
        }
        out.push({at, count: run.from - end, sections});
      }
      at += run.to - run.from;
      end = run.to;
    }
    return out;
  }, [runs]);
  const hooks = window as unknown as MiddleHooks;
  hooks.mediaGridRequests ??= [];
  hooks.mediaGridRuns = runs;
  // The places in the whole list of what is loaded, as the grid saw them when it asked.
  const shown = useRef(items);
  shown.current = items;
  const load = useCallback((request: MediaGridGapRequest) => {
    hooks.mediaGridRequests.push(request);
    const place = request.side === 'inside' ? request.position : request.index < 0 ? -1 : Number(shown.current[request.index].id.replace(/\D/g, ''));
    return new Promise<void>(resolve => {
      const answer = () => {
        setRuns(current => {
          const next = current.map(run => ({...run}));
          if (request.side === 'before') {
            const run = next.find(r => r.from === place);
            if (run) {
              const previous = next.filter(r => r.to <= run.from).at(-1);
              run.from = Math.max(previous?.to ?? 0, run.from - (hooks.mediaGridPage ?? MIDDLE_PAGE));
            }
          } else if (request.side === 'after') {
            if (place < 0) next.unshift({from: 0, to: Math.min(MIDDLE_PAGE, next[0]?.from ?? ROWS_LARGE)});
            else {
              const run = next.find(r => r.to === place + 1);
              const following = next.find(r => r.from >= (run?.to ?? ROWS_LARGE));
              if (run) run.to = Math.min(following?.from ?? ROWS_LARGE, run.to + MIDDLE_PAGE);
            }
          } else {
            const following = next.find(r => r.from > place);
            next.push({from: place, to: Math.min(following?.from ?? ROWS_LARGE, place + MIDDLE_PAGE)});
            next.sort((a, b) => a.from - b.from);
          }
          // Runs that meet become one.
          const merged: typeof next = [];
          for (const run of next) {
            const last = merged.at(-1);
            if (last && last.to >= run.from) last.to = Math.max(last.to, run.to);
            else if (run.to > run.from) merged.push(run);
          }
          return merged;
        });
        resolve();
      };
      if (hooks.mediaGridHold) {
        const before = hooks.mediaGridRelease;
        hooks.mediaGridRelease = () => { before?.(); answer(); };
      } else setTimeout(answer, tweaks.slowNetwork ? 2500 : 300);
    });
  }, [tweaks.slowNetwork, hooks]);
  const getHref = useMemo(() => (item: Tile) => `#${item.id}`, []);
  // Selecting as an app does it for a list it hasn't loaded whole: whole days (`days`, with photos taken out of them,
  // `except`) and single photos (`selected`); the grid's selected tiles are the loaded part of that.
  const [days, setDays] = useState<Set<string>>(() => new Set());
  const [except, setExcept] = useState<Set<string>>(() => new Set());
  const dayKey = (item: Tile) => String(item.day);
  // Only where the example selects (its tweak), and the same set while no day is selected: a new one with every page would redraw every drawn block.
  const selectedNow = useMemo(() => !tweaks.selectable || days.size === 0 ? selected : new Set(items.filter(item => days.has(dayKey(item)) ? !except.has(item.id) : selected.has(item.id)).map(item => item.id)), [tweaks.selectable, items, days, except, selected]);
  const changeSelection = useCallback((next: Set<string>) => {
    const out = new Set(except);
    const picked = new Set(selected);
    for (const item of items) {
      if (days.has(dayKey(item))) {
        if (next.has(item.id)) out.delete(item.id);
        else out.add(item.id);
      } else if (next.has(item.id)) picked.add(item.id);
      else picked.delete(item.id);
    }
    setExcept(out);
    setSelected(picked);
  }, [items, days, except, selected]);
  // A photo's day from its id (photo-<index>): only the photos picked or taken out are looked at, never all 10,000.
  const dayOfId = (id: string) => dayKey(all[Number(id.replace(/\D/g, ''))]);
  const sectionSelection = useMemo(() => ({
    stateOf: (key: string) => days.has(key)
      ? ([...except].some(id => dayOfId(id) === key) ? 'some' as const : 'all' as const)
      : ([...selected].some(id => dayOfId(id) === key) ? 'some' as const : 'none' as const),
    onToggle: (key: string) => {
      const whole = days.has(key) && ![...except].some(id => dayOfId(id) === key);
      setDays(current => { const next = new Set(current); if (whole) next.delete(key); else next.add(key); return next; });
      setExcept(current => new Set([...current].filter(id => dayKey(all[Number(id.replace(/\D/g, ''))]) !== key)));
      setSelected(current => new Set([...current].filter(id => dayKey(all[Number(id.replace(/\D/g, ''))]) !== key)));
    },
  }), [days, except, selected, all]);
  // `/media-grid/rows-dates`: the days as a scroll bar by date, from 1 January 2025 on. A jump loads a run from the day's
  // first photo (as an app's list starts at a day, one call) and brings its section to the top of the window.
  const [jump, setJump] = useState<{key: string; request: number} | undefined>();
  const dateDays = useMemo(() => Array.from({length: Math.ceil(ROWS_LARGE / PER_DAY)}, (_, day) => ({
    key: new Date(Date.UTC(2025, 0, 1 + day)).toISOString().slice(0, 10),
    count: Math.min(PER_DAY, ROWS_LARGE - day * PER_DAY),
  })), []);
  const jumpTo = useCallback((key: string) => {
    const day = dateDays.findIndex(d => d.key === key);
    const from = day * PER_DAY;
    setRuns(current => current.some(run => run.from <= from && run.to > from) ? current
      : [...current, {from, to: Math.min(current.find(r => r.from > from)?.from ?? ROWS_LARGE, from + MIDDLE_PAGE)}].sort((a, b) => a.from - b.from));
    setJump(j => ({key: String(day), request: (j?.request ?? 0) + 1}));
  }, [dateDays]);
  return <main className={withDates ? 'media-grid-example media-grid-example--dates' : 'media-grid-example'}>
    {withDates && <DateScrollBar days={dateDays} onJump={jumpTo} timeline="--photos" />}
    <PageHeader title="Final" meta={['Main Arena', `${new Intl.NumberFormat('en').format(ROWS_LARGE)} photos`]} />
    {/* The photos' part of the page, as a view timeline the bar's grip follows. */}
    <div className="media-grid-example__photos">
    <MediaGrid
      layout="rows"
      items={items}
      gaps={gaps}
      onLoadGap={load}
      getHref={getHref}
      selectedIds={selectedNow}
      onSelectionChange={tweaks.selectable ? changeSelection : undefined}
      sectionSelection={tweaks.selectable ? sectionSelection : undefined}
      isSelecting={Boolean(tweaks.selectable) && days.size > 0}
      isDone={runs.at(-1)?.to === ROWS_LARGE}
      label="Photos"
      focusId={all[MIDDLE_START].id}
      focusOffset={200}
      total={ROWS_LARGE}
      isTotalExact
      sectionOf={sectionOf}
      stickySections={Boolean(tweaks.sticky)}
      captions={tweaks.captionsAlways ? 'always' : 'hover'}
      scrollToSection={jump}
    />
    </div>
  </main>;
}

function PagedExample({page, tweaks}: Pick<ExampleProps, 'page' | 'tweaks'>) {
  const isLarge = page === 'large';
  const openId = useOpenPhoto();
  const locale = useLocale();
  const isRows = Boolean(tweaks.rows) || page === 'rows-large';
  const [items, setItems] = useState<Tile[]>(() => isLarge || page === 'rows-large' ? demoPhotos(page === 'rows-large' ? ROWS_LARGE : LARGE).map(toTile) : []);
  const [isDone, setDone] = useState(isLarge || page === 'rows-large');
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  // The tile last pointed at, touched or focused (onItemIntent), for the tests.
  const [intent, setIntent] = useState<string | null>(null);
  const loaded = useRef(items.length);
  // The photo the viewer showed last, for the grid to return to.
  const lastOpened = useRef<string | null>(null);
  if (openId) lastOpened.current = openId;

  // A stand-in backend: pages of up to 60, some shorter because the backend
  // hid photos, until all 240 are loaded.
  const loadMore = useCallback(async () => {
    await new Promise(resolve => setTimeout(resolve, tweaks.slowNetwork ? 2500 : 400));
    const start = loaded.current;
    const pageIndex = start / PAGE;
    const length = Math.min(PAGE - (tweaks.shortPages && pageIndex % 2 === 0 ? 47 : 0), TOTAL - start);
    loaded.current = start + PAGE;
    setItems(current => [...current, ...Array.from({length}, (_, offset) => toTile(demoPhoto(start + offset), start + offset))]);
    if (loaded.current >= TOTAL) setDone(true);
  }, [tweaks.slowNetwork, tweaks.shortPages]);

  // The second photo is still being made and the fifth failed: tiles without an image that still open.
  const gridItems = useMemo(() => tweaks.missingImages
    ? items.map((item, index) => index === 1 ? {...item, src: undefined, state: 'pending' as const} : index === 4 ? {...item, src: undefined, state: 'failed' as const} : item)
    : items, [items, tweaks.missingImages]);

  const openIndex = openId ? items.findIndex(item => item.id === openId) : -1;
  // Moving in the viewer replaces the address, so one Back closes it.
  const showPhoto = (id: string) => {
    history.replaceState(history.state, '', `#${id}`);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  };
  const all = page === 'rows-large' ? ROWS_LARGE : isLarge ? LARGE : TOTAL;
  const count = new Intl.NumberFormat(locale).format(all);
  // Sections by made-up day; each says how many photos it holds.
  const sectionOf = useMemo(() => tweaks.sections || page === 'rows-large'
    ? (item: Tile) => ({key: String(item.day), title: dayTitle(item.day), meta: `${Math.min(PER_DAY, all - item.day * PER_DAY)} photos`})
    : undefined, [tweaks.sections, page, all]);
  const getHref = useMemo(() => (item: Tile) => `#${item.id}`, []);
  return <main className="media-grid-example" data-intent={intent ?? undefined}>
    <PageHeader
      breadcrumbs={[{label: 'Northern League', href: '#client'}, {label: 'Finals 2026', href: '#project'}, {label: 'Final'}]}
      title="Final"
      meta={['Main Arena', `${count} photos`]}
    />
    {openIndex >= 0
      ? <MediaViewer
          item={viewerItem(items[openIndex].photo)}
          title={items[openIndex].photo.fileName}
          position={openIndex + 1}
          total={isDone ? items.length : all}
          previous={openIndex > 0 ? viewerItem(items[openIndex - 1].photo) : null}
          next={openIndex < items.length - 1 ? viewerItem(items[openIndex + 1].photo) : null}
          onPrevious={() => showPhoto(items[openIndex - 1].id)}
          onNext={() => showPhoto(items[openIndex + 1].id)}
          onClose={() => history.back()}
          panel={<PhotoDetails photo={items[openIndex].photo} />}
        />
      : <MediaGrid
      items={gridItems}
      getHref={getHref}
      selectedIds={selected}
      onSelectionChange={tweaks.selectable ? setSelected : undefined}
      onLoadMore={loadMore}
      isDone={isDone}
      label="Photos"
      focusId={lastOpened.current ?? undefined}
      layout={isRows ? 'rows' : 'grid'}
      total={tweaks.reserve || page === 'rows-large' ? all : undefined}
      isTotalExact
      sectionOf={sectionOf}
      stickySections={Boolean(tweaks.sticky)}
      captions={tweaks.captionsAlways ? 'always' : 'hover'}
      onItemIntent={item => setIntent(item.id)}
    />}
    {isDone && !isLarge && <p className="media-grid-example__end">All {count} photos are loaded.</p>}
    {openIndex < 0 && <SelectionBar
      count={selected.size}
      summary="up to 2400 px"
      onClear={() => setSelected(new Set())}
      actions={<Button label="Download" variant="primary" size="sm" />}
    />}
  </main>;
}
