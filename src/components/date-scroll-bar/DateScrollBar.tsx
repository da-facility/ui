import {use, useCallback, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent} from 'react';
import {InternationalizationContext} from '@astryxdesign/core/i18n';
import {useMessages} from '../../i18n';
import './date-scroll-bar.css';

/** One day of a `DateScrollBar`: its calendar day and how many items it holds. */
export type DateScrollBarDay = {
  /** The calendar day, `YYYY-MM-DD`. */
  key: string;
  /** How many items it holds: its share of the track. */
  count: number;
};

export type DateScrollBarProps = {
  /** The days in the list's order (newest first or oldest first, as the list), each with its count. Fewer than two: nothing is drawn. */
  days: readonly DateScrollBarDay[];
  /** Called with a day's key when the person lets go of the track or the grip, clicks it, or moves there with the keyboard. */
  onJump: (key: string) => void;
  /** The day at the window's top, for the keyboard's starting point and screen readers. */
  current?: string;
  /** Accessible name. Defaults to "Jump to a date". */
  label?: string;
  /**
   * The name of a view timeline on the list (`view-timeline: --photos block` on the list, `timeline-scope: --photos`
   * on an element holding both): the grip then follows the list's part of the page, at the first day while the
   * list's top is at or below the window's top and at the last once its end is in view. Without it the grip
   * follows the whole page's scroll.
   */
  timeline?: string;
};

type Mark = {key: string; text: string; at: number};

const DAY_MS = 86_400_000;
/** A day key as a moment at its noon, read in UTC so the calendar day never shifts. */
const noon = (key: string) => Date.UTC(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, Number(key.slice(8, 10)), 12);
/** Marks closer than this (px) to the one above are left out. */
const MARK_SPACE = 22;

/**
 * A scroll bar by date beside a long list of dated items (a `MediaGrid` in
 * rows with a section per day): the days as a track, each as tall as its
 * share of the items, marked by year, month or day as there is room; the day
 * under the pointer named while it is pointed at or dragged; a click or a
 * drag's end jumps there (`onJump`, the app brings the day into view, such as
 * through `MediaGrid`'s `scrollToSection`). A slider for the keyboard: arrows
 * a day, Page Up and Page Down a month, Home and End the ends. On phones only
 * a grip at the right edge is drawn, a thumb's size, that drags along the
 * whole height. On a computer the track is a rail with the same grip on it,
 * the pointer's hand over both, quiet until pointed at or dragged (then the
 * accent). The grip's place follows the list's part of the page (`timeline`,
 * a CSS view timeline) or the page's scroll (a scroll timeline), never a
 * scroll listener; where the browser has neither, it rests at the middle.
 */
export function DateScrollBar({days, onJump, current, label, timeline}: DateScrollBarProps) {
  const t = useMessages();
  const {locale} = use(InternationalizationContext);
  const trackRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  // The day pointed at (hover, drag or keys) and how: a drag jumps on release, keys at once.
  const [pointed, setPointed] = useState<{index: number; at: number; mode: 'hover' | 'drag' | 'keys'} | null>(null);
  const dragging = useRef(false);
  /** Half the grip's height: the days start and end that far inside the track, so the grip never leaves it. */
  const gripPad = () => (trackRef.current?.querySelector<HTMLElement>('.date-scroll-bar__thumb')?.offsetHeight ?? 0) / 2;

  const formats = useMemo(() => ({
    day: new Intl.DateTimeFormat(locale, {timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'long', year: 'numeric'}),
    month: new Intl.DateTimeFormat(locale, {timeZone: 'UTC', month: 'short'}),
    monthYear: new Intl.DateTimeFormat(locale, {timeZone: 'UTC', month: 'short', year: 'numeric'}),
    year: new Intl.DateTimeFormat(locale, {timeZone: 'UTC', year: 'numeric'}),
    short: new Intl.DateTimeFormat(locale, {timeZone: 'UTC', day: 'numeric', month: 'numeric'}),
  }), [locale]);

  // Where each day starts on the track (0 to 1), by its share of the items.
  const starts = useMemo(() => {
    const total = days.reduce((n, d) => n + Math.max(0, d.count), 0) || 1;
    let at = 0;
    return days.map(d => {
      const start = at / total;
      at += Math.max(0, d.count);
      return start;
    });
  }, [days]);

  // Year marks when the days span more than a year and a half, else months when they span more than one, else days.
  const marks = useMemo<Mark[]>(() => {
    if (days.length < 2 || height <= 0) return [];
    const times = days.map(d => noon(d.key));
    const span = Math.abs(times.at(-1)! - times[0]!);
    const by: 'year' | 'month' | 'day' = span > 540 * DAY_MS ? 'year' : span > 31 * DAY_MS ? 'month' : 'day';
    const group = (key: string) => (by === 'year' ? key.slice(0, 4) : by === 'month' ? key.slice(0, 7) : key);
    const out: Mark[] = [];
    let last = -Infinity;
    let lastYear = '';
    days.forEach((d, i) => {
      if (i > 0 && group(d.key) === group(days[i - 1]!.key)) return;
      const y = starts[i]! * (height - 2 * gripPad());
      if (y - last < MARK_SPACE) return;
      const year = d.key.slice(0, 4);
      const text = by === 'year' ? formats.year.format(times[i]) : by === 'month' ? (year !== lastYear ? formats.monthYear : formats.month).format(times[i]) : formats.short.format(times[i]);
      out.push({key: d.key, text, at: starts[i]!});
      last = y;
      lastYear = year;
    });
    return out;
  }, [days, starts, height, formats]);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observer = new ResizeObserver(() => setHeight(track.clientHeight));
    observer.observe(track);
    setHeight(track.clientHeight);
    return () => observer.disconnect();
  }, [days.length > 1]);

  /** Where a point is on the track (0 to 1): the days stand between the grip's half height at either end. */
  const fractionAt = (clientY: number) => {
    const box = trackRef.current!.getBoundingClientRect();
    const pad = gripPad();
    return Math.min(0.9999, Math.max(0, (clientY - box.top - pad) / Math.max(1, box.height - 2 * pad)));
  };
  /** The day at a point of the track. */
  const dayAt = useCallback((clientY: number) => {
    const f = fractionAt(clientY);
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid]! <= f) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }, [starts]);

  const currentIndex = Math.max(0, current === undefined ? 0 : days.findIndex(d => d.key === current));

  const down = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragging.current = true;
    setPointed({index: dayAt(event.clientY), at: fractionAt(event.clientY), mode: 'drag'});
  };
  const move = (event: PointerEvent<HTMLElement>) => {
    if (dragging.current) setPointed({index: dayAt(event.clientY), at: fractionAt(event.clientY), mode: 'drag'});
    else if (event.pointerType === 'mouse') setPointed({index: dayAt(event.clientY), at: fractionAt(event.clientY), mode: 'hover'});
  };
  const up = (event: PointerEvent<HTMLElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    const index = dayAt(event.clientY);
    setPointed(event.pointerType === 'mouse' ? {index, at: fractionAt(event.clientY), mode: 'hover'} : null);
    onJump(days[index]!.key);
  };
  const cancel = () => {
    dragging.current = false;
    setPointed(null);
  };
  const leave = () => {
    if (!dragging.current) setPointed(p => (p?.mode === 'hover' ? null : p));
  };

  const keyDown = (event: KeyboardEvent<HTMLElement>) => {
    const from = pointed?.mode === 'keys' ? pointed.index : currentIndex;
    const month = (step: 1 | -1) => {
      let i = from;
      const m = days[from]!.key.slice(0, 7);
      while (i + step >= 0 && i + step < days.length && days[i + step]!.key.slice(0, 7) === m) i += step;
      return Math.min(days.length - 1, Math.max(0, i + step));
    };
    const to = {
      ArrowDown: from + 1, ArrowRight: from + 1, ArrowUp: from - 1, ArrowLeft: from - 1,
      PageDown: month(1), PageUp: month(-1), Home: 0, End: days.length - 1,
    }[event.key];
    if (to === undefined) return;
    event.preventDefault();
    const index = Math.min(days.length - 1, Math.max(0, to));
    setPointed({index, at: (starts[index]! + (starts[index + 1] ?? 1)) / 2, mode: 'keys'});
    if (index !== from || pointed?.mode !== 'keys') onJump(days[index]!.key);
  };

  if (days.length < 2) return null;
  const shown = pointed ?? null;
  const valueIndex = shown?.mode === 'keys' ? shown.index : currentIndex;
  const dayText = (index: number) => formats.day.format(noon(days[index]!.key));

  // A place on the track (0 to 1) as a CSS top: inside the grip's half height at either end (--da-date-scroll-bar-pad).
  const place = (at: number) => `calc(var(--date-scroll-bar-pad) + ${at} * (100% - 2 * var(--date-scroll-bar-pad)))`;
  const timelineStyle = timeline ? {'--date-scroll-bar-timeline': timeline, '--date-scroll-bar-range': 'contain 0% contain 100%'} as CSSProperties : undefined;

  return <div className="date-scroll-bar" data-dragging={shown?.mode === 'drag' || undefined} data-pointed={shown?.mode === 'hover' || undefined} style={timelineStyle}>
    <div
      ref={trackRef}
      className="date-scroll-bar__track"
      role="slider"
      tabIndex={0}
      aria-label={label ?? t('@da-facility.dateScrollBar.label')}
      aria-orientation="vertical"
      aria-valuemin={0}
      aria-valuemax={days.length - 1}
      aria-valuenow={valueIndex}
      aria-valuetext={dayText(valueIndex)}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={cancel}
      onPointerLeave={leave}
      onKeyDown={keyDown}
      onBlur={() => setPointed(p => (p?.mode === 'keys' ? null : p))}
    >
      <span className="date-scroll-bar__rail" aria-hidden="true" />
      {marks.map(mark => <span key={mark.key} className="date-scroll-bar__mark" style={{top: place(mark.at)}} aria-hidden="true">{mark.text}</span>)}
      <span className="date-scroll-bar__thumb" aria-hidden="true" style={shown?.mode === 'drag' ? {top: place(shown.at), animation: 'none'} : undefined}><span className="date-scroll-bar__grip" /></span>
      {shown && <span className="date-scroll-bar__pointer" style={{top: place(shown.at)}} aria-hidden="true">
        <span className="date-scroll-bar__bubble">{dayText(shown.index)}</span>
      </span>}
    </div>
  </div>;
}
