import {useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent} from 'react';
import {useStoredState} from '../storage';

export type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

/**
 * Distances from the nearest horizontal and vertical screen edges. Positions are
 * stored this way and rendered with CSS `left`/`right`/`top`/`bottom`, so the
 * browser keeps the element in place while mobile toolbars collapse and the
 * safe area changes, without waiting for a resize event.
 */
type Anchor = {x: 'left' | 'right'; y: 'top' | 'bottom'; dx: number; dy: number};

const MARGIN = 12;
const DEFAULT: Anchor = {x: 'right', y: 'bottom', dx: MARGIN, dy: MARGIN};

function isAnchor(value: unknown): value is Anchor {
  const anchor = value as Anchor | null;
  return !!anchor && (anchor.x === 'left' || anchor.x === 'right') && (anchor.y === 'top' || anchor.y === 'bottom')
    && Number.isFinite(anchor.dx) && Number.isFinite(anchor.dy);
}

type Box = {left: number; top: number; width: number; height: number};

/**
 * Anchors the element to its nearer side, and to the top or bottom depending on
 * which half of the screen its bar is in. The element grows away from that edge,
 * so the bar stays under the pointer. Both boxes are where they would be after
 * moving by (dx, dy), kept on screen.
 */
function anchorAt(element: Box, bar: Box, dx: number, dy: number): Anchor {
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = document.documentElement.clientHeight;
  const barLeft = Math.max(MARGIN, Math.min(bar.left + dx, viewportWidth - bar.width - MARGIN));
  const barTop = Math.max(MARGIN, Math.min(bar.top + dy, viewportHeight - bar.height - MARGIN));
  const left = element.left + barLeft - bar.left;
  const top = element.top + barTop - bar.top;
  const right = viewportWidth - left - element.width;
  const bottom = viewportHeight - top - element.height;
  const isTop = barTop + bar.height / 2 < viewportHeight / 2;
  return {
    x: left <= right ? 'left' : 'right',
    dx: Math.max(MARGIN, Math.round(Math.min(left, right))),
    y: isTop ? 'top' : 'bottom',
    dy: Math.max(MARGIN, Math.round(isTop ? top : bottom)),
  };
}

/** Where the element and its bar (the part the handle sits in) are now. */
function measure(handle: HTMLElement, element: HTMLElement) {
  return {element: element.getBoundingClientRect(), bar: handle.parentElement!.getBoundingClientRect()};
}

/** A fixed-position element the user can drag, nudge with arrow keys, or dock to a corner. */
export function useFloatingPosition(storageKey: string, size: {width: number; height: number}) {
  const [stored, setAnchor] = useStoredState<Anchor>(storageKey, DEFAULT);
  const anchor = isAnchor(stored) ? stored : DEFAULT;
  const elementRef = useRef<HTMLDivElement>(null);

  const drag = useRef<{pointerId: number; startX: number; startY: number; element: Box; bar: Box} | null>(null);
  const [isDragging, setDragging] = useState(false);
  const endDrag = () => {
    drag.current = null;
    setDragging(false);
  };

  const handleProps = {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (event.button !== 0 || !elementRef.current) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = {pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, ...measure(event.currentTarget, elementRef.current)};
      setDragging(true);
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      const current = drag.current;
      if (current?.pointerId !== event.pointerId) return;
      setAnchor(anchorAt(current.element, current.bar, event.clientX - current.startX, event.clientY - current.startY));
    },
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    onLostPointerCapture: endDrag,
    onKeyDown(event: KeyboardEvent<HTMLElement>) {
      const step = event.shiftKey ? 40 : 10;
      const delta = {ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step]}[event.key];
      if (!delta || !elementRef.current) return;
      event.preventDefault();
      const {element, bar} = measure(event.currentTarget, elementRef.current);
      setAnchor(anchorAt(element, bar, delta[0], delta[1]));
    },
  };

  const dock = (corner: Corner) => setAnchor({
    x: corner.endsWith('right') ? 'right' : 'left',
    y: corner.startsWith('bottom') ? 'bottom' : 'top',
    dx: MARGIN,
    dy: MARGIN,
  });

  // `min()` keeps the element on screen if the viewport shrinks below the stored distance.
  const style = {
    [anchor.x]: `min(calc(${anchor.dx}px + env(safe-area-inset-${anchor.x})), calc(100% - ${size.width + MARGIN}px))`,
    [anchor.y]: `min(calc(${anchor.dy}px + env(safe-area-inset-${anchor.y})), calc(100% - ${size.height + MARGIN}px))`,
    '--floating-offset': `${anchor.dy}px`,
  } as CSSProperties;

  return {elementRef, style, opensUp: anchor.y === 'bottom', isDragging, handleProps, dock};
}
