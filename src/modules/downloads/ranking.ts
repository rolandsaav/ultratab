import { order } from '../../lib/fuzzy';
import type { DownloadEntry } from './parsers';

const searchableText = (entry: DownloadEntry): string =>
  `${entry.filename} ${entry.url}`;

/** Empty query → most recent first. Otherwise → engine relevance. */
export function rank(entries: DownloadEntry[], query: string): DownloadEntry[] {
  const trimmed = query.trim();

  if (!trimmed) {
    return [...entries].sort((a, b) => b.startTime - a.startTime);
  }

  const idxs = order(entries.map(searchableText), trimmed);
  return idxs.map((i) => entries[i]);
}
