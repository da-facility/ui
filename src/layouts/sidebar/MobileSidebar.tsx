import {useEffect, useLayoutEffect, useRef, useState, type ReactNode, type CSSProperties} from 'react';
import {Button} from '@astryxdesign/core/Button';
import {MobileNav} from '@astryxdesign/core/MobileNav';
import {Switch} from '@astryxdesign/core/Switch';
import {useDirection} from '@astryxdesign/core/i18n';
import './mobile-sidebar.css';
import {Icon} from '@astryxdesign/core/Icon';
import {Bars3Icon, XMarkIcon} from '@heroicons/react/24/outline';

export type MobileNavigationSide = 'left' | 'right';

export type MobileSidebarProps = {
  titleId: string;
  background?: string;
  sectionsLabel?: string;
  side?: MobileNavigationSide;
  onSideChange?: (side: MobileNavigationSide) => void;
  navigationLabel?: string;
  navigationTitle?: ReactNode;
  triggerOffset?: number;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  navigation: ReactNode;
  /** Decorative content shown only in the spare space above navigation. */
  navigationArtwork?: ReactNode;
  header: ReactNode;
  children: ReactNode;
};

/** Responsive page shell with a viewport-fixed header and a thumb-reachable drawer. */
export function MobileSidebar({titleId, isOpen, onOpenChange, navigation, navigationArtwork, header, children,
  background = 'var(--color-background-surface, #fff)', sectionsLabel = 'Navigation sections',
  side = 'right', onSideChange, navigationLabel = 'Navigation', navigationTitle = 'Navigation', triggerOffset = 20,
}: MobileSidebarProps) {
  const direction = useDirection();
  const [drawerSide, setDrawerSide] = useState<'start' | 'end'>('end');
  const shellRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const rtl = getComputedStyle(shellRef.current!).direction === 'rtl';
    setDrawerSide((side === 'right') !== rtl ? 'end' : 'start');
  }, [side, isOpen, direction]);
  const headerRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const header = headerRef.current!;
    const measure = () => shellRef.current?.style.setProperty('--mobile-sidebar-header-height', `${header.getBoundingClientRect().height}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !isOpen) triggerRef.current?.focus({preventScroll: true});
    wasOpen.current = isOpen;
  }, [isOpen]);
  return (
    <div ref={shellRef} className="mobile-sidebar" data-side={side} style={{'--mobile-navigation-bottom': `${triggerOffset}px`, '--mobile-sidebar-background': background} as CSSProperties}>
      <header ref={headerRef} className="mobile-sidebar__header">
        {header}
      </header>
      <main className="mobile-sidebar__content" aria-labelledby={titleId}>{children}</main>
      <Button
        ref={triggerRef}
        className="mobile-sidebar__trigger"
        label={`Open ${navigationLabel.toLowerCase()}`}
        isIconOnly
        icon={<Icon icon={Bars3Icon} />}
        variant="primary"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => onOpenChange(true)}
      />
      <MobileNav
        className="mobile-sidebar__drawer" data-navigation-side={side}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        side={drawerSide}
        width={344}
        label={navigationLabel}
        header={navigationTitle}>
        <div className="mobile-sidebar__drawer-body">
          <nav className="mobile-sidebar__sections" aria-label={sectionsLabel}>
            {navigationArtwork && <div className="mobile-sidebar__artwork" aria-hidden="true">{navigationArtwork}</div>}
            {navigation}
          </nav>
          <footer className="mobile-sidebar__footer">
            {onSideChange && <Switch label="Left-handed navigation" value={side === 'left'} onChange={left => onSideChange(left ? 'left' : 'right')} labelPosition={side === 'left' ? 'end' : 'start'} labelSpacing="spread" />}
            <Button className="mobile-sidebar__close" label="Close menu" icon={<Icon icon={XMarkIcon} />} variant="secondary" onClick={() => onOpenChange(false)} />
          </footer>
        </div>
      </MobileNav>
    </div>
  );
}
