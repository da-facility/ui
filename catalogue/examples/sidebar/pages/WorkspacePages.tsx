// Adapted from the Meta Astryx Settings Dialog template. See LICENSE.third-party.
import {useCallback, useState, type CSSProperties, type KeyboardEvent} from 'react';
import {AspectRatio} from '@astryxdesign/core/AspectRatio';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {Grid} from '@astryxdesign/core/Grid';
import {HStack} from '@astryxdesign/core/HStack';
import {Icon} from '@astryxdesign/core/Icon';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Kbd} from '@astryxdesign/core/Kbd';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {SelectableCard} from '@astryxdesign/core/SelectableCard';
import {Selector} from '@astryxdesign/core/Selector';
import {StackItem} from '@astryxdesign/core/Stack';
import {Switch} from '@astryxdesign/core/Switch';
import {Text} from '@astryxdesign/core/Text';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Theme} from '@astryxdesign/core/theme';
import {Tooltip} from '@astryxdesign/core/Tooltip';
import {VStack} from '@astryxdesign/core/VStack';
import {neutralTheme} from '@astryxdesign/theme-neutral/built';
import {
  ArrowDownOnSquareIcon,
  ArrowUturnLeftIcon,
  AtSymbolIcon,
  Bars3BottomLeftIcon,
  Bars3Icon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  Cog6ToothIcon,
  ComputerDesktopIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  HandRaisedIcon,
  LanguageIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  MoonIcon,
  PaintBrushIcon,
  PencilSquareIcon,
  QuestionMarkCircleIcon,
  SpeakerWaveIcon,
  SunIcon,
  SwatchIcon,
} from '@heroicons/react/24/outline';
import * as stylex from '@stylexjs/stylex';
import {SettingsCard, SettingsRow, CONTROL_WIDTH, ROW_PADDING, type IconComponent} from './SettingsList';
import {type SettingsPageProps} from './settings';

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

export function AppearancePage({settings, update}: SettingsPageProps) {
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

export function NotificationsPage({settings, update}: SettingsPageProps) {
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
    (event: KeyboardEvent) => {
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

export function ShortcutsPage() {
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

export function LanguagePage({settings, update}: SettingsPageProps) {
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
