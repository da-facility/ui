import {useState} from 'react';
import {DateField, TimeField} from '@da-facility/ui';
import type {ExampleProps} from '../../types';
import './time-field-example.css';

export function TimeFieldExample({tweaks}: ExampleProps) {
  const [startDate, setStartDate] = useState<string | undefined>('2026-11-22');
  const [startTime, setStartTime] = useState<string | undefined>(tweaks.empty ? undefined : '17:00');
  const [endDate, setEndDate] = useState<string | undefined>('2026-12-02');
  const [endTime, setEndTime] = useState<string | undefined>();

  return <main className="time-field-example">
    <section className="time-field-example__card" aria-labelledby="time-field-example-title">
      <h1 id="time-field-example-title">Share a folder</h1>
      <p>Add a time only when it matters: without one, access starts at midnight and ends at the end of the day.</p>
      <div className="time-field-example__row">
        <span className="time-field-example__label" aria-hidden="true">From</span>
        <div className="time-field-example__fields">
          <DateField label="Start date" isLabelHidden value={startDate} onChange={setStartDate} width={200} />
          <TimeField
            label="Start time"
            isLabelHidden
            value={startTime}
            onChange={setStartTime}
            placeholder="start of day"
            minuteStep={tweaks.quarterHours ? 15 : undefined}
            isDisabled={tweaks.disabled}
            disabledMessage={tweaks.disabled ? 'Only the folder’s owner can change this.' : undefined}
            width={136}
          />
        </div>
      </div>
      <div className="time-field-example__row">
        <span className="time-field-example__label" aria-hidden="true">Until</span>
        <div className="time-field-example__fields">
          <DateField label="End date" isLabelHidden value={endDate} onChange={setEndDate} width={200} />
          <TimeField
            label="End time"
            isLabelHidden
            value={endTime}
            onChange={setEndTime}
            placeholder="end of day"
            min={tweaks.limits ? '08:00' : undefined}
            max={tweaks.limits ? '20:00' : undefined}
            status={tweaks.error ? {type: 'error', message: 'End after the start.'} : undefined}
            width={136}
          />
        </div>
      </div>
      <p className="time-field-example__value" data-testid="time-field-start">Starts: {startDate ?? 'none'} {startTime ?? 'start of day'}</p>
      <p className="time-field-example__value" data-testid="time-field-end">Ends: {endDate ?? 'none'} {endTime ?? 'end of day'}</p>
    </section>
  </main>;
}
