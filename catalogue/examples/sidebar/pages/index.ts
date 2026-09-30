import type {ComponentType} from 'react';
import {
  BellIcon,
  CodeBracketIcon,
  CommandLineIcon,
  CreditCardIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  LockClosedIcon,
  PaintBrushIcon,
  PuzzlePieceIcon,
  ShieldCheckIcon,
  TableCellsIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import {BillingPage, ProfilePage, SecurityPage} from './AccountPages';
import {AppearancePage, LanguagePage, NotificationsPage, ShortcutsPage} from './WorkspacePages';
import {DeveloperPage, IntegrationsPage, PrivacyPage} from './AdvancedPages';
import {LongParagraphs} from './LongParagraphs';
import {LongTable} from './LongTable';
import type {IconComponent} from './SettingsList';
import type {SettingsPageProps} from './settings';

export type Page = {
  id: string;
  label: string;
  description: string;
  icon: IconComponent;
  Component: ComponentType<SettingsPageProps>;
  /** The page renders its own heading. */
  hasOwnHeading?: boolean;
  /** Page background; also shown when native overscroll stretches past the edges. */
  background?: string;
};

export const PAGE_GROUPS: {label: string; pages: Page[]}[] = [
  {
    label: 'Account',
    pages: [
      {id: 'profile', label: 'Profile', description: 'How you appear to everyone else in the workspace.', icon: UserCircleIcon, Component: ProfilePage},
      {id: 'security', label: 'Login & security', description: 'Sign-in methods and the devices signed in right now.', icon: LockClosedIcon, Component: SecurityPage},
      {id: 'billing', label: 'Billing', description: 'Your plan, seats, and where invoices are sent.', icon: CreditCardIcon, Component: BillingPage},
    ],
  },
  {
    label: 'Workspace',
    pages: [
      {id: 'appearance', label: 'Appearance', description: 'Theme and density for this browser.', icon: PaintBrushIcon, Component: AppearancePage},
      {id: 'notifications', label: 'Notifications', description: 'What reaches you, and where it arrives.', icon: BellIcon, Component: NotificationsPage},
      {id: 'shortcuts', label: 'Keyboard shortcuts', description: 'Rebind or switch off any shortcut on this surface.', icon: CommandLineIcon, Component: ShortcutsPage},
      {id: 'language', label: 'Language & region', description: 'Language, formats, and time zone.', icon: GlobeAltIcon, Component: LanguagePage},
    ],
  },
  {
    label: 'Advanced',
    pages: [
      {id: 'privacy', label: 'Privacy', description: 'What you share, and what we keep.', icon: ShieldCheckIcon, Component: PrivacyPage},
      {id: 'integrations', label: 'Connected apps', description: 'Services with access to this workspace.', icon: PuzzlePieceIcon, Component: IntegrationsPage},
      {id: 'long-table', label: 'Long table', description: '500 sample records. Scroll the content while navigation stays in place.', icon: TableCellsIcon, Component: LongTable},
      {id: 'long-paragraphs', label: 'Long paragraphs', description: 'A railway notebook with twelve chapters.', icon: DocumentTextIcon, Component: LongParagraphs, hasOwnHeading: true, background: '#faf8f2'},
      {id: 'developer', label: 'Developer', description: 'API access and pre-release features.', icon: CodeBracketIcon, Component: DeveloperPage},
    ],
  },
];

const PAGES = PAGE_GROUPS.flatMap(group => group.pages);

export function findPage(id?: string) {
  return PAGES.find(page => page.id === id) ?? PAGES[0];
}
