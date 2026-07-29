import ArrowRight from '@lucide/svelte/icons/arrow-right';
import ArrowRightToLine from '@lucide/svelte/icons/arrow-right-to-line';
import X from '@lucide/svelte/icons/x';
import Link from '@lucide/svelte/icons/link';
import Copy from '@lucide/svelte/icons/copy';
import RotateCw from '@lucide/svelte/icons/rotate-cw';
import Pin from '@lucide/svelte/icons/pin';
import PinOff from '@lucide/svelte/icons/pin-off';
import Volume2 from '@lucide/svelte/icons/volume-2';
import VolumeX from '@lucide/svelte/icons/volume-x';
import SearchIcon from '@lucide/svelte/icons/search';
import type { RowActions, InlineAction } from '../../shell/list/context';
import type { Command } from '../../commands/command';
import type { Item } from './parsers';
import { action, openView } from '../../commands/factories';
import { searchApi } from './api';
import { MODULE } from './module';
import Search from './Search.svelte';

/** Root-list entry: opens the search view. */
export const searchCommand = openView({
  id: MODULE,
  title: 'Search Tabs, Bookmarks & History',
  icon: SearchIcon,
  keywords: ['tabs', 'bookmarks', 'history', 'find'],
  view: Search,
});

// Content-side only — no background needed, so no api call.
const copyUrl = action<Item>({
  id: 'copy-url',
  title: 'Copy URL',
  icon: Link,
  shortcut: { mod: true, key: 'c' },
  do: (entry) => navigator.clipboard.writeText(entry.url),
  after: 'stay',
});

const activateTab = action<Item>({
  id: 'activate',
  title: 'Activate',
  icon: ArrowRight,
  do: (tab) => searchApi.activateTab(tab.id),
});

const closeTab = action<Item>({
  id: 'close',
  title: 'Close Tab',
  icon: X,
  shortcut: { mod: true, key: 'd' },
  do: (tab) => searchApi.closeTab(tab.id),
  after: 'remove',
});

const duplicateTab = action<Item>({
  id: 'duplicate',
  title: 'Duplicate Tab',
  icon: Copy,
  do: (tab) => searchApi.duplicateTab(tab.id),
  after: 'stay',
});

const reloadTab = action<Item>({
  id: 'reload',
  title: 'Reload Tab',
  icon: RotateCw,
  do: (tab) => searchApi.reloadTab(tab.id),
  after: 'stay',
});

const openInNewTab = action<Item>({
  id: 'open',
  title: 'Open in New Tab',
  icon: ArrowRight,
  do: (entry) => searchApi.openUrl(entry.url),
});

const openInThisTab = action<Item>({
  id: 'open-current',
  title: 'Open in This Tab',
  icon: ArrowRightToLine,
  do: (entry) => searchApi.openUrlInCurrentTab(entry.url),
});

const muteTab = action<Item>({
  id: 'mute',
  title: 'Mute Tab',
  icon: VolumeX,
  do: (tab) => searchApi.muteTab(tab.id, true),
  after: 'stay',
});

const unmuteTab = action<Item>({
  id: 'unmute',
  title: 'Unmute Tab',
  icon: Volume2,
  do: (tab) => searchApi.muteTab(tab.id, false),
  after: 'stay',
});

const pinTab = action<Item>({
  id: 'pin',
  title: 'Pin Tab',
  icon: Pin,
  do: (tab) => searchApi.pinTab(tab.id, true),
  after: 'stay',
});

const unpinTab = action<Item>({
  id: 'unpin',
  title: 'Unpin Tab',
  icon: PinOff,
  do: (tab) => searchApi.pinTab(tab.id, false),
  after: 'stay',
});

/** The mute/unmute and pin/unpin toggles depend on the tab's current state. */
function muteToggle(item: Item): Command<Item> {
  if (item.muted) {
    return unmuteTab;
  }
  return muteTab;
}

function pinToggle(item: Item): Command<Item> {
  if (item.pinned) {
    return unpinTab;
  }
  return pinTab;
}

/**
 * Row buttons for a tab. Each control is a state icon and its toggle in one fixed
 * slot — no separate passive indicator to clash with a button. Persistent controls
 * (an active state) stay visible at rest; the rest reveal on hover. A control's
 * resting icon reflects state; where the toggle flips to a distinct outcome (mute),
 * a hover icon previews the action.
 */
function inlineActions(item: Item): InlineAction<Item>[] {
  const actions: InlineAction<Item>[] = [];

  // Mute mirrors pin: available on hover for every tab, persistent (shown at rest)
  // only when there's state to show. The rest icon reflects state; hovering swaps
  // to the action's icon so you see what a click will do.
  if (item.muted) {
    // Muted at rest (VolumeX); hover previews unmute (Volume2).
    actions.push({
      command: unmuteTab,
      icon: VolumeX,
      hoverIcon: Volume2,
      persistent: true,
    });
  } else if (item.audible) {
    // Playing at rest (Volume2); hover previews mute (VolumeX).
    actions.push({
      command: muteTab,
      icon: Volume2,
      hoverIcon: VolumeX,
      persistent: true,
    });
  } else {
    // Silent: no state to show, so hover-only — and the icon is already the mute
    // action (VolumeX), so no separate hover icon is needed.
    actions.push({ command: muteTab, icon: VolumeX });
  }

  // Pin: same Pin glyph whether pinned (visible, click to unpin) or not (revealed
  // on hover to pin) — the persistent flag and colour carry the state.
  actions.push(
    item.pinned
      ? { command: unpinTab, icon: Pin, persistent: true }
      : { command: pinTab, icon: Pin },
  );

  // Close: no state to show, so hover-only.
  actions.push({ command: closeTab });

  return actions;
}

/** A result's actions — the primary runs on Enter, the secondaries fill the panel. */
export function commandsForItem(item: Item): RowActions<Item> {
  if (item.kind === 'tab') {
    return {
      primary: activateTab,
      inline: inlineActions(item),
      secondary: [
        closeTab,
        copyUrl,
        duplicateTab,
        reloadTab,
        muteToggle(item),
        pinToggle(item),
      ],
    };
  }
  return {
    primary: openInNewTab,
    secondary: [openInThisTab, copyUrl],
  };
}
