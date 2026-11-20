<script lang="ts">
	import * as DynamicSelect from '#lib/components/ui/dynamic-select/index.js';
	import { t } from '#lib/i18n/index.js';

	export interface SelectOption {
		value: string;
		label: string;
		keywords?: string[];
	}

	let {
		value = $bindable(''),
		options,
		placeholder = t('dynamicSelect.select'),
		allLabel = t('dynamicSelect.all'),
		allowClear = false,
		disabled = false,
		required = false,
		name,
		id,
		'onchange': onchange,
		'aria-label': ariaLabel
	}: {
		value?: string;
		options: SelectOption[];
		placeholder?: string;
		allLabel?: string;
		allowClear?: boolean;
		disabled?: boolean;
		required?: boolean;
		name?: string;
		id?: string;
		onchange?: (value: string) => void;
		'aria-label'?: string;
	} = $props();

	const selected = $derived(options.find((option) => option.value === value) ?? null);
	const display = $derived(selected?.label ?? (allowClear && !value ? allLabel : ''));

	let previous = value;

	// A hidden input keeps native form validation and FormData working.
	$effect(() => {
		if (value === previous) return;
		previous = value;
		onchange?.(value);
	});
</script>

{#if name}
	<input type="hidden" {name} {value} />
{/if}

<DynamicSelect.Root bind:value label={display}>
	<DynamicSelect.Trigger {id} {disabled} aria-required={required} aria-label={ariaLabel}>
		{placeholder}
	</DynamicSelect.Trigger>
	<DynamicSelect.Content>
		{#if allowClear}
			<DynamicSelect.Item value="" keywords={[allLabel]}>{allLabel}</DynamicSelect.Item>
		{/if}
		{#each options as option (option.value)}
			<DynamicSelect.Item
				value={option.value}
				keywords={option.keywords ?? [option.label]}
			>
				{option.label}
			</DynamicSelect.Item>
		{/each}
	</DynamicSelect.Content>
</DynamicSelect.Root>
