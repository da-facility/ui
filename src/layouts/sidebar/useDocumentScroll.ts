import {useLayoutEffect} from 'react';

export type DocumentScrollOptions = {
  /** Page background. Also fills the overscroll area unless `overscrollBackground` is set. */
  background?: string;
  /** Color revealed when native overscroll stretches past the page edges. */
  overscrollBackground?: string;
  /** `when-scrollable` allows native bounce only while content overflows. */
  overscroll?: 'when-scrollable' | 'none';
};

/**
 * Lets the document own native scrolling while the layout is mounted, so momentum
 * and rubber-banding stay native and fixed navigation remains outside their motion.
 * Document styles are restored on unmount.
 */
export function useDocumentScroll({background = '#fff', overscrollBackground, overscroll = 'when-scrollable'}: DocumentScrollOptions) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const properties = ['--app-background', '--app-overscroll-background', '--app-overscroll-y'];
    const previous = properties.map(name => [name, root.style.getPropertyValue(name), root.style.getPropertyPriority(name)]);
    root.style.setProperty('--app-background', background);
    if (overscrollBackground) root.style.setProperty('--app-overscroll-background', overscrollBackground);
    else root.style.removeProperty('--app-overscroll-background');
    // Content that fits must not bounce, but content that grows later (data
    // loads, expanding sections) must regain native overscroll.
    const measure = () => {
      const canScroll = root.scrollHeight > root.clientHeight + 1;
      root.style.setProperty('--app-overscroll-y', overscroll !== 'none' && canScroll ? 'contain' : 'none');
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    observer.observe(root);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      for (const [name, value, priority] of previous) {
        if (value) root.style.setProperty(name, value, priority);
        else root.style.removeProperty(name);
      }
    };
  }, [background, overscrollBackground, overscroll]);
}
