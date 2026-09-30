import {useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode} from 'react';
import {Button} from '@astryxdesign/core/Button';
import {Icon} from '@astryxdesign/core/Icon';
import {MobileNav} from '@astryxdesign/core/MobileNav';
import {Switch} from '@astryxdesign/core/Switch';
import {useDirection} from '@astryxdesign/core/i18n';
import './mobile-sidebar.css';

/** Physical screen edge, so right-to-left text never flips a hand preference. */
export type MobileNavigationSide = 'left' | 'right';

type MobileSidebarProps = {
  titleId: string;
  header: ReactNode;
  navigation: ReactNode;
  navigationHeader: ReactNode;
  navigationFooter?: ReactNode;
  navigationLabel: string;
  navigationArtwork?: ReactNode;
  side: MobileNavigationSide;
  onSideChange?: (side: MobileNavigationSide) => void;
  triggerOffset?: number;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
};

/** Mobile shell for `SidebarLayout`: a fixed header, a floating menu button and a drawer. */
export function MobileSidebar({
  titleId,
  header,
  navigation,
  navigationHeader,
  navigationFooter,
  navigationLabel,
  navigationArtwork,
  side,
  onSideChange,
  triggerOffset = 20,
  isOpen,
  onOpenChange,
  children,
}: MobileSidebarProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Astryx positions the drawer by logical edge; translate the physical side.
  const direction = useDirection();
  const [drawerEdge, setDrawerEdge] = useState<'start' | 'end'>('end');
  useLayoutEffect(() => {
    const isRtl = getComputedStyle(shellRef.current!).direction === 'rtl';
    setDrawerEdge((side === 'right') !== isRtl ? 'end' : 'start');
  }, [side, isOpen, direction]);

  // Content starts below the fixed header, whatever its height.
  useLayoutEffect(() => {
    const header = headerRef.current!;
    const measure = () => shellRef.current?.style.setProperty('--mobile-sidebar-header-height', `${header.getBoundingClientRect().height}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  // Return focus to the menu button without scrolling the page.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !isOpen) triggerRef.current?.focus({preventScroll: true});
    wasOpen.current = isOpen;
  }, [isOpen]);

  return (
    <div
      ref={shellRef}
      className="mobile-sidebar"
      data-side={side}
      style={{'--mobile-navigation-bottom': `${triggerOffset}px`} as CSSProperties}>
      <header ref={headerRef} className="mobile-sidebar__header">{header}</header>
      <main className="mobile-sidebar__content" aria-labelledby={titleId}>{children}</main>
      <Button
        ref={triggerRef}
        className="mobile-sidebar__trigger"
        label={`Open ${navigationLabel.toLowerCase()}`}
        isIconOnly
        icon={<Icon icon="menu" />}
        variant="primary"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => onOpenChange(true)}
      />
      <MobileNav
        className="mobile-sidebar__drawer"
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        side={drawerEdge}
        width={344}
        label={navigationLabel}
        header={navigationHeader}>
        <div className="mobile-sidebar__drawer-body">
          <nav className="mobile-sidebar__sections scroll-edges" aria-label={navigationLabel}>
            {navigationArtwork && <div className="mobile-sidebar__artwork" aria-hidden="true">{navigationArtwork}</div>}
            {navigation}
          </nav>
          <footer className="mobile-sidebar__footer">
            {navigationFooter}
            {onSideChange && <Switch
              label="Left-handed navigation"
              value={side === 'left'}
              onChange={isLeft => onSideChange(isLeft ? 'left' : 'right')}
              labelPosition={side === 'left' ? 'end' : 'start'}
              labelSpacing="spread"
            />}
            <Button
              className="mobile-sidebar__close"
              label="Close menu"
              icon={<Icon icon="close" />}
              variant="secondary"
              onClick={() => onOpenChange(false)}
            />
          </footer>
        </div>
      </MobileNav>
    </div>
  );
}
