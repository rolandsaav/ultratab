<script lang="ts" generics="T">
  import type { Snippet } from 'svelte';
  import type { RowActions } from './context';

  interface Props {
    id: string;
    domId?: string;
    actions: RowActions<T>;
    selected?: boolean;
    /** Extra class on the row element — a module's per-row modifier (e.g. `current`). */
    rowClass?: string;
    style?: string;
    onSelect: () => void;
    onHighlight: () => void;
    onOpenActions: () => void;
    onRunInline: (index: number) => void;
    children: Snippet;
  }
  let {
    id,
    domId,
    actions,
    selected = false,
    rowClass,
    style,
    onSelect,
    onHighlight,
    onOpenActions,
    onRunInline,
    children,
  }: Props = $props();
</script>

<div
  id={domId}
  role="option"
  aria-selected={selected}
  data-selected={selected ? '' : undefined}
  data-value={id}
  tabindex="-1"
  onclick={onSelect}
  onpointermove={onHighlight}
  onkeydown={(e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    onSelect();
  }}
  oncontextmenu={(e) => {
    e.preventDefault();
    onOpenActions();
  }}
  class={rowClass ? `item virtual-item ${rowClass}` : 'item virtual-item'}
  {style}
>
  {@render children()}
  {#if actions.inline}
    <div class="controls">
      {#each actions.inline as action, i (action.command.id)}
        {@const Icon = action.icon ?? action.command.icon}
        <button
          type="button"
          class="control item-action"
          class:persistent={action.persistent}
          title={action.command.title}
          aria-label={action.command.title}
          onclick={(e) => {
            e.stopPropagation();
            onRunInline(i);
          }}
        >
          {#if action.hoverIcon}
            {@const HoverIcon = action.hoverIcon}
            <Icon class="control-icon control-icon--rest" />
            <HoverIcon class="control-icon control-icon--hover" />
          {:else}
            <Icon />
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>
