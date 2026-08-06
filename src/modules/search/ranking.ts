import { order } from '../../lib/fuzzy';
import type { Item, Kind } from './parsers';

const EMPTY_QUERY_SOURCE_PRIORITY: Record<Kind, number> = {
  tab: 0,
  history: 1,
  bookmark: 2,
};

/**
 * Host + path of a URL, dropping the scheme/query/hash noise every URL carries.
 * Hostname is kept on purpose — searching by domain ("github") is a primary use
 * case. Uses the WHATWG URL parser; falls back to the raw string if it won't parse.
 */
function cleanUrl(raw: string): string {
  try {
    const { hostname, pathname } = new URL(raw);
    return hostname + pathname;
  } catch {
    return raw;
  }
}

/** The text a query is matched against — single home for searchable fields. */
const searchableText = (item: Item): string =>
  `${item.title} ${cleanUrl(item.url)}`;

/** Empty-query order: tabs first, then other sources by their own recency field. */
function emptyQueryOrder(a: Item, b: Item): number {
  if (a.pinned !== b.pinned) {
    return a.pinned ? -1 : 1;
  }
  const sourceDelta =
    EMPTY_QUERY_SOURCE_PRIORITY[a.kind] - EMPTY_QUERY_SOURCE_PRIORITY[b.kind];
  if (sourceDelta !== 0) return sourceDelta;
  return b.lastAccessed - a.lastAccessed;
}

/**
 * Order items for display.
 * Empty query → pinned tabs, then source-aware recency. Otherwise → engine relevance.
 */
export function rank(items: Item[], query: string): Item[] {
  const trimmed = query.trim();

  if (!trimmed) {
    return [...items].sort(emptyQueryOrder);
  }

  // Normalize the query the same way as the haystack, so pasting a full URL
  // (scheme/query/hash and all) still matches the cleaned url text.
  const idxs = order(items.map(searchableText), cleanUrl(trimmed) || trimmed);
  return idxs.map((i) => items[i]);
}
