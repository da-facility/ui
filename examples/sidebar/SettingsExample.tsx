// Adapted from Meta Astryx settings-dialog. See LICENSE.third-party.
'use client';

import {Button} from '@astryxdesign/core/Button';
import {UserMenu, SidebarLayout, type SidebarLayoutProps} from '../../src';
import './settings-example.css';
import {LongTable} from './LongTable';
import {LongParagraphs} from './LongParagraphs';
import {useLibraryTweaks} from '../../catalogue/controls/LibraryTweaks';
import {navigate, readRoute, templatePath} from '../../catalogue/navigation';
import {AspectRatio} from '@astryxdesign/core/AspectRatio';
import {Card} from '@astryxdesign/core/Card';
import {Divider} from '@astryxdesign/core/Divider';
import {Grid} from '@astryxdesign/core/Grid';
import {HStack} from '@astryxdesign/core/HStack';
import {useMediaQuery} from '@astryxdesign/core/hooks';
import {Icon} from '@astryxdesign/core/Icon';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Kbd} from '@astryxdesign/core/Kbd';
import {LayoutContent} from '@astryxdesign/core/Layout';
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl';
import {SelectableCard} from '@astryxdesign/core/SelectableCard';
import {Selector} from '@astryxdesign/core/Selector';
import {SideNavItem, SideNavSection} from '@astryxdesign/core/SideNav';
import {Stack, StackItem} from '@astryxdesign/core/Stack';
import {Switch} from '@astryxdesign/core/Switch';
import {Heading, Text} from '@astryxdesign/core/Text';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Theme} from '@astryxdesign/core/theme';
import {neutralTheme} from '@astryxdesign/theme-neutral/built';
import {Token} from '@astryxdesign/core/Token';
import {Tooltip} from '@astryxdesign/core/Tooltip';
import {VStack} from '@astryxdesign/core/VStack';
import {
  ArrowDownOnSquareIcon,
  ArrowDownTrayIcon,
  ArrowUturnLeftIcon,
  AtSymbolIcon,
  Bars3BottomLeftIcon,
  Bars3Icon,
  BeakerIcon,
  BellIcon,
  BriefcaseIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  CodeBracketIcon,
  Cog6ToothIcon,
  CommandLineIcon,
  ComputerDesktopIcon,
  CreditCardIcon,
  CubeIcon,
  DevicePhoneMobileIcon,
  DocumentMagnifyingGlassIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  EyeIcon,
  FingerPrintIcon,
  FolderIcon,
  GlobeAltIcon,
  HandRaisedIcon,
  KeyIcon,
  LanguageIcon,
  LinkIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  MoonIcon,
  PaintBrushIcon,
  PencilSquareIcon,
  PuzzlePieceIcon,
  QuestionMarkCircleIcon,
  ReceiptPercentIcon,
  ShieldCheckIcon,
  SignalIcon,
  SparklesIcon,
  SpeakerWaveIcon,
  SunIcon,
  SwatchIcon,
  TagIcon,
  TrashIcon,
  UserCircleIcon,
  UserIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import * as stylex from '@stylexjs/stylex';
import {
  Children,
  type ComponentType,
  type CSSProperties,
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
  type SVGProps,
} from 'react';

const NARROW_VIEWPORT = '(max-width: 768px), (max-height: 600px)';

const PANEL_CONTAINER = 'settings-panel';

const ROW_STACK = `@container ${PANEL_CONTAINER} (max-width: 480px)`;

const ROW_PADDING = 4;

const CONTROL_WIDTH = 192;

const styles = stylex.create({
  sideNav: {
    flexShrink: 0,
  },
  sideNavSection: {
    paddingBlock: 'var(--spacing-2)',
  },
});

const row = stylex.create({
  panel: {
    containerType: 'inline-size',
    containerName: PANEL_CONTAINER,
  },
  line: {
    display: 'flex',
    flexDirection: {default: 'row', [ROW_STACK]: 'column'},
    alignItems: {default: 'center', [ROW_STACK]: 'stretch'},
    gap: {
      default: 'var(--spacing-3)',
      [ROW_STACK]: 'var(--spacing-2)',
    },
  },
  textColumn: {
    maxWidth: {default: 420, [ROW_STACK]: 'none'},
  },
  control: {
    flexShrink: 0,
  },
});

const preview = stylex.create({
  bar: {
    height: 4,
    width: '50%',
    borderRadius: 999,
    backgroundColor: 'var(--color-border-emphasized)',
  },
  barWide: {
    width: '66%',
  },
  clip: {
    overflow: 'hidden',
    borderRadius: 'var(--radius-element)',
  },
  mutedSurface: {
    backgroundColor: 'var(--color-background-muted)',
  },
  contentSurface: {
    backgroundColor: 'var(--color-background-surface)',
  },
  inert: {
    pointerEvents: 'none',
  },
});

function faceStyle(stack: string): CSSProperties {
  const style: Record<string, string> = {'--font-family-body': stack};
  return style;
}

type PanelId =
  | 'profile'
  | 'security'
  | 'billing'
  | 'appearance'
  | 'notifications'
  | 'shortcuts'
  | 'language'
  | 'privacy'
  | 'integrations'
  | 'developer'
  | 'long-table'
  | 'long-paragraphs';

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

interface PanelConfig {
  id: PanelId;
  label: string;
  description: string;
  icon: IconComponent;
}

const PANEL_GROUPS: {label: string; panels: PanelConfig[]}[] = [
  {
    label: 'Account',
    panels: [
      {
        id: 'profile',
        label: 'Profile',
        description: 'How you appear to everyone else in the workspace.',
        icon: UserCircleIcon,
      },
      {
        id: 'security',
        label: 'Login & security',
        description: 'Sign-in methods and the devices signed in right now.',
        icon: LockClosedIcon,
      },
      {
        id: 'billing',
        label: 'Billing',
        description: 'Your plan, seats, and where invoices are sent.',
        icon: CreditCardIcon,
      },
    ],
  },
  {
    label: 'Workspace',
    panels: [
      {
        id: 'appearance',
        label: 'Appearance',
        description: 'Theme and density for this browser.',
        icon: PaintBrushIcon,
      },
      {
        id: 'notifications',
        label: 'Notifications',
        description: 'What reaches you, and where it arrives.',
        icon: BellIcon,
      },
      {
        id: 'shortcuts',
        label: 'Keyboard shortcuts',
        description: 'Rebind or switch off any shortcut on this surface.',
        icon: CommandLineIcon,
      },
      {
        id: 'language',
        label: 'Language & region',
        description: 'Language, formats, and time zone.',
        icon: GlobeAltIcon,
      },
    ],
  },
  {
    label: 'Advanced',
    panels: [
      {
        id: 'privacy',
        label: 'Privacy',
        description: 'What you share, and what we keep.',
        icon: ShieldCheckIcon,
      },
      {
        id: 'integrations',
        label: 'Connected apps',
        description: 'Services with access to this workspace.',
        icon: PuzzlePieceIcon,
      },
      {
        id: 'long-table',
        label: 'Long table',
        description: '500 sample records. Scroll the content while navigation stays in place.',
        icon: DocumentTextIcon,
      },
      {
        id: 'long-paragraphs',
        label: 'Long paragraphs',
        description: 'A railway notebook with twelve chapters.',
        icon: DocumentTextIcon,
      },
      {
        id: 'developer',
        label: 'Developer',
        description: 'API access and pre-release features.',
        icon: CodeBracketIcon,
      },
    ],
  },
];

const PANELS: PanelConfig[] = PANEL_GROUPS.flatMap(group => group.panels);
const DEFAULT_PANEL: PanelId = 'profile';

function panelConfig(id: PanelId): PanelConfig {
  return PANELS.find(panel => panel.id === id) ?? PANELS[0];
}

function SettingsCard({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  const rows = Children.toArray(children);

  return (
    <VStack gap={1.5}>
      {title != null && (
        <Text type="supporting" weight="semibold" color="secondary">
          {title}
        </Text>
      )}
      <Card padding={0} width="100%" variant="muted">
        <VStack as="ul" role="list" gap={0}>
          {rows.map((row, index) => (
            <VStack key={index} as="li" gap={0}>
              {index > 0 && <Divider variant="subtle" />}
              {row}
            </VStack>
          ))}
        </VStack>
      </Card>
    </VStack>
  );
}

function SettingsRow({
  title,
  titleAccessory,
  description,
  icon,
  control,
  detail,
}: {
  title: string;
  
  titleAccessory?: ReactNode;
  description?: ReactNode;
  
  icon: IconComponent;
  control?: ReactNode;
  
  detail?: ReactNode;
}) {
  return (
    <VStack padding={ROW_PADDING} gap={2}>
      <Stack xstyle={row.line} data-settings-line>
          <StackItem size="fill">
          <HStack gap={2} align="start">
                  <VStack paddingBlockStart={0.5}>
              <Icon icon={icon} size="sm" color="secondary" />
            </VStack>
                  <VStack gap={0.5} xstyle={row.textColumn}>
              {titleAccessory == null ? (
                <Text type="label">{title}</Text>
              ) : (
                <HStack gap={1.5} align="center">
                  <Text type="label">{title}</Text>
                  {titleAccessory}
                </HStack>
              )}
              {description != null && (
                <Text type="supporting" color="secondary">
                  {description}
                </Text>
              )}
            </VStack>
          </HStack>
        </StackItem>
        {control != null && (
          <VStack data-settings-control xstyle={row.control}>
            {control}
          </VStack>
        )}
      </Stack>
      {detail}
    </VStack>
  );
}

interface SettingsState {
  displayName: string;
  jobTitle: string;
  pronouns: string;
  showLocalTime: boolean;
  presence: string;
  twoFactor: boolean;
  billingEmail: string;
  emailInvoices: boolean;
  theme: string;
  accent: string;
  font: string;
  density: string;
  reduceMotion: boolean;
  emailMentions: boolean;
  emailComments: boolean;
  weeklyDigest: boolean;
  desktopAlerts: boolean;
  notificationSounds: boolean;
  quietHours: string;
  language: string;
  region: string;
  timezone: string;
  weekStart: string;
  discoverable: boolean;
  readReceipts: boolean;
  activityStatus: boolean;
  personalization: boolean;
  apiAccess: boolean;
  webhookUrl: string;
  earlyAccess: boolean;
  verboseLogging: boolean;
}

const INITIAL_SETTINGS: SettingsState = {
  displayName: 'Alex Johnson',
  jobTitle: 'Product designer',
  pronouns: 'they',
  showLocalTime: true,
  presence: 'available',
  twoFactor: true,
  billingEmail: 'billing@example.com',
  emailInvoices: true,
  theme: 'system',
  accent: 'blue',
  font: 'system',
  density: 'comfortable',
  reduceMotion: false,
  emailMentions: true,
  emailComments: false,
  weeklyDigest: true,
  desktopAlerts: true,
  notificationSounds: false,
  quietHours: 'none',
  language: 'en-US',
  region: 'US',
  timezone: 'PT',
  weekStart: 'sun',
  discoverable: true,
  readReceipts: true,
  activityStatus: false,
  personalization: true,
  apiAccess: false,
  webhookUrl: '',
  earlyAccess: false,
  verboseLogging: false,
};

type UpdateSetting = <K extends keyof SettingsState>(
  key: K,
  value: SettingsState[K],
) => void;

interface PanelProps {
  settings: SettingsState;
  update: UpdateSetting;
}

function ProfilePanel({settings, update}: PanelProps) {
  return (
    <VStack gap={5}>
      <SettingsCard title="Identity">
        <SettingsRow
          title="Display name"
          icon={UserIcon}
          description="Shown on your posts, comments, and mentions."
          control={
            <TextInput
              label="Display name"
              isLabelHidden
              size="sm"
              width={CONTROL_WIDTH}
              value={settings.displayName}
              onChange={value => update('displayName', value)}
            />
          }
        />
        <SettingsRow
          title="Job title"
          icon={BriefcaseIcon}
          description="Appears under your name on your profile card."
          control={
            <TextInput
              label="Job title"
              isLabelHidden
              size="sm"
              width={CONTROL_WIDTH}
              value={settings.jobTitle}
              onChange={value => update('jobTitle', value)}
            />
          }
        />
        <SettingsRow
          title="Pronouns"
          icon={TagIcon}
          control={
            <Selector
              label="Pronouns"
              isLabelHidden
              size="sm"
              width={CONTROL_WIDTH}
              value={settings.pronouns}
              onChange={value => update('pronouns', value)}
              options={[
                {value: 'none', label: 'Not specified'},
                {value: 'they', label: 'they/them'},
                {value: 'she', label: 'she/her'},
                {value: 'he', label: 'he/him'},
              ]}
            />
          }
        />
      </SettingsCard>

      <SettingsCard title="Availability">
        <SettingsRow
          title="Show my local time"
          icon={ClockIcon}
          description="Helps people across time zones pick a sane hour."
          control={
            <Switch
              label="Show my local time"
              isLabelHidden
              value={settings.showLocalTime}
              onChange={value => update('showLocalTime', value)}
            />
          }
        />
        <SettingsRow
          title="Presence"
          icon={SignalIcon}
          control={
            <Selector
              label="Presence"
              isLabelHidden
              size="sm"
              width={CONTROL_WIDTH}
              value={settings.presence}
              onChange={value => update('presence', value)}
              options={[
                {value: 'available', label: 'Available'},
                {value: 'busy', label: 'Busy'},
                {value: 'away', label: 'Away'},
              ]}
            />
          }
        />
      </SettingsCard>
    </VStack>
  );
}

function SecurityPanel({settings, update}: PanelProps) {
  return (
    <VStack gap={5}>
      <SettingsCard title="Sign-in">
        <SettingsRow
          title="Password"
          description="Last changed 4 months ago."
          icon={KeyIcon}
          control={<Button label="Change" variant="secondary" size="sm" />}
        />
        <SettingsRow
          title="Two-factor authentication"
          titleAccessory={<Token label="Recommended" size="sm" color="green" />}
          description="Ask for a code from your authenticator app at sign-in."
          icon={ShieldCheckIcon}
          control={
            <Switch
              label="Two-factor authentication"
              isLabelHidden
              value={settings.twoFactor}
              onChange={value => update('twoFactor', value)}
            />
          }
        />
        <SettingsRow
          title="Passkeys"
          icon={FingerPrintIcon}
          description="No passkeys yet."
          control={<Button label="Add passkey" variant="secondary" size="sm" />}
        />
      </SettingsCard>

      <SettingsCard title="Active sessions">
        <SettingsRow
          title="MacBook Pro · Chrome"
          titleAccessory={<Token label="This device" size="sm" />}
          description="San Francisco, California · Active now"
          icon={ComputerDesktopIcon}
        />
        <SettingsRow
          title="iPhone 15 · Safari"
          description="San Francisco, California · 2 hours ago"
          icon={DevicePhoneMobileIcon}
          control={<Button label="Sign out" variant="ghost" size="sm" />}
        />
        <SettingsRow
          title="Windows · Edge"
          description="Austin, Texas · March 30 at 19:31"
          icon={ComputerDesktopIcon}
          control={<Button label="Sign out" variant="ghost" size="sm" />}
        />
      </SettingsCard>
    </VStack>
  );
}

function BillingPanel({settings, update}: PanelProps) {
  return (
    <VStack gap={5}>
      <SettingsCard title="Plan">
        <SettingsRow
          title="Current plan"
          icon={CubeIcon}
          titleAccessory={<Token label="Team" size="sm" color="blue" />}
          description="$12 per seat, per month. Renews on April 1."
          control={<Button label="Upgrade" variant="primary" size="sm" />}
        />
        <SettingsRow
          title="Seats"
          icon={UsersIcon}
          description="18 of 25 seats in use."
          control={
            <Button label="Manage seats" variant="secondary" size="sm" />
          }
        />
      </SettingsCard>

      <SettingsCard title="Invoices">
        <SettingsRow
          title="Billing email"
          icon={EnvelopeIcon}
          description="Where receipts and payment failures are sent."
          control={
            <TextInput
              label="Billing email"
              isLabelHidden
              type="email"
              size="sm"
              width={CONTROL_WIDTH}
              value={settings.billingEmail}
              onChange={value => update('billingEmail', value)}
            />
          }
        />
        <SettingsRow
          title="Email invoices"
          icon={ReceiptPercentIcon}
          description="Send a PDF copy every time we charge the card."
          control={
            <Switch
              label="Email invoices"
              isLabelHidden
              value={settings.emailInvoices}
              onChange={value => update('emailInvoices', value)}
            />
          }
        />
        <SettingsRow
          title="Payment method"
          description="Visa ending 4242 · Expires 09/28"
          icon={CreditCardIcon}
          control={<Button label="Update" variant="secondary" size="sm" />}
        />
      </SettingsCard>
    </VStack>
  );
}

function ThemePreviewCanvas({mode}: {mode: 'light' | 'dark'}) {
  const canvas = (
    <VStack padding={2} gap={1.5} height="100%" xstyle={preview.mutedSurface}>
      <VStack gap={1} align="center">
        <VStack xstyle={[preview.bar, preview.barWide]} />
        <VStack xstyle={preview.bar} />
      </VStack>
      <StackItem size="fill">
        <VStack
          padding={2}
          gap={1}
          justify="center"
          height="100%"
          xstyle={preview.contentSurface}>
          {[0, 1, 2].map(row => (
            <VStack key={row} xstyle={preview.bar} />
          ))}
        </VStack>
      </StackItem>
    </VStack>
  );

  return (
    <Theme theme={neutralTheme} mode={mode}>
      {canvas}
    </Theme>
  );
}

function ThemePreviewMock({scheme}: {scheme: 'light' | 'dark' | 'system'}) {
  return (
    <AspectRatio ratio={3 / 2} xstyle={preview.inert}>
      <VStack aria-hidden="true" height="100%" xstyle={preview.clip}>
        {scheme === 'system' ? (
          <HStack gap={0} height="100%">
            <StackItem size="fill">
              <ThemePreviewCanvas mode="light" />
            </StackItem>
            <StackItem size="fill">
              <ThemePreviewCanvas mode="dark" />
            </StackItem>
          </HStack>
        ) : (
          <ThemePreviewCanvas mode={scheme} />
        )}
      </VStack>
    </AspectRatio>
  );
}

const THEME_CHOICES: {
  value: string;
  label: string;
  scheme: 'light' | 'dark' | 'system';
  icon: IconComponent;
}[] = [
  {value: 'light', label: 'Light', scheme: 'light', icon: SunIcon},
  {value: 'dark', label: 'Dark', scheme: 'dark', icon: MoonIcon},
  {
    value: 'system',
    label: 'System',
    scheme: 'system',
    icon: ComputerDesktopIcon,
  },
];

function ThemeChoiceCards({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Grid
      role="radiogroup"
      aria-label="Color theme"
      columns={{minWidth: 96, max: 3}}
      gap={2}
      maxWidth={480}>
      {THEME_CHOICES.map(choice => {
        const isSelected = choice.value === value;
        return (
          <SelectableCard
            key={choice.value}
            label={choice.label}
            isSelected={isSelected}
            padding={2}
            onChange={() => {
              if (!isSelected) {
                onChange(choice.value);
              }
            }}>
            <VStack gap={1.5}>
              <ThemePreviewMock scheme={choice.scheme} />
              <HStack gap={1} align="center" justify="center">
                <Icon icon={choice.icon} size="sm" color="secondary" />
                <Text
                  type="supporting"
                  weight={isSelected ? 'semibold' : undefined}>
                  {choice.label}
                </Text>
              </HStack>
            </VStack>
          </SelectableCard>
        );
      })}
    </Grid>
  );
}

const INTERFACE_FONTS: {value: string; label: string; stack: string}[] = [
  {value: 'system', label: 'System', stack: 'var(--font-family-body)'},
  {value: 'serif', label: 'Serif', stack: 'Georgia, "Times New Roman", serif'},
  {
    value: 'mono',
    label: 'Monospace',
    stack: 'var(--font-family-code)',
  },
];

function interfaceFont(value: string) {
  return (
    INTERFACE_FONTS.find(font => font.value === value) ?? INTERFACE_FONTS[0]
  );
}

function FontPreview({value}: {value: string}) {
  const font = interfaceFont(value);
  return (
    <Card padding={3} width="100%">
      <VStack gap={1} style={faceStyle(font.stack)}>
        <Text type="label">Weekly digest</Text>
        <Text type="supporting" color="secondary">
          Eight threads moved while you were away, and three are waiting on you.
        </Text>
      </VStack>
    </Card>
  );
}

function AppearancePanel({settings, update}: PanelProps) {
  return (
    <VStack gap={5}>
      <SettingsCard>
        <SettingsRow
          title="Color theme"
          icon={PaintBrushIcon}
          description="Applies to this browser only."
          detail={
            <ThemeChoiceCards
              value={settings.theme}
              onChange={value => update('theme', value)}
            />
          }
        />
        <SettingsRow
          title="Accent color"
          icon={SwatchIcon}
          description="Used for links, selection, and primary buttons."
          control={
            <Selector
              label="Accent color"
              isLabelHidden
              size="sm"
              width={CONTROL_WIDTH}
              value={settings.accent}
              onChange={value => update('accent', value)}
              options={[
                {value: 'blue', label: 'Blue'},
                {value: 'teal', label: 'Teal'},
                {value: 'purple', label: 'Purple'},
                {value: 'orange', label: 'Orange'},
              ]}
            />
          }
        />
      </SettingsCard>

      <SettingsCard title="Typography">
        <SettingsRow
          title="Interface font"
          icon={DocumentTextIcon}
          description="Menus, labels, and message text."
          control={
            <Selector
              label="Interface font"
              isLabelHidden
              size="sm"
              width={CONTROL_WIDTH}
              value={settings.font}
              onChange={value => update('font', value)}
              options={INTERFACE_FONTS.map(font => ({
                value: font.value,
                label: font.label,
              }))}
            />
          }
          detail={<FontPreview value={settings.font} />}
        />
      </SettingsCard>

      <SettingsCard title="Layout">
        <SettingsRow
          title="Interface density"
          icon={Bars3Icon}
          description="How much breathing room rows and lists get."
          control={
            <SegmentedControl
              label="Interface density"
              size="sm"
              value={settings.density}
              onChange={value => update('density', value)}>
              <SegmentedControlItem value="comfortable" label="Comfortable" />
              <SegmentedControlItem value="compact" label="Compact" />
            </SegmentedControl>
          }
        />
        <SettingsRow
          title="Reduce motion"
          icon={HandRaisedIcon}
          description="Skip transitions and animated transforms."
          control={
            <Switch
              label="Reduce motion"
              isLabelHidden
              value={settings.reduceMotion}
              onChange={value => update('reduceMotion', value)}
            />
          }
        />
      </SettingsCard>
    </VStack>
  );
}

function NotificationsPanel({settings, update}: PanelProps) {
  return (
    <VStack gap={5}>
      <SettingsCard title="Email">
        <SettingsRow
          title="Mentions"
          description="Someone types your name."
          icon={AtSymbolIcon}
          control={
            <Switch
              label="Email me about mentions"
              isLabelHidden
              value={settings.emailMentions}
              onChange={value => update('emailMentions', value)}
            />
          }
        />
        <SettingsRow
          title="Comments"
          description="Replies on threads you are part of."
          icon={ChatBubbleLeftRightIcon}
          control={
            <Switch
              label="Email me about comments"
              isLabelHidden
              value={settings.emailComments}
              onChange={value => update('emailComments', value)}
            />
          }
        />
        <SettingsRow
          title="Weekly digest"
          description="One summary every Monday morning."
          icon={EnvelopeIcon}
          control={
            <Switch
              label="Send the weekly digest"
              isLabelHidden
              value={settings.weeklyDigest}
              onChange={value => update('weeklyDigest', value)}
            />
          }
        />
      </SettingsCard>

      <SettingsCard title="Desktop">
        <SettingsRow
          title="Desktop notifications"
          icon={ComputerDesktopIcon}
          description="Requires permission from your browser."
          control={
            <Switch
              label="Desktop notifications"
              isLabelHidden
              value={settings.desktopAlerts}
              onChange={value => update('desktopAlerts', value)}
            />
          }
        />
        <SettingsRow
          title="Play a sound"
          icon={SpeakerWaveIcon}
          control={
            <Switch
              label="Play a sound"
              isLabelHidden
              value={settings.notificationSounds}
              onChange={value => update('notificationSounds', value)}
            />
          }
        />
        <SettingsRow
          title="Quiet hours"
          description="Hold notifications and deliver them in the morning."
          icon={ClockIcon}
          control={
            <Selector
              label="Quiet hours"
              isLabelHidden
              size="sm"
              width={CONTROL_WIDTH}
              value={settings.quietHours}
              onChange={value => update('quietHours', value)}
              options={[
                {value: 'none', label: 'Off'},
                {value: 'evening', label: '18:00 – 09:00'},
                {value: 'night', label: '22:00 – 07:00'},
              ]}
            />
          }
        />
      </SettingsCard>
    </VStack>
  );
}

interface Chord {
  
  mod?: boolean;
  shift?: boolean;
  alt?: boolean;
  key: string;
}

interface ShortcutDef {
  id: string;
  label: string;
  icon: IconComponent;
  binding: Chord;
}

const SHORTCUTS: ShortcutDef[] = [
  {
    id: 'search',
    label: 'Search everything',
    icon: MagnifyingGlassIcon,
    binding: {mod: true, key: 'k'},
  },
  {
    id: 'new',
    label: 'New item',
    icon: PencilSquareIcon,
    binding: {mod: true, key: 'n'},
  },
  {
    id: 'save',
    label: 'Save',
    icon: ArrowDownOnSquareIcon,
    binding: {mod: true, key: 's'},
  },
  {
    id: 'settings',
    label: 'Open settings',
    icon: Cog6ToothIcon,
    binding: {mod: true, key: ','},
  },
  {
    id: 'sidebar',
    label: 'Toggle the sidebar',
    icon: Bars3BottomLeftIcon,
    binding: {mod: true, shift: true, key: 'b'},
  },
  {
    id: 'help',
    label: 'Shortcut cheat sheet',
    icon: QuestionMarkCircleIcon,
    binding: {shift: true, key: '?'},
  },
];

const KBD_KEY_NAMES: Record<string, string> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  '+': 'plus',
  ' ': 'space',
};

function chordKeys(chord: Chord): string {
  const parts: string[] = [];
  if (chord.mod) {
    parts.push('mod');
  }
  if (chord.shift) {
    parts.push('shift');
  }
  if (chord.alt) {
    parts.push('alt');
  }
  parts.push(KBD_KEY_NAMES[chord.key] ?? chord.key);
  return parts.join('+');
}

function chordLabel(chord: Chord): string {
  const parts: string[] = [];
  if (chord.mod) {
    parts.push('Mod');
  }
  if (chord.shift) {
    parts.push('Shift');
  }
  if (chord.alt) {
    parts.push('Alt');
  }
  parts.push(chord.key === ' ' ? 'Space' : chord.key.toUpperCase());
  return parts.join(' + ');
}

const RECORDER_WIDTH = 96;

function ShortcutRecorder({
  onCapture,
  onCancel,
}: {
  onCapture: (chord: Chord) => void;
  onCancel: () => void;
}) {
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (event.key === 'Escape') {
        onCancel();
        return;
      }
      if (['Control', 'Meta', 'Alt', 'Shift'].includes(event.key)) {
        return;
      }

      onCapture({
        mod: event.metaKey || event.ctrlKey,
        shift: event.shiftKey,
        alt: event.altKey,
        key: event.key,
      });
    },
    [onCapture, onCancel],
  );

  return (
    <TextInput
      label="Type a shortcut"
      isLabelHidden
      placeholder="Type it"
      size="sm"
      width={RECORDER_WIDTH}
      value=""
      hasAutoFocus
      onKeyDown={handleKeyDown}
      onBlur={onCancel}
    />
  );
}

function ShortcutRow({
  def,
  chord,
  isEnabled,
  isCustom,
  onRebind,
  onToggle,
  onReset,
}: {
  def: ShortcutDef;
  chord: Chord;
  isEnabled: boolean;
  isCustom: boolean;
  onRebind: (chord: Chord) => void;
  onToggle: () => void;
  onReset: () => void;
}) {
  const [isRecording, setIsRecording] = useState(false);

  return (
    <SettingsRow
      title={def.label}
      icon={def.icon}
      control={
        <HStack gap={2} align="center">
          {isCustom && (
            <IconButton
              label={`Reset ${def.label} to its default`}
              icon={<Icon icon={ArrowUturnLeftIcon} size="sm" />}
              variant="ghost"
              size="sm"
              onClick={onReset}
            />
          )}
          {isRecording ? (
            <ShortcutRecorder
              onCapture={next => {
                onRebind(next);
                setIsRecording(false);
              }}
              onCancel={() => {
                setIsRecording(false);
              }}
            />
          ) : (
            <Button
              label={isEnabled ? chordLabel(chord) : 'No shortcut'}
              variant="ghost"
              size="sm"
              isDisabled={!isEnabled}
              tooltip={
                isEnabled ? 'Click to change' : 'Switch it on to rebind it'
              }
              onClick={() => {
                setIsRecording(true);
              }}>
              {isEnabled ? <Kbd keys={chordKeys(chord)} /> : undefined}
            </Button>
          )}
          <Tooltip content={isEnabled ? 'Disable' : 'Enable'}>
            <Switch
              size="sm"
              label={`${def.label} shortcut`}
              isLabelHidden
              value={isEnabled}
              onChange={onToggle}
            />
          </Tooltip>
        </HStack>
      }
    />
  );
}

function ShortcutsPanel() {
  const [overrides, setOverrides] = useState<Record<string, Chord | false>>({});

  const resolve = (def: ShortcutDef) => overrides[def.id] ?? def.binding;
  const hasOverrides = Object.keys(overrides).length > 0;

  const setOverride = (id: string, value: Chord | false) => {
    setOverrides(current => ({...current, [id]: value}));
  };
  const clearOverride = (id: string) => {
    setOverrides(current => {
      const next = {...current};
      Reflect.deleteProperty(next, id);
      return next;
    });
  };

  return (
    <SettingsCard title="Shortcuts">
      {SHORTCUTS.map(def => {
        const resolved = resolve(def);
        const isEnabled = resolved !== false;
        return (
          <ShortcutRow
            key={def.id}
            def={def}
            chord={isEnabled ? resolved : def.binding}
            isEnabled={isEnabled}
            isCustom={overrides[def.id] != null && overrides[def.id] !== false}
            onRebind={chord => {
              setOverride(def.id, chord);
            }}
            onToggle={() => {
              if (isEnabled) {
                setOverride(def.id, false);
              } else {
                clearOverride(def.id);
              }
            }}
            onReset={() => {
              clearOverride(def.id);
            }}
          />
        );
      })}
      {hasOverrides && (
        <VStack padding={ROW_PADDING}>
          <HStack>
            <Button
              label="Reset all to defaults"
              variant="ghost"
              size="sm"
              icon={<Icon icon={ArrowUturnLeftIcon} size="sm" />}
              onClick={() => {
                setOverrides({});
              }}
            />
          </HStack>
        </VStack>
      )}
    </SettingsCard>
  );
}

function LanguagePanel({settings, update}: PanelProps) {
  return (
    <SettingsCard title="Language & region">
      <SettingsRow
        title="Language"
        icon={LanguageIcon}
        description="Used across menus, buttons, and email."
        control={
          <Selector
            label="Language"
            isLabelHidden
            size="sm"
            width={CONTROL_WIDTH}
            value={settings.language}
            onChange={value => update('language', value)}
            options={[
              {value: 'en-US', label: 'English (US)'},
              {value: 'en-GB', label: 'English (UK)'},
              {value: 'fr', label: 'Français'},
              {value: 'de', label: 'Deutsch'},
              {value: 'ja', label: '日本語'},
            ]}
          />
        }
      />
      <SettingsRow
        title="Region format"
        icon={MapPinIcon}
        description="Dates, numbers, and currency."
        control={
          <Selector
            label="Region format"
            isLabelHidden
            size="sm"
            width={CONTROL_WIDTH}
            value={settings.region}
            onChange={value => update('region', value)}
            options={[
              {value: 'US', label: 'United States'},
              {value: 'GB', label: 'United Kingdom'},
              {value: 'DE', label: 'Germany'},
              {value: 'JP', label: 'Japan'},
            ]}
          />
        }
      />
      <SettingsRow
        title="Time zone"
        icon={GlobeAltIcon}
        description="Used for scheduling and every timestamp you see."
        control={
          <Selector
            label="Time zone"
            isLabelHidden
            size="sm"
            width={CONTROL_WIDTH}
            value={settings.timezone}
            onChange={value => update('timezone', value)}
            options={[
              {value: 'PT', label: 'Pacific (GMT-08:00)'},
              {value: 'MT', label: 'Mountain (GMT-07:00)'},
              {value: 'CT', label: 'Central (GMT-06:00)'},
              {value: 'ET', label: 'Eastern (GMT-05:00)'},
              {value: 'UTC', label: 'UTC (GMT+00:00)'},
            ]}
          />
        }
      />
      <SettingsRow
        title="Start the week on"
        icon={CalendarDaysIcon}
        control={
          <SegmentedControl
            label="Start the week on"
            size="sm"
            value={settings.weekStart}
            onChange={value => update('weekStart', value)}>
            <SegmentedControlItem value="sun" label="Sunday" />
            <SegmentedControlItem value="mon" label="Monday" />
          </SegmentedControl>
        }
      />
    </SettingsCard>
  );
}

function PrivacyPanel({settings, update}: PanelProps) {
  return (
    <VStack gap={5}>
      <SettingsCard title="Visibility">
        <SettingsRow
          title="Discoverable by email"
          icon={MagnifyingGlassIcon}
          description="Let people find your profile by searching your address."
          control={
            <Switch
              label="Discoverable by email"
              isLabelHidden
              value={settings.discoverable}
              onChange={value => update('discoverable', value)}
            />
          }
        />
        <SettingsRow
          title="Read receipts"
          icon={EyeIcon}
          description="Show people when you have read their message."
          control={
            <Switch
              label="Read receipts"
              isLabelHidden
              value={settings.readReceipts}
              onChange={value => update('readReceipts', value)}
            />
          }
        />
        <SettingsRow
          title="Activity status"
          icon={SignalIcon}
          description="Show a green dot while you are online."
          control={
            <Switch
              label="Activity status"
              isLabelHidden
              value={settings.activityStatus}
              onChange={value => update('activityStatus', value)}
            />
          }
        />
      </SettingsCard>

      <SettingsCard title="Your data">
        <SettingsRow
          title="Personalized suggestions"
          description="Use your activity to rank what you see first."
          icon={SparklesIcon}
          control={
            <Switch
              label="Personalized suggestions"
              isLabelHidden
              value={settings.personalization}
              onChange={value => update('personalization', value)}
            />
          }
        />
        <SettingsRow
          title="Export my data"
          description="We will email a download link within 24 hours."
          icon={ArrowDownTrayIcon}
          control={
            <Button label="Request export" variant="secondary" size="sm" />
          }
        />
        <SettingsRow
          title="Delete my account"
          description="Permanent, and it takes the workspace with it."
          icon={TrashIcon}
          control={<Button label="Delete" variant="destructive" size="sm" />}
        />
      </SettingsCard>
    </VStack>
  );
}

function IntegrationsPanel() {
  return (
    <SettingsCard title="Connected apps">
      <SettingsRow
        title="Calendar"
        description="Connected as alex@example.com"
        icon={CalendarDaysIcon}
        control={<Button label="Disconnect" variant="ghost" size="sm" />}
      />
      <SettingsRow
        title="File storage"
        description="Attach files straight from your drive."
        icon={FolderIcon}
        control={<Button label="Connect" variant="secondary" size="sm" />}
      />
      <SettingsRow
        title="Chat"
        description="Post updates to a channel when work ships."
        icon={ChatBubbleLeftRightIcon}
        control={<Button label="Connect" variant="secondary" size="sm" />}
      />
    </SettingsCard>
  );
}

function DeveloperPanel({settings, update}: PanelProps) {
  return (
    <VStack gap={5}>
      <SettingsCard title="API">
        <SettingsRow
          title="API access"
          description="Issue tokens that act on your behalf."
          icon={CodeBracketIcon}
          control={
            <Switch
              label="API access"
              isLabelHidden
              value={settings.apiAccess}
              onChange={value => update('apiAccess', value)}
            />
          }
        />
        <SettingsRow
          title="Webhook URL"
          icon={LinkIcon}
          description="We POST an event here whenever something changes."
          control={
            <TextInput
              label="Webhook URL"
              isLabelHidden
              size="sm"
              width={CONTROL_WIDTH}
              placeholder="https://example.com/hooks"
              isDisabled={!settings.apiAccess}
              value={settings.webhookUrl}
              onChange={value => update('webhookUrl', value)}
            />
          }
        />
      </SettingsCard>

      <SettingsCard title="Pre-release">
        <SettingsRow
          title="Early access features"
          icon={BeakerIcon}
          titleAccessory={<Token label="Beta" size="sm" color="purple" />}
          description="Unfinished work, turned on for your account only."
          control={
            <Switch
              label="Early access features"
              isLabelHidden
              value={settings.earlyAccess}
              onChange={value => update('earlyAccess', value)}
            />
          }
        />
        <SettingsRow
          title="Verbose logging"
          icon={DocumentMagnifyingGlassIcon}
          description="Write a detailed trace to the browser console."
          control={
            <Switch
              label="Verbose logging"
              isLabelHidden
              value={settings.verboseLogging}
              onChange={value => update('verboseLogging', value)}
            />
          }
        />
      </SettingsCard>
    </VStack>
  );
}

function SettingsPanelBody({
  panel,
  settings,
  update,
  isMobile = false,
}: {
  panel: PanelId;
  isMobile?: boolean;
} & PanelProps) {
  switch (panel) {
    case 'long-table':
      return <LongTable />;
    case 'long-paragraphs':
      return <LongParagraphs />;
    case 'profile':
      return <ProfilePanel settings={settings} update={update} />;
    case 'security':
      return <SecurityPanel settings={settings} update={update} />;
    case 'billing':
      return <BillingPanel settings={settings} update={update} />;
    case 'appearance':
      return <AppearancePanel settings={settings} update={update} />;
    case 'notifications':
      return <NotificationsPanel settings={settings} update={update} />;
    case 'shortcuts':
      return <ShortcutsPanel />;
    case 'language':
      return <LanguagePanel settings={settings} update={update} />;
    case 'privacy':
      return <PrivacyPanel settings={settings} update={update} />;
    case 'integrations':
      return <IntegrationsPanel />;
    case 'developer':
      return <DeveloperPanel settings={settings} update={update} />;
  }
}

function SettingsNavigation({activePanel, onSelectPanel}: {activePanel: PanelId; onSelectPanel: (panel: PanelId) => void}) {
  const {extraItems} = useLibraryTweaks();
  return <>{
        PANEL_GROUPS.map(group => (
          <SideNavSection
            key={group.label}
            title={group.label}
            xstyle={styles.sideNavSection}>
            {group.panels.map(panel => (
              <SideNavItem
                key={panel.id}
                label={panel.label}
                icon={<Icon icon={panel.icon} size="sm" color="primary" />}
                isSelected={panel.id === activePanel}
                onClick={() => onSelectPanel(panel.id)}
              />
            ))}
          </SideNavSection>
        ))
      }
      {extraItems.length > 0 && <SideNavSection title="Test navigation" xstyle={styles.sideNavSection}>
        {extraItems.map((label, index) => <SideNavItem key={index} label={label} data-testid={`extra-nav-${index + 1}`} icon={<Icon icon={DocumentTextIcon} size="sm" color="primary" />} onClick={() => onSelectPanel('long-table')} />)}
      </SideNavSection>}
      </>;
}

function SettingsPanelHeading({panel}: {panel: PanelId}) {
  const config = panelConfig(panel);
  return (
    <VStack gap={0.5}>
      <Heading level={2}>{config.label}</Heading>
      <Text type="supporting" color="secondary">
        {config.description}
      </Text>
    </VStack>
  );
}

function SettingsContentPane({
  panel,
  settings,
  update,
  isMobile = false,
}: {
  panel: PanelId;
  isMobile?: boolean;
} & PanelProps) {
  return (
    <LayoutContent className={isMobile ? "settings-content-pane" : "settings-desktop-panel"} isScrollable={false} padding={4}>
      <VStack className="settings-panel-body" gap={4} xstyle={row.panel}>
        {panel !== 'long-paragraphs' && <HStack gap={2} align="start">
          <StackItem size="fill">
            <SettingsPanelHeading panel={panel} />
          </StackItem>
        </HStack>}
        <SettingsPanelBody panel={panel} settings={settings} update={update} />
      </VStack>
    </LayoutContent>
  );
}

type Props = Pick<SidebarLayoutProps, 'mobileNavigationSide' | 'onMobileNavigationSideChange' | 'mobileNavigationOffset' | 'mobileNavigationArtwork'>;

export function SettingsExample(props: Props) {
  const [activePanel, setActivePanel] = useState<PanelId>(() => {
    const requested = readRoute().pageId;
    return PANELS.find(panel => panel.id === requested)?.id ?? DEFAULT_PANEL;
  });
  useLayoutEffect(() => {
    window.scrollTo({top: 0, left: 0, behavior: 'instant'});
  }, [activePanel]);
  useEffect(() => {
    const syncPanel = () => {
      const requested = readRoute().pageId;
      setActivePanel(PANELS.find(panel => panel.id === requested)?.id ?? DEFAULT_PANEL);
    };
    window.addEventListener('popstate', syncPanel);
    return () => window.removeEventListener('popstate', syncPanel);
  }, []);
  const [settings, setSettings] = useState<SettingsState>(INITIAL_SETTINGS);
  const isNarrow = useMediaQuery(NARROW_VIEWPORT);

  const update: UpdateSetting = (key, value) => {
    setSettings(current => ({...current, [key]: value}));
  };

  const selectPanel = (panel: PanelId) => {
    setActivePanel(panel);
    const route = readRoute();
    navigate(templatePath('sidebar', route.clean, panel));
  };

  const header = <>
    <UserMenu
      user={{name: settings.displayName, description: 'Personal account'}}
      compact={isNarrow}
      items={[
        {id: 'profile', label: 'Profile', icon: UserCircleIcon, onClick: () => selectPanel('profile')},
        {id: 'appearance', label: 'Appearance', icon: PaintBrushIcon, onClick: () => selectPanel('appearance')},
        {id: 'security', label: 'Login & security', icon: LockClosedIcon, onClick: () => selectPanel('security')},
      ]}
    />
  </>;

  return <SidebarLayout {...props} title="Da Facility" headerActions={header}
    navigationTitle="Settings" navigationLabel="Settings navigation" sectionsLabel="Settings sections"
    navigation={<SettingsNavigation activePanel={activePanel} onSelectPanel={selectPanel} />}
    navigationKey={activePanel} background={activePanel === 'long-paragraphs' ? '#faf8f2' : '#fff'}>
    <SettingsContentPane panel={activePanel} settings={settings} update={update} isMobile={isNarrow} />
  </SidebarLayout>;
}
