import {use, useMemo} from 'react';
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
 * only requested when the provider has one. Numbers in `values` are formatted
 * for the provider's locale, so counts get the right grouping ("1.204" in
 * Croatian); translations may use ICU plurals on them.
 *
 * The function is the same object for as long as the locale and the messages
 * are, so components can pass it to memoized children and effects without
 * redrawing them, and the locale is parsed once, not on every call.
 */
export function useMessages() {
  const {locale, messages, overrides, translate} = use(InternationalizationContext);
  return useMemo(() => {
    const chain = localeChain(locale);
    return (key: MessageKey, values?: Record<string, string | number>) => {
      const isTranslated = chain.some(tag => overrides?.[tag]?.[key] != null || messages[tag]?.[key]?.defaultMessage != null);
      return isTranslated
        ? translate(key, values)
        : format(en[key].defaultMessage, values, locale);
    };
  }, [locale, messages, overrides, translate]);
}

const chains = new Map<string, string[]>();

/** `hr-HR` → [`hr-HR`, `hr`], matching how Astryx resolves locales. Parsed once per locale. */
function localeChain(locale: string) {
  let chain = chains.get(locale);
  if (chain) return chain;
  let canonical = locale;
  try {
    canonical = new Intl.Locale(locale).baseName;
  } catch { /* Malformed tags are used as they are. */ }
  const parts = canonical.split('-');
  chain = parts.map((_, index) => parts.slice(0, parts.length - index).join('-'));
  chains.set(locale, chain);
  return chain;
}

function format(message: string, values: Record<string, string | number> = {}, locale = 'en') {
  return message.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = values[name];
    if (typeof value === 'number') return formatNumber(value, locale);
    return value ?? match;
  });
}

const numberFormats = new Map<string, Intl.NumberFormat>();

/** Formats a count with the locale's grouping, falling back to English for unknown locales. */
function formatNumber(value: number, locale: string) {
  let formatter = numberFormats.get(locale);
  if (!formatter) {
    try {
      formatter = new Intl.NumberFormat(locale);
    } catch {
      formatter = new Intl.NumberFormat('en');
    }
    numberFormats.set(locale, formatter);
  }
  return formatter.format(value);
}
