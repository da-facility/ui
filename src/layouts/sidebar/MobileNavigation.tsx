import {useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode} from 'react';
import {Button} from '@astryxdesign/core/Button';
import {Icon} from '@astryxdesign/core/Icon';
import {MobileNav} from '@astryxdesign/core/MobileNav';
import {Switch} from '@astryxdesign/core/Switch';
import {useDirection} from '@astryxdesign/core/i18n';
import {scrollAreaClassName} from '../../components/scroll/ScrollArea';
import './mobile-navigation.css';

/** Physical screen edge, so right-to-left text never flips a hand preference. */
export type MobileNavigationSide = 'left' | 'right';

type MobileNavigationProps = {
  navigation: ReactNode;
  navigationHeader: ReactNode;
  navigationFooter?: ReactNode;
  navigationLabel: string;
  navigationArtwork?: ReactNode;
  scrollStyle: CSSProperties;
  side: MobileNavigationSide;
  onSideChange?: (side: MobileNavigationSide) => void;
  triggerOffset: number;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

/** The phone half of `SidebarLayout`: a floating menu button and a navigation drawer. CSS hides it on wider screens. */
export function MobileNavigation({
  navigation,
  navigationHeader,
  navigationFooter,
  navigationLabel,
  navigationArtwork,
  scrollStyle,
  side,
  onSideChange,
  triggerOffset,
  isOpen,
  onOpenChange,
}: MobileNavigationProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Astryx positions the drawer by logical edge; translate the physical side.
  const direction = useDirection();
  const [drawerEdge, setDrawerEdge] = useState<'start' | 'end'>('end');
  useLayoutEffect(() => {
    const isRtl = getComputedStyle(triggerRef.current!).direction === 'rtl';
    setDrawerEdge((side === 'right') !== isRtl ? 'end' : 'start');
  }, [side, isOpen, direction]);

  // Return focus to the menu button without scrolling the page.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !isOpen) triggerRef.current?.focus({preventScroll: true});
    wasOpen.current = isOpen;
  }, [isOpen]);

  return <>
    <Button
      ref={triggerRef}
      className="mobile-navigation__trigger"
      style={{'--mobile-navigation-offset': `${triggerOffset}px`} as CSSProperties}
      label={`Open ${navigationLabel.toLowerCase()}`}
      isIconOnly
      icon={<Icon icon="menu" />}
      variant="primary"
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      onClick={() => onOpenChange(true)}
    />
    <MobileNav
      className="mobile-navigation__drawer"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      side={drawerEdge}
      width={344}
      label={navigationLabel}
      header={navigationHeader}>
      <div className="mobile-navigation__body" style={scrollStyle}>
        <nav className={`mobile-navigation__sections ${scrollAreaClassName}`} aria-label={navigationLabel}>
          {navigationArtwork && <div className="mobile-navigation__artwork" aria-hidden="true">{navigationArtwork}</div>}
          {navigation}
        </nav>
        <footer className="mobile-navigation__footer">
          {navigationFooter}
          {onSideChange && <Switch
            label="Left-handed navigation"
            value={side === 'left'}
            onChange={isLeft => onSideChange(isLeft ? 'left' : 'right')}
            labelPosition={side === 'left' ? 'end' : 'start'}
            labelSpacing="spread"
          />}
          <Button
            className="mobile-navigation__close"
            label="Close menu"
            icon={<Icon icon="close" />}
            variant="secondary"
            onClick={() => onOpenChange(false)}
          />
        </footer>
      </div>
    </MobileNav>
  </>;
}
