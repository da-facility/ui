import city from './photos/city.svg?no-inline';
import desert from './photos/desert.svg?no-inline';
import field from './photos/field.svg?no-inline';
import forest from './photos/forest.svg?no-inline';
import lights from './photos/lights.svg?no-inline';
import mountains from './photos/mountains.svg?no-inline';
import sea from './photos/sea.svg?no-inline';
import tower from './photos/tower.svg?no-inline';
import tree from './photos/tree.svg?no-inline';

/**
 * Drawn stand-ins for photographs, shared by the media examples. Each scene is
 * one SVG file; the `size` query names the rendition (thumb, preview, full) the
 * way a real image service would, so every rendition is its own request that
 * tests can hold back, while the file served is the same.
 */
const scenes = [
  {name: 'Mountains', url: mountains, width: 3000, height: 2000},
  {name: 'Sea at sunset', url: sea, width: 3000, height: 2000},
  {name: 'Wheat field', url: field, width: 3000, height: 2000},
  {name: 'City at night', url: city, width: 3000, height: 2000},
  {name: 'Lighthouse', url: tower, width: 2000, height: 3000},
  {name: 'Forest', url: forest, width: 3000, height: 2000},
  {name: 'Desert', url: desert, width: 3000, height: 2000},
  {name: 'Floodlights', url: lights, width: 3000, height: 2000},
  {name: 'Autumn tree', url: tree, width: 2000, height: 3000},
] as const;

export type DemoPhoto = {
  id: string;
  /** File name, as a photographer's camera would give it. */
  fileName: string;
  alt: string;
  thumbUrl: string;
  previewUrl: string;
  fullUrl: string;
  width: number;
  height: number;
};

/** The photograph at a position in a made-up gallery; the same index always gives the same photograph. */
export function demoPhoto(index: number): DemoPhoto {
  const scene = scenes[(index * 7 + Math.floor(index / scenes.length)) % scenes.length];
  const number = String(4000 + index).padStart(4, '0');
  return {
    id: `photo-${index}`,
    fileName: `IMG_${number}.JPG`,
    alt: scene.name,
    thumbUrl: `${scene.url}?size=thumb`,
    previewUrl: `${scene.url}?size=preview`,
    fullUrl: `${scene.url}?size=full`,
    width: scene.width,
    height: scene.height,
  };
}

export function demoPhotos(count: number, start = 0) {
  return Array.from({length: count}, (_, offset) => demoPhoto(start + offset));
}
