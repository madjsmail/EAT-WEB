<!-- Expand/collapse toggle rendered for grouped cells, with the cell's normal
  content and the sub-row count inline. -->
<script lang="ts">
	import ChevronDown from "@lucide/svelte/icons/chevron-down";
	import ChevronRight from "@lucide/svelte/icons/chevron-right";
	import { Button } from "#lib/components/ui/button/index.js";
	import { useCellContext } from "#lib/hooks/table.svelte.js";

	const cell = useCellContext();
	const row = $derived(cell.row);
</script>

<Button
	variant="ghost"
	size="sm"
	class="h-7 gap-1 pe-2"
	onclick={row.getToggleExpandedHandler()}
	disabled={!row.getCanExpand()}
	style={`padding-inline-start: calc(${row.depth} * 1.5rem + 0.5rem)`}
>
	{#if row.getIsExpanded()}
		<ChevronDown class="size-4 rtl:rotate-180" />
	{:else}
		<ChevronRight class="size-4 rtl:rotate-180" />
	{/if}
	<cell.FlexRender {cell} />
	<span class="text-muted-foreground">({row.subRows.length})</span>
</Button>
