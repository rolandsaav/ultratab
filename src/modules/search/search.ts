import { rank } from './ranking';
import type { Item, Kind, SourceToggles } from './parsers';

/** Fetched items available to search, keyed by source. */
export type SearchPool = Partial<Record<Kind, Item[]>>;

export function search(
  pool: SearchPool,
  enabled: SourceToggles,
  query: string,
): Item[] {
  const kinds = (Object.keys(enabled) as Kind[]).filter(
    (kind) => enabled[kind],
  );
  const items = kinds.flatMap((kind) => pool[kind] ?? []);
  return rank(items, query);
}
