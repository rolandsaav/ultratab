<script lang="ts" generics="T">
  import type { Snippet } from 'svelte';
  import { cubicOut } from 'svelte/easing';
  import type { TransitionConfig } from 'svelte/transition';
  import type { RowActions } from './context';
  import TooltipButton from '../../components/TooltipButton.svelte';

  interface Props {
    id: string;
    domId?: string;
    actions: RowActions<T>;
    trailingLabel?: string;
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
    trailingLabel,
    selected = false,
    rowClass,
    style,
    onSelect,
    onHighlight,
    onOpenActions,
    onRunInline,
    children,
  }: Props = $props();

  const hasPersistentAction = $derived(
    actions.inline?.some((action) => action.persistent) ?? false,
  );

  function blurSwap(_: Element): TransitionConfig {
    const reduceMotion = globalThis.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    return {
      duration: reduceMotion ? 0 : 180,
      easing: cubicOut,
      css: (t) => `opacity: ${t}; filter: blur(${(1 - t) * 3}px);`,
    };
  }
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
  class={[
    'item virtual-item',
    rowClass,
    trailingLabel && 'item--with-trailing-label',
    hasPersistentAction && 'item--with-persistent-action',
  ]}
  {style}
>
  {@render children()}
  {#if trailingLabel || actions.inline}
    <div class="row-trailing">
      {#if trailingLabel}
        <span class="trailing-label">{trailingLabel}</span>
      {/if}
      {#if actions.inline}
        <div class="controls row-controls">
          {#each actions.inline as action, i (action.slot ?? action.command.id)}
            {@const Icon = action.icon ?? action.command.icon}
            <TooltipButton
              type="button"
              class={['control item-action', action.persistent && 'persistent']}
              label={action.command.title}
              onclick={(e) => {
                e.stopPropagation();
                onRunInline(i);
              }}
            >
              {#if action.blurIcon}
                <span class="control-icon-stack">
                  {#key action.command.id}
                    <span class="control-icon-state" transition:blurSwap>
                      {#if action.hoverIcon}
                        {@const HoverIcon = action.hoverIcon}
                        <Icon class="control-icon control-icon--rest" />
                        <HoverIcon class="control-icon control-icon--hover" />
                      {:else}
                        <Icon />
                      {/if}
                    </span>
                  {/key}
                </span>
              {:else if action.hoverIcon}
                {@const HoverIcon = action.hoverIcon}
                <Icon class="control-icon control-icon--rest" />
                <HoverIcon class="control-icon control-icon--hover" />
              {:else}
                <Icon />
              {/if}
            </TooltipButton>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>
