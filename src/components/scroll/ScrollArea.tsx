import type {CSSProperties, HTMLAttributes} from 'react';
import './scroll-area.css';

/** Add to a scroll box you render yourself, or style one you cannot wrap, to make it a scroll area. */
export const scrollAreaClassName = 'scroll-area';

export type ScrollAreaProps = HTMLAttributes<HTMLDivElement> & {
  /** How far, in pixels, content fades out where it passes under an edge. Defaults to 10. */
  fade?: number;
};

/**
 * A scroll box inside fixed chrome, such as a list between a header and a footer.
 * While it overflows it keeps native momentum and bounce, without moving the page,
 * and content fades out under the edges that have more behind them. A box that
 * fits neither fades nor bounces. Give it a height (or a flex parent) to scroll.
 */
export function ScrollArea({fade, className, style, ...props}: ScrollAreaProps) {
  return <div
    {...props}
    className={className ? `${scrollAreaClassName} ${className}` : scrollAreaClassName}
    style={fade === undefined ? style : {...style, '--scroll-area-fade': `${fade}px`} as CSSProperties}
  />;
}
