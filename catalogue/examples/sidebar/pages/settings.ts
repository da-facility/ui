/** Demo state shared by every settings page, kept while switching pages. */
export interface SettingsState {
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

export const INITIAL_SETTINGS: SettingsState = {
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

export type SettingsPageProps = {
  settings: SettingsState;
  update: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
};
