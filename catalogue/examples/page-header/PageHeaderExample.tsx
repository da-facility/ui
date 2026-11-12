import {useState} from 'react';
import {Button, PageHeader, TextInput, useLocale} from '@da-facility/ui';
import type {ExampleProps} from '../../types';
import './page-header-example.css';

const keywords = ['Final', 'Trophy', 'Celebration', 'Second half', 'Coach'];

export function PageHeaderExample({tweaks}: ExampleProps) {
  const locale = useLocale();
  const [query, setQuery] = useState('');
  const [chosen, setChosen] = useState<string[]>(['Trophy']);
  const date = new Intl.DateTimeFormat(locale, {dateStyle: 'long', timeZone: 'Europe/Zagreb'}).format(new Date('2026-06-14T19:00:00Z'));
  const count = new Intl.NumberFormat(locale).format(1204);

  return <main className="page-header-example">
    <PageHeader
      breadcrumbs={tweaks.breadcrumbs ? [
        {label: 'Northern League', href: '#client'},
        {label: 'Finals 2026', href: '#project'},
        {label: tweaks.longTitle ? 'Final round, evening session at the main arena' : 'Final'},
      ] : undefined}
      title={tweaks.longTitle ? 'Final round, evening session at the main arena' : 'Final'}
      meta={['Main Arena', date, `${count} photos`, '6 photographers']}
      actions={tweaks.actions && <>
        <Button label="Sort: time" variant="secondary" size="sm" />
        <Button label="Download all" variant="primary" size="sm" />
      </>}
      search={tweaks.tools && <TextInput label="Search photos" isLabelHidden placeholder="Search by caption, person or keyword" value={query} onChange={setQuery} size="sm" />}
      chips={tweaks.tools ? keywords.map(label => ({id: label, label, isSelected: chosen.includes(label)})) : undefined}
      onChipClick={id => setChosen(current => current.includes(id) ? current.filter(chip => chip !== id) : [...current, id])}
    />
    <div className="page-header-example__content" aria-hidden="true">
      {Array.from({length: 18}, (_, index) => <div key={index} />)}
    </div>
  </main>;
}
