import {useLayoutEffect, useState} from 'react';
import {Heading, Text} from '@astryxdesign/core/Text';
import {Icon} from '@astryxdesign/core/Icon';
import {LayoutContent} from '@astryxdesign/core/Layout';
import {SideNavItem, SideNavSection} from '@astryxdesign/core/SideNav';
import {VStack} from '@astryxdesign/core/VStack';
import {DocumentTextIcon, LockClosedIcon, PaintBrushIcon, UserCircleIcon} from '@heroicons/react/24/outline';
import * as stylex from '@stylexjs/stylex';
import {ProjectSelector, SidebarLayout, UserMenu} from '@da-facility/ui';
import type {ExampleProps} from '../../types';
import {PROJECTS} from '../project-selector/projects';
import {PAGE_GROUPS, findPage} from './pages';
import {INITIAL_SETTINGS, type SettingsPageProps} from './pages/settings';
import {SettingsPage} from './pages/SettingsList';
import clearSky from './clear-sky.svg';
import './sidebar-example.css';

const styles = stylex.create({
  section: {paddingBlock: 'var(--spacing-2)'},
});

// Deterministic filler for the "extra navigation items" tweak.
const EXTRA_ITEMS = Array.from({length: 100}, (_, index) => {
  const adjectives = ['North', 'Shared', 'Daily', 'Regional', 'Internal', 'Weekly', 'Global', 'Central'];
  const nouns = ['Reports', 'Projects', 'Teams', 'Resources', 'Requests', 'Activity', 'Schedules', 'Archives'];
  return `${adjectives[index % 8]} ${nouns[(index * 3) % 8]} ${String(index + 1).padStart(3, '0')}`;
});

export function SidebarExample({page: pageId, onPageChange, tweaks, onTweakChange}: ExampleProps) {
  const page = findPage(pageId);
  const [settings, setSettings] = useState(INITIAL_SETTINGS);
  const update: SettingsPageProps['update'] = (key, value) => setSettings(current => ({...current, [key]: value}));
  const [projectId, setProjectId] = useState(PROJECTS[0].id);

  // Each page starts at the top, like a new document.
  useLayoutEffect(() => {
    window.scrollTo({top: 0, left: 0, behavior: 'instant'});
  }, [page.id]);

  const navigation = <>
    {PAGE_GROUPS.map(group => (
      <SideNavSection key={group.label} title={group.label} xstyle={styles.section}>
        {group.pages.map(item => (
          <SideNavItem
            key={item.id}
            label={item.label}
            icon={<Icon icon={item.icon} size="sm" color="primary" />}
            isSelected={item.id === page.id}
            onClick={() => onPageChange(item.id)}
          />
        ))}
      </SideNavSection>
    ))}
    {tweaks.extraNavigation && <SideNavSection title="Extra items" xstyle={styles.section}>
      {EXTRA_ITEMS.map((label, index) => (
        <SideNavItem
          key={label}
          label={label}
          data-testid={`extra-nav-${index + 1}`}
          icon={<Icon icon={DocumentTextIcon} size="sm" color="primary" />}
          onClick={() => onPageChange('long-table')}
        />
      ))}
    </SideNavSection>}
  </>;

  const userMenu = <UserMenu
    user={{name: settings.displayName, description: 'Personal account'}}
    isFullWidth
    placement="above"
    alignment="start"
    items={[
      {id: 'profile', label: 'Profile', icon: UserCircleIcon, onClick: () => onPageChange('profile')},
      {id: 'appearance', label: 'Appearance', icon: PaintBrushIcon, onClick: () => onPageChange('appearance')},
      {id: 'security', label: 'Login & security', icon: LockClosedIcon, onClick: () => onPageChange('security')},
    ]}
  />;

  return <SidebarLayout
    title={PROJECTS.find(project => project.id === projectId)!.name}
    navigation={navigation}
    navigationHeader={<ProjectSelector projects={PROJECTS} value={projectId} onChange={setProjectId} />}
    navigationFooter={userMenu}
    navigationLabel="Settings navigation"
    navigationKey={page.id}
    background={page.background ?? '#fff'}
    mobileNavigationSide={tweaks.leftHanded ? 'left' : 'right'}
    onMobileNavigationSideChange={side => onTweakChange('leftHanded', side === 'left')}
    mobileNavigationOffset={84}
    mobileNavigationArtwork={<img className="sidebar-example__sky" src={clearSky} alt="" draggable={false} />}>
    {/* Not scrollable: the document scrolls, so momentum and overscroll stay native. */}
    <LayoutContent className="sidebar-example__content" isScrollable={false} padding={4}>
      <SettingsPage>
        {!page.hasOwnHeading && <VStack gap={0.5}>
          <Heading level={2}>{page.label}</Heading>
          <Text type="supporting" color="secondary">{page.description}</Text>
        </VStack>}
        <page.Component settings={settings} update={update} />
      </SettingsPage>
    </LayoutContent>
  </SidebarLayout>;
}
