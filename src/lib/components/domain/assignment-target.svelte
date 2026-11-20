<script lang="ts">
	import { Field, FieldDescription, FieldLabel } from '#lib/components/ui/field/index.js';
	import { t } from '#lib/i18n/index.js';
	import type { Asset } from '#lib/api/assets.js';
	import SearchSelect, { type SelectOption } from '#lib/components/domain/search-select.svelte';
	import UserSelect from '#lib/components/domain/user-select.svelte';

	let {
		target = $bindable<'user' | 'asset'>('user'),
		userId = $bindable(''),
		assetId = $bindable(''),
		assets,
		disabled = false
	}: {
		target?: 'user' | 'asset';
		userId?: string;
		assetId?: string;
		assets: Asset[];
		disabled?: boolean;
	} = $props();

	const uid = $props.id();
	const assetChoices = $derived<SelectOption[]>(
		assets.map((asset) => ({
			value: asset.id,
			label: `${asset.name} · ${asset.asset_tag}`,
			keywords: [asset.name, asset.asset_tag]
		}))
	);
	const options = [
		{ value: 'user', labelKey: 'target.employee' },
		{ value: 'asset', labelKey: 'target.asset' }
	] as const;
</script>

<div class="flex flex-col gap-3">
	<div class="flex flex-col gap-1.5">
		<span class="text-sm font-medium">{t('target.label')}</span>
		<div
			class="inline-flex w-fit rounded-md border p-0.5"
			role="group"
			aria-label={t('target.label')}
		>
			{#each options as option (option.value)}
				<button
					type="button"
					class="rounded-sm px-3 py-1 text-sm transition-colors {target === option.value
						? 'bg-primary text-primary-foreground'
						: 'text-muted-foreground hover:text-foreground'}"
					aria-pressed={target === option.value}
					{disabled}
					onclick={() => (target = option.value)}
				>
					{t(option.labelKey)}
				</button>
			{/each}
		</div>
	</div>

	{#if target === 'user'}
		<Field>
			<FieldLabel for="{uid}-user">{t('target.userId')}</FieldLabel>
			<UserSelect
				label={t('target.userId')}
				value={userId}
				onchange={(id) => (userId = id)}
				{disabled}
			/>
			<FieldDescription>{t('target.userHint')}</FieldDescription>
		</Field>
	{:else}
		<Field>
			<FieldLabel for="{uid}-asset">{t('target.asset')}</FieldLabel>
			<SearchSelect
				id="{uid}-asset"
				bind:value={assetId}
				options={assetChoices}
				{disabled}
				required
				allowClear
				allLabel="—"
				aria-label={t('target.asset')}
			/>
			<FieldDescription>{t('target.assetHint')}</FieldDescription>
		</Field>
	{/if}
</div>
