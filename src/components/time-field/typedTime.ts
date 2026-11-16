/**
 * Reads a typed time written with a dot, as in Croatian and much of Europe
 * ("17.00", "9.30", "17."), and gives it back as `HH:mm`, or `null` when the
 * text isn't one this function understands (Astryx's own parser then has its
 * turn).
 *
 * Astryx 0.6.8 reads "17", "1700", "17:00" and "5:30 PM", but not a dot
 * between the hours and minutes.
 */
export function readTypedTime(text: string): string | null {
  const match = /^(\d{1,2})\.(\d{2})?$/.exec(text.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? 0);
  if (hours > 23 || minutes > 59) return null;
  return `${pad(hours)}:${pad(minutes)}`;
}

const pad = (n: number) => String(n).padStart(2, '0');
