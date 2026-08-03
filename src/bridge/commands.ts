import browser from 'webextension-polyfill';

// Background→content command name. The browser shortcut itself uses `_execute_action`;
// this is the message sent to content scripts on injectable pages.
export const TOGGLE_PALETTE = 'toggle-palette';

// Background→content envelope; the literal `type` keeps it distinct from the RPC envelope.
export interface PaletteCommandMessage {
  type: 'ultratab:command';
  name: string;
}

/** True when a message is one of our palette command envelopes. */
export function isPaletteCommand(
  message: unknown,
): message is PaletteCommandMessage {
  const candidate = message as Partial<PaletteCommandMessage>;
  return (
    candidate?.type === 'ultratab:command' &&
    typeof candidate?.name === 'string'
  );
}

/** Send one palette command to a tab. Rejections propagate to the caller. */
export function sendPaletteCommand(tabId: number, name: string): Promise<void> {
  const message: PaletteCommandMessage = { type: 'ultratab:command', name };
  return browser.tabs.sendMessage(tabId, message) as Promise<void>;
}
