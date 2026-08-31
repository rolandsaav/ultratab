<script lang="ts">
  import { SOURCE_META, SOURCE_ORDER } from './sources';
  import type { Kind, SourceToggles } from './parsers';
  import TooltipButton from '../../components/TooltipButton.svelte';

  interface Props {
    enabled: SourceToggles;
    onToggle: (kind: Kind, event: MouseEvent) => void;
  }

  let { enabled, onToggle }: Props = $props();
</script>

<div class="controls">
  {#each SOURCE_ORDER as kind (kind)}
    {@const Icon = SOURCE_META[kind].icon}
    <TooltipButton
      type="button"
      class={['control source', enabled[kind] && 'enabled']}
      label={SOURCE_META[kind].label}
      side="bottom"
      aria-pressed={enabled[kind]}
      onclick={(event) => onToggle(kind, event)}
    >
      <Icon />
    </TooltipButton>
  {/each}
</div>
