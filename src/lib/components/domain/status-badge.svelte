<script lang="ts">
	let { name, color }: { name?: string | null; color?: string | null } = $props();
</script>

<span class="inline-flex items-center gap-1.5 text-sm">
	<span
		class="size-2 shrink-0 rounded-full ring-1 ring-black/10"
		class:bg-muted={!color}
		style:background-color={color ?? undefined}
	></span>
	{name ?? '—'}
</span>
