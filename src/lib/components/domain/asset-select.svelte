<script lang="ts">
	import { debounce } from '@tanstack/pacer';
	import { t } from '#lib/i18n/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { listAssets, type Asset } from '#lib/api/assets.js';

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
	let selected = $state<Asset | null>(null);

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
		if (!value) selected = null;
		else if (selected?.id !== value) {
			selected = assets.find((asset) => asset.id === value) ?? selected;
		}
	});
</script>

<div class="flex flex-col gap-1.5">
	<Input
		class="h-9 text-sm"
		placeholder={t('assetSelect.search')}
		aria-label={t('userSelect.searchLabel', { label })}
		{disabled}
		bind:value={query}
	/>
	<select
		class="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
		aria-label={label}
		{disabled}
		{value}
		onchange={(event: Event & { currentTarget: HTMLSelectElement }) =>
			onchange(event.currentTarget.value)}
	>
		<option value="">{t('assetSelect.any')}</option>
		{#if selected && !assets.some((asset) => asset.id === selected?.id)}
			<option value={selected.id}>{selected.asset_tag} · {selected.name}</option>
		{/if}
		{#each assets as asset (asset.id)}
			<option value={asset.id}>{asset.asset_tag} · {asset.name}</option>
		{/each}
	</select>
</div>
