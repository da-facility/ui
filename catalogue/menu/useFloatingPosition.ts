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

/** Anchors a box at the given viewport position to its nearest edges. */
function anchorAt(left: number, top: number, width: number, height: number): Anchor {
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = document.documentElement.clientHeight;
  left = Math.max(MARGIN, Math.min(left, viewportWidth - width - MARGIN));
  top = Math.max(MARGIN, Math.min(top, viewportHeight - height - MARGIN));
  const right = viewportWidth - left - width;
  const bottom = viewportHeight - top - height;
  return {
    x: left <= right ? 'left' : 'right',
    dx: Math.round(Math.min(left, right)),
    y: top <= bottom ? 'top' : 'bottom',
    dy: Math.round(Math.min(top, bottom)),
  };
}

/** A fixed-position element the user can drag, nudge with arrow keys, or dock to a corner. */
export function useFloatingPosition(storageKey: string, size: {width: number; height: number}) {
  const [stored, setAnchor] = useStoredState<Anchor>(storageKey, DEFAULT);
  const anchor = isAnchor(stored) ? stored : DEFAULT;
  const elementRef = useRef<HTMLDivElement>(null);

  const drag = useRef<{pointerId: number; startX: number; startY: number; left: number; top: number} | null>(null);
  const [isDragging, setDragging] = useState(false);
  const endDrag = () => {
    drag.current = null;
    setDragging(false);
  };

  const handleProps = {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (event.button !== 0 || !elementRef.current) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      const box = elementRef.current.getBoundingClientRect();
      drag.current = {pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, left: box.left, top: box.top};
      setDragging(true);
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      const current = drag.current;
      if (current?.pointerId !== event.pointerId) return;
      setAnchor(anchorAt(current.left + event.clientX - current.startX, current.top + event.clientY - current.startY, size.width, size.height));
    },
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    onLostPointerCapture: endDrag,
    onKeyDown(event: KeyboardEvent<HTMLElement>) {
      const step = event.shiftKey ? 40 : 10;
      const delta = {ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step]}[event.key];
      if (!delta || !elementRef.current) return;
      event.preventDefault();
      const box = elementRef.current.getBoundingClientRect();
      setAnchor(anchorAt(box.left + delta[0], box.top + delta[1], size.width, size.height));
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
