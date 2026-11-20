<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { toast } from 'svelte-sonner';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import { ApiError, type Pagination } from '#lib/api/client.js';
	import { deleteConsumable, listConsumables, type Consumable } from '#lib/api/consumables.js';
	import { listLookups, type Lookup } from '#lib/api/lookups.js';
	import { t } from '#lib/i18n/index.js';
	import { lookupOptions } from '#lib/config/select-options.js';
	import { session } from '#lib/stores/session.svelte.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import TablePagination from '#lib/components/domain/table-pagination.svelte';
	import ConsumableForm from './consumable-form.svelte';
	import SearchSelect, { type SelectOption } from '#lib/components/domain/search-select.svelte';

	const canWrite = $derived(session.has('consumables.write'));

	let consumables = $state<Consumable[]>([]);
	let pagination = $state<Pagination>({ page: 1, per_page: 25, total: 0, total_pages: 0 });
	let loading = $state(true);
	let error = $state<string | null>(null);
	let deletingId = $state<string | null>(null);
	let formOpen = $state(false);
	let editing = $state<Consumable | null>(null);

	let categories = $state<Lookup[]>([]);
	let manufacturers = $state<Lookup[]>([]);
	let suppliers = $state<Lookup[]>([]);
	let locations = $state<Lookup[]>([]);

	let q = $state('');
	let categoryId = $state('');
	let lowStock = $state('');
	let archived = $state('');

	const categoryChoices = $derived(lookupOptions(categories));
	const stockChoices: SelectOption[] = [
		{ value: 'true', label: t('consumable.lowStockOnly') },
		{ value: 'false', label: t('consumable.healthyOnly') }
	];
	const archivedChoices: SelectOption[] = [
		{ value: 'false', label: t('consumable.activeOnly') },
		{ value: 'true', label: t('consumable.archivedOnly') }
	];

	async function load(page = 1) {
		loading = true;
		error = null;
		try {
			const result = await listConsumables({
				q,
				category_id: categoryId || undefined,
				low_stock: lowStock === '' ? undefined : lowStock === 'true',
				is_archived: archived === '' ? undefined : archived === 'true',
				page,
				per_page: pagination.per_page
			});
			consumables = result.items;
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
			const [cats, mans, sups, locs] = await Promise.all([
				listLookups('categories'),
				listLookups('manufacturers'),
				listLookups('suppliers'),
				listLookups('locations')
			]);
			categories = cats;
			manufacturers = mans;
			suppliers = sups;
			locations = locs;
		} catch {
			// Filters and the form fall back to empty selects.
		}
	});

	function search(event: SubmitEvent) {
		event.preventDefault();
		void load(1);
	}

	async function remove(consumable: Consumable) {
		if (!confirm(t('consumable.confirmDelete'))) return;
		deletingId = consumable.id;
		try {
			await deleteConsumable(consumable.id);
			toast.success(t('consumable.deleted'));
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
	<title>{t('consumable.title')} · EAT</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-semibold tracking-tight">{t('consumable.title')}</h1>
			<p class="text-sm text-muted-foreground">{t('consumable.description')}</p>
		</div>
		{#if canWrite}
			<Button
				onclick={() => {
					editing = null;
					formOpen = true;
				}}
			>
				<PlusIcon />
				{t('consumable.add')}
			</Button>
		{/if}
	</div>

	<form class="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3" onsubmit={search}>
		<Input class="sm:max-w-64" placeholder={t('consumable.searchPlaceholder')} bind:value={q} />
		<div class="w-48">
			<SearchSelect
				aria-label={t('consumable.category')}
				bind:value={categoryId}
				options={categoryChoices}
				allowClear
				allLabel={t('consumable.allCategories')}
				onchange={() => load(1)}
			/>
		</div>
		<div class="w-48">
			<SearchSelect
				aria-label={t('consumable.lowStock')}
				bind:value={lowStock}
				options={stockChoices}
				allowClear
				allLabel={t('consumable.allStockLevels')}
				onchange={() => load(1)}
			/>
		</div>
		<div class="w-40">
			<SearchSelect
				aria-label={t('consumable.isArchived')}
				bind:value={archived}
				options={archivedChoices}
				allowClear
				allLabel={t('consumable.allStatuses')}
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
		{:else if consumables.length === 0}
			<div class="flex flex-col items-center gap-1 p-10 text-center">
				<p class="font-medium">{t('consumable.emptyTitle')}</p>
				<p class="text-sm text-muted-foreground">{t('consumable.emptyDescription')}</p>
			</div>
		{:else}
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>{t('consumable.name')}</Table.Head>
						<Table.Head class="hidden md:table-cell">{t('consumable.category')}</Table.Head>
						<Table.Head class="text-end">{t('consumable.onHand')}</Table.Head>
						<Table.Head class="hidden text-end sm:table-cell">
							{t('consumable.minStockAlert')}
						</Table.Head>
						<Table.Head class="hidden lg:table-cell">{t('consumable.location')}</Table.Head>
						<Table.Head class="w-0">{t('common.actions')}</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each consumables as consumable (consumable.id)}
						<Table.Row>
							<Table.Cell>
								<div class="flex flex-col">
									<a
										class="font-medium underline-offset-4 hover:underline"
										href={resolve('/dashboard/consumables/[id]', { id: consumable.id })}
									>
										{consumable.name}
									</a>
									{#if consumable.model_number}
										<span class="font-mono text-xs text-muted-foreground">
											{consumable.model_number}
										</span>
									{/if}
								</div>
							</Table.Cell>
							<Table.Cell class="hidden text-muted-foreground md:table-cell">
								{consumable.category_name ?? '—'}
							</Table.Cell>
							<Table.Cell class="text-end font-medium">
								{consumable.quantity_on_hand}
							</Table.Cell>
							<Table.Cell class="hidden text-end text-muted-foreground sm:table-cell">
								{consumable.min_stock_alert}
							</Table.Cell>
							<Table.Cell class="hidden text-muted-foreground lg:table-cell">
								{consumable.location_name ?? '—'}
							</Table.Cell>
							<Table.Cell>
								<div class="flex items-center justify-end gap-1">
									{#if consumable.is_low_stock}
										<Badge variant="destructive">{t('consumable.lowStock')}</Badge>
									{/if}
									{#if consumable.is_archived}
										<Badge variant="secondary">{t('consumable.isArchived')}</Badge>
									{/if}
									{#if canWrite}
										<Button
											variant="ghost"
											size="icon-sm"
											aria-label={t('common.edit')}
											onclick={() => {
												editing = consumable;
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
											disabled={deletingId === consumable.id}
											onclick={() => remove(consumable)}
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
	<ConsumableForm
		consumable={editing}
		{categories}
		{manufacturers}
		{suppliers}
		{locations}
		onclose={() => (formOpen = false)}
		onsaved={() => load(pagination.page)}
	/>
{/if}
