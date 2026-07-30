<script lang="ts" generics="T">
  import { Command, Popover } from 'bits-ui';
  import type { Command as PaletteCommand } from '../commands/command';
  import { autofocus, matchAction, tabNav } from './utils.svelte';
  import KeyCombo from './KeyCombo.svelte';

  interface Props {
    actions: PaletteCommand<T>[];
    onRun: (command: PaletteCommand<T>) => void;
    /** Controlled open state — the shell owns it. */
    open: boolean;
    /** Called when bits-ui requests a close (a click outside the panel). */
    onDismiss: () => void;
  }

  let { actions, onRun, open, onDismiss }: Props = $props();

  let query = $state('');
  let inputRef = $state<HTMLInputElement | null>(null);
  let commandRoot = $state<ReturnType<typeof Command.Root> | null>(null);

  // Focus the filter while open.
  autofocus(
    () => inputRef,
    () => open,
  );
  // Clear the filter on close: query is bound to the Command's input, so a stale
  // value would keep filtering the actions the next time the panel opens.
  $effect(() => {
    if (!open) query = '';
  });

  function onKeydown(e: KeyboardEvent): void {
    const match = matchAction(e, actions);
    if (match) {
      e.preventDefault();
      onRun(match);
      return;
    }
    tabNav(e, commandRoot);
  }
</script>

<Popover.Root {open} onOpenChange={(v) => !v && onDismiss()}>
  <!-- Focus is List's job (filter on open, main input on close), so trapFocus and
       close-autofocus are off here. -->
  <Popover.ContentStatic
    class="actions-anchor"
    trapFocus={false}
    onCloseAutoFocus={(e) => e.preventDefault()}
  >
    <Command.Root
      bind:this={commandRoot}
      loop
      onkeydown={onKeydown}
      class="actions"
    >
      <Command.List class="actions-list">
        <Command.Empty class="empty">No actions</Command.Empty>
        {#each actions as action (action.id)}
          {@const Icon = action.icon}
          <Command.Item
            value={action.title}
            onSelect={() => onRun(action)}
            class="action-item"
          >
            <Icon size={16} />
            <span class="action-label">{action.title}</span>
            {#if action.shortcut}
              <span class="action-shortcut"
                ><KeyCombo shortcut={action.shortcut} /></span
              >
            {/if}
          </Command.Item>
        {/each}
      </Command.List>
      <Command.Input
        bind:ref={inputRef}
        bind:value={query}
        placeholder="Search actions…"
        class="actions-input"
      />
    </Command.Root>
  </Popover.ContentStatic>
</Popover.Root>
