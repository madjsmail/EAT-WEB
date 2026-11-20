<script lang="ts">
	import { debounce } from '@tanstack/pacer';
	import { t } from '#lib/i18n/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { listAssets, type Asset } from '#lib/api/assets.js';
	import SearchSelect, { type SelectOption } from '#lib/components/domain/search-select.svelte';

	let {
		value = '',
		label,
		onchange,
		disabled = false
	}: {
		value?: string;
		label: string;
		onchange: (assetId: string) => void;
		disabled?: boolean;
	} = $props();

	let query = $state('');
	let assets = $state<Asset[]>([]);
	let chosen = $state<Asset | null>(null);

	const search = debounce(
		async (q: string) => {
			try {
				const result = await listAssets({ q, per_page: 25 });
				assets = result.items;
			} catch {
				// The select keeps the last known list; the server error surfaces on submit.
			}
		},
		{ wait: 250 }
	);

	$effect(() => {
		if (!disabled) void search(query);
	});

	$effect(() => {
		if (!value) {
			chosen = null;
			return;
		}
		const found = assets.find((asset) => asset.id === value);
		if (found) chosen = found;
	});

	const options = $derived<SelectOption[]>([
		...(chosen && !assets.some((asset) => asset.id === chosen?.id)
			? [
					{
						value: chosen.id,
						label: `${chosen.asset_tag} · ${chosen.name}`,
						keywords: [chosen.asset_tag, chosen.name]
					}
				]
			: []),
		...assets.map((asset) => ({
			value: asset.id,
			label: `${asset.asset_tag} · ${asset.name}`,
			keywords: [asset.asset_tag, asset.name]
		}))
	]);
</script>

<div class="flex flex-col gap-1.5">
	<Input
		class="h-9 text-sm"
		placeholder={t('assetSelect.search')}
		aria-label={t('userSelect.searchLabel', { label })}
		{disabled}
		bind:value={query}
	/>
	<SearchSelect
		aria-label={label}
		{value}
		{options}
		{disabled}
		allowClear
		allLabel={t('assetSelect.any')}
		{onchange}
	/>
</div>
