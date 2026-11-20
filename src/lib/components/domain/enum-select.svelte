<script lang="ts">
	import * as Select from '#lib/components/ui/select/index.js';
	import type { SelectOption } from './search-select.svelte';

	let {
		value = '',
		options,
		id,
		placeholder = '—',
		clearLabel,
		disabled = false,
		required = false,
		onchange,
		class: className,
		'aria-label': ariaLabel
	}: {
		value?: string;
		options: SelectOption[];
		id?: string;
		placeholder?: string;
		clearLabel?: string;
		disabled?: boolean;
		required?: boolean;
		onchange?: (value: string) => void;
		class?: string;
		'aria-label'?: string;
	} = $props();

	const ALL = '__all';
	const selected = $derived(value === '' ? ALL : value);

	function change(next: string): void {
		onchange?.(next === ALL ? '' : next);
	}
</script>

<Select.Root type="single" value={selected} onValueChange={change}>
	<Select.Trigger
		{id}
		{disabled}
		aria-required={required}
		aria-label={ariaLabel}
		class={className ?? 'h-9 w-full'}
	>
		<Select.Value {placeholder} />
	</Select.Trigger>
	<Select.Content>
		{#if clearLabel}
			<Select.Item value={ALL} label={clearLabel}>{clearLabel}</Select.Item>
		{/if}
		{#each options as option (option.value)}
			<Select.Item value={option.value} label={option.label}>{option.label}</Select.Item>
		{/each}
	</Select.Content>
</Select.Root>
