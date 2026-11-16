import {useCallback, useMemo, useRef, useState, useSyncExternalStore} from 'react';
import {Button, MediaGrid, MediaViewer, PageHeader, SelectionBar, useLocale} from '@da-facility/ui';
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
