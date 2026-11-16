import {useEffect, useRef} from 'react';
import {flushSync} from 'react-dom';
import {TimeInput, type ISOTimeString} from '@astryxdesign/core/TimeInput';
import type {InputStatus} from '@astryxdesign/core/Field';
import {useLocale} from '@astryxdesign/core/i18n';
import {useMessages} from '../../i18n';
import {hourCycle} from '../date-field/hourCycle';
import {readTypedTime} from './typedTime';
import './time-field.css';

export type TimeFieldProps = {
  /** Visible label of the field (also its accessible name). */
  label: string;
  /** Hides the label visually; screen readers still read it. */
  isLabelHidden?: boolean;
  /** Help text between the label and the field. */
  description?: string;
  /**
   * The chosen time of day as `HH:mm` on a 24-hour clock (`'17:00'`), a
   * wall-clock time with no date or time zone. Leave out or pass `undefined`
   * for an empty field; empty is a real state, which the app gives its own
   * meaning, such as "the whole day".
   */
  value?: string;
  /** Called with the new `HH:mm`, or `undefined` when the field is emptied. */
  onChange: (value: string | undefined) => void;
  /** Shows a button that empties the field. Defaults to `true`. */
  hasClear?: boolean;
  /**
   * Text shown while the field is empty, saying what empty means, such as
   * "end of day". Defaults to "Time".
   */
  placeholder?: string;
  /** Earliest time that can be typed or picked (`HH:mm`). */
  min?: string;
  /** Latest time that can be typed or picked (`HH:mm`). */
  max?: string;
  /**
   * Minutes that ArrowUp and ArrowDown add or take away. Defaults to 1.
   * Any other step keeps the typed field on touch screens too, because the
   * phone's own time picker can't step by it.
   */
  minuteStep?: number;
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
  /** Height of the field, as Astryx's inputs. Defaults to `md`. */
  size?: 'sm' | 'md' | 'lg';
  /** Width of the whole field: pixels as a number, or any CSS length such as `'100%'`. */
  width?: number | string;
  /** Class on the field's root, to place it in the app's layout. */
  className?: string;
};

/** The format hint Astryx 0.6.8 shows, in English only, while the field is focused and empty. */
const ENGLISH_HINT = /^e\.g\., (.+)$/;

/**
 * A time of day on its own, typed, or picked with the phone's own picker on a
 * touch screen; it may stay empty.
 *
 * Built on Astryx's `TimeInput`, set up the same way in every app: times use
 * the locale's clock (24 hours in Croatian), "17", "1700", "17:00" and
 * "17.00" are all 17:00, and the field can be emptied with its clear button
 * or by deleting the text. Its strings come in English and, from
 * `locales/hr.json`, Croatian.
 */
export function TimeField({
  label,
  isLabelHidden,
  description,
  value,
  onChange,
  hasClear = true,
  placeholder,
  min,
  max,
  minuteStep,
  isRequired,
  isOptional,
  isDisabled,
  disabledMessage,
  status,
  size,
  width,
  className,
}: TimeFieldProps) {
  const t = useMessages();
  const locale = useLocale();
  const rootRef = useRef<HTMLDivElement>(null);
  const latest = useRef({value, onChange, t});
  latest.current = {value, onChange, t};

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    // A time typed with a dot ("17.00") is read just before it would be lost
    // (Enter, or leaving the field), and Enter in an emptied field empties the
    // value at once instead of on leaving it, so a form submitted by Enter
    // sees it empty.
    const reread = (event: Event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || input.type !== 'text' || input.readOnly) return;
      const isEnter = event instanceof globalThis.KeyboardEvent;
      if (isEnter && (event.key !== 'Enter' || event.isComposing)) return;
      if (isEnter && !input.value.trim() && latest.current.value !== undefined) {
        latest.current.onChange(undefined);
        return;
      }
      const time = readTypedTime(input.value);
      if (!time || time === input.value) return;
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      flushSync(() => {
        setValue?.call(input, time);
        input.dispatchEvent(new Event('input', {bubbles: true}));
      });
    };
    // Astryx's format hint for a focused, empty field is English only; say it in the locale's words.
    const translateHint = () => {
      for (const input of root.querySelectorAll('input')) {
        const example = ENGLISH_HINT.exec(input.placeholder)?.[1];
        if (!example) continue;
        const hint = latest.current.t('@da-facility.timeField.formatHint', {example});
        // Setting the same text would wake the observer again, for ever.
        if (hint !== input.placeholder) input.placeholder = hint;
      }
    };
    const observer = new MutationObserver(translateHint);
    observer.observe(root, {subtree: true, attributeFilter: ['placeholder']});
    root.addEventListener('keydown', reread, true);
    root.addEventListener('focusout', reread, true);
    return () => {
      observer.disconnect();
      root.removeEventListener('keydown', reread, true);
      root.removeEventListener('focusout', reread, true);
    };
  }, []);

  // The wrapper takes no room of its own (`display: contents`); it is where the key and focus handling listens.
  return <div ref={rootRef} className="time-field">
    <TimeInput
      label={label}
      isLabelHidden={isLabelHidden}
      description={description}
      value={value as ISOTimeString | undefined}
      onChange={next => onChange(next?.slice(0, 5))}
      hasClear={hasClear}
      placeholder={placeholder ?? t('@da-facility.timeField.placeholder')}
      min={min as ISOTimeString | undefined}
      max={max as ISOTimeString | undefined}
      increment={minuteStep}
      hourFormat={hourCycle(locale)}
      isRequired={isRequired}
      isOptional={isOptional}
      isDisabled={isDisabled}
      disabledMessage={disabledMessage}
      status={status}
      size={size}
      width={width}
      presentation="adaptive-native"
      className={className}
    />
  </div>;
}
