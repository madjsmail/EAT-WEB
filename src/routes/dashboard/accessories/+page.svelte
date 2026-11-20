<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { toast } from 'svelte-sonner';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import { ApiError, type Pagination } from '#lib/api/client.js';
	import { deleteAccessory, listAccessories, type Accessory } from '#lib/api/accessories.js';
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
	import AccessoryForm from './accessory-form.svelte';
	import SearchSelect, { type SelectOption } from '#lib/components/domain/search-select.svelte';

	const canWrite = $derived(session.has('accessories.write'));

	let accessories = $state<Accessory[]>([]);
	let pagination = $state<Pagination>({ page: 1, per_page: 25, total: 0, total_pages: 0 });
	let loading = $state(true);
	let error = $state<string | null>(null);
	let deletingId = $state<string | null>(null);
	let formOpen = $state(false);
	let editing = $state<Accessory | null>(null);

	let categories = $state<Lookup[]>([]);
	let manufacturers = $state<Lookup[]>([]);
	let suppliers = $state<Lookup[]>([]);
	let locations = $state<Lookup[]>([]);

	let q = $state('');
	let categoryId = $state('');
	let manufacturerId = $state('');
	let archived = $state('');

	const categoryChoices = $derived(lookupOptions(categories));
	const manufacturerChoices = $derived(lookupOptions(manufacturers));
	const archivedChoices: SelectOption[] = [
		{ value: 'false', label: t('accessory.activeOnly') },
		{ value: 'true', label: t('accessory.archivedOnly') }
	];

	async function load(page = 1) {
		loading = true;
		error = null;
		try {
			const result = await listAccessories({
				q,
				category_id: categoryId || undefined,
				manufacturer_id: manufacturerId || undefined,
				is_archived: archived === '' ? undefined : archived === 'true',
				page,
				per_page: pagination.per_page
			});
			accessories = result.items;
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

	async function remove(accessory: Accessory) {
		if (!confirm(t('accessory.confirmDelete'))) return;
		deletingId = accessory.id;
		try {
			await deleteAccessory(accessory.id);
			toast.success(t('accessory.deleted'));
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
	<title>{t('accessory.title')} · EAT</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-semibold tracking-tight">{t('accessory.title')}</h1>
			<p class="text-sm text-muted-foreground">{t('accessory.description')}</p>
		</div>
		{#if canWrite}
			<Button
				onclick={() => {
					editing = null;
					formOpen = true;
				}}
			>
				<PlusIcon />
				{t('accessory.add')}
			</Button>
		{/if}
	</div>

	<form class="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3" onsubmit={search}>
		<Input class="sm:max-w-64" placeholder={t('accessory.searchPlaceholder')} bind:value={q} />
		<div class="w-48">
			<SearchSelect
				aria-label={t('accessory.category')}
				bind:value={categoryId}
				options={categoryChoices}
				allowClear
				allLabel={t('accessory.allCategories')}
				onchange={() => load(1)}
			/>
		</div>
		<div class="w-48">
			<SearchSelect
				aria-label={t('accessory.manufacturer')}
				bind:value={manufacturerId}
				options={manufacturerChoices}
				allowClear
				allLabel={t('accessory.allManufacturers')}
				onchange={() => load(1)}
			/>
		</div>
		<div class="w-40">
			<SearchSelect
				aria-label={t('accessory.isArchived')}
				bind:value={archived}
				options={archivedChoices}
				allowClear
				allLabel={t('accessory.allStatuses')}
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
		{:else if accessories.length === 0}
			<div class="flex flex-col items-center gap-1 p-10 text-center">
				<p class="font-medium">{t('accessory.emptyTitle')}</p>
				<p class="text-sm text-muted-foreground">{t('accessory.emptyDescription')}</p>
			</div>
		{:else}
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>{t('accessory.name')}</Table.Head>
						<Table.Head class="hidden md:table-cell">{t('accessory.category')}</Table.Head>
						<Table.Head class="text-end">{t('accessory.total')}</Table.Head>
						<Table.Head class="text-end">{t('accessory.available')}</Table.Head>
						<Table.Head class="hidden text-end sm:table-cell">
							{t('accessory.assigned')}
						</Table.Head>
						<Table.Head class="hidden text-end lg:table-cell">{t('accessory.min')}</Table.Head>
						<Table.Head class="hidden lg:table-cell">{t('accessory.location')}</Table.Head>
						<Table.Head class="w-0">{t('common.actions')}</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each accessories as accessory (accessory.id)}
						<Table.Row>
							<Table.Cell>
								<div class="flex flex-col">
									<a
										class="font-medium underline-offset-4 hover:underline"
										href={resolve('/dashboard/accessories/[id]', { id: accessory.id })}
									>
										{accessory.name}
									</a>
									{#if accessory.model_number}
										<span class="font-mono text-xs text-muted-foreground">
											{accessory.model_number}
										</span>
									{/if}
								</div>
							</Table.Cell>
							<Table.Cell class="hidden text-muted-foreground md:table-cell">
								{accessory.category_name ?? '—'}
							</Table.Cell>
							<Table.Cell class="text-end">{accessory.total_quantity}</Table.Cell>
							<Table.Cell class="text-end font-medium">{accessory.available_quantity}</Table.Cell>
							<Table.Cell class="hidden text-end text-muted-foreground sm:table-cell">
								{accessory.assigned_quantity}
							</Table.Cell>
							<Table.Cell class="hidden text-end text-muted-foreground lg:table-cell">
								{accessory.min_quantity}
							</Table.Cell>
							<Table.Cell class="hidden text-muted-foreground lg:table-cell">
								{accessory.location_name ?? '—'}
							</Table.Cell>
							<Table.Cell>
								<div class="flex items-center justify-end gap-1">
									{#if accessory.is_archived}
										<Badge variant="secondary">{t('accessory.isArchived')}</Badge>
									{/if}
									{#if canWrite}
										<Button
											variant="ghost"
											size="icon-sm"
											aria-label={t('common.edit')}
											onclick={() => {
												editing = accessory;
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
											disabled={deletingId === accessory.id}
											onclick={() => remove(accessory)}
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
	<AccessoryForm
		accessory={editing}
		{categories}
		{manufacturers}
		{suppliers}
		{locations}
		onclose={() => (formOpen = false)}
		onsaved={() => load(pagination.page)}
	/>
{/if}
