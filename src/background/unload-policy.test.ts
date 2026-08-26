import { describe, expect, it } from 'bun:test';
import type { Tabs } from 'webextension-polyfill';
import { RECENT_TAB_LIMIT, selectTabsToUnload } from './unload-policy';

function tab(id: number, state: Partial<Tabs.Tab> = {}): Tabs.Tab {
  return {
    id,
    index: id,
    lastAccessed: id,
    active: false,
    pinned: false,
    audible: false,
    autoDiscardable: true,
    discarded: false,
    ...state,
  } as Tabs.Tab;
}

function tabs(count: number): Tabs.Tab[] {
  return Array.from({ length: count }, (_, index) => tab(index + 1));
}

describe('selectTabsToUnload', () => {
  it('does not select a tab when the count is at the limit', () => {
    expect(selectTabsToUnload(tabs(RECENT_TAB_LIMIT))).toEqual([]);
  });

  it('selects the oldest tab after the limit', () => {
    expect(selectTabsToUnload(tabs(RECENT_TAB_LIMIT + 1))).toEqual([1]);
  });

  it('selects each eligible tab after the limit', () => {
    expect(selectTabsToUnload(tabs(RECENT_TAB_LIMIT + 2))).toEqual([2, 1]);
  });

  it.each([
    ['active', { active: true }],
    ['pinned', { pinned: true }],
    ['audible', { audible: true }],
    ['protected', { autoDiscardable: false }],
    ['already unloaded', { discarded: true }],
  ] satisfies Array<[string, Partial<Tabs.Tab>]>)(
    'does not select an old %s tab',
    (_name, state) => {
      const items = tabs(RECENT_TAB_LIMIT + 1);
      items[0] = tab(1, state);

      expect(selectTabsToUnload(items)).toEqual([]);
    },
  );

  it('allows protected tabs to increase the loaded tab count', () => {
    const items = tabs(RECENT_TAB_LIMIT + 2);
    items[0] = tab(1, { pinned: true });
    items[1] = tab(2, { audible: true });

    expect(selectTabsToUnload(items)).toEqual([]);
  });

  it('skips tabs without a valid ID', () => {
    const items = tabs(RECENT_TAB_LIMIT + 2);
    items[0] = tab(1, { id: undefined });
    items[1] = tab(2, { id: -1 });

    expect(selectTabsToUnload(items)).toEqual([]);
  });

  it('uses the tab index when access times are equal', () => {
    const items = tabs(RECENT_TAB_LIMIT + 1).map((item) => ({
      ...item,
      lastAccessed: 1,
    }));

    expect(selectTabsToUnload(items)).toEqual([1]);
  });

  it('uses the tab index when access times are missing', () => {
    const items = tabs(RECENT_TAB_LIMIT + 1).map((item) => ({
      ...item,
      lastAccessed: undefined,
    }));

    expect(selectTabsToUnload(items)).toEqual([1]);
  });

  it('evaluates each window as a separate input', () => {
    const firstWindow = tabs(RECENT_TAB_LIMIT + 1);
    const secondWindow = tabs(RECENT_TAB_LIMIT);

    expect([
      selectTabsToUnload(firstWindow),
      selectTabsToUnload(secondWindow),
    ]).toEqual([[1], []]);
  });

  it('does not change the input order', () => {
    const items = tabs(RECENT_TAB_LIMIT + 1).reverse();
    const originalOrder = [...items];

    selectTabsToUnload(items);

    expect(items).toEqual(originalOrder);
  });
});
