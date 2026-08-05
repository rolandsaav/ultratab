<script lang="ts">
  import List from './list/List.svelte';
  import CommandRow from './CommandRow.svelte';
  import { COMMANDS } from '../commands/registry';
  import { order } from '../lib/fuzzy';
  import type { Command } from '../commands/command';

  let query = $state('');

  function textFor(command: Command): string {
    return [command.title, ...(command.keywords ?? [])].join(' ');
  }

  const visible = $derived.by(() => {
    if (!query.trim()) return COMMANDS;
    return order(COMMANDS.map(textFor), query).map((index) => COMMANDS[index]);
  });
</script>

<List
  items={visible}
  getId={(command) => command.id}
  getActions={(command) => ({ primary: command })}
  getSubject={() => undefined}
  bind:query
  placeholder="Search for commands…"
>
  {#snippet row(command)}
    <CommandRow {command} />
  {/snippet}
</List>
