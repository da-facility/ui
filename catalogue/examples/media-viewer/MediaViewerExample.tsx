import {useState} from 'react';
import {Button, MediaViewer, type MediaViewerItem} from '@da-facility/ui';
import {demoPhoto, type DemoPhoto} from '../shared/photos';
import {PhotoDetails} from '../shared/PhotoDetails';
import type {ExampleProps} from '../../types';
import './media-viewer-example.css';

const TOTAL = 1204;

export function viewerItem(photo: DemoPhoto, isZoomable = true): MediaViewerItem {
  return {
    id: photo.id,
    previewUrl: photo.previewUrl,
    thumbUrl: photo.thumbUrl,
    fullUrl: isZoomable ? photo.fullUrl : undefined,
    width: photo.width,
    height: photo.height,
    alt: photo.alt,
  };
}

export function MediaViewerExample({tweaks}: ExampleProps) {
  const [index, setIndex] = useState<number | null>(13);
  const at = (position: number) => position >= 0 && position < TOTAL ? viewerItem(demoPhoto(position), !tweaks.noZoom) : null;

  return <main className="media-viewer-example">
    <h1>Media viewer</h1>
    <p>Arrow keys or swipes move, a click or + zooms, I toggles the details, Escape closes.</p>
    <Button label="Open the viewer" variant="primary" onClick={() => setIndex(13)} />
    {index != null && <MediaViewer
      item={at(index)!}
      title={demoPhoto(index).fileName}
      position={index + 1}
      total={TOTAL}
      previous={at(index - 1)}
      next={at(index + 1)}
      onPrevious={() => setIndex(index - 1)}
      onNext={() => setIndex(index + 1)}
      onClose={() => setIndex(null)}
      panel={tweaks.noPanel ? undefined : <PhotoDetails photo={demoPhoto(index)} />}
    />}
  </main>;
}
