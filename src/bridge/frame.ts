import browser from 'webextension-polyfill';

/*
 * postMessage protocol between the in-page embedder and the palette iframe. The
 * embedder sits at the page origin, so it can't stamp the extension origin — receivers
 * validate by source window, not a symmetric origin check.
 */

/** embedder → iframe: `toggle`. iframe → embedder: `ready` when listening, `closed` when its exit animation ends. */
export type FrameMessageName = 'toggle' | 'ready' | 'closed';

export interface FrameMessage {
  type: 'ultratab:frame';
  name: FrameMessageName;
}

/** Our extension origin, e.g. moz-extension://<uuid>. */
export const EXTENSION_ORIGIN = new URL(browser.runtime.getURL('')).origin;

/** Narrow untrusted postMessage data to one of our frame envelopes. */
export function asFrameMessage(data: unknown): FrameMessage | null {
  const candidate = data as Partial<FrameMessage> | null;
  if (
    candidate?.type !== 'ultratab:frame' ||
    typeof candidate.name !== 'string'
  ) {
    return null;
  }
  return candidate as FrameMessage;
}

/** targetOrigin: EXTENSION_ORIGIN to reach the iframe, '*' to reach the page-origin parent. */
export function postFrameMessage(
  target: Window,
  name: FrameMessageName,
  targetOrigin: string,
): void {
  const message: FrameMessage = { type: 'ultratab:frame', name };
  target.postMessage(message, targetOrigin);
}
