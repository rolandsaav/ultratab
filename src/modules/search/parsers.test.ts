import { describe, expect, it } from 'vitest';
import type { Tabs } from 'webextension-polyfill';
import { parseTab } from './parsers';

describe('parseTab', () => {
  it('copies the browser unload state', () => {
    const item = parseTab(
      {
        id: 12,
        discarded: true,
        autoDiscardable: false,
      } as Tabs.Tab,
      0,
    );

    expect(item.discarded).toBe(true);
    expect(item.autoDiscardable).toBe(false);
  });

  it('uses the browser defaults when unload state is missing', () => {
    const item = parseTab({ id: 12 } as Tabs.Tab, 0);

    expect(item.discarded).toBe(false);
    expect(item.autoDiscardable).toBe(true);
  });
});
