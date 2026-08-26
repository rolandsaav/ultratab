import browser from 'webextension-polyfill';
import { selectTabsToUnload } from './unload-policy';

/** Apply the unload policy to one normal browser window. */
export async function syncWindowUnloading(windowId: number): Promise<void> {
  const tabs = await browser.tabs.query({ windowId });
  const tabIds = selectTabsToUnload(tabs);

  await Promise.all(tabIds.map((tabId) => browser.tabs.discard(tabId)));
}

/** Apply the unload policy to every normal browser window. */
export async function syncAllTabUnloading(): Promise<void> {
  const windows = await browser.windows.getAll({ windowTypes: ['normal'] });
  await Promise.all(
    windows
      .map((window) => window.id)
      .filter((windowId) => windowId != null)
      .map(syncWindowUnloading),
  );
}

/** Find the replacement tab's window, then apply that window's unload policy. */
export async function syncReplacedTabUnloading(tabId: number): Promise<void> {
  if (tabId === browser.tabs.TAB_ID_NONE) return;
  const tab = await browser.tabs.get(tabId);
  if (tab.windowId == null) return;
  await syncWindowUnloading(tab.windowId);
}
