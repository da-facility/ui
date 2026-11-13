import type {MouseEvent, ReactNode} from 'react';
import {useLinkComponent} from '@astryxdesign/core/Link';
import {useMessages} from '../../i18n';
import './media-card.css';

export type MediaCardImage = {
  /** A small rendition, such as the grid's thumbnail. */
  src: string;
  /** Usually empty: the card's title already names what the cover shows. */
  alt?: string;
};

export type MediaCardProps = {
  /** Where the card leads. The whole card is one link, through Astryx's `LinkProvider`. */
  href: string;
  /** The name, such as a project or gallery name. */
  title: ReactNode;
  /**
   * Up to three cover images, newest first: one large on the left and two
   * small on the right. With fewer, the cover fills what exists; with none it
   * is an empty well.
   */
  images?: MediaCardImage[];
  /** Lines under the title, such as counts ("5 galleries · 2,004 photos"). */
  meta?: ReactNode[];
  /** The latest activity, such as "New photos 12 min ago" or a date. */
  activity?: ReactNode;
  /**
   * Marks recent activity with a dot before `activity`. The dot is never the
   * only sign: `activity` should say it in words, and screen readers hear "New".
   */
  isNew?: boolean;
  /**
   * Said in the cover when there are no `images`, such as "No photos yet", so
   * an empty project or gallery doesn't look like a cover that failed to load.
   * Without it the cover is a plain well.
   */
  emptyLabel?: ReactNode;
  /**
   * Fill the height of the cell the card sits in, with the meta lines and
   * activity at the bottom edge, so cards in one grid row are one height and
   * their meta lines line up. Defaults to false: the card is as tall as its content.
   */
  isFullHeight?: boolean;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

/** A link card with a cover of up to three images, a title and meta lines. */
export function MediaCard({href, title, images = [], meta = [], activity, isNew = false, emptyLabel, isFullHeight = false, onClick}: MediaCardProps) {
  const t = useMessages();
  const Link = useLinkComponent();
  const cover = images.slice(0, 3);
  const showEmpty = cover.length === 0 && emptyLabel != null && emptyLabel !== '';
  const lines = meta.filter(line => line != null && line !== false && line !== '');
  return <Link className={isFullHeight ? 'media-card media-card--full-height' : 'media-card'} href={href} onClick={onClick}>
    <span className="media-card__cover" data-count={cover.length}>
      {/* Shown in the cover, read after the title (below), so the link's name starts with the title. */}
      {showEmpty && <span className="media-card__empty" aria-hidden="true">{emptyLabel}</span>}
      {cover.map((image, index) => <img
        key={`${index}-${image.src}`}
        className="media-card__image"
        src={image.src}
        alt={image.alt ?? ''}
        loading="lazy"
        decoding="async"
      />)}
    </span>
    <span className="media-card__body">
      <span className="media-card__title">{title}</span>
      {showEmpty && <span className="media-card__visually-hidden">{emptyLabel}</span>}
      {lines.map((line, index) => <span key={index} className="media-card__meta">{line}</span>)}
      {(activity != null || isNew) && <span className="media-card__meta media-card__activity">
        {isNew && <>
          <span className="media-card__dot" aria-hidden="true" />
          <span className="media-card__visually-hidden">{t('@da-facility.mediaCard.new')}: </span>
        </>}
        {activity}
      </span>}
    </span>
  </Link>;
}
