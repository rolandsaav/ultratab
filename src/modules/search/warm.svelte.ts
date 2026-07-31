import type { Item } from './parsers';

/** Default-view results (empty query, default sources) kept across palette opens so
 * Search seeds a populated list instead of flashing empty. A rune singleton, like the
 * status store. Only results are warmed; the search box and toggles reset each open. */
export const warm: { items: Item[] } = $state({ items: [] });
