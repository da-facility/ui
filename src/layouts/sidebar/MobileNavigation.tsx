import {useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject} from 'react';
import {Button} from '@astryxdesign/core/Button';
import {Icon} from '@astryxdesign/core/Icon';
import {MobileNav} from '@astryxdesign/core/MobileNav';
import {Switch} from '@astryxdesign/core/Switch';
import {useDirection} from '@astryxdesign/core/i18n';
import {scrollAreaClassName} from '../../components/scroll/ScrollArea';
import {useMessages} from '../../i18n';
import './mobile-navigation.css';

/** Physical screen edge, so right-to-left text never flips a hand preference. */
export type MobileNavigationSide = 'left' | 'right';

/** How phones open the navigation: a floating round button, or a button in a top bar. */
export type MobileNavigationTrigger = 'floating' | 'top-bar';

type MobileNavigationButtonProps = {
  ref: RefObject<HTMLButtonElement | null>;
  navigationLabel: string;
  isOpen: boolean;
  onOpen: () => void;
  /** `floating` draws the round button in the thumb zone; `bar` a plain icon button for the top bar. */
  appearance: 'floating' | 'bar';
  offset?: number;
};

/** The menu button that opens the drawer, floating or in the top bar. */
export function MobileNavigationButton({ref, navigationLabel, isOpen, onOpen, appearance, offset}: MobileNavigationButtonProps) {
  const t = useMessages();
  return <Button
    ref={ref}
    className={appearance === 'floating' ? 'mobile-navigation__trigger' : 'mobile-navigation__bar-trigger'}
    style={offset === undefined ? undefined : {'--mobile-navigation-offset': `${offset}px`} as CSSProperties}
    label={t('@da-facility.mobileNavigation.open', {label: navigationLabel.toLowerCase()})}
    isIconOnly
    icon={<Icon icon="menu" />}
    variant={appearance === 'floating' ? 'primary' : 'ghost'}
    aria-haspopup="dialog"
    aria-expanded={isOpen}
    onClick={onOpen}
  />;
}

type MobileNavigationProps = {
  navigation: ReactNode;
  navigationHeader: ReactNode;
  navigationFooter?: ReactNode;
  navigationLabel: string;
  navigationArtwork?: ReactNode;
  scrollStyle: CSSProperties;
  side: MobileNavigationSide;
  onSideChange?: (side: MobileNavigationSide) => void;
  /** `top-bar`: the layout renders the button in its header with `triggerRef`. */
  trigger: MobileNavigationTrigger;
  triggerRef: RefObject<HTMLButtonElement | null>;
  triggerOffset: number;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * The phone half of `SidebarLayout`: the menu button (floating here, or in the
 * layout's top bar) and the navigation drawer. CSS hides it on wider screens.
 */
export function MobileNavigation({
  navigation,
  navigationHeader,
  navigationFooter,
  navigationLabel,
  navigationArtwork,
  scrollStyle,
  side,
  onSideChange,
  trigger,
  triggerRef,
  triggerOffset,
  isOpen,
  onOpenChange,
}: MobileNavigationProps) {
  const t = useMessages();
  // The top bar's drawer starts its list at the top, under the header, and has one close control.
  const isTopBar = trigger === 'top-bar';

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
    {trigger === 'floating' && <MobileNavigationButton
      ref={triggerRef}
      appearance="floating"
      offset={triggerOffset}
      navigationLabel={navigationLabel}
      isOpen={isOpen}
      onOpen={() => onOpenChange(true)}
    />}
    <MobileNav
      className={isTopBar ? 'mobile-navigation__drawer mobile-navigation__drawer--top-bar' : 'mobile-navigation__drawer'}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      side={drawerEdge}
      width={344}
      label={navigationLabel}
      header={navigationHeader}>
      <div className="mobile-navigation__body" style={scrollStyle}>
        <nav className={`mobile-navigation__sections ${scrollAreaClassName}`} aria-label={navigationLabel}>
          {navigationArtwork && !isTopBar && <div className="mobile-navigation__artwork" aria-hidden="true">{navigationArtwork}</div>}
          {navigation}
        </nav>
        {/* With the top bar, the drawer's own X (and Escape, and the backdrop) close it: no second close button. */}
        {(navigationFooter || onSideChange || !isTopBar) && <footer className="mobile-navigation__footer">
          {navigationFooter}
          {onSideChange && <Switch
            label={t('@da-facility.mobileNavigation.leftHanded')}
            value={side === 'left'}
            onChange={isLeft => onSideChange(isLeft ? 'left' : 'right')}
            labelPosition={side === 'left' ? 'end' : 'start'}
            labelSpacing="spread"
          />}
          {!isTopBar && <Button
            className="mobile-navigation__close"
            label={t('@da-facility.mobileNavigation.close')}
            icon={<Icon icon="close" />}
            variant="secondary"
            onClick={() => onOpenChange(false)}
          />}
        </footer>}
      </div>
    </MobileNav>
  </>;
}
