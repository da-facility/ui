import {memo, useRef, type KeyboardEvent, type MouseEvent, type PointerEvent} from 'react';
import {useLinkComponent} from '@astryxdesign/core/Link';
import {useMessages} from '../../i18n';
import './media-tile.css';

export type MediaTileProps = {
  /**
   * The image, usually a small rendition such as a 512px thumbnail. Without
   * it the tile is an empty well, as while its page loads.
   */
  src?: string;
  /** Text for the image, such as a photo's headline, caption or file name. */
  alt: string;
  /** The image's intrinsic size, so the browser can reserve space; the tile is 3:2 either way. */
  width?: number;
  height?: number;
  /** Where the tile leads, such as the viewer's route for this photo. Goes through Astryx's `LinkProvider`. */
  href: string;
  /** Whether the tile is selected: a ring around it and a filled tick. */
  isSelected?: boolean;
  /**
   * Makes the tile selectable: a circle in its corner toggles it, as do Space
   * on the focused tile and a long press on touch screens. Called with the
   * new state and whether Shift was held, for range selection.
   */
  onSelectedChange?: (isSelected: boolean, options: {isRange: boolean}) => void;
  /** Shows the selection circle on touch screens before a tile is selected, as when something already is. */
  isSelecting?: boolean;
  /** Called when the link is followed by click or Enter, before the link navigates. */
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  /** Tab order of the link; grids give one tile 0 and the rest -1. */
  tabIndex?: number;
};

/** One image in a grid: a 3:2 tile that is a link and, optionally, selectable. */
export function MediaTile({src, alt, width, height, href, isSelected = false, onSelectedChange, isSelecting, onClick, tabIndex}: MediaTileProps) {
  const toggle = onSelectedChange && ((_: number, isRange: boolean) => onSelectedChange(!isSelected, {isRange}));
  return <Tile
    index={0}
    src={src}
    alt={alt}
    width={width}
    height={height}
    href={href}
    isSelected={isSelected}
    isSelectable={Boolean(onSelectedChange)}
    isSelecting={isSelecting}
    tabIndex={tabIndex}
    onToggle={toggle}
    onOpen={onClick && ((_, event) => onClick(event))}
    onKeyDown={toggle && ((_, event) => {
      if (event.key !== ' ' || event.ctrlKey || event.metaKey || event.altKey) return;
      event.preventDefault();
      toggle(0, event.shiftKey);
    })}
  />;
}

type TileProps = Omit<MediaTileProps, 'onSelectedChange' | 'onClick'> & {
  index: number;
  isSelectable: boolean;
  onToggle?: (index: number, isRange: boolean) => void;
  onOpen?: (index: number, event: MouseEvent<HTMLAnchorElement>) => void;
  onKeyDown?: (index: number, event: KeyboardEvent<HTMLAnchorElement>) => void;
};

const LONG_PRESS = 500;

/**
 * The tile itself, shared by `MediaTile` and `MediaGrid`. Handlers take the
 * tile's index, so a grid passes the same functions to every tile and only
 * tiles whose own props change re-render.
 */
export const Tile = memo(function Tile({src, alt, width, height, href, index, isSelected, isSelectable, isSelecting, tabIndex, onToggle, onOpen, onKeyDown}: TileProps) {
  const t = useMessages();
  const Link = useLinkComponent();
  const press = useRef<{timer: number; x: number; y: number; fired: boolean} | null>(null);

  if (!src) return <div className="media-tile" data-index={index} data-loading="true" aria-hidden="true" />;

  // A long press on a touch screen selects instead of opening.
  function pointerDown(event: PointerEvent<HTMLAnchorElement>) {
    if (!isSelectable || event.pointerType !== 'touch') return;
    const state = {x: event.clientX, y: event.clientY, fired: false, timer: 0};
    state.timer = window.setTimeout(() => {
      state.fired = true;
      onToggle?.(index, false);
    }, LONG_PRESS);
    press.current = state;
  }
  function pointerMove(event: PointerEvent<HTMLAnchorElement>) {
    const state = press.current;
    if (state && !state.fired && Math.hypot(event.clientX - state.x, event.clientY - state.y) > 10) cancelPress();
  }
  function cancelPress() {
    if (press.current && !press.current.fired) {
      clearTimeout(press.current.timer);
      press.current = null;
    }
  }
  function click(event: MouseEvent<HTMLAnchorElement>) {
    if (press.current?.fired) {
      event.preventDefault();
      press.current = null;
      return;
    }
    press.current = null;
    if (isSelectable && event.shiftKey) {
      event.preventDefault();
      onToggle?.(index, true);
      return;
    }
    onOpen?.(index, event);
  }

  return <div className="media-tile" data-index={index} data-selected={isSelected || undefined} data-selecting={isSelecting || undefined}>
    <Link
      className="media-tile__link"
      href={href}
      tabIndex={tabIndex}
      draggable={false}
      onClick={click}
      onKeyDown={onKeyDown && ((event: KeyboardEvent<HTMLAnchorElement>) => onKeyDown(index, event))}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={cancelPress}
      onPointerCancel={cancelPress}
      onContextMenu={(event: MouseEvent) => { if (press.current?.fired) event.preventDefault(); }}
    >
      <img className="media-tile__image" src={src} alt={alt} width={width} height={height} loading="lazy" decoding="async" draggable={false} />
      {isSelected && <span className="media-tile__visually-hidden">, {t('@da-facility.mediaTile.selected')}</span>}
    </Link>
    {isSelectable && <label className="media-tile__select">
      <input
        type="checkbox"
        className="media-tile__checkbox"
        tabIndex={-1}
        checked={Boolean(isSelected)}
        aria-label={t('@da-facility.mediaTile.select', {name: alt})}
        onChange={() => {}}
        onClick={event => onToggle?.(index, event.shiftKey)}
      />
      <span className="media-tile__circle" aria-hidden="true" />
    </label>}
  </div>;
});
