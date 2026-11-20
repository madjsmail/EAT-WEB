<script lang="ts">
	import { onMount } from 'svelte';
	import { t } from '#lib/i18n/index.js';
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

	let assets = $state<Asset[]>([]);
	let chosen = $state<Asset | null>(null);

	async function load() {
		try {
			const result = await listAssets({ per_page: 50 });
			assets = result.items;
		} catch {
			// The select keeps the last known list; the server error surfaces on submit.
		}
	}

	onMount(() => {
		void load();
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
