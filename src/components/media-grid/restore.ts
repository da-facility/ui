/** Tiles opened from a grid, by page, to return to when the grid comes back. */
export const opened = new Map<string, {id: string; top: number; at: number}>();

/** The page's path and query: the default key a grid remembers its opened tile under. */
export function currentPath() {
  return typeof location === 'undefined' ? '' : location.pathname + location.search;
}
