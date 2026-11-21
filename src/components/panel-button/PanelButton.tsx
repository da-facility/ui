import {useRef, useState, type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {BottomSheet} from '@astryxdesign/core/BottomSheet';
import {Popover} from '@astryxdesign/core/Popover';
import {Icon} from '@astryxdesign/core/Icon';
import {Button} from '@astryxdesign/core/Button';
import {useMediaQuery} from '@astryxdesign/core/hooks';
import './panel-button.css';

export type PanelButtonProps = {
  /** The button's text, such as "Filters". */
  label: string;
  /** How many choices the panel holds now (such as filters chosen): shown after the label ("Filters · 2") and highlighted; 0 or none shows nothing. */
  count?: number;
  /** The panel's name for screen readers and the sheet's title on phones. Defaults to `label`. */
  title?: string;
  /** What the panel holds. Applied as chosen: the panel has no buttons of its own. */
  children: ReactNode;
  /** Controlled opening; leave out to let the button open and close it. */
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  /** The popover's width on a computer, in px (default 520). */
  width?: number;
  /** Stretches the button over its row (a phone's bar). */
  isFullWidth?: boolean;
  /**
   * The sheet's closing button on a phone, saying what the person gets ("Show 87 photos"): it stays in view at the
   * sheet's bottom edge while the choices scroll above it, and closes the sheet. Leave out for none (light dismiss
   * and the drag still close it). The popover on a computer has none: it closes when the pointer leaves for the page.
   */
  doneLabel?: string;
};

/** Phones and short windows: the panel comes as a sheet from the bottom. */
const NARROW_VIEWPORT = '(max-width: 768px), (max-height: 599.98px)';

/**
 * A button that opens a panel of choices: a popover under the button on a
 * computer, a sheet from the bottom on a phone (with `title` at its top), the
 * same content in both. Light dismiss and Escape close it; its choices apply
 * as they are made. For a list's filters (and on phones its order with them)
 * beside its other controls: it looks like the other buttons of the bar
 * (32 px, 44 px on phones), the count of choices made after its label.
 */
export function PanelButton({label, count = 0, title, children, isOpen: controlled, onOpenChange, width = 520, isFullWidth, doneLabel}: PanelButtonProps) {
  const [own, setOwn] = useState(false);
  const isOpen = controlled ?? own;
  const setOpen = (next: boolean) => {
    if (controlled === undefined) setOwn(next);
    onOpenChange?.(next);
  };
  const isNarrow = useMediaQuery(NARROW_VIEWPORT);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const name = title ?? label;
  const face = <>
    <Icon icon="funnel" size="sm" />
    <span className="panel-button__label">{label}</span>
    {count > 0 && <span className="panel-button__count"><span aria-hidden="true">·</span> {count}</span>}
  </>;
  const className = `panel-button${count > 0 ? ' panel-button--active' : ''}${isFullWidth ? ' panel-button--full' : ''}`;
  if (isNarrow)
    return <>
      <button ref={buttonRef} type="button" className={className} aria-haspopup="dialog" aria-expanded={isOpen} onClick={() => setOpen(!isOpen)}>{face}</button>
      {typeof document !== 'undefined' && createPortal(
        <BottomSheet className="panel-button__bottom-sheet" label={name} isOpen={isOpen} onOpenChange={setOpen} finalFocusRef={buttonRef} height="hug">
          {/* Drawn only while open: a closed panel adds nothing to the page (a list's bar of 10,000 photos). */}
          {isOpen && <div className={`panel-button__sheet${doneLabel ? ' panel-button__sheet--done' : ''}`}>
            <h2 className="panel-button__title">{name}</h2>
            {children}
            {/* At the sheet's bottom edge whatever scrolls above it: the plain way to close it. */}
            {doneLabel && <div className="panel-button__done">
              <Button label={doneLabel} variant="primary" size="lg" width="100%" onClick={() => setOpen(false)} />
            </div>}
          </div>}
        </BottomSheet>,
        document.body,
      )}
    </>;
  return <Popover
    className="panel-button__popover"
    content={isOpen ? <div className="panel-button__panel">{children}</div> : null}
    label={name}
    isOpen={isOpen}
    onOpenChange={setOpen}
    placement="below"
    alignment="end"
    width={width}
    hasAutoFocus={false}>
    {trigger => <button {...trigger} type="button" className={className}>{face}</button>}
  </Popover>;
}
