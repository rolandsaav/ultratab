import browser from 'webextension-polyfill';

type Tab = browser.Tabs.Tab;

/** Whether the current browser can maintain a native close-successor chain. */
function canMoveInSuccession(): boolean {
  return typeof browser.tabs.moveInSuccession === 'function';
}

/** Ignore sentinel tab IDs before building a succession chain. */
function tabId(tab: Tab): number | undefined {
  if (tab.id === browser.tabs.TAB_ID_NONE) return undefined;
  return tab.id;
}

/** Newest accessed tabs should close back to the next newest tab. */
function sortByMostRecent(a: Tab, b: Tab): number {
  const recentDelta = (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0);
  if (recentDelta !== 0) return recentDelta;

  return b.index - a.index;
}

/** Build the tab ID chain passed to moveInSuccession, optionally pinning one tab first. */
function tabIdsBySuccession(tabs: Tab[], promotedTabId?: number): number[] {
  const ids = new Set(tabs.map(tabId).filter((id) => id != null));
  const promoted =
    promotedTabId != null && ids.has(promotedTabId) ? [promotedTabId] : [];
  const rest = tabs
    .filter((tab) => tabId(tab) != null && tab.id !== promotedTabId)
    .sort(sortByMostRecent)
    .map((tab) => tab.id!);

  return [...promoted, ...rest];
}

/** Rebuild one window's native close-successor chain from current tab state. */
async function syncWindowSuccession(
  windowId: number,
  promotedTabId?: number,
): Promise<void> {
  if (!canMoveInSuccession()) return;

  const tabs = await browser.tabs.query({ windowId });
  const ids = tabIdsBySuccession(tabs, promotedTabId);

  if (ids.length > 1) {
    await browser.tabs.moveInSuccession(ids);
  }
}

/** Rebuild succession for every normal browser window, usually after startup/reload. */
export async function syncAllTabSuccession(): Promise<void> {
  const windows = await browser.windows.getAll({ windowTypes: ['normal'] });
  await Promise.all(
    windows
      .filter((window) => window.id != null)
      .map((window) => syncWindowSuccession(window.id!)),
  );
}

/** Promote the newly active tab so closing it returns to the previous recent tab. */
export function syncActivatedTabSuccession(
  tabId: number,
  windowId: number,
): Promise<void> {
  return syncWindowSuccession(windowId, tabId);
}

/** Treat newly opened tabs, including background tabs, as most recent. */
export function syncCreatedTabSuccession(tab: Tab): Promise<void> {
  if (tab.windowId == null || tab.id == null) return Promise.resolve();
  return syncWindowSuccession(tab.windowId, tab.id);
}

/** Rebuild the destination window after a tab moves into it. */
export function syncAttachedTabSuccession(
  tabId: number,
  windowId: number,
): Promise<void> {
  return syncWindowSuccession(windowId, tabId);
}

/** Rebuild the old window after a tab moves out of it. */
export function syncDetachedTabSuccession(windowId: number): Promise<void> {
  return syncWindowSuccession(windowId);
}

/** Promote the replacement tab after prerendering swaps its tab ID. */
export async function syncReplacedTabSuccession(tabId: number): Promise<void> {
  const tab = await browser.tabs.get(tabId);
  if (tab.windowId == null || tabId === browser.tabs.TAB_ID_NONE) return;

  await syncWindowSuccession(tab.windowId, tabId);
}
