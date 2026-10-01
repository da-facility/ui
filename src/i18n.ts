import {use} from 'react';
import {InternationalizationContext} from '@astryxdesign/core/i18n';
import en from './locales/en.json';

export type MessageKey = keyof typeof en;

/**
 * The package's built-in strings, translated through Astryx's
 * `InternationalizationProvider`. Apps add translations under the same keys
 * in its `messages` or `overrides` (see locales/hr.json); anything missing
 * falls back to the English in locales/en.json.
 *
 * Asking Astryx for a key it does not have logs a warning, so a translation is
 * only requested when the provider has one.
 */
export function useMessages() {
  const {locale, messages, overrides, translate} = use(InternationalizationContext);
  const chain = localeChain(locale);
  return (key: MessageKey, values?: Record<string, string>) => {
    const isTranslated = chain.some(tag => overrides?.[tag]?.[key] != null || messages[tag]?.[key]?.defaultMessage != null);
    return isTranslated ? translate(key, values) : format(en[key].defaultMessage, values);
  };
}

/** `hr-HR` → [`hr-HR`, `hr`], matching how Astryx resolves locales. */
function localeChain(locale: string) {
  let canonical = locale;
  try {
    canonical = new Intl.Locale(locale).baseName;
  } catch { /* Malformed tags are used as they are. */ }
  const parts = canonical.split('-');
  return parts.map((_, index) => parts.slice(0, parts.length - index).join('-'));
}

function format(message: string, values: Record<string, string> = {}) {
  return message.replace(/\{(\w+)\}/g, (match, name: string) => values[name] ?? match);
}
