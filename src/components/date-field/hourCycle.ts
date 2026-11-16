/** The locale's clock: `12h` where it writes times with AM and PM (US English), else `24h` (Croatian). */
export function hourCycle(locale: string): '12h' | '24h' {
  try {
    const cycle = new Intl.DateTimeFormat(locale, {hour: 'numeric'}).resolvedOptions().hourCycle;
    return cycle === 'h11' || cycle === 'h12' ? '12h' : '24h';
  } catch {
    return '24h';
  }
}
