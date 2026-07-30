<script lang="ts">
  import type { Snippet } from 'svelte';
  import { SvelteMap } from 'svelte/reactivity';
  import { Command } from 'bits-ui';
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import type { Command as PaletteCommand } from '../../commands/command';
  import { nav } from '../nav.svelte';
  import { footer } from '../footer.svelte';
  import {
    autofocus,
    tabNav,
    matchAction,
    matchesShortcut,
    OPEN_ACTIONS_SHORTCUT,
  } from '../../components/utils.svelte';
  import ActionsPanel from '../../components/ActionsPanel.svelte';
  import { runCommand } from './run';
  import {
    setListContext,
    allActions,
    hasSecondaryActions,
    type ItemEntry,
  } from './context';

  interface Props {
    placeholder: string;
    isLoading?: boolean;
    /** The input value — bindable so a module can rewrite it (e.g. clear on an @-command). */
    query?: string;
    header?: Snippet;
    /** Present → the module reacts to each keystroke (controlled). Absent → the module
     * just filters its own items off the bound query. */
    onSearchChange?: (query: string) => void;
    onRefresh?: () => void;
    /** Drop the row with this id — for `remove` actions that don't warrant a full refresh. */
    onRemove?: (id: string) => void;
    /** Reorder the existing rows in place — for `update` actions (e.g. pin/mute). */
    onUpdate?: () => void;
    /** Left-aligned footer text for this view, e.g. a result count. */
    footerInfo?: string;
    children: Snippet;
  }
  let {
    placeholder,
    isLoading = false,
    query = $bindable(''),
    header,
    onSearchChange,
    onRefresh,
    onRemove,
    onUpdate,
    footerInfo,
    children,
  }: Props = $props();

  const registry = new SvelteMap<string, ItemEntry>();
  let highlightedId = $state('');
  let inputRef = $state<HTMLInputElement | null>(null);
  let commandRoot = $state<ReturnType<typeof Command.Root> | null>(null);
  let actionsOpen = $state(false);
  // Not cleared on close, so the panel keeps its contents while it animates out
  // (hence panelEntry below isn't gated on actionsOpen).
  let actionTargetId = $state('');

  // Refocus the main input when the actions panel is closed.
  autofocus(
    () => inputRef,
    () => !actionsOpen,
  );

  const highlightedEntry = $derived(registry.get(highlightedId));
  const panelEntry = $derived(registry.get(actionTargetId));

  // Sync the shell footer for this view. Every view uses List, so mounting one
  // overwrites the previous view's values — no manual reset.
  $effect(() => {
    const actions = highlightedEntry?.actions;
    footer.primaryLabel = actions?.primary.title;
    footer.hasActions = !!actions && hasSecondaryActions(actions);
    footer.info = footerInfo;
  });

  // Own Escape only while the panel is open, so it closes before the shell steps back a view.
  $effect(() => {
    if (!actionsOpen) return;
    nav.setEscapeInterceptor(() => {
      closeActions();
      return true;
    });
    return () => nav.setEscapeInterceptor(null);
  });

  function openActions(id: string): void {
    const actions = registry.get(id)?.actions;
    if (!actions || !hasSecondaryActions(actions)) return;
    actionTargetId = id;
    // Pin the highlight to the panel's row so it's clear which item the panel acts on.
    highlightedId = id;
    actionsOpen = true;
  }

  function closeActions(): void {
    actionsOpen = false;
  }

  // The Popover dismisses on pointer-down, but the click would still run the row
  // beneath. Snapshot open-ness on pointer-down (capture, before the Popover
  // reacts) and swallow the resulting click; right-clicks fire no click, so they
  // still retarget. Assumes bits-ui dismisses on pointer-down, not click.
  let swallowNextClick = false;
  function armClickSwallow(): void {
    swallowNextClick = actionsOpen;
  }
  function swallowClickWhileDismissing(e: MouseEvent): void {
    if (!swallowNextClick) return;
    swallowNextClick = false;
    e.preventDefault();
    e.stopPropagation();
  }

  // Step the highlight off the row about to be removed, so selection and scroll
  // don't reset. Down, or up on the last row (which `loop` would wrap to the top);
  // bits-ui updates the bound `highlightedId`.
  function stepHighlightOffCurrent(): void {
    const items = commandRoot?.getValidItems() ?? [];
    if (items.length <= 1) return;
    const idx = items.findIndex((el) => el.hasAttribute('data-selected'));
    if (idx < 0) return;
    const atLast = idx === items.length - 1;
    commandRoot?.updateSelectedByItem(atLast ? -1 : 1);
  }

  // Run a row's command; if it removes the highlighted row, step off it first.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- rows hold heterogeneous subjects
  function runRow(command: PaletteCommand<any>, id: string): void {
    const entry = registry.get(id);
    if (!entry) return;
    const removing =
      command.run.kind === 'perform' && command.run.after === 'remove';
    if (removing && id === highlightedId) {
      stepHighlightOffCurrent();
    }
    void runCommand(command, entry.subject, {
      onRefresh,
      onRemove: () => onRemove?.(id),
      onUpdate,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- panel commands act on heterogeneous subjects
  function runFromPanel(command: PaletteCommand<any>): void {
    const id = actionTargetId;
    closeActions();
    runRow(command, id);
  }

  setListContext({
    register: (id, entry) => registry.set(id, entry),
    unregister: (id) => registry.delete(id),
    select: (id) => {
      const entry = registry.get(id);
      if (entry) runRow(entry.actions.primary, id);
    },
    openActions,
    runInline: (id, index) => {
      const command = registry.get(id)?.actions.inline?.[index]?.command;
      if (command) runRow(command, id);
    },
  });

  function onInput(value: string): void {
    query = value;
    onSearchChange?.(value);
  }

  function onKeydown(e: KeyboardEvent): void {
    if (matchesShortcut(e, OPEN_ACTIONS_SHORTCUT)) {
      e.preventDefault();
      if (highlightedId) openActions(highlightedId);
      return;
    }
    const entry = highlightedEntry;
    if (entry) {
      const match = matchAction(e, allActions(entry.actions));
      if (match) {
        e.preventDefault();
        runRow(match, highlightedId);
        return;
      }
    }
    tabNav(e, commandRoot);
  }
</script>

<Command.Root
  bind:this={commandRoot}
  shouldFilter={false}
  loop
  bind:value={highlightedId}
  disablePointerSelection={actionsOpen}
  onkeydown={onKeydown}
  onpointerdowncapture={armClickSwallow}
  onclickcapture={swallowClickWhileDismissing}
  class="command"
>
  {#if isLoading}
    <div class="header"><span class="loading">Loading…</span></div>
  {/if}

  <div class="input-row">
    {#if nav.canPop}
      <button
        type="button"
        class="back"
        aria-label="Back"
        onclick={() => nav.pop()}
      >
        <ArrowLeft size={18} />
      </button>
    {/if}
    <Command.Input
      bind:ref={inputRef}
      value={query}
      oninput={(e) => onInput(e.currentTarget.value)}
      {placeholder}
      class="input"
    />
    {#if header}{@render header()}{/if}
  </div>

  <Command.List class={actionsOpen ? 'list list--inert' : 'list'}>
    <Command.Empty class="empty">No results found</Command.Empty>
    {@render children()}
  </Command.List>
</Command.Root>

<!-- Rendered once a row is targeted; the Popover owns open/close. Keyed on the
     target so a right-click retarget remounts and replays the entry animation. -->
{#if actionTargetId && panelEntry}
  {#key actionTargetId}
    <ActionsPanel
      open={actionsOpen}
      actions={allActions(panelEntry.actions)}
      onRun={runFromPanel}
      onDismiss={closeActions}
    />
  {/key}
{/if}
