import browser from 'webextension-polyfill';
import { PALETTE_PORT } from '../bridge/commands';
import { emitTabChanged } from '../bridge/tab-events';
import { isTabChangedMessage } from '../bridge/tab-messages';

/** Connect this palette document to background-pushed browser state changes. */
export function connectBackgroundEvents(): void {
  const port = browser.runtime.connect({ name: PALETTE_PORT });
  port.onMessage.addListener((message: unknown) => {
    if (isTabChangedMessage(message)) {
      // Re-emit inside the palette so views can subscribe without owning the port.
      emitTabChanged(message.tab);
    }
  });
}
