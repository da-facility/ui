import {useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject} from 'react';
import {useMediaQuery} from '@astryxdesign/core/hooks';
import {SideNav} from '@astryxdesign/core/SideNav';
import {PageScroll, type PageScrollProps} from '../../components/scroll/PageScroll';
import {scrollAreaStyle} from '../../components/scroll/ScrollArea';
import '../../components/scroll/scroll-area.css';
import {MobileNavigation, type MobileNavigationSide} from './MobileNavigation';
import './sidebar-layout.css';

export type SidebarLayoutProps = Pick<PageScrollProps, 'background' | 'overscrollBackground' | 'overscroll'> & {
  /** Navigation content, typically Astryx `SideNavSection` and `SideNavItem` elements. */
  navigation: ReactNode;
  /** Page content. */
  children: ReactNode;
  /** Page title in the header. Without a title or `headerActions`, there is no header. */
  title?: string;
  /** Content at the end of the header. */
  headerActions?: ReactNode;
  /** Pinned to the bottom of the page area, such as actions for the page. Content scrolls underneath. */
  footer?: ReactNode;
  /**
   * Pinned above the navigation, such as a title or a `ProjectSelector`. Text is
   * styled as a title; elements render as they are. Defaults to `navigationLabel`.
   */
  navigationHeader?: ReactNode;
  /** Pinned below the navigation, such as a `UserMenu`. The navigation scrolls between the two. */
  navigationFooter?: ReactNode;
  /** Accessible name for the navigation landmark and the mobile drawer. */
  navigationLabel?: string;
  /** How far, in pixels, navigation fades out under its header and footer. 0 turns fading off. */
  navigationFade?: number;
  /** Whether the navigation list bounces natively while it overflows. */
  navigationBounce?: boolean;
  /** Change this when the route changes so the mobile drawer closes. Routing stays in the app. */
  navigationKey?: string;
  /** A full-width bar above the whole layout, such as a `StatusBar`. */
  statusBar?: ReactNode;
  /** A chat bar below the whole layout, such as an `Assistant`. The layout contracts around it when it opens. */
  assistant?: ReactNode;
  /** Screen edge for the mobile menu button and drawer. */
  mobileNavigationSide?: MobileNavigationSide;
  /** Shows a left-handed toggle in the mobile drawer. The app owns persistence. */
  onMobileNavigationSideChange?: (side: MobileNavigationSide) => void;
  /** Distance in pixels between the mobile menu button and whatever is below it. */
  mobileNavigationOffset?: number;
  /** Decorative content for the spare space above the mobile navigation. */
  mobileNavigationArtwork?: ReactNode;
};

const NARROW_VIEWPORT = '(max-width: 768px), (max-height: 600px)';

/**
 * Full-page app shell with a fixed navigation rail on desktop and a thumb-reachable
 * drawer on mobile. CSS picks between them, so server rendering shows the right
 * one straight away. Built on `PageScroll`: the document scrolls, so momentum
 * and overscroll are native. Mount one per document.
 */
export function SidebarLayout({
  navigation,
  children,
  title,
  headerActions,
  footer,
  navigationLabel = 'Navigation',
  navigationHeader = navigationLabel,
  navigationFooter,
  navigationFade,
  navigationBounce,
  navigationKey,
  statusBar,
  assistant,
  mobileNavigationSide = 'right',
  onMobileNavigationSideChange,
  mobileNavigationOffset = 20,
  mobileNavigationArtwork,
  background,
  overscrollBackground,
  overscroll,
}: SidebarLayoutProps) {
  const titleId = useId();
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  // Only closes the drawer when the screen widens; the layout itself is CSS.
  const isNarrow = useMediaQuery(NARROW_VIEWPORT);
  useEffect(() => setDrawerOpen(false), [navigationKey, isNarrow]);

  const footerRef = useRef<HTMLElement>(null);
  useFooterHeight(footerRef, Boolean(footer));

  const hasHeader = Boolean(title || headerActions);
  const scrollStyle = scrollAreaStyle({fade: navigationFade, bounce: navigationBounce});
  // The drawer styles text headers itself; the rail needs a wrapper.
  const railHeader = typeof navigationHeader === 'string'
    ? <div className="sidebar-layout__navigation-title">{navigationHeader}</div>
    : navigationHeader;

  return <PageScroll
    className="sidebar-layout"
    background={background}
    overscrollBackground={overscrollBackground}
    overscroll={overscroll}
    data-side={mobileNavigationSide}
    data-header={hasHeader || undefined}
    data-status-bar={statusBar ? true : undefined}
    data-assistant={assistant ? true : undefined}>
    {statusBar && <div className="sidebar-layout__status-bar">{statusBar}</div>}
    <aside className="sidebar-layout__rail" style={scrollStyle}>
      <SideNav className="sidebar-layout__navigation" aria-label={navigationLabel} header={railHeader}>
        {navigation}
      </SideNav>
      {navigationFooter && <div className="sidebar-layout__rail-footer">{navigationFooter}</div>}
    </aside>
    {hasHeader && <header className="sidebar-layout__header">
      {title && <span id={titleId} className="sidebar-layout__title">{title}</span>}
      {headerActions}
    </header>}
    <main className="sidebar-layout__main" aria-labelledby={title ? titleId : undefined}>
      <div className="sidebar-layout__surface">{children}</div>
    </main>
    {footer && <footer ref={footerRef} className="sidebar-layout__footer">{footer}</footer>}
    <MobileNavigation
      navigation={navigation}
      navigationHeader={navigationHeader}
      navigationFooter={navigationFooter}
      navigationLabel={navigationLabel}
      navigationArtwork={mobileNavigationArtwork}
      scrollStyle={scrollStyle}
      side={mobileNavigationSide}
      onSideChange={onMobileNavigationSideChange}
      triggerOffset={mobileNavigationOffset}
      isOpen={isDrawerOpen}
      onOpenChange={setDrawerOpen}
    />
    {assistant && <>
      {/* Paints the backdrop around the page while an open assistant contracts it. */}
      <div className="sidebar-layout__frame" aria-hidden="true" />
      <div className="sidebar-layout__assistant">{assistant}</div>
    </>}
  </PageScroll>;
}

/** Reserves room below the content for the page footer, whatever its height. */
function useFooterHeight(ref: RefObject<HTMLElement | null>, hasFooter: boolean) {
  useLayoutEffect(() => {
    const footer = ref.current;
    const layout = footer?.parentElement;
    if (!footer || !layout) return;
    const measure = () => layout.style.setProperty('--sidebar-layout-footer-height', `${footer.offsetHeight}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(footer);
    return () => {
      observer.disconnect();
      layout.style.removeProperty('--sidebar-layout-footer-height');
    };
  }, [ref, hasFooter]);
}
