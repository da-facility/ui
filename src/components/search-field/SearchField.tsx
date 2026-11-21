import type {KeyboardEvent} from 'react';
import {Icon} from '@astryxdesign/core/Icon';
import {useMessages} from '../../i18n';
import './search-field.css';

/** A second way to search, switched on and off by a button at the field's end, such as a search by what is in a picture. */
export type SearchFieldToggle = {
  /** The button's text, such as "AI search". */
  label: string;
  /** Its text on phones, where the field is narrow, such as "AI". Defaults to `label`. */
  shortLabel?: string;
  /** Whether the other way is on: the button is pressed, and the field's icon becomes the button's. */
  isPressed: boolean;
  onChange: (isPressed: boolean) => void;
};

export type SearchFieldProps = {
  /** Accessible name, such as "Search photos". */
  label: string;
  /** The text in the field. */
  value: string;
  /** Called as the person types and when the field is cleared (with ""). */
  onChange: (value: string) => void;
  /** Called with the text when the person presses Enter. */
  onSubmit?: (value: string) => void;
  /** Shown while the field is empty, such as "Search file names, descriptions, keywords, authors". */
  placeholder?: string;
  /** A second way to search behind a button at the field's end. */
  toggle?: SearchFieldToggle;
};

/** The four-pointed star of the toggle (and of the field while it is on). */
function Star() {
  return <svg className="search-field__star" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
    <path d="M8 0.8 C8.6 5.2 10.8 7.4 15.2 8 C10.8 8.6 8.6 10.8 8 15.2 C7.4 10.8 5.2 8.6 0.8 8 C5.2 7.4 7.4 5.2 8 0.8 Z" fill="currentColor" />
  </svg>;
}

/**
 * A search field for a list's toolbar: the magnifier, the text, a button
 * that clears it, and optionally a second way to search behind a button at
 * its end (`toggle`, such as "AI search": pressed, the field takes its star
 * and the accent's outline). The same height as the bar's other controls
 * (32px, 44px on phones, where its text is 16px so the phone doesn't zoom).
 * It is a plain `type="search"` input: Escape clears it in the browser, and
 * the app decides when a search runs (as typed, on Enter or both).
 */
export function SearchField({label, value, onChange, onSubmit, placeholder, toggle}: SearchFieldProps) {
  const t = useMessages();
  const pressed = toggle?.isPressed === true;
  const keyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') onSubmit?.(value);
  };
  return <div className="search-field" data-toggled={pressed || undefined}>
    <span className="search-field__icon" aria-hidden="true">{pressed ? <Star /> : <Icon icon="search" size="sm" />}</span>
    <input
      className="search-field__input"
      type="search"
      aria-label={label}
      placeholder={placeholder}
      value={value}
      autoComplete="off"
      spellCheck={false}
      enterKeyHint="search"
      onChange={event => onChange(event.target.value)}
      onKeyDown={keyDown}
    />
    {/* Each button is a touch target of the field's height on phones, what it shows a smaller face inside it. */}
    {value !== '' && <button type="button" className="search-field__clear" aria-label={t('@da-facility.searchField.clear')} onClick={() => onChange('')}>
      <span className="search-field__face"><Icon icon="close" size="sm" /></span>
    </button>}
    {toggle && <button type="button" className="search-field__toggle" aria-pressed={pressed} aria-label={toggle.label} onClick={() => toggle.onChange(!pressed)}>
      <span className="search-field__face">
        <Star />
        <span className="search-field__toggle-label" aria-hidden="true">{toggle.label}</span>
        <span className="search-field__toggle-short" aria-hidden="true">{toggle.shortLabel ?? toggle.label}</span>
      </span>
    </button>}
  </div>;
}
