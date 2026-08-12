import type { Tabs } from 'webextension-polyfill';

// Cross-runtime message: background sends browser tab facts, not view-specific rows.
export const TAB_CHANGED = 'ultratab:tab-changed';

export interface TabChangedMessage {
  type: typeof TAB_CHANGED;
  tab: Tabs.Tab;
}

export function isTabChangedMessage(
  message: unknown,
): message is TabChangedMessage {
  const candidate = message as Partial<TabChangedMessage>;
  const tab = candidate.tab;

  return (
    candidate.type === TAB_CHANGED &&
    typeof tab === 'object' &&
    tab != null &&
    typeof tab.id === 'number'
  );
}
