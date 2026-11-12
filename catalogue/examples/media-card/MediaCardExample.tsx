import {MediaCard, useLocale} from '@da-facility/ui';
import {demoPhotos} from '../shared/photos';
import type {ExampleProps} from '../../types';
import './media-card-example.css';

export function MediaCardExample({tweaks}: ExampleProps) {
  const locale = useLocale();
  const count = (value: number) => new Intl.NumberFormat(locale).format(value);
  const date = (iso: string) => new Intl.DateTimeFormat(locale, {day: 'numeric', month: 'long', timeZone: 'Europe/Zagreb'}).format(new Date(iso));
  const cover = (start: number, length: number) => tweaks.noCovers ? [] : demoPhotos(length, start).map(photo => ({src: photo.thumbUrl}));

  return <main className="media-card-example">
    <h1>Projects</h1>
    <div className="media-card-example__grid">
      <MediaCard href="#finals" title="Finals 2026" images={cover(0, 3)} meta={[`5 galleries · ${count(2004)} photos`]} activity="New photos 12 min ago" isNew />
      <MediaCard href="#season" title="Regular season" images={cover(3, 3)} meta={[`22 galleries · ${count(3310)} photos`]} activity={`Last added ${date('2026-06-02T12:00:00Z')}`} />
      <MediaCard href="#training" title="Training camp, the long name of an away week by the sea" images={cover(6, 2)} meta={[`2 galleries · ${count(148)} photos`]} activity={`Last added ${date('2026-05-20T12:00:00Z')}`} />
      <MediaCard href="#media-day" title="Media day" images={cover(8, 1)} meta={[`1 gallery · ${count(36)} photos`]} />
      <MediaCard href="#portraits" title="Official portraits" meta={['No photos yet']} />
    </div>
  </main>;
}
