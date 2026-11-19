import {useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode} from 'react';
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

/**
 * The width of each list that has rows with actions, followed by one
 * ResizeObserver for all of them: every row of a list asks about the same
 * element, so 2,000 rows share one entry, not 2,000 observers.
 */
let listObserver: ResizeObserver | null = null;
const lists = new Map<Element, {width: number; rows: Set<() => void>}>();

function followList(list: Element, row: () => void) {
  if (!listObserver)
    listObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const followed = lists.get(entry.target);
        if (!followed) continue;
        followed.width = entry.target.getBoundingClientRect().width;
        for (const r of followed.rows) r();
      }
    });
  let followed = lists.get(list);
  if (!followed) {
    followed = {width: list.getBoundingClientRect().width, rows: new Set()};
    lists.set(list, followed);
    listObserver.observe(list);
  }
  followed.rows.add(row);
  return {
    width: () => lists.get(list)?.width ?? 0,
    stop: () => {
      const f = lists.get(list);
      if (!f) return;
      f.rows.delete(row);
      if (f.rows.size === 0) {
        lists.delete(list);
        listObserver?.unobserve(list);
      }
    },
  };
}

/** Whether the list the row stands in is at least `minWidth` wide, followed as it changes (one observer per page). */
function useWideEnough(ref: React.RefObject<HTMLElement | null>, minWidth: number, enabled: boolean) {
  const [wide, setWide] = useState(true);
  useLayoutEffect(() => {
    const own = ref.current;
    const list = own?.closest<HTMLElement>(CONTAINER) ?? own?.parentElement;
    if (!enabled || !list) return;
    const follow = followList(list, () => setWide(follow.width() >= minWidth));
    setWide(follow.width() >= minWidth);
    return follow.stop;
  }, [ref, minWidth, enabled]);
  return wide;
}

/** The phone's breakpoint, as the CSS's. One listener for the page, however many rows. */
const PHONE = '(max-width: 768px)';
let phoneQuery: MediaQueryList | null = null;
const phoneListeners = new Set<() => void>();
function subscribePhone(listener: () => void) {
  phoneQuery ??= window.matchMedia(PHONE);
  if (phoneListeners.size === 0) phoneQuery.addEventListener('change', notifyPhone);
  phoneListeners.add(listener);
  return () => {
    phoneListeners.delete(listener);
    if (phoneListeners.size === 0) phoneQuery?.removeEventListener('change', notifyPhone);
  };
}
function notifyPhone() {
  for (const listener of phoneListeners) listener();
}
/** Whether the window is a phone's; null on the server and while hydrating, when CSS chooses. */
function usePhone() {
  return useSyncExternalStore(subscribePhone, () => (phoneQuery ??= window.matchMedia(PHONE)).matches, () => null);
}

/**
 * One icon action. Its tooltip is made the first time the button is pointed
 * at or focused (an off one's at once: its reason is its description), so a
 * list of 2,000 rows holds no closed tooltips.
 */
function IconAction({action}: {action: RowAction}) {
  const [armed, setArmed] = useState(Boolean(action.isDisabled && action.reason));
  const ref = useRef<HTMLSpanElement>(null);
  const woke = useRef<'pointer' | 'focus' | null>(null);
  // Where the pointer is while it is over the item, as the pointer's own events say (WebKit doesn't always report
  // :hover yet in the frame the tooltip is made).
  const over = useRef(false);
  const arm = (by: 'pointer' | 'focus') => {
    if (armed) return;
    woke.current = by;
    setArmed(true);
  };
  // Made under the pointer or the focus: the tooltip shows as if it had been there (its own listeners came after the event).
  useLayoutEffect(() => {
    const button = ref.current?.querySelector('button');
    if (!armed || !woke.current || !button) return;
    if (woke.current === 'pointer' && over.current) button.dispatchEvent(new MouseEvent('mouseenter'));
    if (woke.current === 'focus' && button.matches(':focus-visible')) button.dispatchEvent(new FocusEvent('focusin', {bubbles: true}));
    woke.current = null;
  }, [armed]);
  return (
    <span
      ref={ref}
      className="row-actions__item"
      onPointerEnter={event => {
        over.current = event.pointerType === 'mouse';
        arm('pointer');
      }}
      onPointerLeave={() => (over.current = false)}
      onFocus={() => arm('focus')}
    >
      <Button
        label={action.label}
        isIconOnly
        icon={ICONS[action.icon!]}
        variant="ghost"
        size="md"
        isDisabled={action.isDisabled}
        tooltip={armed ? (action.isDisabled && action.reason ? action.reason : action.label) : undefined}
        onClick={action.onClick}
        // The tooltip is the button's description too (Astryx), so an off action's reason is read with it.
        data-destructive={action.isDestructive || undefined}
      />
    </span>
  );
}

/**
 * The row's "…": a plain button until it is clicked, tapped or reached by the
 * keyboard, then the menu (made then, with its items), so a list of 2,000
 * rows holds no closed menus. Made when the click is over (it opens at once,
 * focus carried over) or on keyboard focus, never in the middle of a press:
 * a button swapped under a press takes the press with it (a row that renders
 * again as it is pointed at, or focus moving at the press, swapped it between
 * the press and its release, and the menu didn't open).
 */
function MenuAction({label, actions}: {label: string; actions: RowAction[]}) {
  const [armed, setArmed] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const hadFocus = useRef(false);
  const opening = useRef(false);
  const arm = (open: boolean) => {
    hadFocus.current = Boolean(ref.current?.contains(document.activeElement));
    opening.current = open;
    setArmed(true);
  };
  useLayoutEffect(() => {
    if (armed && hadFocus.current) ref.current?.querySelector('button')?.focus();
    hadFocus.current = false;
  }, [armed]);
  // A click that made it opens it through its own button, as every menu opens (its own state, its own layer's order),
  // once that button is in the page.
  useEffect(() => {
    if (!armed || !opening.current) return;
    opening.current = false;
    const frame = requestAnimationFrame(() => ref.current?.querySelector<HTMLButtonElement>('button')?.click());
    return () => cancelAnimationFrame(frame);
  }, [armed]);
  const button = {label, isIconOnly: true, icon: <Icon icon="moreHorizontal" />, variant: 'secondary' as const, size: 'sm' as const};
  return (
    <span ref={ref} className="row-actions__menu">
      {armed
        ? <DropdownMenu
            button={button}
            placement="below"
            alignment="end"
            items={actions.map(action => ({
              label: action.label,
              ...(action.icon ? {icon: ICONS[action.icon]} : {}),
              ...(action.isDisabled ? {isDisabled: true, ...(action.reason ? {description: action.reason} : {})} : action.isDestructive ? {variant: 'destructive' as const} : {}),
              onClick: action.onClick,
            }))}
          />
        : <Button
            {...button}
            aria-haspopup="menu"
            aria-expanded={false}
            // A click or tap (or Enter and Space): the menu, open.
            onClick={() => arm(true)}
            // Reached by the keyboard: made now, so its own keys work from here on; a mouse's focus waits for the click.
            onFocus={event => event.currentTarget.matches(':focus-visible') && arm(false)}
            onKeyDown={event => {
              if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
              event.preventDefault();
              arm(true);
            }}
          />}
    </span>
  );
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
  const phone = usePhone();
  // One form in the page. Before hydration (phone unknown) both light forms, and CSS chooses, so a server-rendered
  // page starts right; once the window is known, only the one that shows.
  const form = !canIcons ? 'menu' : phone === null ? 'both' : !phone && wide ? 'icons' : 'menu';
  return (
    <span ref={ref} className={['row-actions', className].filter(Boolean).join(' ')} data-row-actions={canIcons ? 'icons' : 'menu'} data-wide={canIcons ? String(wide) : undefined}>
      {form !== 'menu' && (
        <span className="row-actions__icons" role="group" aria-label={label}>
          {actions.map(action => <IconAction key={action.label} action={action} />)}
        </span>
      )}
      {form !== 'icons' && <MenuAction label={label} actions={actions} />}
    </span>
  );
}
