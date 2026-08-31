<script lang="ts">
  import { Tooltip } from 'bits-ui';
  import type { Snippet } from 'svelte';

  type Props = Omit<
    Tooltip.TriggerProps,
    'aria-label' | 'child' | 'children'
  > & {
    label: string;
    children: Snippet;
    side?: Tooltip.ContentProps['side'];
  };

  let {
    label,
    children,
    side = 'top',
    type = 'button',
    ...buttonProps
  }: Props = $props();
</script>

<Tooltip.Root>
  <Tooltip.Trigger {type} {...buttonProps} aria-label={label}>
    {@render children()}
  </Tooltip.Trigger>
  <Tooltip.Portal>
    <Tooltip.Content class="tooltip" {side} sideOffset={6}>
      {label}
    </Tooltip.Content>
  </Tooltip.Portal>
</Tooltip.Root>
