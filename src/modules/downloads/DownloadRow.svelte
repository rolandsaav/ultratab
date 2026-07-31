<script lang="ts">
  import File from '@lucide/svelte/icons/file';
  import type { DownloadEntry } from './parsers';
  let { item }: { item: DownloadEntry } = $props();
</script>

<span class="lead">
  <File class="favicon" />
</span>
<div class="text">
  <div class="title">{item.filename}</div>
  <div class="url">{item.path}</div>
</div>
