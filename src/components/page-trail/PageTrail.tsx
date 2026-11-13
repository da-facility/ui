import {useLayoutEffect, useRef, useState} from 'react';
import {Button} from '@astryxdesign/core/Button';
import {DropdownMenu} from '@astryxdesign/core/DropdownMenu';
import {useLinkComponent} from '@astryxdesign/core/Link';
import {useMessages} from '../../i18n';
import './page-trail.css';

export type PageTrailLevel = {
  label: string;
  /**
   * Where the level leads, through Astryx's `LinkProvider`, so the app's
   * router handles it. Without it the level is plain text, such as a level
   * that has no page of its own.
   */
  href?: string;
};

export type PageTrailProps = {
  /** The path to this page, the page itself last. Renders nothing with fewer than two levels. */
  levels: PageTrailLevel[];
  /** Accessible name of the navigation landmark. Defaults to "Breadcrumb". */
  label?: string;
  /** Class on the `<nav>`, to place the trail in the app's layout. */
  className?: string;
};

/**
 * Breadcrumbs that keep to one line: every level above the page is a link,
 * so a person reaches any of them in one click.
 *
 * - Desktop: when the line doesn't fit, the first level and the page stay
 *   whole, the levels nearest the page follow as far as there is room, and
 *   the rest go into a "…" menu after the first level. The trail measures
 *   itself with a `ResizeObserver`, so it follows the window, the layout and
 *   late fonts. Only when even the first level, "…" and the page don't fit is
 *   the first level cut. Long names are cut, with the full name as a tooltip.
 * - Phones: a back link to the parent and, when there are levels above the
 *   parent, a "…" menu beside it listing all of them.
 *
 * A CSS media query picks between the two, so server-rendered pages start right.
 * `PageHeader`'s `breadcrumbs` stay as they are; use this above a
 * `PageHeader` without them.
 */
export function PageTrail({levels, label, className}: PageTrailProps) {
  const t = useMessages();
  const Link = useLinkComponent();
  const nav = useRef<HTMLElement>(null);
  const measure = useRef<HTMLOListElement>(null);
  // When collapsed, how many of the levels nearest the page stay after "…"; null: the whole trail shows.
  const [keep, setKeep] = useState<number | null>(null);
  const ancestors = levels.slice(0, -1);
  const current = levels.at(-1);
  const canCollapse = ancestors.length > 1; // something between the first level and the page
  const count = levels.length;
  const names = levels.map(level => level.label).join('\n');

  // Measured unseen, each level on one line as shown (separator included), then "…":
  // the first level, "…" and the page, then the nearest levels while they fit.
  useLayoutEffect(() => {
    const room = nav.current;
    const full = measure.current;
    if (!room || !full || !canCollapse) return setKeep(null);
    const check = () => {
      const width = room.clientWidth; // whole pixels; the widths below have fractions
      if (full.scrollWidth <= width) return setKeep(null);
      const items = [...full.children].map(item => item.getBoundingClientRect().width);
      const page = Math.min(items[count - 1]!, width / 2); // the page takes at most half
      let used = items[0]! + items[count]! + page;
      let kept = 0;
      for (let index = count - 2; index >= 1 && used + items[index]! <= width; index--, kept++) used += items[index]!;
      setKeep(kept);
    };
    check();
    const observer = new ResizeObserver(check);
    observer.observe(room);
    observer.observe(full); // widths change when the fonts arrive
    return () => observer.disconnect();
  }, [canCollapse, count, names]);

  if (!current || ancestors.length === 0) return null;
  const hidden = keep === null ? [] : ancestors.slice(1, ancestors.length - keep);
  const shown = keep === null ? ancestors : [ancestors[0]!, null, ...ancestors.slice(ancestors.length - keep)];
  const more = {label: t('@da-facility.pageTrail.more'), children: '…', variant: 'ghost', size: 'sm', className: 'page-trail__more'} as const;
  const menuItems = (list: PageTrailLevel[]) => list.map((level, index) => ({id: `${index}`, label: level.label, href: level.href, isDisabled: !level.href}));
  const parent = ancestors.at(-1)!;
  const level = (item: PageTrailLevel) => item.href
    ? <Link className="page-trail__level" href={item.href} title={item.label}>{item.label}</Link>
    : <span className="page-trail__level page-trail__level--text" title={item.label}>{item.label}</span>;

  return <nav ref={nav} className={className ? `page-trail ${className}` : 'page-trail'} aria-label={label ?? t('@da-facility.pageTrail.label')}>
    {/* Desktop */}
    <ol className="page-trail__line">
      {shown.map((item, index) => item === null
        ? <li key="more" className="page-trail__more-item">
          <DropdownMenu button={more} hasChevron={false} placement="below" alignment="start" menuWidth={240} items={menuItems(hidden)} />
        </li>
        : <li key={`${index}-${item.label}`}>{level(item)}</li>)}
      <li>
        <span className="page-trail__level page-trail__level--current" aria-current="page" title={current.label}>{current.label}</span>
      </li>
    </ol>
    {/* Unseen: the whole trail on one line, then "…". What fits? */}
    {canCollapse && <ol ref={measure} className="page-trail__line page-trail__measure" aria-hidden="true" inert>
      {levels.map((item, index) => <li key={index}>
        <span className={index === count - 1 ? 'page-trail__level page-trail__level--current' : 'page-trail__level'}>{item.label}</span>
      </li>)}
      <li className="page-trail__more-item"><Button {...more} /></li>
    </ol>}
    {/* Phones */}
    <div className="page-trail__phone">
      {parent.href
        ? <Link className="page-trail__back" href={parent.href}>
          <span className="page-trail__back-sign" aria-hidden="true">‹</span>
          <span className="page-trail__back-label">{parent.label}</span>
        </Link>
        : <span className="page-trail__back-label">{parent.label}</span>}
      {ancestors.length > 1 && <DropdownMenu
        button={{label: t('@da-facility.pageTrail.allLevels'), children: '…', variant: 'ghost', className: 'page-trail__all'}}
        hasChevron={false}
        placement="below"
        alignment="start"
        menuWidth={280}
        items={menuItems(ancestors)}
      />}
    </div>
  </nav>;
}
