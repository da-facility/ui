import {useLayoutEffect} from 'react';

export type DocumentAppearance = {
  background?: string;
  overscrollBackground?: string;
  overscroll?: 'when-scrollable' | 'none';
};

/** The document owns native scrolling; fixed navigation remains outside its motion. */
export function useDocumentAppearance({background = '#fff', overscrollBackground, overscroll = 'when-scrollable'}: DocumentAppearance) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const properties = ['--app-background', '--app-overscroll-background', '--app-overscroll-y'];
    const previous = properties.map(name => [name, root.style.getPropertyValue(name), root.style.getPropertyPriority(name)]);
    root.style.setProperty('--app-background', background);
    if (overscrollBackground) root.style.setProperty('--app-overscroll-background', overscrollBackground);
    else root.style.removeProperty('--app-overscroll-background');
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
