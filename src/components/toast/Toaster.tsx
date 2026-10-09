import {useEffect, type CSSProperties, type ReactNode} from 'react';
import {Toaster as SonnerToaster, type ToasterProps as SonnerToasterProps} from 'sonner';
import {useTheme} from '@astryxdesign/core/theme';
import {useMessages} from '../../i18n';
import {warmUp} from './arrival';
import './toast.css';

/** Corner or edge of the viewport the toasts stack in. */
export type ToastPosition = NonNullable<SonnerToasterProps['position']>;

/** Distance from the viewport edges, as pixels, a CSS length, or one per side. */
export type ToasterOffset = NonNullable<SonnerToasterProps['offset']>;

/** How toasts launched with `from` arrive: a star with a fading trail, which the card grows out of and absorbs. */
export type ToastArrival = {
  /** Colour of the trail and of the shape the toast opens from. Any CSS colour or token. Defaults to the theme's `--color-accent`. */
  color?: string;
  /** How much of the flight the trail covers behind the star, as a percentage. Defaults to 45. */
  tailLength?: number;
  /** How long the trail takes to slide into the toast and vanish after impact, in milliseconds. Defaults to 180. */
  fadeOut?: number;
  /**
   * Tint the trail of error toasts red and of warning toasts yellow, instead of
   * `color`. The colours are the toaster's `--da-toast-arrival-error-color` and
   * `--da-toast-arrival-warning-color`, from the theme's data colours by default.
   */
  tintByType?: boolean;
  /**
   * Start the card a little back along the star's path and let it settle onto
   * its place as it grows, so it carries the star's momentum.
   */
  momentum?: boolean;
};

export type ToasterProps = {
  /** Where toasts stack. Defaults to the bottom right. */
  position?: ToastPosition;
  /** How many toasts show at once; the rest wait behind them. Defaults to 3. */
  visibleToasts?: number;
  /** Show every toast at full size instead of collapsing them into a stack. */
  expand?: boolean;
  /** How long a toast stays, in milliseconds, unless its own `duration` says otherwise. Defaults to 4000. */
  duration?: number;
  /** Space between expanded toasts, in pixels. Defaults to 14. */
  gap?: number;
  /** Give every toast a close button. A toast can also set `closeButton` itself. */
  closeButton?: boolean;
  /** Colour the success, info, warning and error toasts, not only their icons. */
  richColors?: boolean;
  /** Distance from the viewport edges on desktop. Defaults to 24px. */
  offset?: ToasterOffset;
  /** Distance from the viewport edges on phones. Defaults to 16px. */
  mobileOffset?: ToasterOffset;
  /** Keys that focus the toasts, as `KeyboardEvent.code` values. Defaults to Alt+T. */
  hotkey?: string[];
  /** Directions a toast can be swiped away in. Defaults to all of them. */
  swipeDirections?: SonnerToasterProps['swipeDirections'];
  /** Icons for each toast type, in place of Sonner's. */
  icons?: SonnerToasterProps['icons'];
  /** Defaults applied to every toast, such as `duration`, `closeButton` or `classNames`. */
  toastOptions?: SonnerToasterProps['toastOptions'];
  /** Names this toaster, for `toasterId` on toasts when there are several. */
  id?: string;
  /** Text direction. Defaults to the document's. */
  dir?: SonnerToasterProps['dir'];
  /** How toasts launched with `from` arrive. See `ToastArrival`. */
  arrival?: ToastArrival;
  /** Accessible name of the notifications region. Defaults to the translated "Notifications" and the hotkey. */
  label?: string;
  className?: string;
  style?: CSSProperties;
};

/**
 * Where toasts appear. Mount one per document, anywhere in the app, and call
 * `toast()` from any code. Sonner draws the toasts; this styles them with the
 * Astryx theme's tokens so they follow the app's light and dark mode, and
 * translates their built-in text.
 */
export function Toaster({label, className, style, arrival, toastOptions, ...props}: ToasterProps): ReactNode {
  const t = useMessages();
  const {mode} = useTheme();
  // So the first toast's arrival doesn't stutter; see `warmUp`.
  useEffect(() => {
    if (typeof requestIdleCallback === 'function') {
      const handle = requestIdleCallback(warmUp, {timeout: 2000});
      return () => cancelIdleCallback(handle);
    }
    const handle = setTimeout(warmUp, 300);
    return () => clearTimeout(handle);
  }, []);
  return <SonnerToaster
    {...props}
    theme={mode}
    className={['da-toaster', arrival?.tintByType && 'da-toaster--tinted', arrival?.momentum && 'da-toaster--momentum', className].filter(Boolean).join(' ')}
    style={{...arrivalProperties(arrival), ...style}}
    containerAriaLabel={label ?? t('@da-facility.toast.notifications')}
    customAriaLabel={label}
    toastOptions={{closeButtonAriaLabel: t('@da-facility.toast.close'), ...toastOptions}}
  />;
}

/** The arrival settings as the custom properties arrival.ts reads; unset ones keep toast.css's defaults. */
function arrivalProperties(arrival: ToastArrival = {}) {
  const properties: Record<string, string | number> = {};
  if (arrival.color) properties['--da-toast-arrival-color'] = arrival.color;
  if (arrival.tailLength != null) properties['--da-toast-trail-length'] = arrival.tailLength;
  if (arrival.fadeOut != null) properties['--da-toast-trail-fade-out'] = arrival.fadeOut;
  return properties as CSSProperties;
}
