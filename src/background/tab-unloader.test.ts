import { beforeEach, describe, expect, it, mock } from 'bun:test';

const browser = {
  tabs: {
    TAB_ID_NONE: -1,
    query: mock(),
    discard: mock(),
    get: mock(),
  },
  windows: {
    getAll: mock(),
  },
};

mock.module('webextension-polyfill', () => ({ default: browser }));

const { syncAllTabUnloading, syncReplacedTabUnloading, syncWindowUnloading } =
  await import('./tab-unloader');

function tabs(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    index: index + 1,
    lastAccessed: index + 1,
    active: false,
    pinned: false,
    audible: false,
    autoDiscardable: true,
    discarded: false,
  }));
}

describe('tab unloader integration', () => {
  beforeEach(() => {
    browser.tabs.query.mockClear();
    browser.tabs.discard.mockClear();
    browser.tabs.get.mockClear();
    browser.windows.getAll.mockClear();
    browser.tabs.discard.mockResolvedValue(undefined);
  });

  it('queries one window and discards each selected tab by ID', async () => {
    browser.tabs.query.mockResolvedValue(tabs(12));

    await syncWindowUnloading(7);

    expect(browser.tabs.query).toHaveBeenCalledWith({ windowId: 7 });
    expect(browser.tabs.discard).toHaveBeenNthCalledWith(1, 2);
    expect(browser.tabs.discard).toHaveBeenNthCalledWith(2, 1);
  });

  it('reconciles each normal window with an ID', async () => {
    browser.windows.getAll.mockResolvedValue([
      { id: 3 },
      { id: undefined },
      { id: 8 },
    ]);
    browser.tabs.query.mockResolvedValue([]);

    await syncAllTabUnloading();

    expect(browser.windows.getAll).toHaveBeenCalledWith({
      windowTypes: ['normal'],
    });
    expect(browser.tabs.query).toHaveBeenCalledWith({ windowId: 3 });
    expect(browser.tabs.query).toHaveBeenCalledWith({ windowId: 8 });
    expect(browser.tabs.query).toHaveBeenCalledTimes(2);
  });

  it('reconciles the replacement tab window', async () => {
    browser.tabs.get.mockResolvedValue({ windowId: 6 });
    browser.tabs.query.mockResolvedValue([]);

    await syncReplacedTabUnloading(14);

    expect(browser.tabs.get).toHaveBeenCalledWith(14);
    expect(browser.tabs.query).toHaveBeenCalledWith({ windowId: 6 });
  });
});
