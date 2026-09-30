// Adapted from the Meta Astryx Settings Dialog template. See LICENSE.third-party.
import {Button} from '@astryxdesign/core/Button';
import {Switch} from '@astryxdesign/core/Switch';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Token} from '@astryxdesign/core/Token';
import {VStack} from '@astryxdesign/core/VStack';
import {
  ArrowDownTrayIcon,
  BeakerIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  CodeBracketIcon,
  DocumentMagnifyingGlassIcon,
  EyeIcon,
  FolderIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  SignalIcon,
  SparklesIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import {SettingsCard, SettingsRow, CONTROL_WIDTH} from './SettingsList';
import {type SettingsPageProps} from './settings';

export function PrivacyPage({settings, update}: SettingsPageProps) {
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

export function IntegrationsPage() {
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

export function DeveloperPage({settings, update}: SettingsPageProps) {
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
