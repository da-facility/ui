import type {ComponentPropsWithRef, CSSProperties} from 'react';
import './scroll-area.css';

/** Add to a scroll box you render yourself, or style one you cannot wrap, to make it a scroll area. */
export const scrollAreaClassName = 'scroll-area';

export type ScrollAreaOptions = {
  /** How far, in pixels, content fades out where it passes under an edge. 0 turns fading off. Defaults to 10. */
  fade?: number;
  /** Whether the area bounces natively while it overflows. Defaults to true. */
  bounce?: boolean;
};

export type ScrollAreaProps = ComponentPropsWithRef<'div'> & ScrollAreaOptions;

/** CSS variables that configure scroll areas; they apply to the element and everything inside it. */
export function scrollAreaStyle({fade, bounce}: ScrollAreaOptions): CSSProperties {
  const style: Record<string, string> = {};
  if (fade !== undefined) style['--scroll-area-fade'] = `${fade}px`;
  // `initial` clears a `none` inherited from an outer area, so bouncing follows overflow again.
  if (bounce !== undefined) style['--scroll-area-bounce'] = bounce ? 'initial' : 'none';
  return style;
}

/**
 * A scroll box inside fixed chrome, such as a list between a header and a footer.
 * While it overflows it keeps native momentum and bounce, without moving the page,
 * and content fades out under the edges that have more behind them. A box that
 * fits neither fades nor bounces. Give it a height (or a flex parent) to scroll.
 */
export function ScrollArea({fade, bounce, className, style, ...props}: ScrollAreaProps) {
  return <div
    {...props}
    className={className ? `${scrollAreaClassName} ${className}` : scrollAreaClassName}
    style={{...scrollAreaStyle({fade, bounce}), ...style}}
  />;
}
