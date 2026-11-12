import {useCallback, useMemo, useRef, useState, useSyncExternalStore} from 'react';
import {Button, MediaGrid, MediaViewer, PageHeader, SelectionBar, useLocale} from '@da-facility/ui';
import {PhotoDetails} from '../shared/PhotoDetails';
import {viewerItem} from '../media-viewer/MediaViewerExample';
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
    setItems(current => [...current, ...Array.from({length}, (_, offset) => toTile(demoPhoto(start + offset)))]);
    if (loaded.current >= TOTAL) setDone(true);
  }, [tweaks.slowNetwork, tweaks.shortPages]);

  const openIndex = openId ? items.findIndex(item => item.id === openId) : -1;
  // Moving in the viewer replaces the address, so one Back closes it.
  const showPhoto = (id: string) => {
    history.replaceState(history.state, '', `#${id}`);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  };
  const count = new Intl.NumberFormat(locale).format(isLarge ? LARGE : TOTAL);
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
          total={isDone ? items.length : isLarge ? LARGE : TOTAL}
          previous={openIndex > 0 ? viewerItem(items[openIndex - 1].photo) : null}
          next={openIndex < items.length - 1 ? viewerItem(items[openIndex + 1].photo) : null}
          onPrevious={() => showPhoto(items[openIndex - 1].id)}
          onNext={() => showPhoto(items[openIndex + 1].id)}
          onClose={() => history.back()}
          panel={<PhotoDetails photo={items[openIndex].photo} />}
        />
      : <MediaGrid
      items={items}
      getHref={getHref}
      selectedIds={selected}
      onSelectionChange={tweaks.selectable ? setSelected : undefined}
      onLoadMore={loadMore}
      isDone={isDone}
      label="Photos"
      focusId={lastOpened.current ?? undefined}
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
