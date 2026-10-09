/**
 * Replacing a toast in place. When a toast is shown `from` an element inside
 * another toast, such as its action button, it takes that toast's place
 * instead of arriving as a new one: a wave in the trail's colour spreads from
 * the pressed element and wipes the card clean, the card resizes to fit the new
 * content where it stands in the stack, and the new content fades in as an
 * arriving toast's does.
 *
 * A stand-in card covers the real one while it changes. The wave is a radial
 * gradient whose radius is a registered custom property (see toast.css),
 * animated with the Web Animations API. Nothing listens to scroll or resize
 * events, and the stand-in is removed when it is done.
 */
import {ARRIVING, easeOut, mix, revealContent, toRgba, trailStyle, type Point} from './arrival';

const WAVE = 'da-toast-wave';
const WIPE_DURATION = 260;
const RESIZE_DURATION = 180;
/** How many frames to wait for Sonner to show the new content before going on without it. */
const UPDATE_FRAMES = 20;

/**
 * Wipes `toast` clean with a wave from `origin`, calls `update` to give Sonner
 * the new content once nothing of the old shows, then resizes the card to the
 * new content and fades it in. `type` is the new toast's type, for the wave's
 * tint. Without animations it just updates.
 */
export function replaceInPlace(toast: HTMLElement, origin: Point, type: string | undefined, update: (hiddenClassName: string) => void) {
  if (typeof Element.prototype.animate !== 'function' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    update('');
    return;
  }
  const card = toast.dataset.styled === 'true' ? toast : (toast.firstElementChild as HTMLElement | null) ?? toast;
  const before = card.getBoundingClientRect();
  const look = getComputedStyle(card);
  const borderWidth = parseFloat(look.borderTopWidth) || 0;
  const radius = parseFloat(look.borderTopLeftRadius) || 0;
  const surface = toRgba(look.backgroundColor);
  const tint = trailStyle(toast, type).rgb;

  // The stand-in sits inside the card's border, so the border stays while the wave passes.
  const ghost = document.createElement('div');
  ghost.className = WAVE;
  ghost.setAttribute('aria-hidden', 'true');
  place(ghost, inset(before, borderWidth));
  ghost.style.borderRadius = `${Math.max(0, radius - borderWidth)}px`;
  ghost.style.setProperty('--da-wave-x', `${origin.x - before.left - borderWidth}px`);
  ghost.style.setProperty('--da-wave-y', `${origin.y - before.top - borderWidth}px`);
  ghost.style.setProperty('--da-wave-surface', mix(surface, surface, 1));
  ghost.style.setProperty('--da-wave-tint', `rgba(${tint.join(', ')}, 0.45)`);
  document.body.append(ghost);

  const reach = farthestCorner(origin, before) + 24;
  const wipe = ghost.animate(
    [{'--da-wave-radius': '0px'}, {'--da-wave-radius': `${reach}px`}],
    {duration: WIPE_DURATION, easing: 'cubic-bezier(0.25, 0.6, 0.3, 1)', fill: 'forwards'},
  );
  wipe.addEventListener('finish', () => {
    // Clean card: the stand-in becomes the whole card, a plain surface over
    // the finished wave, and the real one hides while Sonner swaps its content.
    place(ghost, before);
    Object.assign(ghost.style, {
      background: look.backgroundColor,
      border: `${borderWidth}px solid ${look.borderTopColor}`,
      borderRadius: `${radius}px`,
      boxShadow: look.boxShadow,
    });
    update(ARRIVING);
    whenUpdated(toast, () => resize(toast, ghost, before));
  });
}

/** Animates the stand-in from the old card to the new one, then hands over to the real card. */
function resize(toast: HTMLElement, ghost: HTMLElement, before: DOMRect) {
  const card = toast.dataset.styled === 'true' ? toast : (toast.firstElementChild as HTMLElement | null) ?? toast;
  const after = card.getBoundingClientRect();
  const look = getComputedStyle(card);
  const fromSurface = toRgba(ghost.style.backgroundColor);
  const toSurface = toRgba(look.backgroundColor);
  const fromEdge = toRgba(ghost.style.borderColor);
  const toEdge = toRgba(look.borderTopColor);
  const steps = 12;
  const frames = Array.from({length: steps + 1}, (_, index) => {
    const t = easeOut(index / steps, 3);
    return {
      left: `${lerp(before.left + before.width / 2, after.left + after.width / 2, t)}px`,
      top: `${lerp(before.top + before.height / 2, after.top + after.height / 2, t)}px`,
      width: `${lerp(before.width, after.width, t)}px`,
      height: `${lerp(before.height, after.height, t)}px`,
      backgroundColor: mix(fromSurface, toSurface, t),
      borderColor: mix(fromEdge, toEdge, t),
    };
  });
  const resizing = ghost.animate(frames, {duration: RESIZE_DURATION, fill: 'forwards'});
  const finish = () => {
    ghost.remove();
    toast.classList.remove(ARRIVING);
  };
  resizing.addEventListener('finish', () => {
    revealContent(toast);
    finish();
  });
  resizing.addEventListener('cancel', finish);
}

/**
 * Waits for Sonner to render the new content (its class marks the update) and
 * for layout to settle, polling frames rather than observing mutations so the
 * measurement lands after layout.
 */
function whenUpdated(toast: HTMLElement, onUpdated: () => void) {
  let frames = 0;
  const tick = () => {
    if (toast.classList.contains(ARRIVING) || !toast.isConnected || ++frames >= UPDATE_FRAMES) {
      // One more frame, so the new content has been laid out.
      requestAnimationFrame(onUpdated);
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function place(element: HTMLElement, rect: {left: number; top: number; width: number; height: number}) {
  element.style.left = `${rect.left + rect.width / 2}px`;
  element.style.top = `${rect.top + rect.height / 2}px`;
  element.style.width = `${rect.width}px`;
  element.style.height = `${rect.height}px`;
}

function inset(rect: DOMRect, by: number) {
  return {left: rect.left + by, top: rect.top + by, width: Math.max(0, rect.width - by * 2), height: Math.max(0, rect.height - by * 2)};
}

function farthestCorner(point: Point, rect: DOMRect) {
  return Math.max(
    Math.hypot(point.x - rect.left, point.y - rect.top),
    Math.hypot(point.x - rect.right, point.y - rect.top),
    Math.hypot(point.x - rect.left, point.y - rect.bottom),
    Math.hypot(point.x - rect.right, point.y - rect.bottom),
  );
}

function lerp(from: number, to: number, t: number) {
  return from + (to - from) * t;
}

