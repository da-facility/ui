import {useLayoutEffect, useRef, useState, type ReactNode} from 'react';
import {Button} from '@astryxdesign/core/Button';
import {DropdownMenu} from '@astryxdesign/core/DropdownMenu';
import {Icon} from '@astryxdesign/core/Icon';
import './row-actions.css';

/** The icons a row's action may have: the ones nobody has to guess. Any other action has none. */
export type RowActionIcon = 'edit' | 'remove';

/** One action of a row. */
export type RowAction = {
  /** What it does, such as “Rename…”: the icon's tooltip and accessible name, or the menu item. */
  label: string;
  /** `edit` (a pencil) or `remove` (a bin). Without one, the row's actions stay in its menu. */
  icon?: RowActionIcon;
  onClick: () => void;
  /** Can't be done now: the icon is off, or the item locked, with `reason`. */
  isDisabled?: boolean;
  /** Why it can't be done: the off icon's tooltip and description, the locked item's line. */
  reason?: string;
  /** Removes or deletes: the destructive look comes only when it is pointed at or focused. */
  isDestructive?: boolean;
};

export type RowActionsProps = {
  /** The row's name for its actions, such as “Actions for Suci”: the group's or the menu button's accessible name. */
  label: string;
  /** The row's actions, in their order; the one that removes last. */
  actions: RowAction[];
  /** The most actions shown as icons. More than that, and they all stay in the menu. Defaults to 2. */
  maxIcons?: number;
  /**
   * The list's width (its closest table or list, or an element marked
   * `data-row-actions-container`) under which the icons fold into the menu.
   * The list's, not the window's: a narrow table in a wide window folds too.
   * Defaults to 600.
   */
  minWidth?: number;
  className?: string;
};

const pencil = (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden focusable="false">
    <path d="M10.5 2.5l3 3L5.5 13.5H2.5v-3z M9 4l3 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
  </svg>
);
const bin = (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden focusable="false">
    <path d="M2.5 4h11 M6 4V2.5h4V4 M3.75 4l.75 9.5h7l.75-9.5 M6.5 6.5v4.5 M9.5 6.5v4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
  </svg>
);
const ICONS: Record<RowActionIcon, ReactNode> = {edit: pencil, remove: bin};

const CONTAINER = '[data-row-actions-container], table, [role="table"], ul, ol';

/** Whether the list the row stands in is at least `minWidth` wide, followed as it changes. */
function useWideEnough(ref: React.RefObject<HTMLElement | null>, minWidth: number, enabled: boolean) {
  const [wide, setWide] = useState(true);
  useLayoutEffect(() => {
    const own = ref.current;
    const list = own?.closest<HTMLElement>(CONTAINER) ?? own?.parentElement;
    if (!enabled || !list) return;
    const measure = () => setWide(list.getBoundingClientRect().width >= minWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [ref, minWidth, enabled]);
  return wide;
}

/**
 * A row's actions, given once and drawn one of two ways. At most two
 * (`maxIcons`), each with an icon nobody has to guess (a pencil, a bin), in
 * a list wide enough (`minWidth`, the list's width): quiet icon buttons at
 * the row's end, always visible, each named by its tooltip and for a screen
 * reader; the one that removes takes the destructive look only when pointed
 * at or focused, and an action that can't be done is the same icon, off,
 * with its reason as the tooltip and description. Otherwise, more actions,
 * one without such an icon, or a narrow list: the row's “…” with all of
 * them, never icons and “…” in one row.
 */
export function RowActions({label, actions, maxIcons = 2, minWidth = 600, className}: RowActionsProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const canIcons = actions.length > 0 && actions.length <= maxIcons && actions.every(action => action.icon);
  const wide = useWideEnough(ref, minWidth, canIcons);
  const icons = canIcons && (
    <span className="row-actions__icons" role="group" aria-label={label}>
      {actions.map(action => (
        <span key={action.label} className="row-actions__item">
          <Button
            label={action.label}
            isIconOnly
            icon={ICONS[action.icon!]}
            variant="ghost"
            size="md"
            isDisabled={action.isDisabled}
            tooltip={action.isDisabled && action.reason ? action.reason : action.label}
            onClick={action.onClick}
            // The tooltip is the button's description too (Astryx), so an off action's reason is read with it.
            data-destructive={action.isDestructive || undefined}
          />
        </span>
      ))}
    </span>
  );
  const menu = (
    <span className="row-actions__menu">
      <DropdownMenu
        button={{label, isIconOnly: true, icon: <Icon icon="moreHorizontal" />, variant: 'secondary', size: 'sm'}}
        placement="below"
        alignment="end"
        items={actions.map(action => ({
          label: action.label,
          ...(action.icon ? {icon: ICONS[action.icon]} : {}),
          ...(action.isDisabled ? {isDisabled: true, ...(action.reason ? {description: action.reason} : {})} : action.isDestructive ? {variant: 'destructive' as const} : {}),
          onClick: action.onClick,
        }))}
      />
    </span>
  );
  // Both forms when icons are possible: the phone's media query and the list's width (data-wide) choose in CSS, so a
  // server-rendered page starts right; one form is hidden, and out of the accessibility tree, at any time.
  return (
    <span ref={ref} className={['row-actions', className].filter(Boolean).join(' ')} data-row-actions={canIcons ? 'icons' : 'menu'} data-wide={canIcons ? String(wide) : undefined}>
      {icons}
      {menu}
    </span>
  );
}
