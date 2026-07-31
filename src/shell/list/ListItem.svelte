<script lang="ts" generics="T">
  import { Command } from 'bits-ui';
  import type { Snippet } from 'svelte';
  import { getListContext, type RowActions } from './context';

  interface Props {
    id: string;
    actions: RowActions<T>;
    /** Value passed to an action's perform; omit for void/root commands. */
    subject?: T;
    /** Extra class on the row element — a module's per-row modifier (e.g. `current`). */
    rowClass?: string;
    children: Snippet;
  }
  let { id, actions, subject, rowClass, children }: Props = $props();
  const ctx = getListContext();

  $effect(() => {
    ctx.register(id, { subject, actions });
    return () => ctx.unregister(id);
  });
</script>

<Command.Item
  value={id}
  onSelect={() => ctx.select(id)}
  oncontextmenu={(e) => {
    e.preventDefault();
    ctx.openActions(id);
  }}
  class={rowClass ? `item ${rowClass}` : 'item'}
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
            ctx.runInline(id, i);
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
</Command.Item>
