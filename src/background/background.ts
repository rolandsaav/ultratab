import browser from 'webextension-polyfill';
import { markVisited, forget, seed } from './visited';
import {
  syncActivatedTabSuccession,
  syncAllTabSuccession,
  syncAttachedTabSuccession,
  syncCreatedTabSuccession,
  syncDetachedTabSuccession,
  syncReplacedTabSuccession,
} from './succession';
import { TOGGLE_PALETTE, sendPaletteCommand } from '../bridge/commands';
import '../modules/search/background';
import '../modules/downloads/background';

const POPUP_PATH = 'popup.html';
const INJECTABLE_PROTOCOLS = new Set(['http:', 'https:']);

/** Fire-and-forget a visited-set update, logging any failure. */
function track(label: string, task: Promise<unknown>): void {
  task.catch((err) => console.error(`[UltraTab] ${label} failed:`, err));
}

function isInjectableUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    return INJECTABLE_PROTOCOLS.has(new URL(url).protocol);
  } catch {
    return false;
  }
}

async function setActionPopup(tabId: number, popup: string): Promise<void> {
  await browser.action.setPopup({ tabId, popup });
}

async function setActionPopupForTab(tab: browser.Tabs.Tab): Promise<void> {
  if (tab.id === undefined) return;
  await setActionPopup(tab.id, isInjectableUrl(tab.url) ? '' : POPUP_PATH);
}

async function syncActiveTabPopup(): Promise<void> {
  const [active] = await browser.tabs.query({
    currentWindow: true,
    active: true,
  });
  if (active) await setActionPopupForTab(active);
}

async function openActionPopup(
  tabId: number,
  { restore = false }: { restore?: boolean } = {},
): Promise<void> {
  await setActionPopup(tabId, POPUP_PATH);
  try {
    await browser.action.openPopup();
  } finally {
    if (restore) await setActionPopup(tabId, '');
  }
}

/** Relay to content when possible; otherwise fall back to the native action popup. */
async function toggleForTab(tab: browser.Tabs.Tab): Promise<void> {
  if (tab.id === undefined) return;
  if (!isInjectableUrl(tab.url)) {
    await openActionPopup(tab.id);
    return;
  }

  try {
    await sendPaletteCommand(tab.id, TOGGLE_PALETTE);
  } catch {
    await openActionPopup(tab.id, { restore: true });
  }
}

// Seed the visited set so pre-existing tabs don't flag as unvisited, and
// rebuild browser-native tab close succession from current tab metadata.
browser.runtime.onStartup.addListener(() =>
  track('startup', Promise.all([seed(), syncAllTabSuccession()])),
);
browser.runtime.onInstalled.addListener(() =>
  track('installed', Promise.all([seed(), syncAllTabSuccession()])),
);

// Keep tab activity state and close succession in step with real activity.
browser.tabs.onActivated.addListener(({ tabId, windowId }) =>
  track(
    'tab-activated',
    Promise.all([
      markVisited(tabId),
      syncActivatedTabSuccession(tabId, windowId),
      browser.tabs.get(tabId).then(setActionPopupForTab),
    ]),
  ),
);
browser.tabs.onCreated.addListener((tab) =>
  track('tab-created', syncCreatedTabSuccession(tab)),
);
browser.tabs.onDetached.addListener((_tabId, { oldWindowId }) =>
  track('tab-detached', syncDetachedTabSuccession(oldWindowId)),
);
browser.tabs.onAttached.addListener((tabId, { newWindowId }) =>
  track('tab-attached', syncAttachedTabSuccession(tabId, newWindowId)),
);
browser.tabs.onRemoved.addListener((tabId) => track('forget', forget(tabId)));
browser.tabs.onReplaced.addListener((addedTabId) =>
  track('tab-replaced', syncReplacedTabSuccession(addedTabId)),
);
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === 'complete') {
    track('sync-action-popup', setActionPopupForTab({ ...tab, id: tabId }));
  }
});

// On injectable pages the action has no popup, so clicks route here and toggle the iframe.
browser.action.onClicked.addListener((tab) => {
  track('toggle-palette', toggleForTab(tab));
});

// Also run on service-worker wake / extension reload.
track('sync-action-popup', syncActiveTabPopup());
track('sync-succession', syncAllTabSuccession());
