import {useEffect, useRef, type ReactNode} from 'react';
import {Button} from '@astryxdesign/core/Button';
import {useMessages} from '../../i18n';
import './selection-bar.css';

export type SelectionBarProps = {
  /** How many items are selected. The bar shows while this is above zero. */
  count: number;
  /**
   * What can be done with the selection, after the count, such as "up to
   * 2400 px" or "downloading isn't allowed".
   */
  summary?: ReactNode;
  /**
   * Buttons for the selection, after the clear button, such as an Astryx
   * `Button` with `variant="primary"`. The bar swaps the theme's colours, so
   * Astryx components inside it contrast with it.
   */
  actions?: ReactNode;
  /** Clears the selection: the clear button and Escape. */
  onClear: () => void;
  /** Replaces the count text, such as "3 photos selected". Defaults to "{count} selected". */
  countLabel?: ReactNode;
  /** Text of the clear button. Defaults to "Clear selection". */
  clearLabel?: string;
};

/**
 * The bar shown while items are selected: the count, a summary, actions and
 * clear. Render it after the content it belongs to: it sticks to the bottom of
 * the screen inside the content area, never over the navigation, and comes to
 * rest after the content instead of covering its last row. It is a live
 * region, so screen readers announce it, and Escape clears the selection.
 */
export function SelectionBar({count, summary, actions, onClear, countLabel, clearLabel}: SelectionBarProps) {
  const t = useMessages();
  const isOpen = count > 0;
  const onClearRef = useRef(onClear);
  onClearRef.current = onClear;

  // Escape clears, unless something else on the page, such as an open
  // dialog or menu, has already handled it.
  useEffect(() => {
    if (!isOpen) return;
    const clear = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      const overlays = document.querySelectorAll('dialog[open], [role="dialog"], [role="menu"], [role="listbox"]');
      if ([...overlays].some(overlay => overlay.checkVisibility())) return;
      onClearRef.current();
    };
    document.addEventListener('keydown', clear);
    return () => document.removeEventListener('keydown', clear);
  }, [isOpen]);

  // The live region stays in the document so its content is announced when it appears.
  return <div className="selection-bar" role="status" data-open={isOpen || undefined}>
    {isOpen && <div className="selection-bar__bar">
      <p className="selection-bar__text">
        <strong>{countLabel ?? t('@da-facility.selectionBar.count', {count})}</strong>
        {summary != null && summary !== false && summary !== '' && <> · {summary}</>}
      </p>
      <div className="selection-bar__actions">
        <Button label={clearLabel ?? t('@da-facility.selectionBar.clear')} variant="ghost" size="sm" onClick={() => onClearRef.current()} />
        {actions}
      </div>
    </div>}
  </div>;
}
