import {PageHeader, PageTrail, type PageTrailLevel} from '@da-facility/ui';
import type {ExampleProps} from '../../types';
import './page-trail-example.css';

const DEEP: PageTrailLevel[] = [
  {label: 'Coastal Rowing Club', href: '#club'},
  {label: 'Traditional boat regatta and the opening of the swimming season', href: '#regatta'},
  {label: 'Day one of the regatta: races from the harbour to the lighthouse', href: '#day-one'},
  {label: 'Morning race', href: '#morning'},
  {label: 'Finish and prize-giving on the waterfront'},
];

/** The same trail at three widths, so the narrower ones collapse on desktop. */
export function PageTrailExample({tweaks}: ExampleProps) {
  const levels = tweaks.shallow
    ? [DEEP[0]!, {label: 'Season 2026'}]
    : tweaks.textLevel
      ? DEEP.map((level, index) => index === 1 ? {label: level.label} : level)
      : DEEP;
  const title = levels.at(-1)!.label;
  return <main className="page-trail-example">
    <h1>Page trail</h1>
    {[['Full width', 'wide'], ['720 px', 'medium'], ['480 px', 'narrow']].map(([name, size]) => <section key={size} className={`page-trail-example__box page-trail-example__box--${size}`}>
      <h2 className="page-trail-example__caption">{name}</h2>
      <PageTrail levels={levels} label={`Breadcrumb, ${name}`} />
      <PageHeader title={title} headingLevel={2} />
    </section>)}
  </main>;
}
