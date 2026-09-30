import {useEffect, useRef, useState, type KeyboardEvent, type PointerEvent} from 'react';
import {useStoredState} from '../storage';

export type Position = {x: number; y: number};
export type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

const MARGIN = 12;

/** A fixed-position element the user can drag, nudge with arrow keys, or dock to a corner. */
export function useFloatingPosition(storageKey: string, size: {width: number; height: number}) {
  const clamp = ({x, y}: Position): Position => ({
    x: Math.max(MARGIN, Math.min(x, window.innerWidth - size.width - MARGIN)),
    y: Math.max(MARGIN, Math.min(y, window.innerHeight - size.height - MARGIN)),
  });
  const [stored, setStored] = useStoredState<Position | null>(storageKey, null);
  const position = clamp(stored ?? {x: Infinity, y: Infinity});
  const setPosition = (next: Position) => setStored(clamp(next));

  // Re-render on resize so the clamped position follows the viewport.
  const [, setViewport] = useState(0);
  useEffect(() => {
    const resize = () => setViewport(window.innerWidth * 10_000 + window.innerHeight);
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const drag = useRef<{pointerId: number; start: Position; origin: Position} | null>(null);
  const [isDragging, setDragging] = useState(false);
  const endDrag = () => {
    drag.current = null;
    setDragging(false);
  };

  const handleProps = {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (event.button !== 0) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = {pointerId: event.pointerId, start: {x: event.clientX, y: event.clientY}, origin: position};
      setDragging(true);
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      const current = drag.current;
      if (current?.pointerId !== event.pointerId) return;
      setPosition({x: current.origin.x + event.clientX - current.start.x, y: current.origin.y + event.clientY - current.start.y});
    },
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    onLostPointerCapture: endDrag,
    onKeyDown(event: KeyboardEvent<HTMLElement>) {
      const step = event.shiftKey ? 40 : 10;
      const delta = {ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step]}[event.key];
      if (!delta) return;
      event.preventDefault();
      setPosition({x: position.x + delta[0], y: position.y + delta[1]});
    },
  };

  const dock = (corner: Corner) => setPosition({
    x: corner.endsWith('right') ? Infinity : 0,
    y: corner.startsWith('bottom') ? Infinity : 0,
  });

  return {position, isDragging, handleProps, dock};
}
