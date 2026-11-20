<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import { ApiError } from '#lib/api/client.js';
	import {
		getMaintenance,
		isClosed,
		type Maintenance
	} from '#lib/api/maintenances.js';
	import { listLookups, type Lookup } from '#lib/api/lookups.js';
	import { t } from '#lib/i18n/index.js';
	import { session } from '#lib/stores/session.svelte.js';
	import { formatDate, formatNumber } from '#lib/utils.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import AttachmentPanel from '#lib/components/domain/attachment-panel.svelte';
	import MaintenanceActions from '../maintenance-actions.svelte';
	import MaintenanceForm from '../maintenance-form.svelte';

	let ticket = $state<Maintenance | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let formOpen = $state(false);
	let suppliers = $state<Lookup[]>([]);

	const canWrite = $derived(session.has('maintenances.write'));
	const id = $derived(page.params.id ?? '');

	async function load() {
		loading = true;
		error = null;
		try {
			ticket = await getMaintenance(id);
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

	function money(cost: string | number | null, currency: string): string {
		if (cost === null || cost === undefined || cost === '') return '—';
		return formatNumber(Number(cost), { style: 'currency', currency });
	}
</script>

<svelte:head>
	<title>{ticket?.title ?? t('maintenance.detailTitle')} · EAT</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<a
		class="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
		href={resolve('/dashboard/maintenances')}
	>
		<ArrowLeftIcon class="size-4" />
		{t('maintenance.backToList')}
	</a>

	{#if loading}
		<div class="flex flex-col gap-3">
			<Skeleton class="h-8 w-64" />
			<Skeleton class="h-48 w-full" />
		</div>
	{:else if error}
		<section class="rounded-lg border bg-card p-6">
			<p class="text-sm text-destructive">{error}</p>
			<Button class="mt-3" variant="outline" size="sm" onclick={load}>{t('table.retry')}</Button>
		</section>
	{:else if ticket}
		<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
			<div class="flex flex-col gap-1">
				<h1 class="text-2xl font-semibold tracking-tight">{ticket.title}</h1>
				<p class="text-sm text-muted-foreground">
					<a
						class="underline-offset-4 hover:underline"
						href={resolve('/dashboard/assets/[id]', { id: ticket.asset_id })}
					>
						{ticket.asset_name ?? t('maintenance.unknownAsset')}
					</a>
					{#if ticket.asset_tag}
						<span class="font-mono text-xs">· {ticket.asset_tag}</span>
					{/if}
				</p>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				<MaintenanceActions maintenance={ticket} onchanged={(updated) => (ticket = updated ?? ticket)} />
				{#if canWrite}
					<Button
						variant="outline"
						size="sm"
						disabled={isClosed(ticket.status)}
						onclick={() => (formOpen = true)}
					>
						<PencilIcon />
						{t('common.edit')}
					</Button>
				{/if}
			</div>
		</div>

		<section class="rounded-lg border bg-card p-6">
			<dl class="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
				<div class="flex flex-col gap-1">
					<dt class="text-xs text-muted-foreground">{t('maintenance.status')}</dt>
					<dd>{t(`maintenance.status.${ticket.status}`)}</dd>
				</div>
				<div class="flex flex-col gap-1">
					<dt class="text-xs text-muted-foreground">{t('maintenance.type')}</dt>
					<dd>{t(`maintenance.type.${ticket.maintenance_type}`)}</dd>
				</div>
				<div class="flex flex-col gap-1">
					<dt class="text-xs text-muted-foreground">{t('maintenance.priority')}</dt>
					<dd>{t(`maintenance.priority.${ticket.priority}`)}</dd>
				</div>
				<div class="flex flex-col gap-1">
					<dt class="text-xs text-muted-foreground">{t('maintenance.assignee')}</dt>
					<dd>{ticket.assigned_user_name ?? '—'}</dd>
				</div>
				<div class="flex flex-col gap-1">
					<dt class="text-xs text-muted-foreground">{t('maintenance.scheduledAt')}</dt>
					<dd>{ticket.scheduled_at ? formatDate(ticket.scheduled_at) : '—'}</dd>
				</div>
				<div class="flex flex-col gap-1">
					<dt class="text-xs text-muted-foreground">{t('maintenance.cost')}</dt>
					<dd>{money(ticket.cost, ticket.currency)}</dd>
				</div>
				<div class="flex flex-col gap-1">
					<dt class="text-xs text-muted-foreground">{t('lookup.suppliers')}</dt>
					<dd>{ticket.supplier_name ?? '—'}</dd>
				</div>
				<div class="flex flex-col gap-1">
					<dt class="text-xs text-muted-foreground">{t('maintenance.rmaReference')}</dt>
					<dd class="font-mono text-xs">{ticket.rma_reference ?? '—'}</dd>
				</div>
				<div class="flex flex-col gap-1">
					<dt class="text-xs text-muted-foreground">{t('maintenance.previousStatus')}</dt>
					<dd>{ticket.previous_status_name ?? '—'}</dd>
				</div>
				<div class="flex flex-col gap-1 sm:col-span-2 lg:col-span-3">
					<dt class="text-xs text-muted-foreground">{t('maintenance.descriptionLabel')}</dt>
					<dd class="whitespace-pre-line">{ticket.description ?? '—'}</dd>
				</div>
				{#if ticket.completion_notes}
					<div class="flex flex-col gap-1 sm:col-span-2 lg:col-span-3">
						<dt class="text-xs text-muted-foreground">{t('maintenance.completionNotes')}</dt>
						<dd class="whitespace-pre-line">{ticket.completion_notes}</dd>
					</div>
				{/if}
				{#if ticket.cancel_reason}
					<div class="flex flex-col gap-1 sm:col-span-2 lg:col-span-3">
						<dt class="text-xs text-muted-foreground">{t('maintenance.cancelReason')}</dt>
						<dd class="whitespace-pre-line">{ticket.cancel_reason}</dd>
					</div>
				{/if}
			</dl>
		</section>

		{#if session.has('attachments.read')}
			<section class="rounded-lg border bg-card p-6">
				<AttachmentPanel attachableType="maintenance" attachableId={ticket.id} />
			</section>
		{/if}

		{#if formOpen}
			<MaintenanceForm
				maintenance={ticket}
				{suppliers}
				onclose={() => (formOpen = false)}
				onsaved={load}
			/>
		{/if}
	{/if}
</div>
