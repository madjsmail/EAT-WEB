<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { resolve } from '$app/paths';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import { ApiError, type Pagination } from '#lib/api/client.js';
	import {
		deleteMaintenance,
		isClosed,
		listMaintenances,
		type Maintenance
	} from '#lib/api/maintenances.js';
	import { listLookups, type Lookup } from '#lib/api/lookups.js';
	import { resolveI18n, t } from '#lib/i18n/index.js';
	import { session } from '#lib/stores/session.svelte.js';
	import { formatDate, formatNumber } from '#lib/utils.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import AssetSelect from '#lib/components/domain/asset-select.svelte';
	import TablePagination from '#lib/components/domain/table-pagination.svelte';
	import MaintenanceForm from './maintenance-form.svelte';
	import MaintenanceActions from './maintenance-actions.svelte';

	const canWrite = $derived(session.has('maintenances.write'));

	const statuses = ['open', 'in_progress', 'completed', 'cancelled'];
	const maintenanceTypes = ['repair', 'preventive', 'inspection', 'other'];
	const priorities = ['low', 'medium', 'high', 'critical'];

	const statusTone: Record<string, string> = {
		open: 'border-amber-200 bg-amber-500/10 text-amber-700',
		in_progress: 'border-blue-200 bg-blue-500/10 text-blue-700',
		completed: 'border-emerald-200 bg-emerald-500/10 text-emerald-700',
		cancelled: 'border-slate-200 bg-slate-500/10 text-slate-700'
	};

	let tickets = $state<Maintenance[]>([]);
	let pagination = $state<Pagination>({ page: 1, per_page: 20, total: 0, total_pages: 0 });
	let loading = $state(true);
	let error = $state<string | null>(null);
	let deletingId = $state<string | null>(null);
	let formOpen = $state(false);
	let editing = $state<Maintenance | null>(null);
	let suppliers = $state<Lookup[]>([]);

	let q = $state('');
	let assetId = $state('');
	let status = $state('');
	let maintenanceType = $state('');
	let priority = $state('');

	function money(cost: string | number | null, currency: string): string {
		if (cost === null || cost === undefined || cost === '') return '—';
		return formatNumber(Number(cost), { style: 'currency', currency });
	}

	async function load(page = 1) {
		loading = true;
		error = null;
		try {
			const result = await listMaintenances({
				q,
				asset_id: assetId || undefined,
				status: status || undefined,
				maintenance_type: maintenanceType || undefined,
				priority: priority || undefined,
				page,
				per_page: pagination.per_page
			});
			tickets = result.items;
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
			suppliers = await listLookups('suppliers');
		} catch {
			suppliers = [];
		}
	});

	function search(event: SubmitEvent) {
		event.preventDefault();
		void load(1);
	}

	async function remove(ticket: Maintenance) {
		if (!confirm(t('maintenance.confirmDelete'))) return;
		deletingId = ticket.id;
		try {
			await deleteMaintenance(ticket.id);
			toast.success(t('maintenance.deleted'));
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
	<title>{t('maintenance.title')} · EAT</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-semibold tracking-tight">{t('maintenance.title')}</h1>
			<p class="text-sm text-muted-foreground">{t('maintenance.description')}</p>
		</div>
		{#if canWrite}
			<Button
				onclick={() => {
					editing = null;
					formOpen = true;
				}}
			>
				<PlusIcon />
				{t('maintenance.add')}
			</Button>
		{/if}
	</div>

	<form class="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3" onsubmit={search}>
		<Input class="sm:max-w-56" placeholder={t('maintenance.searchPlaceholder')} bind:value={q} />
		<div class="w-56">
			<AssetSelect label={t('asset.title')} value={assetId} onchange={(id) => (assetId = id)} />
		</div>
		<select
			class="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
			aria-label={t('maintenance.status')}
			bind:value={status}
			onchange={() => load(1)}
		>
			<option value="">{t('maintenance.allStatuses')}</option>
			{#each statuses as value (value)}
				<option value={value}>{t(`maintenance.status.${value}`)}</option>
			{/each}
		</select>
		<select
			class="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
			aria-label={t('maintenance.type')}
			bind:value={maintenanceType}
			onchange={() => load(1)}
		>
			<option value="">{t('maintenance.allTypes')}</option>
			{#each maintenanceTypes as value (value)}
				<option value={value}>{t(`maintenance.type.${value}`)}</option>
			{/each}
		</select>
		<select
			class="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
			aria-label={t('maintenance.priority')}
			bind:value={priority}
			onchange={() => load(1)}
		>
			<option value="">{t('maintenance.allPriorities')}</option>
			{#each priorities as value (value)}
				<option value={value}>{t(`maintenance.priority.${value}`)}</option>
			{/each}
		</select>
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
		{:else if tickets.length === 0}
			<div class="flex flex-col items-center gap-1 p-10 text-center">
				<p class="font-medium">{t('maintenance.emptyTitle')}</p>
				<p class="text-sm text-muted-foreground">{t('maintenance.emptyDescription')}</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>{t('asset.title')}</Table.Head>
							<Table.Head>{t('maintenance.titleLabel')}</Table.Head>
							<Table.Head class="hidden lg:table-cell">{t('maintenance.type')}</Table.Head>
							<Table.Head class="hidden md:table-cell">{t('maintenance.priority')}</Table.Head>
							<Table.Head>{t('maintenance.status')}</Table.Head>
							<Table.Head class="hidden xl:table-cell">{t('maintenance.assignee')}</Table.Head>
							<Table.Head class="hidden lg:table-cell">{t('maintenance.scheduledAt')}</Table.Head>
							<Table.Head class="hidden xl:table-cell">{t('maintenance.cost')}</Table.Head>
							<Table.Head class="w-0">{t('common.actions')}</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each tickets as ticket (ticket.id)}
							<Table.Row>
								<Table.Cell>
									<div class="flex flex-col">
										<a
											class="font-medium underline-offset-4 hover:underline"
											href={resolve('/dashboard/assets/[id]', { id: ticket.asset_id })}
										>
											{ticket.asset_name ?? t('maintenance.unknownAsset')}
										</a>
										<span class="font-mono text-xs text-muted-foreground">
											{ticket.asset_tag ?? '—'}
										</span>
									</div>
								</Table.Cell>
								<Table.Cell>
									<a
										class="underline-offset-4 hover:underline"
										href={resolve('/dashboard/maintenances/[id]', { id: ticket.id })}
									>
										{ticket.title}
									</a>
									{#if ticket.rma_reference}
										<span class="block font-mono text-xs text-muted-foreground">
											{ticket.rma_reference}
										</span>
									{/if}
								</Table.Cell>
								<Table.Cell class="hidden text-muted-foreground lg:table-cell">
									{t(`maintenance.type.${ticket.maintenance_type}`)}
								</Table.Cell>
								<Table.Cell class="hidden md:table-cell">
									{t(`maintenance.priority.${ticket.priority}`)}
								</Table.Cell>
								<Table.Cell>
									<span
										class="inline-flex rounded-full border px-2 py-0.5 text-xs font-medium {statusTone[
											ticket.status
										] ?? 'border-border bg-muted text-muted-foreground'}"
									>
										{t(`maintenance.status.${ticket.status}`)}
									</span>
								</Table.Cell>
								<Table.Cell class="hidden text-muted-foreground xl:table-cell">
									{ticket.assigned_user_name ?? '—'}
								</Table.Cell>
								<Table.Cell class="hidden text-muted-foreground lg:table-cell">
									{ticket.scheduled_at ? formatDate(ticket.scheduled_at) : '—'}
								</Table.Cell>
								<Table.Cell class="hidden text-muted-foreground xl:table-cell">
									{money(ticket.cost, ticket.currency)}
								</Table.Cell>
								<Table.Cell>
									<div class="flex flex-col items-end gap-1">
										<MaintenanceActions
											maintenance={ticket}
											onchanged={() => load(pagination.page)}
										/>
										{#if canWrite}
											<div class="flex justify-end gap-1">
												<Button
													variant="ghost"
													size="icon-sm"
													aria-label={t('common.edit')}
													disabled={isClosed(ticket.status)}
													onclick={() => {
														editing = ticket;
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
													disabled={
														deletingId === ticket.id ||
														(ticket.status !== 'open' && ticket.status !== 'cancelled')
													}
													onclick={() => remove(ticket)}
												>
													<Trash2Icon />
												</Button>
											</div>
										{/if}
									</div>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
			<TablePagination {pagination} onpage={(page: number) => load(page)} />
		{/if}
	</section>
</div>

{#if formOpen}
	<MaintenanceForm
		maintenance={editing}
		{suppliers}
		onclose={() => (formOpen = false)}
		onsaved={() => load(pagination.page)}
	/>
{/if}
