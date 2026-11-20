import {useState} from 'react';
import {PanelButton, SegmentedControl, SegmentedControlItem, Selector} from '@da-facility/ui';
import type {ExampleProps} from '../../types';
import './panel-button-example.css';

/** A list's filters behind one button: a popover on a computer, a sheet from the bottom on a phone, applied at once. */
export function PanelButtonExample(_: ExampleProps) {
  const [added, setAdded] = useState('any');
  const [shape, setShape] = useState('all');
  const [author, setAuthor] = useState('');
  const count = (added !== 'any' ? 1 : 0) + (shape !== 'all' ? 1 : 0) + (author ? 1 : 0);
  return <main className="panel-button-example">
    <h1>Panel button</h1>
    <div className="panel-button-example__bar">
      <PanelButton label="Filters" count={count}>
        <div className="panel-button-example__row">
          <span>Added</span>
          <SegmentedControl label="Added" value={added} onChange={setAdded}>
            <SegmentedControlItem value="any" label="Any time" />
            <SegmentedControlItem value="today" label="Today" />
            <SegmentedControlItem value="week" label="Last 7 days" />
          </SegmentedControl>
        </div>
        <div className="panel-button-example__row">
          <span>Author</span>
          <Selector label="Author" isLabelHidden value={author} onChange={value => setAuthor(String(value))} options={[{value: '', label: 'Anyone'}, {value: 'Ana', label: 'Ana Horvat'}, {value: 'Ivo', label: 'Ivo Marić'}]} />
        </div>
        <div className="panel-button-example__row">
          <span>Shape</span>
          <SegmentedControl label="Shape" value={shape} onChange={setShape}>
            <SegmentedControlItem value="all" label="All" />
            <SegmentedControlItem value="landscape" label="Landscape" />
            <SegmentedControlItem value="portrait" label="Portrait" />
          </SegmentedControl>
        </div>
      </PanelButton>
    </div>
    <p className="panel-button-example__status">{count === 0 ? 'No filters.' : `${count} filter${count > 1 ? 's' : ''}: added ${added}, shape ${shape}${author ? `, by ${author}` : ''}.`}</p>
  </main>;
}
