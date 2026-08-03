import browser from 'webextension-polyfill';
import { TOGGLE_PALETTE, isPaletteCommand } from '../bridge/commands';
import {
  EXTENSION_ORIGIN,
  asFrameMessage,
  postFrameMessage,
} from '../bridge/frame';

/*
 * Thin embedder: injects the palette iframe into the page, positions it, promotes it
 * to the top layer, and forwards toggle intent. The palette renders in its own
 * extension-origin document (its own CSP). The iframe owns open-vs-close; it reports
 * 'closed' once its exit animation finishes so we know when to hide the host.
 */

const HOST_ID = 'ultratab-host';

let host: HTMLElement | null = null;
let frame: HTMLIFrameElement | null = null;
let ready = false; // the iframe has loaded and is listening
let toggleWhenReady = false; // a toggle arrived before the iframe was ready

function hostParent(): HTMLElement {
  return document.documentElement;
}

/**
 * Build the host and iframe once and keep them warm. Called eagerly at startup so the
 * first toggle is instant, and again (idempotently) on each toggle as a safety net.
 */
function ensureHost(): void {
  if (host) {
    // Already built and warm. Only re-attach if the page removed the host and
    // orphaned it — rebuilding would reload the iframe and drop its warm state.
    if (!host.isConnected) hostParent().appendChild(host);
    return;
  }

  host = document.createElement('div');
  host.id = HOST_ID;
  host.setAttribute('popover', 'manual'); // top layer, beating page z-index
  Object.assign(host.style, {
    position: 'fixed',
    inset: '0',
    width: '100vw',
    height: '100vh',
    padding: '0',
    margin: '0',
    border: 'none',
    background: 'transparent',
    overflow: 'hidden', // a popover defaults to overflow: auto; never scroll the host
    zIndex: '2147483647',
  });

  frame = document.createElement('iframe');
  frame.src = browser.runtime.getURL('palette.html');
  Object.assign(frame.style, {
    width: '100%',
    height: '100%',
    border: 'none',
    background: 'transparent',
    colorScheme: 'light',
  });

  host.appendChild(frame);
  hostParent().appendChild(host);
}

/**
 * Show the host in the top layer and forward the toggle to the iframe, which decides
 * open vs close. Runs on each toggle intent from the background. The host is shown
 * even on a close (a no-op when already open) so it's up before the iframe renders on
 * an open and stays up through the exit animation on a close.
 */
function toggle(): void {
  ensureHost();
  if (host && !host.matches(':popover-open')) host.showPopover();

  if (ready) sendToggle();
  else toggleWhenReady = true; // fire once the iframe reports ready
}

/**
 * Forward the toggle to the iframe, which decides open vs close. Called once the iframe
 * is ready — immediately from toggle(), or deferred until the 'ready' message.
 */
function sendToggle(): void {
  postFrameMessage(frame!.contentWindow!, 'toggle', EXTENSION_ORIGIN);
}

/** Hide the host, once the iframe reports its exit animation has finished ('closed'). */
function hide(): void {
  if (host?.matches(':popover-open')) host.hidePopover();
}

// Toggle intent from the background (F1 / toolbar click): forward it to the frame.
browser.runtime.onMessage.addListener((message: unknown) => {
  if (!isPaletteCommand(message) || message.name !== TOGGLE_PALETTE) return;
  toggle();
});

/*
 * Lifecycle from the palette iframe. The iframe is a genuine extension document, so we
 * require both the source window and the extension origin before trusting a message.
 */
window.addEventListener('message', (event) => {
  if (
    event.source !== frame?.contentWindow ||
    event.origin !== EXTENSION_ORIGIN
  )
    return;
  const message = asFrameMessage(event.data);
  if (!message) return;
  switch (message.name) {
    case 'ready':
      ready = true;
      if (toggleWhenReady) {
        toggleWhenReady = false;
        sendToggle();
      }
      break;
    case 'closed':
      hide();
      break;
  }
});

// Build the iframe eagerly so it's warm on first toggle.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ensureHost);
} else {
  ensureHost();
}
