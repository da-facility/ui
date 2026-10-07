import {useState} from 'react';
import {BarsArrowDownIcon, BarsArrowUpIcon, CalendarDaysIcon, ComputerDesktopIcon, ListBulletIcon, MoonIcon, Squares2X2Icon, SunIcon, ViewColumnsIcon} from '@heroicons/react/24/outline';
import {CycleButton, type CycleButtonStates} from '@da-facility/ui';
import type {ExampleProps} from '../../types';
import './cycle-button-example.css';

const sortStates: CycleButtonStates<'ascending' | 'descending'> = [
  {value: 'ascending', label: 'Ascending', icon: <BarsArrowUpIcon />},
  {value: 'descending', label: 'Descending', icon: <BarsArrowDownIcon />},
];

const themeStates: CycleButtonStates<'light' | 'dark' | 'system'> = [
  {value: 'light', label: 'Light', icon: <SunIcon />},
  {value: 'dark', label: 'Dark', icon: <MoonIcon />},
  {value: 'system', label: 'System', icon: <ComputerDesktopIcon />},
];

const viewStates: CycleButtonStates<'list' | 'grid' | 'board' | 'calendar'> = [
  {value: 'list', label: 'List', icon: <ListBulletIcon />},
  {value: 'grid', label: 'Grid', icon: <Squares2X2Icon />},
  {value: 'board', label: 'Board', icon: <ViewColumnsIcon />},
  {value: 'calendar', label: 'Calendar', icon: <CalendarDaysIcon />},
];

export function CycleButtonExample({tweaks}: ExampleProps) {
  const [sort, setSort] = useState<'ascending' | 'descending'>('ascending');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [view, setView] = useState<'list' | 'grid' | 'board' | 'calendar'>('list');
  const shared = {variant: tweaks.ghost ? 'ghost' : 'secondary', size: tweaks.large ? 'lg' : 'md', isDisabled: tweaks.disabled} as const;

  return <main className="cycle-button-example">
    <h1>Cycle button</h1>
    <div className="cycle-button-example__variants">
      <section>
        <h2>Two states</h2>
        <div className="cycle-button-example__buttons">
          <CycleButton label="Sort" states={sortStates} value={sort} onChange={setSort} {...shared} />
          <CycleButton label="Sort" states={sortStates} value={sort} onChange={setSort} isIconOnly {...shared} />
        </div>
      </section>
      <section>
        <h2>Three states</h2>
        <div className="cycle-button-example__buttons">
          <CycleButton label="Theme" states={themeStates} value={theme} onChange={setTheme} {...shared} />
          <CycleButton label="Theme" states={themeStates} value={theme} onChange={setTheme} isIconOnly {...shared} />
        </div>
      </section>
      <section>
        <h2>Four states</h2>
        <div className="cycle-button-example__buttons">
          <CycleButton label="View" states={viewStates} value={view} onChange={setView} {...shared} />
          <CycleButton label="View" states={viewStates} value={view} onChange={setView} isIconOnly {...shared} />
        </div>
      </section>
    </div>
    <p role="status">Sort {sort}, {theme} theme, {view} view.</p>
  </main>;
}
