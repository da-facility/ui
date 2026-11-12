import type {Example, Tweak} from './types';
import {SidebarExample} from './examples/sidebar/SidebarExample';
import {LoginSplitExample} from './examples/login-split/LoginSplitExample';
import {LoginPocketIdExample} from './examples/login-pocket-id/LoginPocketIdExample';
import {LoginEmailCodeExample} from './examples/login-email-code/LoginEmailCodeExample';
import {MediaCardExample} from './examples/media-card/MediaCardExample';
import {MediaGridExample} from './examples/media-grid/MediaGridExample';
import {MediaViewerExample} from './examples/media-viewer/MediaViewerExample';
import {PageHeaderExample} from './examples/page-header/PageHeaderExample';
import {PocketIdButtonExample} from './examples/pocket-id-button/PocketIdButtonExample';
import {ProjectSelectorExample} from './examples/project-selector/ProjectSelectorExample';
import {ScrollAreaExample} from './examples/scroll-area/ScrollAreaExample';
import {CodeInputExample} from './examples/code-input/CodeInputExample';
import {CycleButtonExample} from './examples/cycle-button/CycleButtonExample';
import {SelectionBarExample} from './examples/selection-bar/SelectionBarExample';
import {ToastsExample} from './examples/toasts/ToastsExample';
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
      {id: 'topBar', label: 'Menu in a top bar', group: 'Phone'},
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
    id: 'login-pocket-id',
    name: 'Login with Pocket ID',
    kind: 'Template',
    description: 'Blank sign-in page with only a Pocket ID button, and an optional title for expired or failed sign-ins.',
    tweaks: [
      {id: 'expired', label: 'Expired sign-in', group: 'State'},
      {id: 'noAccess', label: 'No access, without a button', group: 'State'},
    ],
    Component: LoginPocketIdExample,
  },
  {
    id: 'login-email-code',
    name: 'Login with an email code',
    kind: 'Template',
    description: 'Two-step sign-in: an email address, then a one-time code, with a resend cool-down and a lock after too many attempts.',
    tweaks: [
      {id: 'brandPanel', label: 'Brand panel', group: 'Layout', default: true},
      {id: 'codeStep', label: 'Start on the code step', group: 'State'},
      {id: 'locked', label: 'Too many attempts', group: 'State'},
    ],
    Component: LoginEmailCodeExample,
  },
  {
    id: 'code-input',
    name: 'Code input',
    kind: 'Component',
    description: 'One-time sign-in code as a row of boxes, with paste, autofill, checking and error states.',
    tweaks: [
      {id: 'error', label: 'Wrong code', group: 'State'},
      {id: 'checking', label: 'Checking', group: 'State'},
      {id: 'disabled', label: 'Disabled', group: 'State'},
      {id: 'fourDigits', label: 'Four digits', group: 'Length'},
    ],
    Component: CodeInputExample,
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
    id: 'media-card',
    name: 'Media card',
    kind: 'Component',
    description: 'Link card with a cover of up to three images, a title, meta lines and a dot for something new.',
    tweaks: [
      {id: 'noCovers', label: 'Without covers', group: 'Content'},
    ],
    Component: MediaCardExample,
  },
  {
    id: 'media-grid',
    name: 'Media grid',
    kind: 'Component',
    description: 'Even grid of 3:2 tiles with selection, keyboard focus and paging; /media-grid/large holds 20,000 photos.',
    tweaks: [
      {id: 'selectable', label: 'Selection', group: 'Behaviour', default: true},
      {id: 'shortPages', label: 'Short pages', group: 'Loading'},
      {id: 'slowNetwork', label: 'Slow network', group: 'Loading'},
    ],
    Component: MediaGridExample,
  },
  {
    id: 'media-viewer',
    name: 'Media viewer',
    kind: 'Component',
    description: 'Full-window image viewer on a dark canvas: fitted image, previous and next, zoom, and a side panel.',
    tweaks: [
      {id: 'noPanel', label: 'Without the side panel', group: 'Parts'},
      {id: 'noZoom', label: 'No larger image to zoom into', group: 'Parts'},
    ],
    Component: MediaViewerExample,
  },
  {
    id: 'page-header',
    name: 'Page header',
    kind: 'Component',
    description: 'Breadcrumbs, title with a meta line and actions, and a row for search and filter chips.',
    tweaks: [
      {id: 'breadcrumbs', label: 'Breadcrumbs', group: 'Parts', default: true},
      {id: 'actions', label: 'Actions', group: 'Parts', default: true},
      {id: 'tools', label: 'Search and filters', group: 'Parts', default: true},
      {id: 'longTitle', label: 'Long title', group: 'Content'},
    ],
    Component: PageHeaderExample,
  },
  {
    id: 'pocket-id-button',
    name: 'Pocket ID button',
    kind: 'Component',
    description: 'Sign-in button in Pocket ID’s black pill with its logo, like the Apple and Google sign-in buttons.',
    source: {label: 'Pocket ID', url: 'https://github.com/pocket-id/pocket-id'},
    Component: PocketIdButtonExample,
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
    id: 'selection-bar',
    name: 'Selection bar',
    kind: 'Component',
    description: 'Bar shown while items are selected: the count, what can be done, actions and clear. Escape clears.',
    tweaks: [
      {id: 'one', label: 'One selected', group: 'Count'},
      {id: 'many', label: '1,204 selected', group: 'Count'},
      {id: 'noDownload', label: 'Download not allowed', group: 'Actions'},
    ],
    Component: SelectionBarExample,
  },
  {
    id: 'toasts',
    name: 'Toasts',
    kind: 'Component',
    description: 'Sonner toasts in the Astryx theme, each arriving like a shooting star from the button that showed it.',
    source: {label: 'Sonner · shadcn/ui', url: 'https://sonner.emilkowal.ski'},
    tweaks: [
      {id: 'expand', label: 'Expand the stack', group: 'Toasts'},
      {id: 'closeButton', label: 'Close buttons', group: 'Toasts'},
      {id: 'richColors', label: 'Rich colours', group: 'Toasts'},
      {id: 'tintByType', label: 'Tint errors and warnings', group: 'Shooting star', default: true},
      {id: 'momentum', label: 'Carry the star’s momentum', group: 'Shooting star'},
    ],
    Component: ToastsExample,
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
