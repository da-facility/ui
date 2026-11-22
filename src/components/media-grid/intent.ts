import {useRef, type FocusEvent, type PointerEvent, type TouchEvent} from 'react';
import type {MediaGridItem} from './MediaGrid';

/**
 * `onItemIntent` for a grid: the item whose tile the mouse comes over, a finger touches or the keyboard focuses, once
 * per tile until another one, through one set of handlers on the grid (no listener per tile). The app starts loading
 * what opening it shows, so it is there by the click.
 */
export function useItemIntent<Item extends MediaGridItem>(items: readonly Item[], onItemIntent: ((item: Item, index: number) => void) | undefined) {
  const last = useRef<string | null>(null);
  const latest = useRef({items, onItemIntent});
  latest.current = {items, onItemIntent};
  if (!onItemIntent) return undefined;
  const intent = (target: EventTarget | null) => {
    const tile = target instanceof Element ? target.closest<HTMLElement>('.media-tile[data-index]') : null;
    const index = tile ? Number(tile.dataset.index) : NaN;
    const item = latest.current.items[index];
    if (!item || item.id === last.current) return;
    last.current = item.id;
    latest.current.onItemIntent?.(item, index);
  };
  return {
    onPointerOver: (event: PointerEvent) => event.pointerType === 'mouse' && intent(event.target),
    onTouchStart: (event: TouchEvent) => intent(event.target),
    onFocus: (event: FocusEvent) => intent(event.target),
  };
}
