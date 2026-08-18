export interface RecentTab {
  lastAccessed?: number;
  index: number;
}

/** Put the newest tab first. Use the tab index when access times are equal. */
export function compareTabRecency(a: RecentTab, b: RecentTab): number {
  const recentDelta = (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0);
  if (recentDelta !== 0) return recentDelta;

  return b.index - a.index;
}
