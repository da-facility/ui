import {useEffect, useId, useState, type ReactNode} from 'react';
import {useMediaQuery} from '@astryxdesign/core/hooks';
import {SideNav} from '@astryxdesign/core/SideNav';
import {MobileSidebar, type MobileNavigationSide} from './MobileSidebar';
import {PageScroll, type PageScrollProps} from '../../components/scroll/PageScroll';
import '../../components/scroll/scroll-area.css';
import './sidebar-layout.css';

export type SidebarLayoutProps = Pick<PageScrollProps, 'background' | 'overscrollBackground' | 'overscroll'> & {
  /** App or page title shown in the header. */
  title: string;
  /** Navigation content, typically Astryx `SideNavSection` and `SideNavItem` elements. */
  navigation: ReactNode;
  /** Page content. */
  children: ReactNode;
  /** Content at the end of the header, such as a `UserMenu`. */
  headerActions?: ReactNode;
  /**
   * Pinned above the navigation, such as a title or a `ProjectSelector`. Text is
   * styled as a title; elements render as they are. Defaults to `navigationLabel`.
   */
  navigationHeader?: ReactNode;
  /** Pinned below the navigation, such as a `UserMenu`. The navigation scrolls between the two. */
  navigationFooter?: ReactNode;
  /** Accessible name for the navigation landmark and the mobile drawer. */
  navigationLabel?: string;
  /** Change this when the route changes so the mobile drawer closes. Routing stays in the app. */
  navigationKey?: string;
  /** Screen edge for the mobile menu button and drawer. */
  mobileNavigationSide?: MobileNavigationSide;
  /** Shows a left-handed toggle in the mobile drawer. The app owns persistence. */
  onMobileNavigationSideChange?: (side: MobileNavigationSide) => void;
  /** Distance in pixels between the mobile menu button and the bottom of the screen. */
  mobileNavigationOffset?: number;
  /** Decorative content for the spare space above the mobile navigation. */
  mobileNavigationArtwork?: ReactNode;
};

const NARROW_VIEWPORT = '(max-width: 768px), (max-height: 600px)';

/**
 * Full-page app shell with a fixed navigation rail on desktop and a thumb-reachable
 * drawer on mobile. Built on `PageScroll`: the document scrolls, so momentum and
 * overscroll are native. Mount one per document.
 */
export function SidebarLayout({
  title,
  navigation,
  children,
  headerActions,
  navigationLabel = 'Navigation',
  navigationHeader = navigationLabel,
  navigationFooter,
  navigationKey,
  mobileNavigationSide = 'right',
  onMobileNavigationSideChange,
  mobileNavigationOffset,
  mobileNavigationArtwork,
  background,
  overscrollBackground,
  overscroll,
}: SidebarLayoutProps) {
  const titleId = useId();
  const isNarrow = useMediaQuery(NARROW_VIEWPORT);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  useEffect(() => setDrawerOpen(false), [navigationKey, isNarrow]);

  const header = <>
    <span id={titleId} className="sidebar-layout__title">{title}</span>
    {headerActions}
  </>;
  const content = <div className="sidebar-layout__surface">{children}</div>;
  // The mobile drawer styles text headers itself; the rail needs a wrapper.
  const navigationTop = typeof navigationHeader === 'string'
    ? <div className="sidebar-layout__navigation-title">{navigationHeader}</div>
    : navigationHeader;

  const page = {className: 'sidebar-layout', background, overscrollBackground, overscroll};

  if (isNarrow) {
    return <PageScroll {...page}>
      <MobileSidebar
        titleId={titleId}
        header={header}
        navigation={navigation}
        navigationHeader={navigationHeader}
        navigationFooter={navigationFooter}
        navigationLabel={navigationLabel}
        navigationArtwork={mobileNavigationArtwork}
        side={mobileNavigationSide}
        onSideChange={onMobileNavigationSideChange}
        triggerOffset={mobileNavigationOffset}
        isOpen={isDrawerOpen}
        onOpenChange={setDrawerOpen}>
        {content}
      </MobileSidebar>
    </PageScroll>;
  }

  return <PageScroll {...page}>
    <aside className="sidebar-layout__rail">
      <SideNav className="sidebar-layout__navigation" aria-label={navigationLabel} header={navigationTop}>
        {navigation}
      </SideNav>
      {navigationFooter && <div className="sidebar-layout__footer">{navigationFooter}</div>}
    </aside>
    <header className="sidebar-layout__header">{header}</header>
    <main className="sidebar-layout__main" aria-labelledby={titleId}>{content}</main>
  </PageScroll>;
}
