import type { Tabs } from 'webextension-polyfill';
import { TAB_CHANGED } from './tab-messages';

/*
 * This event stays inside one palette document.
 * The browser puts the event data in `detail`.
 * Here, `detail` is the changed tab.
 */
export function emitTabChanged(tab: Tabs.Tab): void {
  window.dispatchEvent(new CustomEvent<Tabs.Tab>(TAB_CHANGED, { detail: tab }));
}

/*
 * Listen for tab-change events in this palette document.
 * Read the changed tab from `detail`.
 * Return a cleanup function for Svelte.
 */
export function onTabChanged(handler: (tab: Tabs.Tab) => void): () => void {
  const listener = (event: Event) => {
    handler((event as CustomEvent<Tabs.Tab>).detail);
  };
  window.addEventListener(TAB_CHANGED, listener);
  return () => window.removeEventListener(TAB_CHANGED, listener);
}
