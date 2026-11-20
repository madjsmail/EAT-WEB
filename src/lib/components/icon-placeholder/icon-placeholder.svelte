<script lang="ts">
	import CheckIcon from "@lucide/svelte/icons/check";
	import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
	import ChevronLeftIcon from "@lucide/svelte/icons/chevron-left";
	import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
	import ChevronUpIcon from "@lucide/svelte/icons/chevron-up";
	import MinusIcon from "@lucide/svelte/icons/minus";
	import SearchIcon from "@lucide/svelte/icons/search";
	import { cn } from "#lib/utils.js";

	const icons = {
		CheckIcon,
		ChevronDownIcon,
		ChevronLeftIcon,
		ChevronRightIcon,
		ChevronUpIcon,
		MinusIcon,
		SearchIcon,
	};

	let {
		lucide,
		class: className,
	}: {
		lucide?: keyof typeof icons;
		class?: string;
		// Alternate icon-set names are accepted for registry compatibility; only lucide renders.
		tabler?: string;
		hugeicons?: string;
		phosphor?: string;
		remixicon?: string;
	} = $props();

	const Icon = $derived(lucide ? icons[lucide] : undefined);
</script>

{#if Icon}
	<Icon class={cn("size-4", className)} />
{/if}
