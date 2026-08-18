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
import {
  syncAllTabUnloading,
  syncReplacedTabUnloading,
  syncWindowUnloading,
} from './tab-unloader';
import {
  PALETTE_PORT,
  TOGGLE_PALETTE,
  sendPaletteCommand,
} from '../bridge/commands';
import { TAB_CHANGED, type TabChangedMessage } from '../bridge/tab-messages';
import '../modules/search/background';
import '../modules/downloads/background';

const POPUP_PATH = 'popup.html';
const INJECTABLE_PROTOCOLS = new Set(['http:', 'https:']);

const palettePorts = new Set<browser.Runtime.Port>();

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

function postToConnectedPalettes(message: unknown): void {
  for (const port of palettePorts.keys()) {
    try {
      port.postMessage(message);
    } catch {
      palettePorts.delete(port);
    }
  }
}

browser.runtime.onConnect.addListener((port) => {
  if (port.name !== PALETTE_PORT) return;
  palettePorts.add(port);
  port.onDisconnect.addListener(() => {
    palettePorts.delete(port);
  });
});

// Seed the visited set, rebuild tab close succession, and apply the unload policy.
browser.runtime.onStartup.addListener(() =>
  track(
    'startup',
    Promise.all([seed(), syncAllTabSuccession(), syncAllTabUnloading()]),
  ),
);
browser.runtime.onInstalled.addListener(() =>
  track(
    'installed',
    Promise.all([seed(), syncAllTabSuccession(), syncAllTabUnloading()]),
  ),
);

// Keep tab activity, close succession, and automatic unloading in step.
browser.tabs.onActivated.addListener(({ tabId, windowId }) =>
  track(
    'tab-activated',
    Promise.all([
      markVisited(tabId),
      syncActivatedTabSuccession(tabId, windowId),
      syncWindowUnloading(windowId),
      browser.tabs.get(tabId).then(setActionPopupForTab),
    ]),
  ),
);
browser.tabs.onCreated.addListener((tab) =>
  track(
    'tab-created',
    Promise.all([
      syncCreatedTabSuccession(tab),
      tab.windowId == null
        ? Promise.resolve()
        : syncWindowUnloading(tab.windowId),
    ]),
  ),
);
browser.tabs.onDetached.addListener((_tabId, { oldWindowId }) =>
  track(
    'tab-detached',
    Promise.all([
      syncDetachedTabSuccession(oldWindowId),
      syncWindowUnloading(oldWindowId),
    ]),
  ),
);
browser.tabs.onAttached.addListener((tabId, { newWindowId }) =>
  track(
    'tab-attached',
    Promise.all([
      syncAttachedTabSuccession(tabId, newWindowId),
      syncWindowUnloading(newWindowId),
    ]),
  ),
);
browser.tabs.onRemoved.addListener((tabId) => track('forget', forget(tabId)));
browser.tabs.onReplaced.addListener((addedTabId) =>
  track(
    'tab-replaced',
    Promise.all([
      syncReplacedTabSuccession(addedTabId),
      syncReplacedTabUnloading(addedTabId),
    ]),
  ),
);
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === 'complete') {
    track('sync-action-popup', setActionPopupForTab({ ...tab, id: tabId }));
  }
  const message: TabChangedMessage = {
    type: TAB_CHANGED,
    tab: { ...tab, id: tabId },
  };
  postToConnectedPalettes(message);
});

// On injectable pages the action has no popup, so clicks route here and toggle the iframe.
browser.action.onClicked.addListener((tab) => {
  track('toggle-palette', toggleForTab(tab));
});

// Also run on service-worker wake / extension reload.
track('sync-action-popup', syncActiveTabPopup());
track('sync-succession', syncAllTabSuccession());
track('sync-unloading', syncAllTabUnloading());
