import browser from 'webextension-polyfill';
import { selectTabsToUnload } from './unload-policy';
import { createWindowReconcileQueue } from './window-reconcile-queue';

/** Apply the unload policy to one normal browser window. */
async function reconcileWindow(windowId: number): Promise<void> {
  const tabs = await browser.tabs.query({ windowId });
  const tabIds = selectTabsToUnload(tabs);

  await Promise.all(tabIds.map((tabId) => browser.tabs.discard(tabId)));
}

export const syncWindowUnloading = createWindowReconcileQueue(reconcileWindow);

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
