import { describe, expect, it } from 'bun:test';
import type { Tabs } from 'webextension-polyfill';
import { parseTab } from './parsers';

describe('parseTab', () => {
  it('copies the browser discarded state', () => {
    const item = parseTab(
      {
        id: 12,
        discarded: true,
      } as Tabs.Tab,
      0,
    );

    expect(item.discarded).toBe(true);
  });

  it('uses the browser default when discarded state is missing', () => {
    const item = parseTab({ id: 12 } as Tabs.Tab, 0);

    expect(item.discarded).toBe(false);
  });
});
