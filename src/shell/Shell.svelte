<script lang="ts">
  import { nav } from './nav.svelte';
  import { footer } from './footer.svelte';
  import { status } from './status.svelte';
  import RootList from './RootList.svelte';
  import Footer from '../components/Footer.svelte';
  import { cubicIn, cubicOut } from 'svelte/easing';

  type Surface = 'iframe' | 'popup';

  let {
    surface,
    onClosed,
  }: {
    surface: Surface;
    onClosed?: () => void;
  } = $props();

  nav.setRoot({ view: RootList, title: 'Ultra Tab' });
  const Current = $derived(nav.current?.view);
  const shouldAnimate = $derived(surface === 'iframe');

  function teardown() {
    onClosed?.();
  }

  // Own Escape in capture so the shell can step back through its navigation stack.
  $effect(() => {
    function onKeydown(e: KeyboardEvent) {
      if (e.key !== 'Escape' || !nav.visible) return;
      e.preventDefault();
      e.stopPropagation();
      nav.escape();
    }
    window.addEventListener('keydown', onKeydown, true);
    return () => window.removeEventListener('keydown', onKeydown, true);
  });

  function popupEnter(_node: Element) {
    if (!shouldAnimate) return { duration: 0 };
    return {
      duration: 180,
      easing: cubicOut,
      css: (t: number) =>
        `opacity: ${t}; transform: translateY(${(1 - t) * -24}px);`,
    };
  }

  function popupExit(_node: Element) {
    if (!shouldAnimate) return { duration: 0 };
    return {
      duration: 180,
      easing: cubicIn,
      css: (t: number) =>
        `opacity: ${t}; transform: translateY(${(1 - t) * -24}px);`,
    };
  }
</script>

{#if nav.visible && Current}
  <div
    class="overlay"
    role="button"
    tabindex="0"
    in:popupEnter
    out:popupExit
    onoutroend={teardown}
    onclick={(e) => {
      if (e.target === e.currentTarget) nav.close();
    }}
    onkeydown={(e) => {
      if (e.key === 'Enter' && e.target === e.currentTarget) nav.close();
    }}
  >
    <div class="popup" role="dialog" aria-modal="true" tabindex="-1">
      <div class="body">
        {#key nav.current}
          <Current />
        {/key}
      </div>
      {#if status.error}
        <div class="error">{status.error}</div>
      {/if}
      <Footer
        info={footer.info}
        primaryLabel={footer.primaryLabel}
        hasActions={footer.hasActions}
      />
    </div>
  </div>
{/if}
