<script lang="ts">
  import { SOURCE_META, SOURCE_ORDER } from './sources';
  import type { Kind, SourceToggles } from './parsers';

  interface Props {
    enabled: SourceToggles;
    onToggle: (kind: Kind) => void;
  }

  let { enabled, onToggle }: Props = $props();
  let pressed = $state<Kind | undefined>();

  function release(kind: Kind): void {
    if (pressed === kind) pressed = undefined;
  }
</script>

<div class="controls">
  {#each SOURCE_ORDER as kind (kind)}
    {@const Icon = SOURCE_META[kind].icon}
    <button
      type="button"
      class="control source"
      class:enabled={enabled[kind]}
      class:pressed={pressed === kind}
      aria-pressed={enabled[kind]}
      title={SOURCE_META[kind].label}
      onpointerdown={(e) => {
        if (e.button === 0) pressed = kind;
      }}
      onpointerup={() => release(kind)}
      onpointercancel={() => release(kind)}
      onpointerleave={() => release(kind)}
      onmousedown={(e) => e.preventDefault()}
      onclick={() => onToggle(kind)}
    >
      <Icon />
    </button>
  {/each}
</div>
