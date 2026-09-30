// Adapted from the Meta Astryx Settings Dialog template. See LICENSE.third-party.
import {Button} from '@astryxdesign/core/Button';
import {Selector} from '@astryxdesign/core/Selector';
import {Switch} from '@astryxdesign/core/Switch';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Token} from '@astryxdesign/core/Token';
import {VStack} from '@astryxdesign/core/VStack';
import {
  BriefcaseIcon,
  ClockIcon,
  ComputerDesktopIcon,
  CreditCardIcon,
  CubeIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  FingerPrintIcon,
  KeyIcon,
  ReceiptPercentIcon,
  ShieldCheckIcon,
  SignalIcon,
  TagIcon,
  UserIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import {SettingsCard, SettingsRow, CONTROL_WIDTH} from './SettingsList';
import {type SettingsPageProps} from './settings';

export function ProfilePage({settings, update}: SettingsPageProps) {
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

export function SecurityPage({settings, update}: SettingsPageProps) {
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

export function BillingPage({settings, update}: SettingsPageProps) {
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
