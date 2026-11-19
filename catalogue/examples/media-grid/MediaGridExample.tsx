import {useCallback, useMemo, useRef, useState, useSyncExternalStore} from 'react';
import {Button, MediaGrid, MediaViewer, PageHeader, SelectionBar, useLocale, type MediaGridGapRequest} from '@da-facility/ui';
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

type Tile = {id: string; src?: string; state?: 'pending' | 'failed'; alt: string; width: number; height: number; caption: {title: string; text: string}; day: number; photo: DemoPhoto};
/** Photos per made-up day, for the sections. */
const PER_DAY = 37;
const toTile = (photo: DemoPhoto, index: number): Tile => ({
  id: photo.id, src: photo.thumbUrl, alt: photo.alt, width: photo.width, height: photo.height,
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
  if (page === 'rows-middle') return <MiddleExample tweaks={tweaks} />;
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
function MiddleExample({tweaks}: Pick<ExampleProps, 'tweaks'>) {
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
  return <main className="media-grid-example">
    <PageHeader title="Final" meta={['Main Arena', `${new Intl.NumberFormat('en').format(ROWS_LARGE)} photos`]} />
    <MediaGrid
      layout="rows"
      items={items}
      gaps={gaps}
      onLoadGap={load}
      getHref={getHref}
      selectedIds={selected}
      onSelectionChange={tweaks.selectable ? setSelected : undefined}
      isDone={runs.at(-1)?.to === ROWS_LARGE}
      label="Photos"
      focusId={all[MIDDLE_START].id}
      focusOffset={200}
      total={ROWS_LARGE}
      isTotalExact
      sectionOf={sectionOf}
      stickySections={Boolean(tweaks.sticky)}
      captions={tweaks.captionsAlways ? 'always' : 'hover'}
    />
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
  return <main className="media-grid-example">
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
