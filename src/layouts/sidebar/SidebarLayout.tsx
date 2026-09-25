import {useEffect, useId, useState, type ReactNode} from 'react';
import {useMediaQuery} from '@astryxdesign/core/hooks';
import {SideNav} from '@astryxdesign/core/SideNav';
import {MobileSidebar, type MobileNavigationSide} from './MobileSidebar';
import {useDocumentAppearance, type DocumentAppearance} from './useDocumentAppearance';
import './sidebar-layout.css';

export type SidebarLayoutProps = DocumentAppearance & {
  title: string;
  navigation: ReactNode;
  children: ReactNode;
  headerActions?: ReactNode;
  navigationTitle?: string;
  navigationLabel?: string;
  sectionsLabel?: string;
  /** Change when navigating to close the mobile drawer. Routing stays in the app. */
  navigationKey?: string;
  mobileNavigationSide?: MobileNavigationSide;
  onMobileNavigationSideChange?: (side: MobileNavigationSide) => void;
  mobileNavigationOffset?: number;
  mobileNavigationArtwork?: ReactNode;
};

/** Full-page layout. Mount one per document so native overscroll has one owner. */
export function SidebarLayout({title, navigation, children, headerActions,
  navigationTitle = 'Navigation', navigationLabel = 'Navigation', sectionsLabel = 'Navigation sections', navigationKey,
  mobileNavigationSide = 'right', onMobileNavigationSideChange, mobileNavigationOffset, mobileNavigationArtwork,
  background, overscrollBackground, overscroll,
}: SidebarLayoutProps) {
  useDocumentAppearance({background, overscrollBackground, overscroll});
  const titleId = useId();
  const narrow = useMediaQuery('(max-width: 768px), (max-height: 600px)');
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [navigationKey, narrow]);
  const header = <><span id={titleId} className="sidebar-layout__title">{title}</span>{headerActions}</>;
  const content = <div className="sidebar-layout__surface">{children}</div>;

  return <div className="sidebar-layout">
    {narrow ? <MobileSidebar titleId={titleId} header={header} navigation={navigation}
      background="var(--app-background)" isOpen={open} onOpenChange={setOpen}
      side={mobileNavigationSide} onSideChange={onMobileNavigationSideChange} triggerOffset={mobileNavigationOffset}
      navigationArtwork={mobileNavigationArtwork} navigationTitle={navigationTitle}
      navigationLabel={navigationLabel} sectionsLabel={sectionsLabel}>
      {content}
    </MobileSidebar> : <>
      <aside className="sidebar-layout__rail">
        <SideNav className="sidebar-layout__navigation" aria-label={sectionsLabel}
          header={<div className="sidebar-layout__navigation-title">{navigationTitle}</div>}>{navigation}</SideNav>
      </aside>
      <header className="sidebar-layout__header">{header}</header>
      <main className="sidebar-layout__main" aria-labelledby={titleId}>{content}</main>
    </>}
  </div>;
}
