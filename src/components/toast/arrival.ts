/**
 * "Shooting star": a star with a fading trail flies from the element that asked
 * for a toast, on a slight curve, to where the toast will sit. It speeds up as
 * it goes, so it lands at its fastest. On impact the card grows out of the
 * landing point: a stand-in with the card's surface, border and shadow grows
 * from a dot to the card's size, bursting out and settling, while the rest of
 * the trail slides in after the star and fades, so the toast absorbs it.
 *
 * Sonner owns the toast's rendering and its normal slide-in. For a launched
 * toast, a class added through the toast's `className` hides it from its first
 * paint (clipped away, no transitions) while Sonner puts it in its final place.
 * Its rectangle is then measured, the trail is drawn on a short-lived canvas
 * beneath the toasts, and the stand-in grows with the Web Animations API; on
 * its last frame the real card, identical by then, takes over. Nothing here
 * listens to scroll or resize events, and every element it adds is removed
 * when it is done.
 *
 * The star starts behind the element that launched it: the trail is masked
 * out of that element's shape, so it seems to emerge from under it. Once the
 * card has opened, its content fades in.
 *
 * The trail's colour, tail length and fade out come from the toaster's CSS
 * custom properties (see toast.css and `Toaster`'s `arrival` prop); with
 * `tintByType`, error and warning toasts use their own colours.
 */

/** Where a toast arrives from: the element that triggered it, its rectangle, or a viewport point. */
export type ToastFrom = Element | DOMRect | {x: number; y: number};

/** Sets on a launched toast until its bloom has finished; see toast.css. */
export const ARRIVING = 'da-toast--arriving';
/** Sets while the content fades in, holding off Sonner's slower fade; see toast.css. */
export const SETTLING = 'da-toast--settling';
const TRAIL = 'da-toast-trail';
const STAND_IN = 'da-toast-stand-in';
const FLIGHT_DURATION = 240;
const BLOOM_DURATION = 200;
/** How long the toast's content takes to fade in once the card has opened. */
const CONTENT_FADE = 140;
/** Keyframes sampled along the bloom, so each property can follow its own curve. */
const BLOOM_STEPS = 24;
/** Size the card grows from: about the trail's head, so the star carries straight into it. */
const IMPACT_SIZE = 4;
/** How far back along the star's path the card starts when it carries the star's momentum, in pixels. */
const MOMENTUM_OFFSET = 18;
/** Points the flight path is sampled at. */
const PATH_STEPS = 64;
/** Points the trail's outline is drawn through. */
const TRAIL_STEPS = 24;
/** Opacity of the trail just behind the star, strong enough for its impact to read. */
const TRAIL_OPACITY = 0.95;
/** Width of the trail at the star, in CSS pixels; it tapers to nothing at the tail. */
const HEAD_WIDTH = 3;
/** Width of the faint glow around the trail at the star, in CSS pixels. */
const GLOW_WIDTH = 10;
/** How many frames to wait for Sonner to mount the toast before giving up. */
const MOUNT_FRAMES = 60;

let launches = 0;

export type Launch = {
  /** Class names to add to the toast, so it starts hidden and can be found. */
  className: string;
  /** Starts the flight. Call it after the toast has been given to Sonner. */
  fly: () => void;
};

export type Point = {x: number; y: number};

/** The launching element's shape, which the trail is hidden behind. */
type Cover = {x: number; y: number; width: number; height: number; radius: number};

/** How the trail looks, read from the toaster's custom properties. */
type TrailStyle = {
  /** Red, green and blue of the trail's colour. */
  rgb: [number, number, number];
  /** CSS colour of the shape the toast opens from. */
  color: string;
  /** Length of the trail behind the star, as a fraction of the whole flight. */
  length: number;
  /** How long the trail takes to slide into the toast and vanish after impact, in milliseconds. */
  fadeOut: number;
  /** Whether the card starts a little back along the star's path and settles onto its place. */
  momentum: boolean;
};

let isWarm = false;

/**
 * Does the first-time work of a flight while nothing is happening: the
 * browser's first canvas is slow to create, Safari's especially, and the trail
 * code runs slowly until the engine has optimised it. Without this the first
 * toast after a page load stutters. Draws nothing anyone sees.
 */
export function warmUp() {
  if (isWarm || typeof document === 'undefined') return;
  isWarm = true;
  const canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 8;
  const context = canvas.getContext('2d');
  if (!context) return;
  const path = arc({x: 0, y: 0}, {x: 8, y: 8}, PATH_STEPS);
  boundsOf(path, GLOW_WIDTH);
  for (let index = 0; index < 4; index++) drawTrail(context, path, 0, 1 - index * 0.1, [0, 0, 0], 0);
  toRgba('rgb(0, 0, 0)');
}

/**
 * Prepares a flight from `from`, or returns `undefined` when there is nothing
 * to fly from, the person prefers reduced motion, or the browser cannot
 * animate, in which case the toast shows with Sonner's own animation.
 */
export function prepareLaunch(from: ToastFrom | undefined): Launch | undefined {
  if (!from || typeof document === 'undefined' || typeof Element === 'undefined') return undefined;
  if (typeof Element.prototype.animate !== 'function') return undefined;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;

  const origin = centreOf(from);
  if (!origin) return undefined;
  const cover = coverOf(from);
  const marker = `da-toast-launch-${++launches}`;
  return {
    className: `${ARRIVING} ${marker}`,
    fly: () => whenMounted(`.${marker}`, toast => shootingStar(origin, cover, toast)),
  };
}

/** The rectangle (with its corner radius) the star starts behind, when `from` has one. */
function coverOf(from: ToastFrom): Cover | undefined {
  if (from instanceof Element) {
    const rect = from.getBoundingClientRect();
    const radius = parseFloat(getComputedStyle(from).borderTopLeftRadius) || 0;
    return {x: rect.x, y: rect.y, width: rect.width, height: rect.height, radius: Math.min(radius, rect.width / 2, rect.height / 2)};
  }
  if (typeof DOMRect !== 'undefined' && from instanceof DOMRect) return {x: from.x, y: from.y, width: from.width, height: from.height, radius: 0};
  return undefined;
}

function centreOf(from: ToastFrom) {
  if (from instanceof Element) {
    const rect = from.getBoundingClientRect();
    return {x: rect.left + rect.width / 2, y: rect.top + rect.height / 2};
  }
  if (typeof DOMRect !== 'undefined' && from instanceof DOMRect) return {x: from.x + from.width / 2, y: from.y + from.height / 2};
  if (Number.isFinite(from.x) && Number.isFinite(from.y)) return {x: from.x, y: from.y};
  return undefined;
}

/**
 * Sonner renders the toast on its next React render and flips `data-mounted`
 * in an effect after that, so the final rectangle is only right once both have
 * happened. Frames are polled instead of observing mutations so the measurement
 * lands after layout. If no toast appears (no `Toaster` mounted) it stops; if
 * one appears late, it is simply shown.
 */
function whenMounted(selector: string, onMounted: (toast: HTMLElement) => void) {
  let frames = 0;
  const tick = () => {
    const toast = document.querySelector<HTMLElement>(`${selector}[data-mounted="true"]`);
    if (toast) return onMounted(toast);
    if (++frames < MOUNT_FRAMES) return requestAnimationFrame(tick);
    document.querySelector(selector)?.classList.remove(ARRIVING);
  };
  requestAnimationFrame(tick);
}

function shootingStar(origin: Point, cover: Cover | undefined, toast: HTMLElement) {
  const rect = toast.getBoundingClientRect();
  const target = {x: rect.left + rect.width / 2, y: rect.top + rect.height / 2};
  const style = trailStyle(toast);
  const path = arc(origin, target, PATH_STEPS);

  // The canvas covers only the flight, not the screen: a phone's screen at its
  // pixel density is millions of pixels to allocate and clear every frame.
  const bounds = boundsOf(path, GLOW_WIDTH);
  const canvas = document.createElement('canvas');
  canvas.className = TRAIL;
  canvas.setAttribute('aria-hidden', 'true');
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.ceil(bounds.width * ratio);
  canvas.height = Math.ceil(bounds.height * ratio);
  Object.assign(canvas.style, {left: `${bounds.left}px`, top: `${bounds.top}px`, width: `${bounds.width}px`, height: `${bounds.height}px`});
  document.body.append(canvas);
  const context = canvas.getContext('2d');
  if (!context) {
    canvas.remove();
    return bloom(toast, target, style, {x: 0, y: 0});
  }
  // Drawing stays in page coordinates.
  context.scale(ratio, ratio);
  context.translate(-bounds.left, -bounds.top);

  let start: number | undefined;
  let hasLanded = false;
  let tailAtImpact = 0;
  const frame = (now: number) => {
    start ??= now;
    const elapsed = now - start;
    let head: number;
    let tail: number;
    let opacity = 1;
    if (elapsed < FLIGHT_DURATION) {
      head = flightEase(elapsed / FLIGHT_DURATION);
      tail = Math.max(0, head - style.length);
    } else {
      // After impact the star stays in the toast and the trail follows it in,
      // slowing as it arrives and fading, so the toast absorbs it.
      if (!hasLanded) {
        hasLanded = true;
        tailAtImpact = Math.max(0, 1 - style.length);
        if (toast.isConnected) bloom(toast, target, style, direction(path));
        else toast.classList.remove(ARRIVING);
      }
      const absorbed = style.fadeOut > 0 ? Math.min(1, (elapsed - FLIGHT_DURATION) / style.fadeOut) : 1;
      head = 1;
      tail = tailAtImpact + (1 - tailAtImpact) * (1 - (1 - absorbed) ** 2);
      opacity = 1 - absorbed * absorbed;
    }

    context.clearRect(bounds.left, bounds.top, bounds.width, bounds.height);
    if (opacity > 0 && head - tail > 0.001) {
      context.save();
      if (cover) hideBehind(context, cover, bounds);
      drawTrail(context, path, tail, head, style.rgb, opacity);
      context.restore();
    }
    // Where the star is, for tests and debugging.
    const star = pointAt(path, head);
    canvas.dataset.head = `${star.x.toFixed(1)},${star.y.toFixed(1)}`;

    if (elapsed < FLIGHT_DURATION + style.fadeOut) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}

/** Clips drawing to everything except `cover`, so the trail passes behind the launching element. */
function hideBehind(context: CanvasRenderingContext2D, cover: Cover, bounds: Bounds) {
  context.beginPath();
  context.rect(bounds.left, bounds.top, bounds.width, bounds.height);
  if (typeof context.roundRect === 'function') context.roundRect(cover.x, cover.y, cover.width, cover.height, cover.radius);
  else context.rect(cover.x, cover.y, cover.width, cover.height);
  context.clip('evenodd');
}

/**
 * Fills the trail between `tail` and `head` (fractions of the flight) as one
 * smooth shape: full width at the star, tapering to a point at the tail, and
 * fading from nearly opaque at the star to transparent at the tail. The fade
 * follows the trail's own direction, which is close enough to its slight curve.
 */
function drawTrail(context: CanvasRenderingContext2D, path: Point[], tail: number, head: number, rgb: [number, number, number], opacity: number) {
  const spine = Array.from({length: TRAIL_STEPS + 1}, (_, index) => pointAt(path, tail + (head - tail) * index / TRAIL_STEPS));
  const [r, g, b] = rgb;
  const end = spine[0];
  const star = spine[spine.length - 1];
  context.globalAlpha = opacity;
  // A wide faint pass for the glow, then the core. Canvas shadows would blur
  // it for us, but they are slow, worst of all in Safari.
  for (const [width, strength] of [[GLOW_WIDTH, 0.22], [HEAD_WIDTH, 1]] as const) {
    const gradient = context.createLinearGradient(end.x, end.y, star.x, star.y);
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`);
    gradient.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, ${TRAIL_OPACITY * 0.35 * strength})`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${TRAIL_OPACITY * strength})`);
    context.fillStyle = gradient;
    context.beginPath();
    ribbon(context, spine, width);
    context.fill();
  }
}

/** Outlines a shape along `spine`, `width` wide at its end and tapering to a point at its start. */
function ribbon(context: CanvasRenderingContext2D, spine: Point[], width: number) {
  const left: Point[] = [];
  const right: Point[] = [];
  spine.forEach((point, index) => {
    const before = spine[Math.max(0, index - 1)];
    const after = spine[Math.min(spine.length - 1, index + 1)];
    const length = Math.hypot(after.x - before.x, after.y - before.y) || 1;
    const normal = {x: -(after.y - before.y) / length, y: (after.x - before.x) / length};
    const half = width / 2 * (index / (spine.length - 1)) ** 0.6;
    left.push({x: point.x + normal.x * half, y: point.y + normal.y * half});
    right.push({x: point.x - normal.x * half, y: point.y - normal.y * half});
  });
  context.moveTo(left[0].x, left[0].y);
  for (const point of left.slice(1)) context.lineTo(point.x, point.y);
  for (const point of right.reverse()) context.lineTo(point.x, point.y);
  context.closePath();
}

type Bounds = {left: number; top: number; width: number; height: number};

/** The rectangle around `path`, with `margin` to spare on every side, in whole pixels. */
function boundsOf(path: Point[], margin: number): Bounds {
  const xs = path.map(point => point.x);
  const ys = path.map(point => point.y);
  const left = Math.floor(Math.min(...xs) - margin);
  const top = Math.floor(Math.min(...ys) - margin);
  return {left, top, width: Math.ceil(Math.max(...xs) + margin) - left, height: Math.ceil(Math.max(...ys) + margin) - top};
}

/**
 * The card grows out of the impact. A stand-in with the card's own surface,
 * border, corner radius and shadow grows from the star's dot to the card's
 * size, starting fast to carry the star's speed and settling; height and width
 * ease out on the same clock, height a little sooner, so it gets taller and
 * wider together. Its colour turns from the trail's to the card's as it grows.
 * On its last frame the real card, identical by then, takes over, and its
 * content fades in.
 */
function bloom(toast: HTMLElement, target: Point, style: TrailStyle, heading: Point) {
  // A custom toast is its own card, inside an unstyled toast.
  const card = toast.dataset.styled === 'true' ? toast : (toast.firstElementChild as HTMLElement | null) ?? toast;
  const rect = card.getBoundingClientRect();
  const scale = rect.width / (card.offsetWidth || rect.width);
  const look = getComputedStyle(card);
  const surface = toRgba(look.backgroundColor);
  const edge = toRgba(look.borderTopColor);
  const trail: Rgba = [...style.rgb, 1];
  const radius = (parseFloat(look.borderTopLeftRadius) || 0) * scale;
  const borderWidth = (parseFloat(look.borderTopWidth) || 0) * scale;
  const centre = {x: rect.left + rect.width / 2, y: rect.top + rect.height / 2};
  const offset = style.momentum ? MOMENTUM_OFFSET : 0;

  const ghost = document.createElement('div');
  ghost.className = STAND_IN;
  ghost.setAttribute('aria-hidden', 'true');
  ghost.style.left = `${centre.x}px`;
  ghost.style.top = `${centre.y}px`;
  document.body.append(ghost);

  const frames = Array.from({length: BLOOM_STEPS + 1}, (_, index) => {
    const t = index / BLOOM_STEPS;
    const across = easeOut(t, 3);
    const up = easeOut(t, 4.5);
    const width = IMPACT_SIZE + (rect.width - IMPACT_SIZE) * across;
    const height = IMPACT_SIZE + (rect.height - IMPACT_SIZE) * up;
    const tint = 1 - smoothstep(0, 0.55, t);
    const back = offset * (1 - across);
    return {
      width: `${width}px`,
      height: `${height}px`,
      borderRadius: `${Math.min(width / 2, height / 2, Math.max(IMPACT_SIZE / 2, radius))}px`,
      borderWidth: `${borderWidth * smoothstep(0.2, 0.7, t)}px`,
      backgroundColor: mix(trail, surface, 1 - tint),
      borderColor: mix(trail, edge, 1 - tint),
      boxShadow: index === BLOOM_STEPS ? look.boxShadow : 'none',
      transform: `translate(${-heading.x * back}px, ${-heading.y * back}px)`,
    };
  });
  // The shadow eases in over the bloom rather than stepping at its end.
  if (look.boxShadow !== 'none') frames[0].boxShadow = shadowless(look.boxShadow);
  const growing = ghost.animate(frames, {duration: BLOOM_DURATION, fill: 'forwards'});

  const finish = () => {
    ghost.remove();
    toast.classList.remove(ARRIVING);
  };
  growing.addEventListener('finish', () => {
    revealContent(toast);
    finish();
  });
  growing.addEventListener('cancel', finish);
}

/**
 * Fades a toast's content in quickly once its card is in place. Call it in the
 * same frame as taking off the class that hid the content, so it never shows
 * early; Sonner's own slower fade is held off until this one is done.
 */
export function revealContent(toast: HTMLElement) {
  toast.classList.add(SETTLING);
  const fades = toast.dataset.styled === 'true'
    ? [...toast.children].map(child => child.animate([{opacity: 0}, {opacity: 1}], {duration: CONTENT_FADE, easing: 'ease-out'}))
    : [];
  Promise.all(fades.map(fade => fade.finished.catch(() => undefined))).then(() => toast.classList.remove(SETTLING));
}

export type Rgba = [number, number, number, number];

/** The unit direction the star travels in as it lands. */
function direction(path: Point[]) {
  const from = path[path.length - 2];
  const to = path[path.length - 1];
  const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  return {x: (to.x - from.x) / length, y: (to.y - from.y) / length};
}

/** Fast at first and settling, with a starting speed of `power` times the average. */
export function easeOut(t: number, power: number) {
  return 1 - (1 - t) ** power;
}

function smoothstep(from: number, to: number, t: number) {
  const x = Math.min(1, Math.max(0, (t - from) / (to - from)));
  return x * x * (3 - 2 * x);
}

export function mix(from: Rgba, to: Rgba, amount: number) {
  const channel = (index: number) => from[index] + (to[index] - from[index]) * amount;
  return `rgba(${Math.round(channel(0))}, ${Math.round(channel(1))}, ${Math.round(channel(2))}, ${channel(3).toFixed(3)})`;
}

/** The same shadows with nothing showing, so the browser can ease between them. */
function shadowless(shadow: string) {
  return shadow.replace(/rgba?\([^)]*\)/g, 'rgba(0, 0, 0, 0)');
}

/**
 * Reads the trail settings from the toaster. The colour is resolved through a
 * probe element, because custom properties hold tokens such as `light-dark()`
 * that a canvas cannot paint, and only a real element knows its colour scheme;
 * painting it on a one-pixel canvas then gives its red, green and blue, so the
 * trail can fade it to transparent without passing through black.
 */
export function trailStyle(toast: HTMLElement, type = toast.dataset.type): TrailStyle {
  const host = toast.closest<HTMLElement>('.da-toaster') ?? toast;
  const styles = getComputedStyle(host);
  const number = (name: string, fallback: number) => {
    const value = parseFloat(styles.getPropertyValue(name));
    return Number.isFinite(value) ? value : fallback;
  };
  const probe = document.createElement('span');
  const base = 'var(--da-toast-arrival-color, var(--color-accent, currentColor))';
  const isTinted = host.classList.contains('da-toaster--tinted') && (type === 'error' || type === 'warning');
  probe.style.color = isTinted ? `var(--da-toast-arrival-${type}-color, ${base})` : base;
  probe.style.display = 'none';
  host.append(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return {
    rgb: toRgb(color),
    color,
    length: Math.max(0.01, number('--da-toast-trail-length', 45) / 100),
    fadeOut: Math.max(0, number('--da-toast-trail-fade-out', 180)),
    momentum: host.classList.contains('da-toaster--momentum'),
  };
}

function toRgb(color: string): [number, number, number] {
  const [r, g, b] = toRgba(color);
  return [r, g, b];
}

const colours = new Map<string, Rgba>();
let pixel: CanvasRenderingContext2D | null | undefined;

/**
 * Any CSS colour as red, green, blue (0–255) and alpha (0–1). Computed
 * colours are usually `rgb()` or `rgba()` and are read as text; anything else,
 * such as `oklch()`, is painted on a one-pixel canvas and read back. Results
 * are remembered, since the same few colours come up on every toast.
 */
export function toRgba(color: string): Rgba {
  const known = colours.get(color);
  if (known) return known;
  const match = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/.exec(color);
  let rgba: Rgba;
  if (match) {
    const alpha = match[4] === undefined ? 1 : match[4].endsWith('%') ? parseFloat(match[4]) / 100 : parseFloat(match[4]);
    rgba = [Number(match[1]), Number(match[2]), Number(match[3]), alpha];
  } else {
    pixel ??= document.createElement('canvas').getContext('2d', {willReadFrequently: true});
    if (!pixel) return [0, 0, 0, 1];
    pixel.clearRect(0, 0, 1, 1);
    pixel.fillStyle = color;
    pixel.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = pixel.getImageData(0, 0, 1, 1).data;
    rgba = [r, g, b, a / 255];
  }
  colours.set(color, rgba);
  return rgba;
}

/**
 * The head's progress along the arc over time: it sets off gently and keeps
 * accelerating, so it arrives at its fastest and the toast opening reads as an
 * impact. A little linear speed keeps the start from feeling stuck.
 */
function flightEase(t: number) {
  return 0.15 * t + 0.85 * t ** 2.6;
}

function pointAt(path: Point[], progress: number) {
  const position = progress * (path.length - 1);
  const index = Math.min(path.length - 2, Math.floor(position));
  const t = position - index;
  return {x: path[index].x + (path[index + 1].x - path[index].x) * t, y: path[index].y + (path[index + 1].y - path[index].y) * t};
}

/**
 * Points along a quadratic curve from `start` to `end`, bowing a little above
 * the straight line.
 */
function arc(start: Point, end: Point, steps: number) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const bow = Math.min(length * 0.18, 96);
  // Perpendicular to the chord, on the side that curves upward.
  let nx = dy / length;
  let ny = -dx / length;
  if (ny > 0 || (ny === 0 && nx < 0)) { nx = -nx; ny = -ny; }
  const control = {x: start.x + dx / 2 + nx * bow, y: start.y + dy / 2 + ny * bow};
  return Array.from({length: steps + 1}, (_, index) => {
    const t = index / steps;
    const a = (1 - t) ** 2;
    const b = 2 * (1 - t) * t;
    const c = t ** 2;
    return {x: a * start.x + b * control.x + c * end.x, y: a * start.y + b * control.y + c * end.y};
  });
}
