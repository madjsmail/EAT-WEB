<script lang="ts">
	import { cn } from '#lib/utils.js';
	import * as Command from '#lib/components/ui/command/index.js';
	import { Check } from '@lucide/svelte';
	import { getDynamicSelectContext } from './ctx';
	import type { Snippet } from 'svelte';

	let {
		value,
		keywords = [],
		children
	}: { value: string; keywords?: string[]; children: Snippet } = $props();
	const ctx = getDynamicSelectContext();
	const isSelected = $derived(ctx.value.value === value);
</script>

<Command.Item
	{value}
	{keywords}
	onSelect={() => ctx.setValue(value)}
	class="flex cursor-pointer items-center justify-between"
>
	{@render children()}
	<Check class={cn('ms-2 size-4 shrink-0', isSelected ? 'opacity-100' : 'opacity-0')} />
</Command.Item>
