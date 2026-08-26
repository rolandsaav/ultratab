<script lang="ts" generics="T, S = T">
  import { onMount, tick, type Snippet } from 'svelte';
  import { SvelteMap } from 'svelte/reactivity';
  import { get } from 'svelte/store';
  import { createVirtualizer } from '@tanstack/svelte-virtual';
  import type { OverlayScrollbars } from 'overlayscrollbars';
  import { useOverlayScrollbars } from 'overlayscrollbars-svelte';
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import type { Command as PaletteCommand } from '../../commands/command';
  import { nav } from '../nav.svelte';
  import { footer } from '../footer.svelte';
  import {
    autofocus,
    matchAction,
    matchesShortcut,
    OPEN_ACTIONS_SHORTCUT,
  } from '../../components/utils.svelte';
  import ActionsPanel from '../../components/ActionsPanel.svelte';
  import { runCommand } from './run';
  import ListItem from './ListItem.svelte';
  import TooltipButton from '../../components/TooltipButton.svelte';
  import { allActions, hasSecondaryActions, type RowActions } from './context';

  const OVERSCAN = 6;

  interface Props {
    items: T[];
    getId: (item: T) => string;
    getActions: (item: T) => RowActions<S>;
    getSubject?: (item: T) => S;
    getTrailingLabel?: (item: T) => string | undefined;
    getRowClass?: (item: T) => string | undefined;
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
    row: Snippet<[T]>;
  }

  let {
    items,
    getId,
    getActions,
    getSubject,
    getTrailingLabel,
    getRowClass,
    placeholder,
    isLoading = false,
    query = $bindable(''),
    header,
    onSearchChange,
    onRefresh,
    onRemove,
    onUpdate,
    footerInfo,
    row,
  }: Props = $props();

  let highlightedIndex = $state(0);
  let inputRef = $state<HTMLInputElement | null>(null);
  let listRef = $state<HTMLDivElement | null>(null);
  let scrollRef = $state<HTMLElement | null>(null);
  let measuredListRef = $state<HTMLDivElement | null>(null);
  let rowHeight = $state(1);
  let actionsOpen = $state(false);
  // Kept after close so the panel retains its contents while it animates out.
  let actionTargetId = $state('');

  const virtualizer = createVirtualizer<HTMLElement, HTMLDivElement>({
    count: 0,
    getScrollElement: () => scrollRef ?? listRef,
    estimateSize: () => rowHeight,
    overscan: OVERSCAN,
  });

  const indexById = $derived.by(() => {
    const map = new SvelteMap<string, number>();
    items.forEach((item, index) => map.set(getId(item), index));
    return map;
  });
  const highlightedItem = $derived(items[highlightedIndex]);
  const highlightedId = $derived(idForItem(highlightedItem));
  const highlightedActions = $derived(actionsForItem(highlightedItem));
  const actionTargetIndex = $derived(indexById.get(actionTargetId));
  const panelItem = $derived(itemAt(actionTargetIndex));
  const panelActions = $derived(actionsForItem(panelItem));
  const activeDescendant = $derived(activeDescendantId());
  const overlayScrollbarOptions = {
    scrollbars: {
      autoHide: 'scroll',
    },
  } as const;
  const [initializeOverlayScrollbars] = useOverlayScrollbars({
    options: () => overlayScrollbarOptions,
    events: () => ({
      initialized: onOverlayScrollbarsInitialized,
    }),
    defer: () => true,
  });

  // Refocus the main input when the actions panel is closed.
  autofocus(
    () => inputRef,
    () => !actionsOpen,
  );

  $effect(() => {
    const node = listRef;
    if (!node || node === measuredListRef) return;
    measuredListRef = node;
    rowHeight = measureCssLength(node, '--st-row-height');
  });

  $effect(() => {
    const instance = get(virtualizer);
    instance.setOptions({
      count: items.length,
      getScrollElement: () => scrollRef ?? listRef,
      estimateSize: () => rowHeight,
      overscan: OVERSCAN,
    });
    instance.measure();
  });

  $effect(() => {
    if (items.length === 0) {
      highlightedIndex = 0;
      return;
    }
    if (highlightedIndex >= items.length) {
      highlightedIndex = items.length - 1;
      void tick().then(() =>
        get(virtualizer).scrollToIndex(highlightedIndex, { align: 'auto' }),
      );
    }
  });

  // Sync the shell footer for this view. Every view uses List, so mounting one
  // overwrites the previous view's values — no manual reset.
  $effect(() => {
    footer.primaryLabel = highlightedActions?.primary.title;
    footer.hasActions =
      !!highlightedActions && hasSecondaryActions(highlightedActions);
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

  onMount(() => {
    if (listRef) initializeOverlayScrollbars({ target: listRef });
  });

  function onOverlayScrollbarsInitialized(instance: OverlayScrollbars): void {
    scrollRef = instance.elements().viewport;
  }

  function scrollToHighlighted(): void {
    if (items.length === 0) return;
    get(virtualizer).scrollToIndex(highlightedIndex, { align: 'auto' });
  }

  function measureCssLength(scope: HTMLElement, property: string): number {
    const probe = document.createElement('div');
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.pointerEvents = 'none';
    probe.style.height = `var(${property})`;
    scope.append(probe);
    const height = probe.getBoundingClientRect().height;
    probe.remove();
    return height || rowHeight;
  }

  function itemAt(index: number | undefined): T | undefined {
    if (index == null) return undefined;
    return items[index];
  }

  function idForItem(item: T | undefined): string {
    if (!item) return '';
    return getId(item);
  }

  function actionsForItem(item: T | undefined): RowActions<S> | undefined {
    if (!item) return undefined;
    return getActions(item);
  }

  function activeDescendantId(): string | undefined {
    if (items.length === 0) return undefined;
    return `palette-option-${highlightedIndex}`;
  }

  function setHighlightedIndex(index: number): void {
    if (items.length === 0) {
      highlightedIndex = 0;
      return;
    }
    highlightedIndex = ((index % items.length) + items.length) % items.length;
    scrollToHighlighted();
  }

  export function resetToTop(): void {
    highlightedIndex = 0;
    get(virtualizer).scrollToIndex(0);
  }

  export function focusInput(): void {
    inputRef?.focus({ preventScroll: true });
  }

  function openActions(id: string): void {
    const index = indexById.get(id);
    const item = itemAt(index);
    const actions = actionsForItem(item);
    if (!actions || !hasSecondaryActions(actions)) return;
    actionTargetId = id;
    if (index != null) highlightedIndex = index;
    actionsOpen = true;
  }

  function closeActions(): void {
    actionsOpen = false;
  }

  // The Popover dismisses on pointer-down, but the click would still run the row
  // beneath — swallow it. Right-clicks fire no click, so they still retarget.
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

  // Run a row's command; removals keep the current index so the replacement row
  // takes over the highlight, while the clamp effect handles deleting the tail row.
  function subjectFor(item: T): S {
    if (getSubject) return getSubject(item);
    return item as unknown as S;
  }

  function runRow(command: PaletteCommand<S>, item: T): void {
    const id = getId(item);
    void runCommand(command, subjectFor(item), {
      onRefresh,
      onRemove: () => onRemove?.(id),
      onUpdate,
    });
  }

  function runFromPanel(command: PaletteCommand<S>): void {
    const item = panelItem;
    closeActions();
    if (item) runRow(command, item);
  }

  function onInput(value: string): void {
    query = value;
    resetToTop();
    onSearchChange?.(value);
  }

  function onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Backspace' && !e.repeat && query === '') {
      e.preventDefault();
      nav.escape();
      return;
    }

    if (matchesShortcut(e, OPEN_ACTIONS_SHORTCUT)) {
      e.preventDefault();
      if (highlightedId) openActions(highlightedId);
      return;
    }

    if (highlightedActions) {
      const match = matchAction(e, allActions(highlightedActions));
      if (match && highlightedItem) {
        e.preventDefault();
        runRow(match, highlightedItem);
        return;
      }
    }

    if (e.key === 'Tab' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(highlightedIndex + keyboardDelta(e));
      return;
    }

    if (e.key === 'Home') {
      e.preventDefault();
      setHighlightedIndex(0);
      return;
    }

    if (e.key === 'End') {
      e.preventDefault();
      setHighlightedIndex(items.length - 1);
      return;
    }

    if (e.key === 'Enter' && highlightedItem && highlightedActions) {
      e.preventDefault();
      runRow(highlightedActions.primary, highlightedItem);
    }
  }

  function keyboardDelta(e: KeyboardEvent): number {
    if (e.key === 'ArrowUp' || e.shiftKey) return -1;
    return 1;
  }

  function rowClass(item: T): string | undefined {
    return getRowClass?.(item);
  }

  function trailingLabel(item: T): string | undefined {
    return getTrailingLabel?.(item);
  }
</script>

<div
  class="command"
  onpointerdowncapture={armClickSwallow}
  onclickcapture={swallowClickWhileDismissing}
>
  {#if isLoading}
    <div class="header"><span class="loading">Loading…</span></div>
  {/if}

  <div class="input-row">
    {#if nav.canPop}
      <TooltipButton
        type="button"
        class="back"
        label="Back"
        side="bottom"
        onclick={() => nav.pop()}
      >
        <ArrowLeft size={18} />
      </TooltipButton>
    {/if}
    <input
      bind:this={inputRef}
      role="combobox"
      aria-expanded="true"
      aria-controls="palette-list"
      aria-activedescendant={activeDescendant}
      value={query}
      oninput={(e) => onInput(e.currentTarget.value)}
      onkeydown={onKeydown}
      {placeholder}
      class="input"
    />
    {#if header}{@render header()}{/if}
  </div>

  <div
    bind:this={listRef}
    id="palette-list"
    role="listbox"
    class="list"
    class:list--inert={actionsOpen}
    class:list--empty={items.length === 0}
  >
    {#if items.length === 0}
      <div class="empty">No results found</div>
    {:else}
      <div
        class="virtual-space"
        style={`height: ${$virtualizer.getTotalSize()}px;`}
      >
        {#each $virtualizer.getVirtualItems() as virtualRow (virtualRow.key)}
          {@const item = items[virtualRow.index]}
          {#if item !== undefined}
            {@const id = getId(item)}
            {@const actions = getActions(item)}
            {@const trailing = trailingLabel(item)}
            <ListItem
              {id}
              domId={`palette-option-${virtualRow.index}`}
              {actions}
              trailingLabel={trailing}
              selected={virtualRow.index === highlightedIndex}
              rowClass={rowClass(item)}
              style={`transform: translateY(${virtualRow.start}px);`}
              onSelect={() => runRow(actions.primary, item)}
              onHighlight={() => {
                if (actionsOpen) return;
                highlightedIndex = virtualRow.index;
              }}
              onOpenActions={() => openActions(id)}
              onRunInline={(index) => {
                const command = actions.inline?.[index]?.command;
                if (command) runRow(command, item);
              }}
            >
              {@render row(item)}
            </ListItem>
          {/if}
        {/each}
      </div>
    {/if}
  </div>
</div>

<!-- Keyed on the target so a right-click retarget remounts and replays the animation. -->
{#if actionTargetId && panelActions}
  {#key actionTargetId}
    <ActionsPanel
      open={actionsOpen}
      actions={allActions(panelActions)}
      onRun={runFromPanel}
      onDismiss={closeActions}
    />
  {/key}
{/if}
