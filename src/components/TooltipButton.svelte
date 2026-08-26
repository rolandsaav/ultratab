<script lang="ts">
  import { Tooltip } from 'bits-ui';
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  type Props = {
    label: string;
    children: Snippet;
    side?: 'top' | 'right' | 'bottom' | 'left';
    type?: HTMLButtonAttributes['type'];
    class?: HTMLButtonAttributes['class'];
    'aria-pressed'?: HTMLButtonAttributes['aria-pressed'];
    onclick?: HTMLButtonAttributes['onclick'];
  };

  let {
    label,
    children,
    side = 'top',
    type = 'button',
    class: className,
    'aria-pressed': ariaPressed,
    onclick,
  }: Props = $props();
</script>

<Tooltip.Root>
  <Tooltip.Trigger
    {type}
    class={className}
    aria-label={label}
    aria-pressed={ariaPressed}
    {onclick}
  >
    {@render children()}
  </Tooltip.Trigger>
  <Tooltip.Portal>
    <Tooltip.Content class="tooltip" {side} sideOffset={6}>
      {label}
    </Tooltip.Content>
  </Tooltip.Portal>
</Tooltip.Root>
