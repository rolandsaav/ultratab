import type { Tabs, Bookmarks, History } from 'webextension-polyfill';

export type Kind = 'tab' | 'bookmark' | 'history';
export type TimeKind = 'lastActive' | 'opened' | 'created';

/** Which sources a search should cover. */
export type SourceToggles = Record<Kind, boolean>;

export interface ItemTime {
  kind: TimeKind;
  value: number;
}

export interface Item {
  kind: Kind;
  id: string;
  title: string;
  url: string;
  favIconUrl: string;
  time?: ItemTime;
  /** Only meaningful for tabs — whether it's been activated this session. */
  visited: boolean;
  /** Tab-only state, always false for bookmarks and history. */
  muted: boolean;
  audible: boolean;
  pinned: boolean;
  /** Tab-only — the currently-focused tab. */
  active: boolean;
}

function itemTime(
  kind: TimeKind,
  value: number | undefined,
): ItemTime | undefined {
  if (value == null) return undefined;
  return { kind, value };
}

export function parseTab(tab: Tabs.Tab, index: number): Item {
  return {
    kind: 'tab',
    id: tab.id != null ? String(tab.id) : `tab-${index}`,
    title: tab.title || 'Untitled',
    url: tab.url || '',
    favIconUrl: tab.favIconUrl || '',
    time: itemTime('lastActive', tab.lastAccessed),
    visited: false,
    muted: tab.mutedInfo?.muted ?? false,
    audible: tab.audible ?? false,
    pinned: tab.pinned ?? false,
    active: tab.active ?? false,
  };
}

export function parseBookmark(node: Bookmarks.BookmarkTreeNode): Item {
  return {
    kind: 'bookmark',
    id: node.id,
    title: node.title || node.url || 'Untitled',
    url: node.url || '',
    favIconUrl: '',
    time: itemTime('created', node.dateAdded),
    visited: false,
    muted: false,
    audible: false,
    pinned: false,
    active: false,
  };
}

export function parseHistory(item: History.HistoryItem): Item {
  return {
    kind: 'history',
    id: item.id,
    title: item.title || item.url || 'Untitled',
    url: item.url || '',
    favIconUrl: '',
    time: itemTime('opened', item.lastVisitTime),
    visited: false,
    muted: false,
    audible: false,
    pinned: false,
    active: false,
  };
}
