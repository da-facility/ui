import {flushSync} from 'react-dom';

/**
 * Two corrections to Astryx's calendar (0.6.8) that DateField applies until
 * Astryx makes them itself; both do nothing once it does.
 */

/** The English short weekdays Astryx falls back to when its CLDR table lacks the locale (Croatian, for one). */
const ENGLISH_WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/**
 * Names the calendar's weekday columns in the locale's words ("pon", "uto", …)
 * where Astryx shows its English fallback. Only headers that still read in
 * English are renamed, so a locale Astryx knows is left alone.
 */
export function nameWeekdays(root: ParentNode, locale: string) {
  if (/^en\b/i.test(locale)) return;
  const names = weekdayNames(locale);
  if (!names) return;
  for (const row of root.querySelectorAll<HTMLElement>('[role="row"]')) {
    const headers = [...row.children].filter((cell): cell is HTMLElement => cell.getAttribute('role') === 'columnheader');
    if (headers.length !== 7) continue;
    const days = headers.map(header => header.childElementCount === 0 ? ENGLISH_WEEKDAYS.indexOf(header.textContent?.trim() ?? '') : -1);
    if (days.some(day => day < 0)) continue;
    headers.forEach((header, index) => { header.textContent = names[days[index]]; });
  }
}

const watched = new Map<string, number>();
let observer: MutationObserver | null = null;
let scheduled = false;

/**
 * Keeps calendar headers in the locale's words while a field with that locale
 * is on the page: one observer for all of them, which renames whatever
 * calendar opens (popovers and sheets render outside the field).
 * Returns the function that stops watching.
 */
export function watchWeekdays(locale: string) {
  if (typeof MutationObserver === 'undefined' || /^en\b/i.test(locale)) return () => {};
  watched.set(locale, (watched.get(locale) ?? 0) + 1);
  if (!observer) {
    observer = new MutationObserver(mutations => {
      if (scheduled || !mutations.some(mutation => mutation.addedNodes.length > 0)) return;
      scheduled = true;
      queueMicrotask(() => {
        scheduled = false;
        for (const name of watched.keys()) nameWeekdays(document, name);
      });
    });
    observer.observe(document.body, {childList: true, subtree: true});
  }
  return () => {
    const count = (watched.get(locale) ?? 1) - 1;
    if (count > 0) watched.set(locale, count);
    else watched.delete(locale);
    if (watched.size === 0) {
      observer?.disconnect();
      observer = null;
    }
  };
}

const weekdayCache = new Map<string, string[] | null>();

function weekdayNames(locale: string) {
  if (weekdayCache.has(locale)) return weekdayCache.get(locale)!;
  let names: string[] | null = null;
  try {
    const format = new Intl.DateTimeFormat(locale, {weekday: 'short', timeZone: 'UTC'});
    // 2026-11-15 is a Sunday.
    names = Array.from({length: 7}, (_, day) => format.format(new Date(Date.UTC(2026, 10, 15 + day, 12))).replace(/\.$/, ''));
  } catch { /* Unknown locales keep Astryx's headers. */ }
  weekdayCache.set(locale, names);
  return names;
}

/**
 * Page Up and Page Down move a month (with Shift, a year) to the same day,
 * as the date-picker dialog pattern of the ARIA Authoring Practices has it;
 * Astryx moves a week. Returns whether the key was handled.
 */
export function pageMonths(day: HTMLElement, key: string, shift: boolean, labels: {previous: string; next: string}) {
  const grid = day.closest('[role="grid"]');
  const from = day.dataset.date;
  if (!from || !grid) return false;
  let calendar: HTMLElement | null = grid.parentElement;
  const arrow = (label: string) => calendar?.querySelector<HTMLButtonElement>(`button[aria-label="${CSS.escape(label)}"]`) ?? null;
  while (calendar && !arrow(labels.next)) calendar = calendar.parentElement;
  if (!calendar) return false;
  const target = addMonths(from, (key === 'PageDown' ? 1 : -1) * (shift ? 12 : 1));
  const wanted = target.slice(0, 7);
  // Turn month by month, as the arrows would, each turn rendered at once so
  // the day has focus before the next key; a limit stops it early.
  for (let turns = 0; turns < 13; turns++) {
    const shown = shownMonth(calendar);
    if (!shown || shown === wanted) break;
    const button = arrow(shown < wanted ? labels.next : labels.previous);
    if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true') break;
    flushSync(() => button.click());
  }
  focusNear(calendar, target);
  return true;
}

/** `YYYY-MM` of the month the calendar shows: its third week always lies inside it. */
function shownMonth(calendar: HTMLElement) {
  const days = calendar.querySelectorAll<HTMLElement>('[role="grid"] button[data-date]');
  return days[Math.min(16, days.length - 1)]?.dataset.date?.slice(0, 7);
}

/** Focuses the target day or, when it can't be chosen, the closest day that can. */
function focusNear(calendar: HTMLElement, target: string) {
  const days = [...calendar.querySelectorAll<HTMLButtonElement>('[role="grid"] button[data-date]')]
    .filter(day => !day.disabled && day.getAttribute('aria-disabled') !== 'true');
  const pick = days.find(day => day.dataset.date === target) ?? days.reduce<HTMLButtonElement | undefined>((best, day) =>
    !best || distance(day.dataset.date!, target) < distance(best.dataset.date!, target) ? day : best, undefined);
  pick?.focus();
}

const distance = (a: string, b: string) => Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`));

/** The same day `months` later, or the month's last day when it is shorter. */
export function addMonths(iso: string, months: number) {
  const [year, month, day] = iso.split('-').map(Number);
  const first = new Date(Date.UTC(year, month - 1 + months, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(day, last));
  return first.toISOString().slice(0, 10);
}
