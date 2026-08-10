<script lang="ts">
  import { onMount, tick } from 'svelte';
  import List from '../../shell/list/List.svelte';
  import SourceIcons from './SourceIcons.svelte';
  import ItemRow from './ItemRow.svelte';
  import { searchApi } from './api';
  import { rank } from './ranking';
  import { commandsForItem } from './commands';
  import {
    searchPlaceholder,
    parseSourceCommand,
    sourceRowLabel,
  } from './sources';
  import { status, toMessage } from '../../shell/status.svelte';
  import { warm } from './warm.svelte';
  import type { Item, Kind, SourceToggles } from './parsers';

  const DEFAULT_TOGGLES: SourceToggles = {
    tab: true,
    bookmark: true,
    history: true,
  };

  /* Seeded (copied, so in-place edits never write through) from the warm snapshot, so a
   * reopen shows the last results right away, not an empty list that grows on first query. */
  let items = $state<Item[]>([...warm.items]);
  let enabled = $state.raw<SourceToggles>({ ...DEFAULT_TOGGLES });
  let query = $state('');
  let list = $state<List<Item> | null>(null);
  let reqSeq = 0;

  const placeholder = $derived(searchPlaceholder(enabled));
  const resultCount = $derived(
    `${items.length} ${items.length === 1 ? 'result' : 'results'}`,
  );

  /* The default view — empty query, default sources — is all an open renders, so its
   * results are the only ones worth keeping warm for the next open. */
  const isDefaultView = (text: string, toggles: SourceToggles): boolean =>
    text === '' &&
    (Object.keys(DEFAULT_TOGGLES) as Kind[]).every(
      (kind) => toggles[kind] === DEFAULT_TOGGLES[kind],
    );
  // Refresh the background cache on entry, then show the initial (empty-query) results.
  onMount(refresh);

  async function runQuery(
    next: string,
    toggles = enabled,
    resetSelection = false,
  ): Promise<void> {
    status.error = '';
    const id = ++reqSeq;
    try {
      const { reqId, items: results } = await searchApi.query(
        next,
        toggles,
        id,
      );
      if (reqId !== reqSeq) return; // superseded by a newer query
      items = results;
      if (resetSelection) {
        await tick();
        list?.resetToTop();
      }
      if (isDefaultView(next, toggles)) warm.items = results;
    } catch (e) {
      if (id === reqSeq) status.error = toMessage(e, 'Search failed');
    }
  }

  // Drop the background cache so the next query refetches, surfacing any failure.
  function invalidate(): Promise<void> {
    return searchApi.prepare().catch((e) => {
      status.error = toMessage(e, 'Failed to refresh');
    });
  }

  // Invalidate then re-query — on entry and after an action that keeps the row (e.g. mute).
  function refresh(): void {
    void invalidate().then(() => runQuery(query));
  }

  // Drop a closed row in place instead of re-querying, keeping order/scroll/highlight;
  // invalidate the cache so a later query omits it.
  function remove(id: string): void {
    items = items.filter((item) => item.id !== id);
    void invalidate();
  }

  // Re-rank after an optimistic pin/mute so the row moves without a refetch.
  function update(): void {
    items = rank([...items], query);
    void invalidate();
  }

  // A lone @-command enables its source and clears the input, then re-queries the
  // now-empty input (not the stale @-text) so recent results show.
  function onInput(value: string): void {
    query = value;
    const kind = parseSourceCommand(value);
    if (kind) {
      const next = enabled[kind] ? enabled : { ...enabled, [kind]: true };
      enabled = next;
      query = '';
      void runQuery('', next, true);
      return;
    }
    void runQuery(value);
  }

  // Toggle a source, but never disable the last one. Re-query so a newly-enabled
  // source is fetched (the background fills it lazily) or a disabled one drops out.
  function toggle(kind: Kind): void {
    const onCount = Object.values(enabled).filter(Boolean).length;
    if (enabled[kind] && onCount === 1) return;
    const next = { ...enabled, [kind]: !enabled[kind] };
    enabled = next;
    void runQuery(query, next, true);
  }
</script>

<List
  bind:this={list}
  {items}
  getId={(item) => item.id}
  getActions={commandsForItem}
  getTrailingLabel={sourceRowLabel}
  getRowClass={(item) => (item.active ? 'current' : undefined)}
  bind:query
  {placeholder}
  footerInfo={resultCount}
  onSearchChange={onInput}
  onRefresh={refresh}
  onRemove={remove}
  onUpdate={update}
>
  {#snippet header()}
    <SourceIcons {enabled} onToggle={toggle} />
  {/snippet}
  {#snippet row(item)}
    <ItemRow {item} />
  {/snippet}
</List>
