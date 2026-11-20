<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { resolve } from '$app/paths';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import { ApiError, type Pagination } from '#lib/api/client.js';
	import { deleteAsset, listAssets, type Asset } from '#lib/api/assets.js';
	import { listLookups, type Lookup } from '#lib/api/lookups.js';
	import { listProducts, type Product } from '#lib/api/products.js';
	import { t } from '#lib/i18n/index.js';
	import { lookupOptions, productOptions } from '#lib/config/select-options.js';
	import { session } from '#lib/stores/session.svelte.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import StatusBadge from '#lib/components/domain/status-badge.svelte';
	import TablePagination from '#lib/components/domain/table-pagination.svelte';
	import AssetForm from '#lib/components/domain/asset-form.svelte';
	import SearchSelect from '#lib/components/domain/search-select.svelte';

	const canWrite = $derived(session.has('assets.write'));

	let assets = $state<Asset[]>([]);
	let pagination = $state<Pagination>({ page: 1, per_page: 20, total: 0, total_pages: 0 });
	let loading = $state(true);
	let error = $state<string | null>(null);
	let deletingId = $state<string | null>(null);
	let formOpen = $state(false);

	let products = $state<Product[]>([]);
	let departments = $state<Lookup[]>([]);
	let statuses = $state<Lookup[]>([]);
	let locations = $state<Lookup[]>([]);
	let suppliers = $state<Lookup[]>([]);

	let q = $state('');
	let statusId = $state('');
	let locationId = $state('');
	let departmentId = $state('');
	let productId = $state('');

	const statusChoices = $derived(lookupOptions(statuses));
	const locationChoices = $derived(lookupOptions(locations));
	const departmentChoices = $derived(lookupOptions(departments));
	const productChoices = $derived(productOptions(products));

	async function load(page = 1) {
		loading = true;
		error = null;
		try {
			const result = await listAssets({
				q,
				status_id: statusId || undefined,
				location_id: locationId || undefined,
				department_id: departmentId || undefined,
				product_id: productId || undefined,
				page,
				per_page: pagination.per_page
			});
			assets = result.items;
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
			const [prod, deps, stats, locs, sups] = await Promise.all([
				listProducts({ per_page: 100 }),
				listLookups('departments'),
				listLookups('statuses'),
				listLookups('locations'),
				listLookups('suppliers')
			]);
			products = prod.items;
			departments = deps;
			statuses = stats;
			locations = locs;
			suppliers = sups;
		} catch {
			// Filters and the create form fall back to empty selects.
		}
	});

	function search(event: SubmitEvent) {
		event.preventDefault();
		void load(1);
	}

	async function remove(asset: Asset) {
		if (!confirm(t('asset.confirmDelete'))) return;
		deletingId = asset.id;
		try {
			await deleteAsset(asset.id);
			toast.success(t('asset.deleted'));
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
	<title>{t('asset.title')} · EAT</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-semibold tracking-tight">{t('asset.title')}</h1>
			<p class="text-sm text-muted-foreground">{t('asset.description')}</p>
		</div>
		{#if canWrite}
			<Button onclick={() => (formOpen = true)}>
				<PlusIcon />
				{t('asset.add')}
			</Button>
		{/if}
	</div>

	<form class="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3" onsubmit={search}>
		<Input class="sm:max-w-64" placeholder={t('asset.searchPlaceholder')} bind:value={q} />
		<div class="w-48">
			<SearchSelect
				aria-label={t('asset.status')}
				bind:value={statusId}
				options={statusChoices}
				allowClear
				allLabel={t('asset.allStatuses')}
				onchange={() => load(1)}
			/>
		</div>
		<div class="w-48">
			<SearchSelect
				aria-label={t('asset.location')}
				bind:value={locationId}
				options={locationChoices}
				allowClear
				allLabel={t('asset.allLocations')}
				onchange={() => load(1)}
			/>
		</div>
		<div class="w-48">
			<SearchSelect
				aria-label={t('asset.department')}
				bind:value={departmentId}
				options={departmentChoices}
				allowClear
				allLabel={t('asset.allDepartments')}
				onchange={() => load(1)}
			/>
		</div>
		<div class="w-56">
			<SearchSelect
				aria-label={t('asset.product')}
				bind:value={productId}
				options={productChoices}
				allowClear
				allLabel={t('asset.allProducts')}
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
		{:else if assets.length === 0}
			<div class="flex flex-col items-center gap-1 p-10 text-center">
				<p class="font-medium">{t('asset.emptyTitle')}</p>
				<p class="text-sm text-muted-foreground">{t('asset.emptyDescription')}</p>
			</div>
		{:else}
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>{t('asset.name')}</Table.Head>
						<Table.Head>{t('asset.status')}</Table.Head>
						<Table.Head class="hidden md:table-cell">{t('asset.product')}</Table.Head>
						<Table.Head class="hidden lg:table-cell">{t('asset.location')}</Table.Head>
						<Table.Head class="hidden lg:table-cell">{t('asset.custodian')}</Table.Head>
						<Table.Head class="w-0">{t('common.actions')}</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each assets as asset (asset.id)}
						<Table.Row>
							<Table.Cell>
								<div class="flex flex-col">
									<a
										class="font-medium underline-offset-4 hover:underline"
										href={resolve('/dashboard/assets/[id]', { id: asset.id })}
									>
										{asset.name}
									</a>
									<span class="font-mono text-xs text-muted-foreground">{asset.asset_tag}</span>
								</div>
							</Table.Cell>
							<Table.Cell>
								<StatusBadge name={asset.status_name} color={asset.status_color_code} />
							</Table.Cell>
							<Table.Cell class="hidden text-muted-foreground md:table-cell">
								{asset.product_name ?? '—'}
							</Table.Cell>
							<Table.Cell class="hidden text-muted-foreground lg:table-cell">
								{asset.location_name ?? '—'}
							</Table.Cell>
							<Table.Cell class="hidden text-muted-foreground lg:table-cell">
								{asset.assigned_user_name ?? '—'}
							</Table.Cell>
							<Table.Cell>
								<div class="flex justify-end gap-1">
									{#if canWrite}
										<Button
											variant="ghost"
											size="icon-sm"
											class="text-destructive"
											aria-label={t('common.delete')}
											disabled={deletingId === asset.id}
											onclick={() => remove(asset)}
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
	<AssetForm
		{products}
		{departments}
		{statuses}
		{locations}
		{suppliers}
		onclose={() => (formOpen = false)}
		onsaved={() => load(1)}
	/>
{/if}
