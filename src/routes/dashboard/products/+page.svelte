<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import { ApiError, type Pagination } from '#lib/api/client.js';
	import { deleteProduct, listProducts, type Product } from '#lib/api/products.js';
	import { listLookups, type Lookup } from '#lib/api/lookups.js';
	import { resolveI18n, t } from '#lib/i18n/index.js';
	import { session } from '#lib/stores/session.svelte.js';
	import { formatDate } from '#lib/utils.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import TablePagination from '#lib/components/domain/table-pagination.svelte';
	import SearchSelect, { type SelectOption } from '#lib/components/domain/search-select.svelte';
	import { lookupOptions } from '#lib/config/select-options.js';
	import ProductForm from './product-form.svelte';

	const canWrite = $derived(session.has('products.write'));

	let products = $state<Product[]>([]);
	let pagination = $state<Pagination>({ page: 1, per_page: 20, total: 0, total_pages: 0 });
	let loading = $state(true);
	let error = $state<string | null>(null);
	let deletingId = $state<string | null>(null);
	let formOpen = $state(false);
	let editing = $state<Product | null>(null);

	let categories = $state<Lookup[]>([]);
	let manufacturers = $state<Lookup[]>([]);
	let suppliers = $state<Lookup[]>([]);
	let depreciationModels = $state<Lookup[]>([]);

	let q = $state('');
	let categoryId = $state('');
	let manufacturerId = $state('');
	let archived = $state('');

	const categoryOptions = $derived(lookupOptions(categories));
	const manufacturerOptions = $derived(lookupOptions(manufacturers));
	const archivedOptions: SelectOption[] = [
		{ value: 'false', label: t('product.activeOnly') },
		{ value: 'true', label: t('product.archivedOnly') }
	];

	async function load(page = 1) {
		loading = true;
		error = null;
		try {
			const result = await listProducts({
				q,
				category_id: categoryId || undefined,
				manufacturer_id: manufacturerId || undefined,
				is_archived: archived === '' ? undefined : archived === 'true',
				page,
				per_page: pagination.per_page
			});
			products = result.items;
			pagination = result.pagination;
		} catch (cause) {
			error =
				cause instanceof ApiError && cause.status > 0 ? cause.message : t('auth.genericError');
		} finally {
			loading = false;
		}
	}

	onMount(async () => {
		await load();
		try {
			const [cats, mans, sups, deps] = await Promise.all([
				listLookups('categories'),
				listLookups('manufacturers'),
				listLookups('suppliers'),
				listLookups('depreciation-models')
			]);
			categories = cats;
			manufacturers = mans;
			suppliers = sups;
			depreciationModels = deps;
		} catch {
			// Filters degrade gracefully; the table still works.
		}
	});

	function search(event: SubmitEvent) {
		event.preventDefault();
		void load(1);
	}

	async function remove(product: Product) {
		if (!confirm(t('product.confirmDelete'))) return;
		deletingId = product.id;
		try {
			await deleteProduct(product.id);
			toast.success(t('product.deleted'));
			await load(pagination.page);
		} catch (cause) {
			toast.error(
				cause instanceof ApiError && cause.status > 0 ? cause.message : t('auth.genericError')
			);
		} finally {
			deletingId = null;
		}
	}
</script>

<svelte:head>
	<title>{t('product.title')} · EAT</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-semibold tracking-tight">{t('product.title')}</h1>
			<p class="text-sm text-muted-foreground">{t('product.description')}</p>
		</div>
		{#if canWrite}
			<Button
				onclick={() => {
					editing = null;
					formOpen = true;
				}}
			>
				<PlusIcon />
				{t('product.add')}
			</Button>
		{/if}
	</div>

	<form class="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3" onsubmit={search}>
		<Input class="sm:max-w-64" placeholder={t('table.searchPlaceholder')} bind:value={q} />
		<div class="w-48">
			<SearchSelect
				aria-label={t('product.category')}
				bind:value={categoryId}
				options={categoryOptions}
				allowClear
				allLabel={t('product.allCategories')}
				onchange={() => load(1)}
			/>
		</div>
		<div class="w-48">
			<SearchSelect
				aria-label={t('product.manufacturer')}
				bind:value={manufacturerId}
				options={manufacturerOptions}
				allowClear
				allLabel={t('product.allManufacturers')}
				onchange={() => load(1)}
			/>
		</div>
		<div class="w-40">
			<SearchSelect
				aria-label={t('product.isArchived')}
				bind:value={archived}
				options={archivedOptions}
				allowClear
				allLabel={t('product.allStatuses')}
				onchange={() => load(1)}
			/>
		</div>
		<Button type="submit" variant="outline">{t('table.search')}</Button>
	</form>

	<section class="rounded-lg border bg-card">
		{#if loading}
			<div class="flex flex-col gap-2 p-4">
				<Skeleton class="h-8 w-full" />
				<Skeleton class="h-8 w-full" />
				<Skeleton class="h-8 w-full" />
			</div>
		{:else if error}
			<div class="flex flex-col items-start gap-3 p-6">
				<p class="text-sm text-destructive">{error}</p>
				<Button variant="outline" size="sm" onclick={() => load(pagination.page)}>
					{t('table.retry')}
				</Button>
			</div>
		{:else if products.length === 0}
			<div class="flex flex-col items-center gap-1 p-10 text-center">
				<p class="font-medium">{t('product.emptyTitle')}</p>
				<p class="text-sm text-muted-foreground">{t('product.emptyDescription')}</p>
			</div>
		{:else}
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>{t('product.name')}</Table.Head>
						<Table.Head class="hidden md:table-cell">{t('product.category')}</Table.Head>
						<Table.Head class="hidden md:table-cell">{t('product.manufacturer')}</Table.Head>
						<Table.Head class="hidden lg:table-cell">{t('product.eolType')}</Table.Head>
						<Table.Head>{t('product.purchaseCost')}</Table.Head>
						<Table.Head class="w-0">{t('common.actions')}</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each products as product (product.id)}
						<Table.Row>
							<Table.Cell>
								<div class="flex flex-col">
									<span class="font-medium">
										{resolveI18n(product.translations, undefined, product.name)}
									</span>
									<span class="font-mono text-xs text-muted-foreground">{product.code}</span>
								</div>
							</Table.Cell>
							<Table.Cell class="hidden md:table-cell">
								{product.category_name ?? '—'}
							</Table.Cell>
							<Table.Cell class="hidden text-muted-foreground md:table-cell">
								{product.manufacturer_name ?? '—'}
							</Table.Cell>
							<Table.Cell class="hidden text-muted-foreground lg:table-cell">
								{#if product.eol_date}
									{formatDate(product.eol_date)}
								{:else if product.eol_type}
									{t(`product.eol.${product.eol_type}`)}
								{:else}
									—
								{/if}
							</Table.Cell>
							<Table.Cell class="text-muted-foreground">
								{#if product.default_purchase_cost != null}
									{product.default_purchase_cost} {product.default_currency}
								{:else}
									—
								{/if}
							</Table.Cell>
							<Table.Cell>
								<div class="flex items-center justify-end gap-1">
									{#if product.is_archived}
										<Badge variant="secondary">{t('product.isArchived')}</Badge>
									{/if}
									{#if canWrite}
										<Button
											variant="ghost"
											size="icon-sm"
											aria-label={t('common.edit')}
											onclick={() => {
												editing = product;
												formOpen = true;
											}}
										>
											<PencilIcon />
										</Button>
										<Button
											variant="ghost"
											size="icon-sm"
											class="text-destructive"
											aria-label={t('common.delete')}
											disabled={deletingId === product.id}
											onclick={() => remove(product)}
										>
											<Trash2Icon />
										</Button>
									{/if}
								</div>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
			<TablePagination {pagination} onpage={(page: number) => load(page)} />
		{/if}
	</section>
</div>

{#if formOpen}
	<ProductForm
		product={editing}
		{categories}
		{manufacturers}
		{suppliers}
		{depreciationModels}
		onclose={() => (formOpen = false)}
		onsaved={() => load(pagination.page)}
	/>
{/if}
