import {useState} from 'react';
import {DateField} from '@da-facility/ui';
import type {ExampleProps} from '../../types';
import './date-field-example.css';

// A fixed "today", so the example and its screenshots don't change from day to day.
const TODAY = '2026-11-16';
const LAST = '2026-12-16';
const isWeekend = (date: string) => [0, 6].includes(new Date(`${date}T12:00:00Z`).getUTCDay());

export function DateFieldExample({tweaks}: ExampleProps) {
  const withTime = !!tweaks.withTime;
  const [value, setValue] = useState<string | undefined>(tweaks.empty ? undefined : withTime ? '2026-11-20T17:30' : '2026-11-20');
  const shown = withTime || !value ? value : value.slice(0, 10);

  return <main className="date-field-example">
    <section className="date-field-example__card" aria-labelledby="date-field-example-title">
      <h1 id="date-field-example-title">Share a folder</h1>
      <p>The link stops working at the end of the day you choose.</p>
      <DateField
        key={withTime ? 'time' : 'date'}
        label="Valid until"
        description={tweaks.limits ? 'Weekdays in the next 30 days.' : undefined}
        value={shown}
        onChange={setValue}
        hasTime={withTime}
        min={tweaks.limits ? TODAY : undefined}
        max={tweaks.limits ? LAST : undefined}
        isDateDisabled={tweaks.limits ? isWeekend : undefined}
        isDisabled={tweaks.disabled}
        disabledMessage={tweaks.disabled ? 'Only the folder’s owner can change this.' : undefined}
        status={tweaks.error ? {type: 'error', message: 'Choose a date after today.'} : undefined}
        touchPicker={tweaks.nativeTouch ? 'native' : 'sheet'}
        width="100%"
      />
      <p className="date-field-example__value" data-testid="date-field-value">Value: {shown ?? 'none'}</p>
    </section>
  </main>;
}
