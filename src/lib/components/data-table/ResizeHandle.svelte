<script lang="ts">
	import { useHeaderContext } from "#lib/hooks/table.svelte.js";
	import { cn } from "#lib/utils.js";

	const header = useHeaderContext();
</script>

{#if header.column.getCanResize()}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		ondblclick={() => header.column.resetSize()}
		onmousedown={header.getResizeHandler()}
		ontouchstart={header.getResizeHandler()}
		class={cn(
			"absolute end-[-2px] top-1/2 z-10 h-6 w-[3px] -translate-y-1/2 cursor-e-resize touch-none select-none rounded-md transition-colors before:absolute before:-inset-x-1 before:inset-y-0 before:content-[''] hover:bg-primary/60",
			header.column.getIsResizing() && "bg-primary",
		)}
	></div>
{/if}
