import {useEffect, useId, useRef, useState, type ChangeEvent, type CSSProperties, type KeyboardEvent, type ReactNode} from 'react';
import {useMessages} from '../../i18n';
import './code-input.css';

export type CodeInputProps = {
  /** Number of digits. Defaults to 6. */
  length?: number;
  /** The digits entered so far, for a controlled input. Leave out to let the input keep its own value. */
  value?: string;
  /** Starting digits of an uncontrolled input. */
  defaultValue?: string;
  /** Called with the digits whenever they change, after spaces, dashes and letters are dropped. */
  onChange?: (value: string) => void;
  /**
   * Called once the last digit is entered, typed, pasted or filled in by the
   * browser from a message. There is no separate submit button.
   */
  onComplete?: (code: string) => void;
  /**
   * What went wrong, shown above the boxes, which turn red. The digits are
   * selected so the next ones typed replace them.
   */
  error?: ReactNode;
  /** While the code is being checked the boxes are read-only. */
  isChecking?: boolean;
  /** Turns the input off, such as while sign-in is locked after too many attempts. */
  isDisabled?: boolean;
  /** Accessible name of the input. Defaults to "One-time code". */
  label?: string;
  /** Focuses the input when it mounts. */
  autoFocus?: boolean;
  /** Form field name, for apps that submit the code in a form. */
  name?: string;
  /** Id of the real input, for a `<label htmlFor>` elsewhere. */
  id?: string;
};

/**
 * A one-time code as a row of boxes. One real input sits behind the boxes, so
 * paste, the browser's one-time-code autofill and screen readers work as they
 * do with any text field: typing moves forward, Backspace moves back, and
 * pasting a whole code fills every box.
 */
export function CodeInput({
  length = 6,
  value: valueProp,
  defaultValue = '',
  onChange,
  onComplete,
  error,
  isChecking = false,
  isDisabled = false,
  label,
  autoFocus,
  name,
  id: idProp,
}: CodeInputProps) {
  const t = useMessages();
  const fallbackId = useId();
  const id = idProp ?? `${fallbackId}-code`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [ownValue, setOwnValue] = useState(() => digits(defaultValue, length));
  const value = valueProp === undefined ? ownValue : digits(valueProp, length);
  const hasError = error != null && error !== false && error !== '';

  // After a wrong code, the next digit typed starts over instead of being dropped.
  useEffect(() => {
    if (hasError && document.activeElement === inputRef.current) inputRef.current?.select();
  }, [hasError, error]);

  function change(event: ChangeEvent<HTMLInputElement>) {
    const next = digits(event.target.value, length);
    if (valueProp === undefined) setOwnValue(next);
    if (next !== value) {
      onChange?.(next);
      if (next.length === length) onComplete?.(next);
    }
  }

  // The caret always sits after the last digit, where the active box is.
  function keepCaretAtEnd(event: KeyboardEvent<HTMLInputElement>) {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key) && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.setSelectionRange(value.length, value.length);
    }
  }

  const active = Math.min(value.length, length - 1);
  return <div className="code-input" data-error={hasError || undefined} data-checking={isChecking || undefined} data-disabled={isDisabled || undefined}>
    {hasError && <p className="code-input__error" id={`${id}-error`} role="alert">{error}</p>}
    <div className="code-input__field" style={{'--code-input-length': length} as CSSProperties}>
      <input
        ref={inputRef}
        id={id}
        className="code-input__input"
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="done"
        aria-label={label ?? t('@da-facility.codeInput.label')}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? `${id}-error` : undefined}
        aria-busy={isChecking || undefined}
        value={value}
        onChange={change}
        onKeyDown={keepCaretAtEnd}
        onPointerUp={event => {
          const input = event.currentTarget;
          if (input.selectionStart === input.selectionEnd) input.setSelectionRange(input.value.length, input.value.length);
        }}
        readOnly={isChecking}
        disabled={isDisabled}
        autoFocus={autoFocus}
      />
      <div className="code-input__boxes" aria-hidden="true">
        {Array.from({length}, (_, index) => <span
          key={index}
          className="code-input__box"
          data-active={index === active || undefined}
          data-filled={index < value.length || undefined}
        >{value[index] ?? ''}</span>)}
      </div>
    </div>
  </div>;
}

function digits(value: string, length: number) {
  return value.replace(/\D/g, '').slice(0, length);
}
