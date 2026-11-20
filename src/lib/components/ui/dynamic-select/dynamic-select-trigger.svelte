<script lang="ts">
	import { cn } from '#lib/utils.js';
	import * as Popover from '#lib/components/ui/popover/index.js';
	import { buttonVariants } from '#lib/components/ui/button/index.js';
	import { ChevronDown } from '@lucide/svelte';
	import { getDynamicSelectContext } from './ctx';
	import type { Snippet } from 'svelte';

	let {
		class: className,
		id,
		disabled = false,
		'aria-label': ariaLabel,
		'aria-required': ariaRequired,
		children
	}: {
		class?: string;
		id?: string;
		disabled?: boolean;
		'aria-label'?: string;
		'aria-required'?: boolean;
		children: Snippet;
	} = $props();
	const ctx = getDynamicSelectContext();
</script>

<Popover.Trigger
	class={cn(
		buttonVariants({ variant: 'outline' }),
		'w-full justify-between font-normal',
		className
	)}
	{id}
	{disabled}
	aria-label={ariaLabel}
	aria-required={ariaRequired}
>
	{#if ctx.label.value}
		<span class="truncate">{ctx.label.value}</span>
	{:else if ctx.value.value}
		<span class="truncate font-mono text-xs">{ctx.value.value}</span>
	{:else}
		{@render children()}
	{/if}
	<ChevronDown class="ms-2 size-4 shrink-0 opacity-50" />
</Popover.Trigger>
