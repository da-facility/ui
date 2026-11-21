import {useMemo, useState} from 'react';
import {MediaGrid, SearchField} from '@da-facility/ui';
import type {ExampleProps} from '../../types';
import {demoPhotos} from '../shared/photos';
import './search-field-example.css';

const photos = demoPhotos(24);

/** Where a line's words start with the search's words, as ranges to mark. */
function rangesIn(line: string, words: string[]) {
  const out: [number, number][] = [];
  for (const m of line.matchAll(/[\p{L}\p{N}]+/gu))
    if (words.some(w => m[0].toLowerCase().startsWith(w))) out.push([m.index!, m.index! + m[0].length]);
  return out;
}

/** A list's search in its bar, with a second way to search behind a button at its end; the found words marked in the captions. */
export function SearchFieldExample(_: ExampleProps) {
  const [value, setValue] = useState('');
  const [byContent, setByContent] = useState(false);
  const [submitted, setSubmitted] = useState('');
  const words = value.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const items = useMemo(() => photos
    .map(p => ({id: p.id, src: p.thumbUrl, alt: p.alt, width: p.width, height: p.height, caption: {title: p.fileName, text: p.alt}}))
    .filter(item => words.every(w => `${item.caption.title} ${item.caption.text}`.toLowerCase().includes(w)))
    .map(item => ({...item, caption: {...item.caption, marks: {title: rangesIn(item.caption.title, words), text: rangesIn(item.caption.text, words)}}})), [value]);
  return <main className="search-field-example">
    <h1>Search field</h1>
    <div className="search-field-example__bar">
      <SearchField
        label="Search photos"
        placeholder="Search file names, descriptions, keywords, authors"
        value={value}
        onChange={setValue}
        onSubmit={setSubmitted}
        toggle={{label: 'AI search', shortLabel: 'AI', isPressed: byContent, onChange: setByContent}}
      />
    </div>
    <p className="search-field-example__status">{byContent ? 'Searching by what is in the picture.' : 'Searching the text.'}{submitted ? ` Submitted: ${submitted}.` : ''}</p>
    <MediaGrid layout="rows" items={items} captions="always" label="Photos" isDone getHref={item => `#${item.id}`} />
  </main>;
}
