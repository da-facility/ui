import {useEffect, useLayoutEffect, useRef, type ReactNode} from 'react';
import {Button} from '@astryxdesign/core/Button';
import {MobileNav} from '@astryxdesign/core/MobileNav';
import {Icon} from '@astryxdesign/core/Icon';
import {Bars3Icon, XMarkIcon} from '@heroicons/react/24/outline';

type Props = {
  titleId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  navigation: ReactNode;
  search: ReactNode;
  children: ReactNode;
};

// acc-maxsport uses Astryx MobileNav through AppShell. Use the same drawer,
// explicitly anchored to the right, with a thumb-reachable trigger and close.
export function SettingsMobileShell({titleId, isOpen, onOpenChange, navigation, search, children}: Props) {
  const shellRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const header = headerRef.current!;
    const measure = () => shellRef.current?.style.setProperty('--settings-mobile-header-height', `${header.getBoundingClientRect().height}px`);
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
    <div ref={shellRef} className="settings-mobile-shell">
      <header ref={headerRef} className="settings-mobile-header">
        <span id={titleId}>Settings</span>
        {search}
      </header>
      <main className="settings-mobile-content" aria-labelledby={titleId}>{children}</main>
      <Button
        ref={triggerRef}
        className="settings-mobile-trigger"
        label="Open settings navigation"
        isIconOnly
        icon={<Icon icon={Bars3Icon} />}
        variant="primary"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => onOpenChange(true)}
      />
      <MobileNav
        className="settings-mobile-drawer"
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        side="end"
        width={320}
        label="Settings navigation"
        header="Settings">
        <div className="settings-mobile-drawer-body">
          <nav className="settings-mobile-sections" aria-label="Settings sections">{navigation}</nav>
          <Button className="settings-mobile-close" label="Close menu" icon={<Icon icon={XMarkIcon} />} variant="secondary" onClick={() => onOpenChange(false)} />
        </div>
      </MobileNav>
    </div>
  );
}
