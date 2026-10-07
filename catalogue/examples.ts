import type {Example, Tweak} from './types';
import {SidebarExample} from './examples/sidebar/SidebarExample';
import {LoginSplitExample} from './examples/login-split/LoginSplitExample';
import {ProjectSelectorExample} from './examples/project-selector/ProjectSelectorExample';
import {ScrollAreaExample} from './examples/scroll-area/ScrollAreaExample';
import {CycleButtonExample} from './examples/cycle-button/CycleButtonExample';
import {UserMenuExample} from './examples/user-menu/UserMenuExample';

export const examples: Example[] = [
  {
    id: 'sidebar',
    name: 'Sidebar',
    kind: 'Layout',
    description: 'Settings app with grouped navigation, an account menu and long scrolling pages.',
    source: {label: 'Meta Astryx · Settings Dialog', url: 'https://astryx.atmeta.com/templates?preview=settings-dialog'},
    tweaks: [
      {id: 'statusBar', label: 'Status bar', group: 'Layout'},
      {id: 'header', label: 'Page header', group: 'Layout', default: true},
      {id: 'footer', label: 'Page footer', group: 'Layout'},
      {id: 'navigationHeader', label: 'Sidebar header', group: 'Layout', default: true},
      {id: 'navigationFooter', label: 'Sidebar footer', group: 'Layout', default: true},
      {id: 'assistant', label: 'AI chat', group: 'Layout'},
      {id: 'pageBounce', label: 'Page bounce', group: 'Scrolling', default: true},
      {id: 'navigationBounce', label: 'Sidebar bounce', group: 'Scrolling', default: true},
      {id: 'navigationFade', label: 'Sidebar edge fade', group: 'Scrolling', default: true},
      {id: 'extraNavigation', label: '100 extra navigation items', group: 'Scrolling'},
      {id: 'leftHanded', label: 'Left-handed navigation', group: 'Phone'},
    ],
    Component: SidebarExample,
  },
  {
    id: 'login-split',
    name: 'Login split',
    kind: 'Template',
    description: 'Sign-in form beside a cover image, with alternative providers.',
    source: {label: 'Meta Astryx · Login Split', url: 'https://facebook.github.io/astryx/sandbox/templates/login-split/'},
    Component: LoginSplitExample,
  },
  {
    id: 'cycle-button',
    name: 'Cycle button',
    kind: 'Component',
    description: 'Button that steps through two to four states, such as light, dark and system theme.',
    tweaks: [
      {id: 'ghost', label: 'Ghost variant', group: 'Appearance'},
      {id: 'large', label: 'Large', group: 'Appearance'},
      {id: 'disabled', label: 'Disabled', group: 'State'},
    ],
    Component: CycleButtonExample,
  },
  {
    id: 'project-selector',
    name: 'Project selector',
    kind: 'Component',
    description: 'Current project with a searchable menu for switching projects.',
    Component: ProjectSelectorExample,
  },
  {
    id: 'scroll-area',
    name: 'Scroll area',
    kind: 'Component',
    description: 'Scroll box with native bounce while it overflows and fades under its edges.',
    tweaks: [
      {id: 'fade', label: 'Edge fade', group: 'Scrolling', default: true},
      {id: 'bounce', label: 'Bounce', group: 'Scrolling', default: true},
    ],
    Component: ScrollAreaExample,
  },
  {
    id: 'user-menu',
    name: 'User menu',
    kind: 'Component',
    description: 'Account avatar and name with a menu of account actions.',
    Component: UserMenuExample,
  },
];

/** Tweaks every example has. */
export const globalTweaks: Tweak[] = [
  {id: 'darkMode', label: 'Dark mode', group: 'Appearance'},
  {id: 'croatian', label: 'Croatian', group: 'Appearance'},
];

export function findExample(id: string) {
  return examples.find(example => example.id === id);
}
