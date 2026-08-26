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
import Archive from '@lucide/svelte/icons/archive';
import ArchiveRestore from '@lucide/svelte/icons/archive-restore';
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

const unloadTab = action<Item>({
  id: 'unload',
  title: 'Unload Tab',
  icon: Archive,
  do: (tab) => searchApi.unloadTab(tab.id),
  after: 'update',
});

const loadTab = action<Item>({
  id: 'load',
  title: 'Load Tab',
  icon: ArchiveRestore,
  do: (tab) => searchApi.reloadTab(tab.id),
  after: 'update',
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
  after: 'update',
});

const unmuteTab = action<Item>({
  id: 'unmute',
  title: 'Unmute Tab',
  icon: Volume2,
  do: (tab) => searchApi.muteTab(tab.id, false),
  after: 'update',
});

const pinTab = action<Item>({
  id: 'pin',
  title: 'Pin Tab',
  icon: Pin,
  do: (tab) => searchApi.pinTab(tab.id, true),
  after: 'update',
});

const unpinTab = action<Item>({
  id: 'unpin',
  title: 'Unpin Tab',
  icon: PinOff,
  do: (tab) => searchApi.pinTab(tab.id, false),
  after: 'update',
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

function unloadToggle(item: Item): Command<Item> | undefined {
  if (item.discarded) return loadTab;
  if (item.active) return undefined;
  return unloadTab;
}

type AudioState = 'muted' | 'playing' | 'silent';

function audioState(item: Item): AudioState {
  if (item.muted) return 'muted';
  if (item.audible) return 'playing';
  return 'silent';
}

/** The mute control: resting icon reflects the tab's audio state, a hover icon previews
 * the flip, and it stays visible at rest while there's state to show. */
function muteAction(item: Item): InlineAction<Item> {
  switch (audioState(item)) {
    case 'muted':
      return {
        command: unmuteTab,
        icon: VolumeX,
        hoverIcon: Volume2,
        persistent: true,
      };
    case 'playing':
      return {
        command: muteTab,
        icon: Volume2,
        hoverIcon: VolumeX,
        persistent: true,
      };
    case 'silent':
      return { command: muteTab, icon: VolumeX };
  }
}

/** Row buttons for a tab: each is a toggle whose resting icon reflects state.
 * Persistent controls stay visible at rest; others reveal on hover. */
function inlineActions(item: Item): InlineAction<Item>[] {
  const actions: InlineAction<Item>[] = [muteAction(item)];

  // Pin: same glyph pinned or not — the persistent flag and colour carry the state.
  if (item.pinned) {
    actions.push({ command: unpinTab, icon: Pin, persistent: true });
  } else {
    actions.push({ command: pinTab, icon: Pin });
  }

  actions.push({ command: closeTab });

  return actions;
}

/** A result's actions — the primary runs on Enter, the secondaries fill the panel. */
export function commandsForItem(item: Item): RowActions<Item> {
  if (item.kind === 'tab') {
    const unloadStateAction = unloadToggle(item);
    return {
      primary: activateTab,
      inline: inlineActions(item),
      secondary: [
        ...(unloadStateAction ? [unloadStateAction] : []),
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
    inline: [{ command: openInThisTab }, { command: copyUrl }],
    secondary: [openInThisTab, copyUrl],
  };
}
