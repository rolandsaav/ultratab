import { mount } from 'svelte';
import Shell from '../shell/Shell.svelte';
import { nav } from '../shell/nav.svelte';
import { searchCommand } from '../modules/search/commands';
import { asFrameMessage, postFrameMessage } from '../bridge/frame';
import { connectBackgroundEvents } from './background-events';
import 'overlayscrollbars/overlayscrollbars.css';
import '../components/app.css';

// Palette iframe entry: mounts the app and bridges the frame protocol to the embedder.
const embedded = window.parent !== window; // false in a popup, which has no embedder
const surface = embedded ? 'iframe' : 'popup';
document.documentElement.dataset.ultratabSurface = surface;

mount(Shell, {
  target: document.getElementById('app')!,
  props: {
    surface,
    onClosed: () => {
      if (embedded) {
        postFrameMessage(window.parent, 'closed', '*');
      } else {
        window.close();
      }
    },
  },
});

// Flip open/close on the embedder's toggle. We can't check its (page) origin, so we
// trust the source window: our parent frame. The host page shares that window, so it can
// open us too — harmless, it's a dismissable overlay with no privileged action on open.
window.addEventListener('message', (event) => {
  if (event.source !== window.parent) return;
  const message = asFrameMessage(event.data);
  if (!message || message.name !== 'toggle') return;
  if (nav.visible) nav.close();
  else nav.open(searchCommand);
});

connectBackgroundEvents();

// Announce we're listening so the embedder can flush a toggle that beat us here.
if (embedded) postFrameMessage(window.parent, 'ready', '*');
else nav.open(searchCommand);
