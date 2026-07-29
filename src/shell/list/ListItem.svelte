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
    {@const Icon = actions.inline.icon}
    <button
      type="button"
      class="item-action"
      title={actions.inline.title}
      aria-label={actions.inline.title}
      onclick={(e) => {
        e.stopPropagation();
        ctx.runInline(id);
      }}
    >
      <Icon size={16} />
    </button>
  {/if}
</Command.Item>
