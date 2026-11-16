import {useEffect, useMemo, useRef, type KeyboardEvent} from 'react';
import {flushSync} from 'react-dom';
import {DateInput} from '@astryxdesign/core/DateInput';
import {DateTimeInput, type ISODateTimeString} from '@astryxdesign/core/DateTimeInput';
import type {ISODateString} from '@astryxdesign/core/Calendar';
import type {InputStatus} from '@astryxdesign/core/Field';
import {useLocale, useTranslator} from '@astryxdesign/core/i18n';
import {useMessages} from '../../i18n';
import {pageMonths, watchWeekdays} from './calendarFixes';
import {hourCycle} from './hourCycle';
import {readTypedDate} from './typedDate';
import './date-field.css';

/** Which surface opens on a touch screen. */
export type DateFieldTouchPicker = 'sheet' | 'native';

export type DateFieldProps = {
  /** Visible label of the field (also its accessible name). */
  label: string;
  /** Hides the label visually; screen readers still read it. */
  isLabelHidden?: boolean;
  /** Help text between the label and the field. */
  description?: string;
  /**
   * The chosen date as `YYYY-MM-DD`, or with `hasTime` as `YYYY-MM-DDTHH:mm`
   * (a wall-clock time, no time zone: the app decides which zone it means).
   * Leave out or pass `undefined` for an empty field.
   */
  value?: string;
  /** Called with the new value, or `undefined` when the field is cleared. */
  onChange: (value: string | undefined) => void;
  /** Adds hours and minutes beside the date, for short expiries and appointments. */
  hasTime?: boolean;
  /** Earliest date that can be chosen or typed (`YYYY-MM-DD`; with `hasTime` it may carry a time). */
  min?: string;
  /** Latest date that can be chosen or typed (`YYYY-MM-DD`; with `hasTime` it may carry a time). */
  max?: string;
  /** Days that can't be chosen, such as weekends: return `true` for a disabled `YYYY-MM-DD`. */
  isDateDisabled?: (date: string) => boolean;
  /** Shows a button that empties the field. Defaults to `true`. */
  hasClear?: boolean;
  /** Marks the field as required. */
  isRequired?: boolean;
  /** Marks the field as optional. */
  isOptional?: boolean;
  /** Turns the field off. */
  isDisabled?: boolean;
  /**
   * Why the field is off. With `isDisabled` the field stays focusable and shows
   * this on hover and keyboard focus, so everyone can read the reason.
   */
  disabledMessage?: string;
  /** An error, warning or success, with an optional message under the field. */
  status?: InputStatus;
  /** Text shown while the field is empty. Defaults to "Choose or type a date". */
  placeholder?: string;
  /** Height of the field, as Astryx's inputs. Defaults to `md`. */
  size?: 'sm' | 'md' | 'lg';
  /** Width of the whole field: pixels as a number, or any CSS length such as `'100%'`. */
  width?: number | string;
  /**
   * First day of the calendar's week, 0 (Sunday) to 6 (Saturday). Defaults to
   * the locale's: Monday for Croatian and most of Europe, Sunday for US English.
   */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /**
   * What a finger opens: `sheet` (the default) is the same month calendar in a
   * bottom sheet, swiped month to month; `native` is the phone's own picker,
   * which ignores `weekStartsOn` and may not grey out `isDateDisabled` days.
   * Mouse and keyboard always get the typed field with a calendar popover.
   */
  touchPicker?: DateFieldTouchPicker;
  /** Class on the field's root, to place it in the app's layout. */
  className?: string;
};

/**
 * A date, and optionally a time, typed or picked from a month calendar.
 *
 * Built on Astryx's `DateInput` (and `DateTimeInput` with `hasTime`), set up
 * the same way in every app: the week starts on the locale's first day, times
 * use the locale's clock (24 hours in Croatian), the field can be cleared, and
 * a finger gets a calendar sheet instead of the phone's picker. Typed dates are
 * read in the locale's order ("20. 11. 2026." in Croatian, "11/20/2026" in US
 * English); the calendar takes arrow keys, Page Up and Page Down for months,
 * and Escape, which returns focus to the field. Its strings come in English
 * and, from `locales/hr.json`, Croatian.
 */
export function DateField({
  label,
  isLabelHidden,
  description,
  value,
  onChange,
  hasTime = false,
  min,
  max,
  isDateDisabled,
  hasClear = true,
  isRequired,
  isOptional,
  isDisabled,
  disabledMessage,
  status,
  placeholder,
  size,
  width,
  weekStartsOn,
  touchPicker = 'sheet',
  className,
}: DateFieldProps) {
  const t = useMessages();
  const translate = useTranslator();
  const locale = useLocale();
  const rootRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  const firstDay = weekStartsOn ?? weekStart(locale);
  const constraints = useMemo(
    () => isDateDisabled ? [(date: Date) => !isDateDisabled(isoDate(date))] : undefined,
    [isDateDisabled],
  );
  useEffect(() => watchWeekdays(locale), [locale]);

  // A typed date is read in the locale's order just before Astryx commits it
  // (Enter, or leaving the field), so "3. 12. 2026." is 3 December.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reread = (event: Event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || input.getAttribute('role') !== 'combobox') return;
      if (event instanceof globalThis.KeyboardEvent && (event.key !== 'Enter' || event.isComposing)) return;
      const iso = readTypedDate(input.value, locale);
      // Text that already means the chosen date (the field's own display) needs nothing.
      if (!iso || iso === input.value || iso === valueRef.current?.slice(0, 10)) return;
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      flushSync(() => {
        setValue?.call(input, iso);
        input.dispatchEvent(new Event('input', {bubbles: true}));
      });
    };
    root.addEventListener('keydown', reread, true);
    root.addEventListener('focusout', reread, true);
    return () => {
      root.removeEventListener('keydown', reread, true);
      root.removeEventListener('focusout', reread, true);
    };
  }, [locale]);

  // Page Up and Page Down in the calendar move by month, Shift with them by year.
  function onKeyDownCapture(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'PageUp' && event.key !== 'PageDown') return;
    const day = event.target as HTMLElement;
    if (!day.dataset?.date) return;
    const handled = pageMonths(day, event.key, event.shiftKey, {
      previous: translate('@astryx.calendar.previousMonth'),
      next: translate('@astryx.calendar.nextMonth'),
    });
    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  const shared = {
    label,
    isLabelHidden,
    description,
    isRequired,
    isOptional,
    isDisabled,
    disabledMessage,
    status,
    size,
    width,
    hasClear,
    dateConstraints: constraints,
    weekStartsOn: firstDay,
    placeholder: placeholder ?? t('@da-facility.dateField.placeholder'),
    presentation: touchPicker === 'native' ? 'adaptive-native' as const : 'adaptive-bottom-sheet' as const,
    className,
  };

  const field = hasTime
    ? <DateTimeInput
      {...shared}
      value={value as ISODateTimeString | undefined}
      onChange={next => onChange(next)}
      min={min as ISODateTimeString | undefined}
      max={max as ISODateTimeString | undefined}
      hourFormat={hourCycle(locale)}
      timePlaceholder={t('@da-facility.dateField.timePlaceholder')}
      timeLabel={t('@da-facility.dateField.timeLabel', {label})}
    />
    : <DateInput
    {...shared}
    value={value as ISODateString | undefined}
    onChange={next => onChange(next)}
    min={min?.slice(0, 10) as ISODateString | undefined}
    max={max?.slice(0, 10) as ISODateString | undefined}
  />;
  // The wrapper takes no room of its own (`display: contents`); it is where the key and focus handling listens.
  return <div ref={rootRef} className="date-field" onKeyDownCapture={onKeyDownCapture}>{field}</div>;
}

function isoDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Sunday first only where the locale says so (US English and a few others), else Monday. */
function weekStart(locale: string): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  try {
    const info = new Intl.Locale(locale) as Intl.Locale & {getWeekInfo?: () => {firstDay: number}; weekInfo?: {firstDay: number}};
    const firstDay = info.getWeekInfo?.().firstDay ?? info.weekInfo?.firstDay;
    if (firstDay) return (firstDay % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
    const maximized = info.maximize();
    return ['US', 'CA', 'JP', 'IL', 'BR', 'MX', 'PH', 'KR', 'TW', 'IN'].includes(maximized.region ?? '') ? 0 : 1;
  } catch {
    return 1;
  }
}
