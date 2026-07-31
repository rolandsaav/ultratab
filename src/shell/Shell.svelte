<script lang="ts">
  import { nav } from './nav.svelte';
  import { footer } from './footer.svelte';
  import { status } from './status.svelte';
  import RootList from './RootList.svelte';
  import Footer from '../components/Footer.svelte';
  import { cubicIn, cubicOut } from 'svelte/easing';

  nav.setRoot({ view: RootList, title: 'Ultra Tab' });
  const Current = $derived(nav.current?.view);

  function popupEnter(_node: Element) {
    return {
      duration: 200,
      easing: cubicOut,
      css: (t: number) =>
        `opacity: ${t}; transform: scale(${0.9 + 0.1 * t}) translateY(${(1 - t) * 24}px);`,
    };
  }

  function popupExit(_node: Element) {
    return {
      duration: 150,
      easing: cubicIn,
      css: (t: number) =>
        `opacity: ${t}; transform: scale(${0.8 + 0.2 * t}) translateY(${(1 - t) * -160}px);`,
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
