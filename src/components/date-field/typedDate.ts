/**
 * Reads a typed date in the locale's order and gives it back as `YYYY-MM-DD`,
 * or `null` when the text isn't one this function understands (Astryx's own
 * parser then has its turn).
 *
 * Astryx reads `3.12.2026` and `Dec 3, 2026`, but not the way dates are
 * written in Croatian and much of Europe: `3. 12. 2026.` (spaces, a trailing
 * dot) or with the locale's month names, such as `3. prosinca 2026.`, which
 * is also how the field shows a chosen date, so editing it failed too.
 */
export function readTypedDate(text: string, locale: string, today = new Date()): string | null {
  const trimmed = text.trim();
  if (!trimmed || /^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed)) return null;
  const tokens = trimmed.match(/\p{L}+|\d+/gu) ?? [];
  // Anything but digits, month names and separators is not ours to read.
  if (trimmed.replace(/[\p{L}\d\s.,/-]/gu, '') !== '') return null;
  const numbers: number[] = [];
  const digits: string[] = [];
  let month: number | null = null;
  for (const token of tokens) {
    if (/^\d+$/.test(token)) {
      numbers.push(Number(token));
      digits.push(token);
      continue;
    }
    const named = monthNames(locale).get(token.toLocaleLowerCase(locale));
    if (named == null || month != null) return null;
    month = named;
  }

  let day: number | undefined;
  let year: number | undefined;
  let yearDigits: string | undefined;
  if (month != null) {
    if (numbers.length < 1 || numbers.length > 2) return null;
    [day, year] = numbers;
    yearDigits = digits[1];
  } else {
    if (numbers.length < 2 || numbers.length > 3) return null;
    const order = numericOrder(locale);
    const value = (part: 'day' | 'month' | 'year') => numbers[order.indexOf(part)];
    // Without a year, the two numbers are the day and month in the locale's order.
    const short = order.filter(part => part !== 'year');
    if (numbers.length === 2) {
      day = numbers[short.indexOf('day')];
      month = numbers[short.indexOf('month')];
    } else {
      day = value('day');
      month = value('month');
      year = value('year');
      yearDigits = digits[order.indexOf('year')];
    }
  }
  if (year == null) year = today.getFullYear();
  else if (yearDigits?.length === 2) year += 2000;
  else if (yearDigits?.length !== 4) return null;
  if (month == null || month < 1 || month > 12 || day == null || day < 1) return null;
  if (day > new Date(Date.UTC(year, month, 0)).getUTCDate()) return null;
  return `${String(year).padStart(4, '0')}-${pad(month)}-${pad(day)}`;
}

const pad = (n: number) => String(n).padStart(2, '0');
const namesByLocale = new Map<string, Map<string, number>>();
const ordersByLocale = new Map<string, Array<'day' | 'month' | 'year'>>();

/** Month names as the locale writes them alone and in a date ("studeni", "studenoga", "stu"), lower case, without dots. */
function monthNames(locale: string) {
  let names = namesByLocale.get(locale);
  if (names) return names;
  names = new Map();
  for (let month = 1; month <= 12; month++) {
    const date = new Date(Date.UTC(2026, month - 1, 15, 12));
    for (const options of [{month: 'long'}, {month: 'short'}, {day: 'numeric', month: 'long'}, {day: 'numeric', month: 'short'}] as const) {
      try {
        for (const part of new Intl.DateTimeFormat(locale, {...options, timeZone: 'UTC'}).formatToParts(date)) {
          if (part.type === 'month') names.set(part.value.toLocaleLowerCase(locale).replace(/\.$/, ''), month);
        }
      } catch { /* An unknown locale only loses its month names. */ }
    }
  }
  namesByLocale.set(locale, names);
  return names;
}

/** The order of day, month and year in the locale's numeric dates. */
function numericOrder(locale: string) {
  let order = ordersByLocale.get(locale);
  if (order) return order;
  try {
    order = new Intl.DateTimeFormat(locale, {day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'UTC'})
      .formatToParts(new Date(Date.UTC(2026, 10, 20)))
      .map(part => part.type)
      .filter((type): type is 'day' | 'month' | 'year' => type === 'day' || type === 'month' || type === 'year');
  } catch {
    order = ['day', 'month', 'year'];
  }
  if (order.length !== 3) order = ['day', 'month', 'year'];
  ordersByLocale.set(locale, order);
  return order;
}
