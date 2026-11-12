import {useState} from 'react';
import {Button, SelectionBar} from '@da-facility/ui';
import type {ExampleProps} from '../../types';
import './selection-bar-example.css';

export function SelectionBarExample({tweaks}: ExampleProps) {
  const initial = tweaks.many ? 1204 : tweaks.one ? 1 : 3;
  const [count, setCount] = useState(initial);
  const [message, setMessage] = useState('');
  return <main className="selection-bar-example">
    <h1>Selection bar</h1>
    <p>The bar sticks to the bottom of the screen inside the content and rests after the last row. Escape clears the selection.</p>
    {count === 0 && <Button label={`Select ${initial} again`} onClick={() => setCount(initial)} />}
    <div className="selection-bar-example__rows" aria-hidden="true">
      {Array.from({length: 24}, (_, index) => <div key={index} />)}
    </div>
    {message && <p role="alert">{message}</p>}
    <SelectionBar
      count={count}
      summary={tweaks.noDownload ? 'downloading isn’t allowed' : 'up to 2400 px'}
      onClear={() => setCount(0)}
      actions={!tweaks.noDownload && <Button label="Download" variant="primary" size="sm" onClick={() => setMessage(`Downloading ${count} photos is not part of this demo.`)} />}
    />
  </main>;
}
