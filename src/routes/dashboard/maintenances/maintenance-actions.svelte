<script lang="ts">
	import { toast } from 'svelte-sonner';
	import PlayIcon from '@lucide/svelte/icons/play';
	import CheckIcon from '@lucide/svelte/icons/check';
	import XIcon from '@lucide/svelte/icons/x';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Field, FieldLabel } from '#lib/components/ui/field/index.js';
	import * as Sheet from '#lib/components/ui/sheet/index.js';
	import { ApiError } from '#lib/api/client.js';
	import { listLookups, type Lookup } from '#lib/api/lookups.js';
	import {
		cancelMaintenance,
		completeMaintenance,
		legalActions,
		startMaintenance,
		type Maintenance
	} from '#lib/api/maintenances.js';
	import { t } from '#lib/i18n/index.js';
	import { lookupOptions } from '#lib/config/select-options.js';
	import { session } from '#lib/stores/session.svelte.js';
	import SearchSelect from '#lib/components/domain/search-select.svelte';

	let {
		maintenance,
		onchanged
	}: {
		maintenance: Maintenance;
		onchanged: (updated?: Maintenance) => void;
	} = $props();

	const canWrite = $derived(session.has('maintenances.write'));
	const actions = $derived(legalActions(maintenance.status));

	let busy = $state(false);
	let error = $state<string | null>(null);
	let completeOpen = $state(false);
	let cancelOpen = $state(false);
	let completionNotes = $state('');
	let completionCost = $state('');
	let restoreStatusId = $state('');
	let cancelReason = $state('');
	let statuses = $state<Lookup[]>([]);

	const statusChoices = $derived(lookupOptions(statuses));

	async function start() {
		busy = true;
		error = null;
		try {
			const updated = await startMaintenance(maintenance.id);
			toast.success(t('maintenance.started'));
			onchanged(updated);
		} catch (cause) {
			error = cause instanceof ApiError && cause.status > 0 ? cause.message : t('auth.genericError');
		} finally {
			busy = false;
		}
	}

	async function openComplete() {
		completionNotes = '';
		completionCost = maintenance.cost == null ? '' : String(maintenance.cost);
		restoreStatusId = '';
		error = null;
		completeOpen = true;
		try {
			statuses = await listLookups('statuses');
		} catch {
			statuses = [];
		}
	}

	async function submitComplete(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		error = null;
		try {
			const updated = await completeMaintenance(maintenance.id, {
				completion_notes: completionNotes,
				cost: completionCost || null,
				restore_status_id: restoreStatusId || null
			});
			toast.success(
				t('maintenance.restoredToast', { status: updated.previous_status_name ?? '—' })
			);
			completeOpen = false;
			onchanged(updated);
		} catch (cause) {
			error = cause instanceof ApiError && cause.status > 0 ? cause.message : t('auth.genericError');
		} finally {
			busy = false;
		}
	}

	async function submitCancel(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		error = null;
		try {
			const updated = await cancelMaintenance(maintenance.id, { reason: cancelReason });
			toast.success(
				t('maintenance.restoredToast', { status: updated.previous_status_name ?? '—' })
			);
			cancelOpen = false;
			onchanged(updated);
		} catch (cause) {
			error = cause instanceof ApiError && cause.status > 0 ? cause.message : t('auth.genericError');
		} finally {
			busy = false;
		}
	}
</script>

{#if canWrite && actions.length > 0}
	<div class="flex flex-wrap items-center gap-2">
		{#if actions.includes('start')}
			<Button size="sm" disabled={busy} onclick={start}>
				<PlayIcon />
				{t('maintenance.start')}
			</Button>
		{/if}
		{#if actions.includes('complete')}
			<Button size="sm" disabled={busy} onclick={openComplete}>
				<CheckIcon />
				{t('maintenance.complete')}
			</Button>
		{/if}
		{#if actions.includes('cancel')}
			<Button
				size="sm"
				variant="outline"
				disabled={busy}
				onclick={() => {
					cancelReason = '';
					error = null;
					cancelOpen = true;
				}}
			>
				<XIcon />
				{t('maintenance.cancelTicket')}
			</Button>
		{/if}
		{#if error && !completeOpen && !cancelOpen}
			<p class="text-sm text-destructive">{error}</p>
		{/if}
	</div>
{/if}

{#if completeOpen}
	<Sheet.Root open onOpenChange={(open) => !open && (completeOpen = false)}>
		<Sheet.Content side="right" class="w-full sm:max-w-md">
			<Sheet.Header>
				<Sheet.Title>{t('maintenance.completeTitle')}</Sheet.Title>
				<Sheet.Description>{t('maintenance.completeDescription')}</Sheet.Description>
			</Sheet.Header>
			<form class="flex min-h-0 flex-1 flex-col" onsubmit={submitComplete}>
				<div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
					{#if error}
						<p
							class="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
						>
							{error}
						</p>
					{/if}
					<Field>
						<FieldLabel for="completion-notes">{t('maintenance.completionNotes')} *</FieldLabel>
						<textarea
							id="completion-notes"
							class="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
							required
							bind:value={completionNotes}></textarea>
					</Field>
					<Field>
						<FieldLabel for="completion-cost">{t('maintenance.cost')}</FieldLabel>
						<Input id="completion-cost" type="number" step="0.01" bind:value={completionCost} />
					</Field>
					<Field>
						<FieldLabel for="completion-status">{t('maintenance.restoreStatus')}</FieldLabel>
						<SearchSelect
							id="completion-status"
							bind:value={restoreStatusId}
							options={statusChoices}
							allowClear
							allLabel={t('maintenance.previousStatus')}
						/>
					</Field>
				</div>
				<div class="flex justify-end gap-2 border-t p-4">
					<Button type="button" variant="outline" onclick={() => (completeOpen = false)}>
						{t('common.cancel')}
					</Button>
					<Button type="submit" disabled={busy}>
						{busy ? t('common.saving') : t('maintenance.complete')}
					</Button>
				</div>
			</form>
		</Sheet.Content>
	</Sheet.Root>
{/if}

{#if cancelOpen}
	<Sheet.Root open onOpenChange={(open) => !open && (cancelOpen = false)}>
		<Sheet.Content side="right" class="w-full sm:max-w-md">
			<Sheet.Header>
				<Sheet.Title>{t('maintenance.cancelTitle')}</Sheet.Title>
				<Sheet.Description>{t('maintenance.cancelDescription')}</Sheet.Description>
			</Sheet.Header>
			<form class="flex min-h-0 flex-1 flex-col" onsubmit={submitCancel}>
				<div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
					{#if error}
						<p
							class="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
						>
							{error}
						</p>
					{/if}
					<Field>
						<FieldLabel for="cancel-reason">{t('maintenance.cancelReason')} *</FieldLabel>
						<Input id="cancel-reason" required bind:value={cancelReason} />
					</Field>
				</div>
				<div class="flex justify-end gap-2 border-t p-4">
					<Button type="button" variant="outline" onclick={() => (cancelOpen = false)}>
						{t('common.cancel')}
					</Button>
					<Button type="submit" variant="destructive" disabled={busy}>
						{busy ? t('common.saving') : t('maintenance.cancelTicket')}
					</Button>
				</div>
			</form>
		</Sheet.Content>
	</Sheet.Root>
{/if}
