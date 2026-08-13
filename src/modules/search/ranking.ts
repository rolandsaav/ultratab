import { order } from '../../lib/fuzzy';
import type { Item, Kind } from './parsers';

const EMPTY_QUERY_SOURCE_PRIORITY: Record<Kind, number> = {
  tab: 0,
  history: 1,
  bookmark: 2,
};

const QUERY_SOURCE_PENALTY: Record<Kind, number> = {
  tab: 0,
  bookmark: 8,
  history: 12,
};
/*
 * Recency is a nudge among comparable fuzzy matches, not a source/category override.
 */
const RECENCY_WEIGHT = 0.25;

/**
 * Typed search is tiered before scoring so direct "I can see the word I typed"
 * matches remain predictable. In particular, open tabs with literal title/URL
 * matches should beat saved items and weaker fuzzy tab matches.
 */
const enum QueryTier {
  DirectTab = 0,
  DirectSaved = 1,
  FuzzyTab = 2,
  FuzzySaved = 3,
}

interface QueryRank {
  item: Item;
  tier: QueryTier;
  relevance: number;
  recencyRank: number;
  direct: boolean;
}

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

const recencyValue = (item: Item): number => item.time?.value ?? 0;

function isDirectMatch(item: Item, query: string): boolean {
  const needle = cleanUrl(query).toLowerCase();
  if (!needle) return false;
  return searchableText(item).toLowerCase().includes(needle);
}

/*
 * A direct match means the normalized query appears literally in the title or
 * cleaned URL. Non-direct items can still be valid results when uFuzzy matches them.
 */
function queryTier(item: Item, direct: boolean): QueryTier {
  if (item.kind === 'tab') {
    return direct ? QueryTier.DirectTab : QueryTier.FuzzyTab;
  }
  return direct ? QueryTier.DirectSaved : QueryTier.FuzzySaved;
}

/** Empty-query order: tabs first, then other sources by their own recency field. */
function emptyQueryOrder(a: Item, b: Item): number {
  if (a.pinned !== b.pinned) {
    return a.pinned ? -1 : 1;
  }
  const sourceDelta =
    EMPTY_QUERY_SOURCE_PRIORITY[a.kind] - EMPTY_QUERY_SOURCE_PRIORITY[b.kind];
  if (sourceDelta !== 0) return sourceDelta;
  return recencyValue(b) - recencyValue(a);
}

function queryOrder(a: QueryRank, b: QueryRank): number {
  if (a.tier !== b.tier) return a.tier - b.tier;

  /*
   * Among many matching open tabs for the same site, the recently-used tab is
   * usually the one the user meant to switch back to.
   */
  if (a.tier === QueryTier.DirectTab) {
    const recentDelta = recencyValue(b.item) - recencyValue(a.item);
    if (recentDelta !== 0) return recentDelta;
    return a.relevance - b.relevance;
  }

  /*
   * uFuzzy's order is still the main signal. Source and recency only bias
   * results that are close enough to live in the same tier.
   */
  const scoreA =
    a.relevance +
    QUERY_SOURCE_PENALTY[a.item.kind] +
    a.recencyRank * RECENCY_WEIGHT;
  const scoreB =
    b.relevance +
    QUERY_SOURCE_PENALTY[b.item.kind] +
    b.recencyRank * RECENCY_WEIGHT;
  if (scoreA !== scoreB) return scoreA - scoreB;

  return recencyValue(b.item) - recencyValue(a.item);
}

/**
 * Order items for display.
 * Empty query → pinned tabs, then source-aware recency.
 * Query → tiered relevance, with direct matches and open tabs favored.
 */
export function rank(items: Item[], query: string): Item[] {
  const trimmed = query.trim();

  if (!trimmed) {
    return [...items].sort(emptyQueryOrder);
  }

  /*
   * Normalize the query the same way as the haystack, so pasting a full URL
   * (scheme/query/hash and all) still matches the cleaned url text.
   */
  const needle = cleanUrl(trimmed) || trimmed;
  const haystack = items.map(searchableText);
  const fuzzyIdxs = order(haystack, needle);

  /*
   * uFuzzy can rank fuzzy candidates well, but literal substring matches are a
   * product guarantee for tab switching. Merge them in before sorting so a real
   * title/URL hit cannot be dropped by fuzzy filtering.
   */
  const directIdxs = items
    .map((item, i) => (isDirectMatch(item, needle) ? i : -1))
    .filter((i) => i >= 0);
  const idxs = [...new Set([...directIdxs, ...fuzzyIdxs])];

  const fuzzyRanks = new Map(fuzzyIdxs.map((idx, rank) => [idx, rank]));
  const recencyRanks = new Map(
    [...idxs]
      .sort((a, b) => recencyValue(items[b]) - recencyValue(items[a]))
      .map((idx, rank) => [idx, rank]),
  );

  return idxs
    .map((i, relevance) => {
      const item = items[i];
      const direct = isDirectMatch(item, needle);
      return {
        item,
        direct,
        tier: queryTier(item, direct),
        relevance: fuzzyRanks.get(i) ?? fuzzyIdxs.length + relevance,
        recencyRank: recencyRanks.get(i) ?? idxs.length,
      };
    })
    .sort(queryOrder)
    .map(({ item }) => item);
}
