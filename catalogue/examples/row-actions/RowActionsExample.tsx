import {useState} from 'react';
import {RowActions, type RowAction} from '@da-facility/ui';
import type {ExampleProps} from '../../types';
import './row-actions-example.css';

type Row = {name: string; detail: string; locked?: string};

const groups: Row[] = [
  {name: 'Judges', detail: '2 members'},
  {name: 'Press 2026', detail: '2 members'},
  {name: 'Sponsors', detail: '2 members', locked: 'Locked. The agency shares galleries with this group, so only the agency can remove it.'},
];

/** `/row-actions/many`: this many people, each row with its actions, as a large client's people list. */
export const MANY_ROWS = 2000;

/** Rows with two actions with plain icons, a locked one, rows with more actions, and the same list narrow. */
export function RowActionsExample({page, tweaks}: ExampleProps) {
  if (page === 'many') return <ManyRows />;
  return <Examples tweaks={tweaks} />;
}

/** 2,000 rows, half with two icon actions and half with a menu, to count what each row costs the page. */
function ManyRows() {
  const [said, setSaid] = useState('Nothing done yet.');
  return <main className="row-actions-example">
    <h1>2,000 rows</h1>
    <p className="row-actions-example__said" role="status">{said}</p>
    <table className="row-actions-example__table">
      <tbody>
        {Array.from({length: MANY_ROWS}, (_, index) => {
          const name = `Person ${index + 1}`;
          const actions: RowAction[] = index % 2
            ? [
                {label: 'Send again', onClick: () => setSaid(`Sent again to ${name}.`)},
                {label: 'Extend access…', onClick: () => setSaid(`Extend ${name}.`)},
                {label: 'Remove…', isDestructive: true, onClick: () => setSaid(`Remove ${name}.`)},
              ]
            : [
                {label: 'Rename…', icon: 'edit', onClick: () => setSaid(`Rename ${name}.`)},
                {label: 'Remove…', icon: 'remove', isDestructive: true, onClick: () => setSaid(`Remove ${name}.`)},
              ];
          return <tr key={name}>
            <th scope="row">{name}</th>
            <td className="row-actions-example__end"><RowActions label={`Actions for ${name}`} actions={actions} /></td>
          </tr>;
        })}
      </tbody>
    </table>
  </main>;
}

function Examples({tweaks}: Pick<ExampleProps, 'tweaks'>) {
  const [said, setSaid] = useState('Nothing done yet.');
  const [pointed, setPointed] = useState<string | null>(null);
  const two = (row: Row): RowAction[] => [
    {label: 'Rename…', icon: 'edit', onClick: () => setSaid(`Rename ${row.name}.`)},
    {label: 'Remove group…', icon: 'remove', isDestructive: true, isDisabled: !!row.locked, reason: row.locked, onClick: () => setSaid(`Remove ${row.name}.`)},
  ];
  const more = (name: string): RowAction[] => [
    {label: 'Send again', onClick: () => setSaid(`Sent again to ${name}.`)},
    {label: 'Extend access…', onClick: () => setSaid(`Extend ${name}.`)},
    {label: 'Withdraw the invitation…', isDestructive: true, onClick: () => setSaid(`Withdraw ${name}.`)},
  ];
  const list = (narrow: boolean, title: string) => (
    <section>
      <h2>{title}</h2>
      <table className={narrow ? 'row-actions-example__table row-actions-example__table--narrow' : 'row-actions-example__table'}>
        <tbody>
          {groups.map(row => (
            <tr key={row.name}>
              <th scope="row">{row.name}</th>
              <td>{row.detail}</td>
              <td className="row-actions-example__end">
                <RowActions label={`Actions for ${row.name}`} actions={two(row)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
  return <main className="row-actions-example">
    <h1>Row actions</h1>
    <p className="row-actions-example__said" role="status">{said}</p>
    {list(false, 'Two actions with plain icons: icons')}
    {list(true, 'The same list, narrow: the menu')}
    <section>
      <h2>More actions, or one without a plain icon: the menu</h2>
      <table className="row-actions-example__table">
        <tbody>
          {['ana@example.com', 'ivo@example.com'].map(name => (
            <tr key={name}>
              <th scope="row">{name}</th>
              <td>Invited</td>
              <td className="row-actions-example__end">
                {/* As an app's row that asks something when its actions are pointed at: it renders again then. */}
                <span onPointerEnter={() => setPointed(name)} data-pointed={pointed === name || undefined}>
                  <RowActions label={`Actions for ${name}`} actions={more(name)} />
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
    {tweaks.single && (
      <section>
        <h2>One action</h2>
        <RowActions label="Actions for Judges" actions={[two(groups[0]!)[1]!]} />
      </section>
    )}
  </main>;
}
