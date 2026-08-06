<script lang="ts">
  import type { Item } from './parsers';
  import { SOURCE_META } from './sources';

  let { item }: { item: Item } = $props();
  let FallbackIcon = $derived(SOURCE_META[item.kind].icon);
</script>

<span class="lead">
  <FallbackIcon class="favicon fallback-icon" />
  {#if item.favIconUrl}
    {#key item.url}
      <img
        class="favicon favicon-img"
        src={item.favIconUrl}
        alt=""
        onerror={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
      />
    {/key}
  {/if}
</span>
<div class="text">
  <div class="title">{item.title}</div>
  <div class="url">{item.url}</div>
</div>
{#if item.kind === 'tab' && !item.visited}
  <span class="badge" title="Not visited yet" aria-label="Not visited yet"
  ></span>
{/if}
