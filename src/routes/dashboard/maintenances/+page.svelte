<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { resolve } from '$app/paths';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import { useSortable } from '@dnd-kit-svelte/svelte/sortable';
	import { DragDropProvider, useDroppable } from '@dnd-kit-svelte/svelte';
	import { move } from '@dnd-kit/helpers';
	type DragEndEvent = Parameters<typeof move>[1];
	import { ApiError, type Pagination } from '#lib/api/client.js';
	import {
		cancelMaintenance,
		completeMaintenance,
		deleteMaintenance,
		isClosed,
		listMaintenances,
		startMaintenance,
		type Maintenance,
		type MaintenanceStatus
	} from '#lib/api/maintenances.js';
	import { listLookups, type Lookup } from '#lib/api/lookups.js';
	import { resolveI18n, t } from '#lib/i18n/index.js';
	import { session } from '#lib/stores/session.svelte.js';
	import { formatDate, formatNumber } from '#lib/utils.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import ListIcon from '@lucide/svelte/icons/list';
	import ColumnsIcon from '@lucide/svelte/icons/columns-3';
	import GripIcon from '@lucide/svelte/icons/grip-vertical';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Field, FieldLabel } from '#lib/components/ui/field/index.js';
	import * as Sheet from '#lib/components/ui/sheet/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import AssetSelect from '#lib/components/domain/asset-select.svelte';
	import EnumSelect from '#lib/components/domain/enum-select.svelte';
	import TablePagination from '#lib/components/domain/table-pagination.svelte';
	import MaintenanceForm from './maintenance-form.svelte';
	import MaintenanceActions from './maintenance-actions.svelte';

	const canWrite = $derived(session.has('maintenances.write'));

	const statuses = ['open', 'in_progress', 'completed', 'cancelled'];
	const maintenanceTypes = ['repair', 'preventive', 'inspection', 'corrective', 'other'];
	const priorities = ['low', 'medium', 'high', 'critical'];

	const statusTone: Record<string, string> = {
		open: 'border-amber-200 bg-amber-500/10 text-amber-700 dark:border-amber-400/30 dark:text-amber-300',
		in_progress: 'border-blue-200 bg-blue-500/10 text-blue-700 dark:border-blue-400/30 dark:text-blue-300',
		completed: 'border-emerald-200 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/30 dark:text-emerald-300',
		cancelled: 'border-slate-200 bg-slate-500/10 text-slate-700 dark:border-slate-400/30 dark:text-slate-300'
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

	let view = $state<'list' | 'board'>('list');

	const board = $derived<Record<MaintenanceStatus, Maintenance[]>>({
		open: tickets.filter((ticket) => ticket.status === 'open'),
		in_progress: tickets.filter((ticket) => ticket.status === 'in_progress'),
		completed: tickets.filter((ticket) => ticket.status === 'completed'),
		cancelled: tickets.filter((ticket) => ticket.status === 'cancelled')
	});

	/** The board has no pagination, so it asks for a single large page. */
	const boardPerPage = 200;

	async function switchView(next: 'list' | 'board') {
		if (view === next) return;
		view = next;
		await load(1);
	}

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
				per_page: view === 'board' ? boardPerPage : undefined
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

	/** Ticket awaiting a completion/cancellation form because of a board drop. */
	let pending = $state<{ ticket: Maintenance; target: 'completed' | 'cancelled' } | null>(null);
	let completionNotes = $state('');
	let completionCost = $state('');
	let cancelReason = $state('');
	let busy = $state(false);

	function fail(cause: unknown) {
		toast.error(
			cause instanceof ApiError && cause.status > 0 ? cause.message : t('auth.genericError')
		);
	}

	async function onDragEnd(event: DragEndEvent) {
		const activeId = String(event.operation.source?.id ?? '');
		const ticket = tickets.find((item) => item.id === activeId);
		const next = move(board, event);
		const target = statuses.find((value) =>
			next[value as MaintenanceStatus]?.some((item) => item.id === activeId)
		) as MaintenanceStatus | undefined;
		if (!canWrite || !ticket || !target || target === ticket.status) return;

		// The backend only accepts start → complete → cancel, never an arbitrary status PATCH.
		if (target === 'in_progress' && ticket.status === 'open') {
			try {
				await startMaintenance(ticket.id);
				toast.success(t('maintenance.started'));
				await load(1);
			} catch (cause) {
				fail(cause);
			}
			return;
		}
		if (target === 'completed' && ticket.status === 'in_progress') {
			completionNotes = '';
			completionCost = ticket.cost == null ? '' : String(ticket.cost);
			pending = { ticket, target };
			return;
		}
		if (target === 'cancelled' && !isClosed(ticket.status)) {
			cancelReason = '';
			pending = { ticket, target };
			return;
		}
		toast.error(t('maintenance.boardInvalidMove'));
	}

	async function submitComplete(event: SubmitEvent) {
		event.preventDefault();
		if (!pending) return;
		busy = true;
		try {
			const updated = await completeMaintenance(pending.ticket.id, {
				completion_notes: completionNotes,
				cost: completionCost || null
			});
			toast.success(
				t('maintenance.restoredToast', { status: updated.previous_status_name ?? '—' })
			);
			pending = null;
			await load(1);
		} catch (cause) {
			fail(cause);
		} finally {
			busy = false;
		}
	}

	async function submitCancel(event: SubmitEvent) {
		event.preventDefault();
		if (!pending) return;
		busy = true;
		try {
			const updated = await cancelMaintenance(pending.ticket.id, { reason: cancelReason });
			toast.success(
				t('maintenance.restoredToast', { status: updated.previous_status_name ?? '—' })
			);
			pending = null;
			await load(1);
		} catch (cause) {
			fail(cause);
		} finally {
			busy = false;
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
		<div class="flex items-center gap-2">
			<div class="flex rounded-lg border p-0.5" role="group" aria-label={t('table.view')}>
				<Button
					variant={view === 'list' ? 'secondary' : 'ghost'}
					size="icon-sm"
					aria-pressed={view === 'list'}
					aria-label={t('maintenance.view.list')}
					onclick={() => switchView('list')}
				>
					<ListIcon />
				</Button>
				<Button
					variant={view === 'board' ? 'secondary' : 'ghost'}
					size="icon-sm"
					aria-pressed={view === 'board'}
					aria-label={t('maintenance.view.board')}
					onclick={() => switchView('board')}
				>
					<ColumnsIcon />
				</Button>
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

	</div>

	<form class="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3" onsubmit={search}>
		<Input class="sm:max-w-56" placeholder={t('maintenance.searchPlaceholder')} bind:value={q} />
		<div class="w-56">
			<AssetSelect label={t('asset.title')} value={assetId} onchange={(id) => (assetId = id)} />
		</div>
		<EnumSelect
			id="maintenance-filter-status" class="h-9 w-full sm:w-44"
			value={status}
			onchange={(value) => {
				status = value;
				load(1);
			}}
			aria-label={t('maintenance.status')}
			clearLabel={t('maintenance.allStatuses')}
			options={statuses.map((value) => ({ value, label: t(`maintenance.status.${value}`) }))}
		/>
		<EnumSelect
			id="maintenance-filter-maintenanceType" class="h-9 w-full sm:w-44"
			value={maintenanceType}
			onchange={(value) => {
				maintenanceType = value;
				load(1);
			}}
			aria-label={t('maintenance.type')}
			clearLabel={t('maintenance.allTypes')}
			options={maintenanceTypes.map((value) => ({ value, label: t(`maintenance.type.${value}`) }))}
		/>
		<EnumSelect
			id="maintenance-filter-priority" class="h-9 w-full sm:w-44"
			value={priority}
			onchange={(value) => {
				priority = value;
				load(1);
			}}
			aria-label={t('maintenance.priority')}
			clearLabel={t('maintenance.allPriorities')}
			options={priorities.map((value) => ({ value, label: t(`maintenance.priority.${value}`) }))}
		/>
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
				<Button
					variant="outline"
					size="sm"
					onclick={() => load(view === 'board' ? 1 : pagination.page)}
				>
					{t('table.retry')}
				</Button>
			</div>
		{:else if view === 'board'}
			<DragDropProvider onDragEnd={onDragEnd}>
				<div class="grid items-start gap-3 p-3 sm:grid-cols-2 xl:grid-cols-4">
					{#each statuses as column (column)}
						{@render BoardColumn({ column: column as MaintenanceStatus })}
					{/each}
				</div>
			</DragDropProvider>
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
							<Table.Head class="w-48">{t('common.actions')}</Table.Head>
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

{#snippet BoardColumn({ column }: { column: MaintenanceStatus })}
	{@const droppable = useDroppable({ id: column })}
	<div class="flex flex-col gap-2 rounded-lg border bg-muted/30">
		<div class="flex items-center justify-between border-b px-3 py-2">
			<h2 class="text-sm font-medium">{t(`maintenance.status.${column}`)}</h2>
			<span class="text-xs text-muted-foreground">{board[column].length}</span>
		</div>
		<div
			class="flex min-h-24 flex-col gap-2 p-2 transition-colors data-[over=true]:bg-primary/5"
			data-over={droppable.isDropTarget.current}
			{@attach droppable.ref}
		>
			{#each board[column] as ticket, index (ticket.id)}
				{@render TicketCard({ ticket, index })}
			{/each}
		</div>
	</div>
{/snippet}

{#snippet TicketCard({ ticket, index }: { ticket: Maintenance; index: number })}
	{@const sortable = useSortable({ id: ticket.id, index: () => index, disabled: !canWrite })}
	<div
		class="relative rounded-lg border bg-card p-3 text-sm shadow-xs data-[dragging=true]:z-10 data-[dragging=true]:opacity-60"
		data-dragging={sortable.isDragging.current}
		{@attach sortable.ref}
	>
		<div class="flex items-start justify-between gap-2">
			<a
				class="font-medium underline-offset-4 hover:underline"
				href={resolve('/dashboard/maintenances/[id]', { id: ticket.id })}
			>
				{ticket.title}
			</a>
			<div class="flex shrink-0 items-center gap-1">
				<span class="rounded-full border px-2 py-0.5 text-xs font-medium">
					{t(`maintenance.priority.${ticket.priority}`)}
				</span>
				{#if canWrite}
					<span
						class="cursor-grab text-muted-foreground active:cursor-grabbing"
						aria-hidden="true"
						{@attach sortable.handleRef}
					>
						<GripIcon class="size-4" />
					</span>
				{/if}
			</div>
		</div>
		<p class="mt-1 text-xs text-muted-foreground">
			{ticket.asset_name ?? t('maintenance.unknownAsset')}
			{#if ticket.asset_tag}
				<span class="font-mono">· {ticket.asset_tag}</span>
			{/if}
		</p>
		<div class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
			<span>{t(`maintenance.type.${ticket.maintenance_type}`)}</span>
			{#if ticket.assigned_user_name}
				<span>· {ticket.assigned_user_name}</span>
			{/if}
			{#if ticket.scheduled_at}
				<span>· {formatDate(ticket.scheduled_at)}</span>
			{/if}
			<span>· {money(ticket.cost, ticket.currency)}</span>
		</div>
	</div>
{/snippet}

{#if pending}
	<Sheet.Root open onOpenChange={(open) => !open && (pending = null)}>
		<Sheet.Content side="right" class="w-full sm:max-w-md">
			<Sheet.Header>
				<Sheet.Title>
					{pending.target === 'completed'
						? t('maintenance.completeTitle')
						: t('maintenance.cancelTitle')}
				</Sheet.Title>
				<Sheet.Description>
					{pending.ticket.title} ·
					{pending.target === 'completed'
						? t('maintenance.completeDescription')
						: t('maintenance.cancelDescription')}
				</Sheet.Description>
			</Sheet.Header>
			<form
				class="flex min-h-0 flex-1 flex-col"
				onsubmit={pending.target === 'completed' ? submitComplete : submitCancel}
			>
				<div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
					{#if pending.target === 'completed'}
						<Field>
							<FieldLabel for="board-completion-notes">
								{t('maintenance.completionNotes')} *
							</FieldLabel>
							<textarea
								id="board-completion-notes"
								class="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
								required
								bind:value={completionNotes}></textarea>
						</Field>
						<Field>
							<FieldLabel for="board-completion-cost">{t('maintenance.cost')}</FieldLabel>
							<Input
								id="board-completion-cost"
								type="number"
								step="0.01"
								bind:value={completionCost}
							/>
						</Field>
					{:else}
						<Field>
							<FieldLabel for="board-cancel-reason">{t('maintenance.cancelReason')} *</FieldLabel>
							<Input id="board-cancel-reason" required bind:value={cancelReason} />
						</Field>
					{/if}
				</div>
				<div class="flex justify-end gap-2 border-t p-4">
					<Button type="button" variant="outline" onclick={() => (pending = null)}>
						{t('common.cancel')}
					</Button>
					<Button type="submit" disabled={busy}>
						{busy
							? t('common.saving')
							: pending.target === 'completed'
								? t('maintenance.complete')
								: t('maintenance.cancelTicket')}
					</Button>
				</div>
			</form>
		</Sheet.Content>
	</Sheet.Root>
{/if}
