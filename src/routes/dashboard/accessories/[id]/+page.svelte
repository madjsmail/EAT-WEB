<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { toast } from 'svelte-sonner';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import UserPlusIcon from '@lucide/svelte/icons/user-plus';
	import Undo2Icon from '@lucide/svelte/icons/undo-2';
	import { ApiError } from '#lib/api/client.js';
	import {
		assignAccessory,
		getAccessory,
		listAccessoryAssignments,
		returnAccessory,
		type Accessory,
		type AccessoryAssignment
	} from '#lib/api/accessories.js';
	import { listAssets, type Asset } from '#lib/api/assets.js';
	import { listLookups, type Lookup } from '#lib/api/lookups.js';
	import { t } from '#lib/i18n/index.js';
	import { session } from '#lib/stores/session.svelte.js';
	import { formatDate } from '#lib/utils.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import { Field, FieldLabel } from '#lib/components/ui/field/index.js';
	import * as Sheet from '#lib/components/ui/sheet/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import AssignmentTarget from '#lib/components/domain/assignment-target.svelte';
	import AttachmentPanel from '#lib/components/domain/attachment-panel.svelte';
	import AccessoryForm from '../accessory-form.svelte';

	const id = $derived(page.params.id ?? '');
	const canWrite = $derived(session.has('accessories.write'));
	const canAssign = $derived(session.has('accessories.assign'));

	let accessory = $state<Accessory | null>(null);
	let assignments = $state<AccessoryAssignment[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let editOpen = $state(false);

	let categories = $state<Lookup[]>([]);
	let manufacturers = $state<Lookup[]>([]);
	let suppliers = $state<Lookup[]>([]);
	let locations = $state<Lookup[]>([]);
	let assets = $state<Asset[]>([]);

	let assignOpen = $state(false);
	let target = $state<'user' | 'asset'>('user');
	let userId = $state('');
	let assetId = $state('');
	let quantity = $state('1');
	let notes = $state('');
	let submitting = $state(false);
	let formError = $state<string | null>(null);

	let returnOpen = $state(false);
	let returning = $state<AccessoryAssignment | null>(null);
	let returnQuantity = $state('1');
	let returnNotes = $state('');

	const available = $derived(accessory?.available_quantity ?? 0);
	const total = $derived(accessory?.total_quantity ?? 0);
	const usedPercent = $derived(total > 0 ? Math.round(((total - available) / total) * 100) : 0);

	async function load() {
		loading = true;
		error = null;
		try {
			accessory = await getAccessory(id);
			assignments = await listAccessoryAssignments(id);
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
			const [cats, mans, sups, locs, list] = await Promise.all([
				listLookups('categories'),
				listLookups('manufacturers'),
				listLookups('suppliers'),
				listLookups('locations'),
				listAssets({ per_page: 100 })
			]);
			categories = cats;
			manufacturers = mans;
			suppliers = sups;
			locations = locs;
			assets = list.items;
		} catch {
			// Pickers stay empty when lookups are unavailable.
		}
	});

	function openAssign() {
		target = 'user';
		userId = '';
		assetId = '';
		quantity = String(Math.max(available, 1));
		notes = '';
		formError = null;
		assignOpen = true;
	}

	async function submitAssign(event: SubmitEvent) {
		event.preventDefault();
		if (!accessory) return;
		submitting = true;
		formError = null;
		try {
			await assignAccessory(accessory.id, {
				user_id: target === 'user' ? userId.trim() || undefined : undefined,
				asset_id: target === 'asset' ? assetId || undefined : undefined,
				quantity: Number(quantity),
				notes: notes || undefined
			});
			toast.success(t('accessory.assigned'));
			assignOpen = false;
			await load();
		} catch (cause) {
			formError =
				cause instanceof ApiError && cause.status > 0 ? cause.message : t('auth.genericError');
		} finally {
			submitting = false;
		}
	}

	function openReturn(assignment: AccessoryAssignment) {
		returning = assignment;
		returnQuantity = String(assignment.remaining_quantity);
		returnNotes = '';
		formError = null;
		returnOpen = true;
	}

	async function submitReturn(event: SubmitEvent) {
		event.preventDefault();
		if (!accessory || !returning) return;
		submitting = true;
		formError = null;
		try {
			await returnAccessory(accessory.id, returning.id, {
				quantity: Number(returnQuantity),
				notes: returnNotes || undefined
			});
			toast.success(t('accessory.returned'));
			returnOpen = false;
			await load();
		} catch (cause) {
			formError =
				cause instanceof ApiError && cause.status > 0 ? cause.message : t('auth.genericError');
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>{accessory?.name ?? t('accessory.detailTitle')} · EAT</title>
</svelte:head>

<div class="flex flex-col gap-6">
	{#if loading}
		<div class="flex flex-col gap-2">
			<Skeleton class="h-10 w-64" />
			<Skeleton class="h-40 w-full" />
		</div>
	{:else if error}
		<section class="rounded-lg border bg-card p-6">
			<p class="text-sm text-destructive">{error}</p>
			<Button variant="outline" size="sm" class="mt-3" onclick={load}>{t('table.retry')}</Button>
		</section>
	{:else if accessory}
		<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
			<div class="flex flex-col gap-1">
				<a
					class="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
					href={resolve('/dashboard/accessories')}
				>
					<ArrowLeftIcon class="size-3" />
					{t('accessory.backToList')}
				</a>
				<h1 class="text-2xl font-semibold tracking-tight">{accessory.name}</h1>
				<p class="text-sm text-muted-foreground">
					{accessory.category_name ?? '—'}
					{#if accessory.model_number}
						· <span class="font-mono">{accessory.model_number}</span>
					{/if}
				</p>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				{#if accessory.is_archived}
					<Badge variant="secondary">{t('accessory.isArchived')}</Badge>
				{/if}
				{#if canWrite}
					<Button variant="outline" onclick={() => (editOpen = true)}>
						<PencilIcon />
						{t('common.edit')}
					</Button>
				{/if}
				{#if canAssign}
					<Button onclick={openAssign} disabled={available <= 0}>
						<UserPlusIcon />
						{t('accessory.assign')}
					</Button>
				{/if}
			</div>
		</div>

		<section class="rounded-lg border bg-card p-4">
			<div class="flex flex-wrap items-baseline justify-between gap-2">
				<p class="text-sm">
					<span class="font-medium">{t('accessory.availableOf', { available, total })}</span>
				</p>
				<p class="text-xs text-muted-foreground">
					{t('accessory.assignedCount', { count: accessory.assigned_quantity })}
				</p>
			</div>
			<div class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
				<div class="h-full rounded-full bg-primary" style="width: {usedPercent}%"></div>
			</div>
			<div class="mt-4 grid gap-4 sm:grid-cols-3">
				<div class="flex flex-col gap-1">
					<span class="text-xs text-muted-foreground">{t('accessory.minQuantity')}</span>
					<span>{accessory.min_quantity}</span>
				</div>
				<div class="flex flex-col gap-1">
					<span class="text-xs text-muted-foreground">{t('accessory.location')}</span>
					<span>{accessory.location_name ?? '—'}</span>
				</div>
				<div class="flex flex-col gap-1">
					<span class="text-xs text-muted-foreground">{t('accessory.supplier')}</span>
					<span>{accessory.supplier_name ?? '—'}</span>
				</div>
			</div>
		</section>

		<section class="rounded-lg border bg-card">
			<div class="border-b p-3">
				<h2 class="text-sm font-medium">{t('accessory.assignments')}</h2>
			</div>
			{#if assignments.length === 0}
				<div class="flex flex-col items-center gap-1 p-10 text-center">
					<p class="font-medium">{t('accessory.noAssignmentsTitle')}</p>
					<p class="text-sm text-muted-foreground">{t('accessory.noAssignmentsDescription')}</p>
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>{t('accessory.quantity')}</Table.Head>
							<Table.Head>{t('accessory.remaining')}</Table.Head>
							<Table.Head>{t('accessory.targetLabel')}</Table.Head>
							<Table.Head class="hidden md:table-cell">{t('accessory.assignedBy')}</Table.Head>
							<Table.Head class="hidden lg:table-cell">{t('accessory.assignedAt')}</Table.Head>
							<Table.Head class="hidden lg:table-cell">
								{t('accessory.returnedQuantity')}
							</Table.Head>
							<Table.Head class="w-0">{t('common.actions')}</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each assignments as assignment (assignment.id)}
							<Table.Row class={assignment.remaining_quantity === 0 ? 'text-muted-foreground' : ''}>
								<Table.Cell>{assignment.quantity}</Table.Cell>
								<Table.Cell class="font-medium">{assignment.remaining_quantity}</Table.Cell>
								<Table.Cell>
									{#if assignment.user_name}
										{assignment.user_name}
									{:else if assignment.asset_tag}
										<span class="font-mono text-xs">{assignment.asset_tag}</span>
									{:else}
										—
									{/if}
								</Table.Cell>
								<Table.Cell class="hidden text-muted-foreground md:table-cell">
									{assignment.assigned_by_user_name ?? '—'}
								</Table.Cell>
								<Table.Cell class="hidden text-muted-foreground lg:table-cell">
									{formatDate(assignment.assigned_at)}
								</Table.Cell>
								<Table.Cell class="hidden text-muted-foreground lg:table-cell">
									{assignment.returned_quantity}
								</Table.Cell>
								<Table.Cell>
									<div class="flex justify-end">
										{#if canAssign && assignment.remaining_quantity > 0}
											<Button variant="outline" size="sm" onclick={() => openReturn(assignment)}>
												<Undo2Icon />
												{t('accessory.return')}
											</Button>
										{/if}
									</div>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}
		</section>
	{/if}

	{#if accessory && session.has('attachments.read')}
		<section class="rounded-lg border bg-card p-6">
			<AttachmentPanel attachableType="accessory" attachableId={accessory.id} />
		</section>
	{/if}
</div>

{#if assignOpen && accessory}
	<Sheet.Root open onOpenChange={(open) => !open && (assignOpen = false)}>
		<Sheet.Content side="right" class="w-full sm:max-w-lg">
			<Sheet.Header>
				<Sheet.Title>{t('accessory.assignTitle')}</Sheet.Title>
				<Sheet.Description>
					{t('accessory.availableOf', { available, total })}
				</Sheet.Description>
			</Sheet.Header>
			<form class="flex min-h-0 flex-1 flex-col" onsubmit={submitAssign}>
				<div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
					{#if formError}
						<p
							class="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
						>
							{formError}
						</p>
					{/if}
					<AssignmentTarget bind:target bind:userId bind:assetId {assets} />
					<Field>
						<FieldLabel for="assign-quantity">{t('accessory.quantity')} *</FieldLabel>
						<Input
							id="assign-quantity"
							type="number"
							min="1"
							max={available}
							required
							value={quantity}
							oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
								(quantity = event.currentTarget.value)}
						/>
					</Field>
					<Field>
						<FieldLabel for="assign-notes">{t('lookup.notes')}</FieldLabel>
						<Input
							id="assign-notes"
							value={notes}
							oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
								(notes = event.currentTarget.value)}
						/>
					</Field>
				</div>
				<div class="flex justify-end gap-2 border-t p-4">
					<Button type="button" variant="outline" onclick={() => (assignOpen = false)}>
						{t('common.cancel')}
					</Button>
					<Button type="submit" disabled={submitting}>
						{submitting ? t('common.saving') : t('accessory.assign')}
					</Button>
				</div>
			</form>
		</Sheet.Content>
	</Sheet.Root>
{/if}

{#if returnOpen && returning}
	<Sheet.Root open onOpenChange={(open) => !open && (returnOpen = false)}>
		<Sheet.Content side="right" class="w-full sm:max-w-md">
			<Sheet.Header>
				<Sheet.Title>{t('accessory.returnTitle')}</Sheet.Title>
				<Sheet.Description>
					{t('accessory.remainingOf', {
						remaining: returning.remaining_quantity
					})}
				</Sheet.Description>
			</Sheet.Header>
			<form class="flex min-h-0 flex-1 flex-col" onsubmit={submitReturn}>
				<div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
					{#if formError}
						<p
							class="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
						>
							{formError}
						</p>
					{/if}
					<Field>
						<FieldLabel for="return-quantity">{t('accessory.quantity')} *</FieldLabel>
						<Input
							id="return-quantity"
							type="number"
							min="1"
							max={returning.remaining_quantity}
							required
							value={returnQuantity}
							oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
								(returnQuantity = event.currentTarget.value)}
						/>
					</Field>
					<Field>
						<FieldLabel for="return-notes">{t('lookup.notes')}</FieldLabel>
						<Input
							id="return-notes"
							value={returnNotes}
							oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
								(returnNotes = event.currentTarget.value)}
						/>
					</Field>
				</div>
				<div class="flex justify-end gap-2 border-t p-4">
					<Button type="button" variant="outline" onclick={() => (returnOpen = false)}>
						{t('common.cancel')}
					</Button>
					<Button type="submit" disabled={submitting}>
						{submitting ? t('common.saving') : t('accessory.return')}
					</Button>
				</div>
			</form>
		</Sheet.Content>
	</Sheet.Root>
{/if}

{#if editOpen && accessory}
	<AccessoryForm
		{accessory}
		{categories}
		{manufacturers}
		{suppliers}
		{locations}
		onclose={() => (editOpen = false)}
		onsaved={load}
	/>
{/if}
