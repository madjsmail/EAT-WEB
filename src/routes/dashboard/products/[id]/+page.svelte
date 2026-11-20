<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import { ApiError } from '#lib/api/client.js';
	import { getProduct, type Product } from '#lib/api/products.js';
	import { resolveI18n, t } from '#lib/i18n/index.js';
	import { session } from '#lib/stores/session.svelte.js';
	import { formatDate, formatNumber } from '#lib/utils.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import AttachmentPanel from '#lib/components/domain/attachment-panel.svelte';

	const id = $derived(page.params.id ?? '');
	let product = $state<Product | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	async function load() {
		loading = true;
		error = null;
		try {
			product = await getProduct(id);
		} catch (cause) {
			error =
				cause instanceof ApiError && cause.status > 0 ? cause.message : t('auth.genericError');
		} finally {
			loading = false;
		}
	}

	onMount(load);
</script>

<svelte:head>
	<title>{product?.name ?? t('product.detailTitle')} · EAT</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<a
		class="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
		href={resolve('/dashboard/products')}
	>
		<ArrowLeftIcon class="size-4" />
		{t('product.backToList')}
	</a>

	{#if loading}
		<div class="flex flex-col gap-2">
			<Skeleton class="h-8 w-64" />
			<Skeleton class="h-40 w-full" />
		</div>
	{:else if error}
		<section class="rounded-lg border bg-card p-6">
			<p class="text-sm text-destructive">{error}</p>
			<Button class="mt-3" variant="outline" size="sm" onclick={load}>{t('table.retry')}</Button>
		</section>
	{:else if product}
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-semibold tracking-tight">
				{resolveI18n(product.translations, undefined, product.name)}
			</h1>
			<p class="font-mono text-sm text-muted-foreground">{product.code}</p>
		</div>

		<section class="rounded-lg border bg-card p-6">
			<dl class="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
				<div class="flex flex-col gap-1">
					<dt class="text-xs text-muted-foreground">{t('product.category')}</dt>
					<dd>{product.category_name ?? '—'}</dd>
				</div>
				<div class="flex flex-col gap-1">
					<dt class="text-xs text-muted-foreground">{t('product.manufacturer')}</dt>
					<dd>{product.manufacturer_name ?? '—'}</dd>
				</div>
				<div class="flex flex-col gap-1">
					<dt class="text-xs text-muted-foreground">{t('product.modelCode')}</dt>
					<dd>{product.model_code ?? '—'}</dd>
				</div>
				<div class="flex flex-col gap-1">
					<dt class="text-xs text-muted-foreground">{t('product.defaultCost')}</dt>
					<dd>
						{product.default_purchase_cost == null
							? '—'
							: formatNumber(Number(product.default_purchase_cost), {
									style: 'currency',
									currency: product.default_currency
								})}
					</dd>
				</div>
				<div class="flex flex-col gap-1">
					<dt class="text-xs text-muted-foreground">{t('product.minQuantity')}</dt>
					<dd>{product.min_quantity}</dd>
				</div>
				<div class="flex flex-col gap-1">
					<dt class="text-xs text-muted-foreground">{t('product.eolDate')}</dt>
					<dd>{product.eol_date ? formatDate(product.eol_date) : '—'}</dd>
				</div>
				<div class="flex flex-col gap-1 sm:col-span-2 lg:col-span-3">
					<dt class="text-xs text-muted-foreground">{t('product.notes')}</dt>
					<dd class="whitespace-pre-line">{product.notes ?? '—'}</dd>
				</div>
			</dl>
		</section>

		{#if session.has('attachments.read')}
			<section class="rounded-lg border bg-card p-6">
				<AttachmentPanel attachableType="product" attachableId={product.id} />
			</section>
		{/if}
	{/if}
</div>
