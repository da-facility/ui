import {useCallback, useMemo, useRef, useState, useSyncExternalStore} from 'react';
import {MediaGrid, PageHeader, useLocale} from '@da-facility/ui';
import {demoPhoto, demoPhotos, type DemoPhoto} from '../shared/photos';
import type {ExampleProps} from '../../types';
import './media-grid-example.css';

/** `/media-grid/large` starts with this many photos loaded, to measure the grid. */
export const LARGE = 20_000;
const TOTAL = 240;
const PAGE = 60;

type Tile = {id: string; src: string; alt: string; width: number; height: number; photo: DemoPhoto};
const toTile = (photo: DemoPhoto): Tile => ({id: photo.id, src: photo.thumbUrl, alt: photo.alt, width: photo.width, height: photo.height, photo});

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
  const [items, setItems] = useState<Tile[]>(() => isLarge ? demoPhotos(LARGE).map(toTile) : []);
  const [isDone, setDone] = useState(isLarge);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const loaded = useRef(items.length);

  // A stand-in backend: pages of up to 60, some shorter because the backend
  // hid photos, until all 240 are loaded.
  const loadMore = useCallback(async () => {
    await new Promise(resolve => setTimeout(resolve, tweaks.slowNetwork ? 2500 : 400));
    const start = loaded.current;
    const pageIndex = start / PAGE;
    const length = Math.min(PAGE - (tweaks.shortPages && pageIndex % 2 === 0 ? 47 : 0), TOTAL - start);
    loaded.current = start + PAGE;
    setItems(current => [...current, ...Array.from({length}, (_, offset) => toTile(demoPhoto(start + offset)))]);
    if (loaded.current >= TOTAL) setDone(true);
  }, [tweaks.slowNetwork, tweaks.shortPages]);

  const count = new Intl.NumberFormat(locale).format(isLarge ? LARGE : TOTAL);
  const getHref = useMemo(() => (item: Tile) => `#${item.id}`, []);
  return <main className="media-grid-example">
    <PageHeader
      breadcrumbs={[{label: 'Northern League', href: '#client'}, {label: 'Finals 2026', href: '#project'}, {label: 'Final'}]}
      title="Final"
      meta={['Main Arena', `${count} photos`]}
    />
    {openId
      ? <section className="media-grid-example__viewer" aria-label="Photo">
          <p>{items.find(item => item.id === openId)?.photo.fileName}</p>
          <button type="button" onClick={() => history.back()}>Back to the gallery</button>
        </section>
      : <MediaGrid
      items={items}
      getHref={getHref}
      selectedIds={selected}
      onSelectionChange={tweaks.selectable ? setSelected : undefined}
      onLoadMore={loadMore}
      isDone={isDone}
      label="Photos"
    />}
    {isDone && !isLarge && <p className="media-grid-example__end">All {count} photos are loaded.</p>}
  </main>;
}
