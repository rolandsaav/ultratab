import type { Tabs } from 'webextension-polyfill';

export const RECENT_TAB_LIMIT = 10;

/** Browser tab state that can change automatic unload eligibility. */
export type TabUnloadState = Pick<
  Tabs.Tab,
  | 'id'
  | 'index'
  | 'lastAccessed'
  | 'active'
  | 'pinned'
  | 'audible'
  | 'autoDiscardable'
  | 'discarded'
>;

/** Put recently accessed tabs first, then use tab order as a stable fallback. */
function compareForUnloading(a: TabUnloadState, b: TabUnloadState): number {
  const recentDelta = (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0);
  if (recentDelta !== 0) return recentDelta;

  return b.index - a.index;
}

function canUnload(
  tab: TabUnloadState,
): tab is TabUnloadState & { id: number } {
  return (
    tab.id != null &&
    tab.id >= 0 &&
    !tab.active &&
    !tab.pinned &&
    !tab.audible &&
    tab.autoDiscardable !== false &&
    !tab.discarded
  );
}

/** Select old tabs from one window. This function does not change browser state. */
export function selectTabsToUnload(tabs: TabUnloadState[]): number[] {
  return [...tabs]
    .sort(compareForUnloading)
    .slice(RECENT_TAB_LIMIT)
    .filter(canUnload)
    .map((tab) => tab.id);
}
