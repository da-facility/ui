import {useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject} from 'react';
import {useMediaQuery} from '@astryxdesign/core/hooks';
import {SideNav} from '@astryxdesign/core/SideNav';
import {PageScroll, type PageScrollProps} from '../../components/scroll/PageScroll';
import {useMessages} from '../../i18n';
import {scrollAreaStyle} from '../../components/scroll/ScrollArea';
import '../../components/scroll/scroll-area.css';
import {MobileNavigation, MobileNavigationButton, type MobileNavigationSide, type MobileNavigationTrigger} from './MobileNavigation';
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
   * styled as a title; elements render as they are. Defaults to `navigationLabel`;
   * pass `null` for no header.
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
  /**
   * How phones open the navigation. `'floating'` (the default): a round menu
   * button in the thumb zone, bottom corner. `'top-bar'`: a bar across the top
   * with the menu button at the `mobileNavigationSide` edge and `mobileTitle`
   * (or `title`) beside it; nothing floats over the page. Wider screens are
   * unchanged either way.
   */
  mobileNavigationTrigger?: MobileNavigationTrigger;
  /**
   * Text in the phone top bar, such as the current page's title. Defaults to
   * `title`. Only with `mobileNavigationTrigger="top-bar"`; not shown on wider
   * screens.
   */
  mobileTitle?: ReactNode;
  /** Shows a left-handed toggle in the mobile drawer. The app owns persistence. */
  onMobileNavigationSideChange?: (side: MobileNavigationSide) => void;
  /** Distance in pixels between the floating mobile menu button and whatever is below it. */
  mobileNavigationOffset?: number;
  /** Decorative content for the spare space above the mobile navigation. */
  mobileNavigationArtwork?: ReactNode;
};

const NARROW_VIEWPORT = '(max-width: 768px), (max-height: 600px)';

/**
 * Full-page app shell with a fixed navigation rail on desktop and a drawer on
 * mobile, opened from a floating button in the thumb zone or a top bar. CSS picks between them, so server rendering shows the right
 * one straight away. Built on `PageScroll`: the document scrolls, so momentum
 * and overscroll are native. Mount one per document.
 */
export function SidebarLayout({
  navigation,
  children,
  title,
  headerActions,
  footer,
  navigationLabel: navigationLabelProp,
  navigationHeader: navigationHeaderProp,
  navigationFooter,
  navigationFade,
  navigationBounce,
  navigationKey,
  statusBar,
  assistant,
  mobileNavigationSide = 'right',
  mobileNavigationTrigger = 'floating',
  mobileTitle,
  onMobileNavigationSideChange,
  mobileNavigationOffset = 20,
  mobileNavigationArtwork,
  background,
  overscrollBackground,
  overscroll,
}: SidebarLayoutProps) {
  const t = useMessages();
  const navigationLabel = navigationLabelProp ?? t('@da-facility.sidebarLayout.navigation');
  const navigationHeader = navigationHeaderProp === undefined ? navigationLabel : navigationHeaderProp;
  const titleId = useId();
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  // Only closes the drawer when the screen widens; the layout itself is CSS.
  const isNarrow = useMediaQuery(NARROW_VIEWPORT);
  useEffect(() => setDrawerOpen(false), [navigationKey, isNarrow]);

  const footerRef = useRef<HTMLElement>(null);
  useFooterHeight(footerRef, Boolean(footer));

  const triggerRef = useRef<HTMLButtonElement>(null);
  const hasHeader = Boolean(title || headerActions);
  const hasTopBar = mobileNavigationTrigger === 'top-bar';
  const topBarTitle = mobileTitle ?? title;
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
    data-mobile-trigger={hasTopBar ? 'top-bar' : undefined}
    data-status-bar={statusBar ? true : undefined}
    data-assistant={assistant ? true : undefined}>
    {statusBar && <div className="sidebar-layout__status-bar">{statusBar}</div>}
    <aside className="sidebar-layout__rail" style={scrollStyle}>
      <SideNav className="sidebar-layout__navigation" aria-label={navigationLabel} header={railHeader}>
        {navigation}
      </SideNav>
      {navigationFooter && <div className="sidebar-layout__rail-footer">{navigationFooter}</div>}
    </aside>
    {(hasHeader || hasTopBar) && <header className="sidebar-layout__header">
      {/* The phone top bar: the menu button and a title; CSS hides both on wider screens. */}
      {hasTopBar && <MobileNavigationButton
        ref={triggerRef}
        appearance="bar"
        navigationLabel={navigationLabel}
        isOpen={isDrawerOpen}
        onOpen={() => setDrawerOpen(true)}
      />}
      {hasTopBar && topBarTitle != null && topBarTitle !== '' && <span className="sidebar-layout__mobile-title">{topBarTitle}</span>}
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
      trigger={mobileNavigationTrigger}
      triggerRef={triggerRef}
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
