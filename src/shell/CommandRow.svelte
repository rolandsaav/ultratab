<script lang="ts">
  import type { Command } from '../commands/command';
  let { command }: { command: Command } = $props();
  const Icon = $derived(command.icon);
</script>

<span class="lead">
  <Icon class="favicon fallback-icon" />
</span>
<div class="text">
  <div class="title">{command.title}</div>
</div>
