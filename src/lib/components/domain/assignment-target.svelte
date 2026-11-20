<script lang="ts">
	import { Field, FieldDescription, FieldLabel } from '#lib/components/ui/field/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { t } from '#lib/i18n/index.js';
	import type { Asset } from '#lib/api/assets.js';

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
			<Input
				id="{uid}-user"
				placeholder="UUID"
				required
				{disabled}
				value={userId}
				oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
					(userId = event.currentTarget.value)}
			/>
			<FieldDescription>{t('target.userHint')}</FieldDescription>
		</Field>
	{:else}
		<Field>
			<FieldLabel for="{uid}-asset">{t('target.asset')}</FieldLabel>
			<select
				id="{uid}-asset"
				class="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
				required
				{disabled}
				value={assetId}
				onchange={(event: Event & { currentTarget: HTMLSelectElement }) =>
					(assetId = event.currentTarget.value)}
			>
				<option value="">—</option>
				{#each assets as asset (asset.id)}
					<option value={asset.id}>
						{asset.name} · {asset.asset_tag}
					</option>
				{/each}
			</select>
			<FieldDescription>{t('target.assetHint')}</FieldDescription>
		</Field>
	{/if}
</div>
