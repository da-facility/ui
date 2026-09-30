import type {HTMLAttributes} from 'react';
import './page-scroll.css';

export type PageScrollProps = HTMLAttributes<HTMLDivElement> & {
  /** Page background. The bounce shows it too, unless `overscrollBackground` is set. Defaults to the theme's surface colour. */
  background?: string;
  /** Colour revealed when the page bounces past its top or bottom edge. */
  overscrollBackground?: string;
  /** `when-scrollable` bounces natively only while the page overflows; `none` never bounces. */
  overscroll?: 'when-scrollable' | 'none';
};

/**
 * Makes the document itself the page's scroller, so momentum and rubber-banding
 * are the browser's own. Keep page chrome `position: fixed` inside it and avoid
 * nested scroll boxes for page content. Mount one per document.
 */
export function PageScroll({background = 'var(--color-background-surface)', overscrollBackground, overscroll = 'when-scrollable', className, children, ...props}: PageScrollProps) {
  // The bounce reveals <html>'s background, which no element inside the page can
  // set from CSS. This style element sets it, and goes away when the page unmounts.
  const colours = `html:has(.page-scroll) {
    --page-background: ${cssValue(background)};
    ${overscrollBackground ? `--page-overscroll-background: ${cssValue(overscrollBackground)};` : ''}
  }`;
  return <div {...props} className={className ? `page-scroll ${className}` : 'page-scroll'} data-overscroll={overscroll}>
    <style>{colours}</style>
    {children}
  </div>;
}

/** Keeps a colour from closing the rule it is written into. */
function cssValue(value: string) {
  return value.replace(/[{}<;]/g, '');
}
