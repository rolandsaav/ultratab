import { compareTabRecency, type RecentTab } from './tab-recency';

export const RECENT_TAB_LIMIT = 10;

/** Browser tab state that can change automatic unload eligibility. */
export interface TabUnloadState extends RecentTab {
  id?: number;
  active?: boolean;
  pinned?: boolean;
  audible?: boolean;
  autoDiscardable?: boolean;
  discarded?: boolean;
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
export function selectTabsToUnload(
  tabs: TabUnloadState[],
  recentTabLimit = RECENT_TAB_LIMIT,
): number[] {
  if (!Number.isInteger(recentTabLimit) || recentTabLimit < 0) {
    throw new RangeError('The recent tab limit must be a nonnegative integer.');
  }

  return [...tabs]
    .sort(compareTabRecency)
    .slice(recentTabLimit)
    .filter(canUnload)
    .map((tab) => tab.id);
}
