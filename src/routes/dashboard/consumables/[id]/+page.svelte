<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { toast } from 'svelte-sonner';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import ArrowLeftRightIcon from '@lucide/svelte/icons/arrow-left-right';
	import { ApiError } from '#lib/api/client.js';
	import {
		createConsumableTransaction,
		getConsumable,
		listConsumableTransactions,
		type Consumable,
		type ConsumableTransaction,
		type ConsumableTransactionType
	} from '#lib/api/consumables.js';
	import { listLookups, type Lookup } from '#lib/api/lookups.js';
	import { t } from '#lib/i18n/index.js';
	import { session } from '#lib/stores/session.svelte.js';
	import { formatDate } from '#lib/utils.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import { Field, FieldDescription, FieldLabel } from '#lib/components/ui/field/index.js';
	import * as Sheet from '#lib/components/ui/sheet/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import ConsumableForm from '../consumable-form.svelte';

	const id = $derived(page.params.id ?? '');
	const canWrite = $derived(session.has('consumables.write'));
	const canIssue = $derived(session.has('consumables.issue'));

	let consumable = $state<Consumable | null>(null);
	let transactions = $state<ConsumableTransaction[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let editOpen = $state(false);

	let categories = $state<Lookup[]>([]);
	let manufacturers = $state<Lookup[]>([]);
	let suppliers = $state<Lookup[]>([]);
	let locations = $state<Lookup[]>([]);

	let drawerOpen = $state(false);
	let action = $state<ConsumableTransactionType>('restock');
	let quantity = $state('1');
	let userId = $state('');
	let notes = $state('');
	let submitting = $state(false);
	let quantityError = $state<string | null>(null);
	let formError = $state<string | null>(null);

	const actions: ConsumableTransactionType[] = ['restock', 'issue', 'adjustment'];

	function signed(transaction: ConsumableTransaction): string {
		if (transaction.transaction_type === 'issue') return `−${transaction.quantity}`;
		if (transaction.transaction_type === 'restock') return `+${transaction.quantity}`;
		return transaction.quantity > 0 ? `+${transaction.quantity}` : `${transaction.quantity}`;
	}

	async function load() {
		loading = true;
		error = null;
		try {
			consumable = await getConsumable(id);
			transactions = await listConsumableTransactions(id);
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
			// The edit form falls back to empty selects.
		}
	});

	function openDrawer(next: ConsumableTransactionType) {
		action = next;
		quantity = next === 'adjustment' ? '' : '1';
		userId = '';
		notes = '';
		quantityError = null;
		formError = null;
		drawerOpen = true;
	}

	function selectAction(next: ConsumableTransactionType) {
		action = next;
		quantity = next === 'adjustment' ? '' : '1';
		quantityError = null;
		formError = null;
	}

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!consumable) return;
		submitting = true;
		quantityError = null;
		formError = null;
		try {
			await createConsumableTransaction(consumable.id, {
				transaction_type: action,
				quantity: Number(quantity),
				user_id: action === 'issue' ? userId.trim() || undefined : undefined,
				notes: notes || undefined
			});
			toast.success(t('consumable.transactionSaved'));
			drawerOpen = false;
			await load();
		} catch (cause) {
			if (cause instanceof ApiError && cause.status === 409) quantityError = cause.message;
			else
				formError =
					cause instanceof ApiError && cause.status > 0 ? cause.message : t('auth.genericError');
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>{consumable?.name ?? t('consumable.detailTitle')} · EAT</title>
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
	{:else if consumable}
		<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
			<div class="flex flex-col gap-1">
				<a
					class="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
					href={resolve('/dashboard/consumables')}
				>
					<ArrowLeftIcon class="size-3" />
					{t('consumable.backToList')}
				</a>
				<h1 class="text-2xl font-semibold tracking-tight">{consumable.name}</h1>
				<p class="text-sm text-muted-foreground">
					{consumable.category_name ?? '—'}
					{#if consumable.model_number}
						· <span class="font-mono">{consumable.model_number}</span>
					{/if}
				</p>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				{#if consumable.is_archived}
					<Badge variant="secondary">{t('consumable.isArchived')}</Badge>
				{/if}
				{#if canWrite}
					<Button variant="outline" onclick={() => (editOpen = true)}>
						<PencilIcon />
						{t('common.edit')}
					</Button>
				{/if}
				{#if canIssue}
					<Button onclick={() => openDrawer('restock')}>
						<ArrowLeftRightIcon />
						{t('consumable.manageStock')}
					</Button>
				{/if}
			</div>
		</div>

		<div class="grid gap-3 sm:grid-cols-3">
			<section class="rounded-lg border bg-card p-4">
				<p class="text-xs text-muted-foreground">{t('consumable.onHand')}</p>
				<p class="mt-1 text-2xl font-semibold">{consumable.quantity_on_hand}</p>
			</section>
			<section class="rounded-lg border bg-card p-4">
				<p class="text-xs text-muted-foreground">{t('consumable.minStockAlert')}</p>
				<p class="mt-1 text-2xl font-semibold">{consumable.min_stock_alert}</p>
			</section>
			<section class="rounded-lg border bg-card p-4">
				<p class="text-xs text-muted-foreground">{t('consumable.stockState')}</p>
				<p class="mt-1">
					{#if consumable.is_low_stock}
						<Badge variant="destructive">{t('consumable.lowStock')}</Badge>
					{:else}
						<Badge variant="secondary">{t('consumable.inStock')}</Badge>
					{/if}
				</p>
			</section>
		</div>

		<section class="rounded-lg border bg-card">
			<div class="flex items-center justify-between border-b p-3">
				<h2 class="text-sm font-medium">{t('consumable.ledger')}</h2>
				{#if canIssue}
					<Button variant="outline" size="sm" onclick={() => openDrawer('issue')}>
						{t('consumable.issue')}
					</Button>
				{/if}
			</div>
			{#if transactions.length === 0}
				<div class="flex flex-col items-center gap-1 p-10 text-center">
					<p class="font-medium">{t('consumable.noTransactionsTitle')}</p>
					<p class="text-sm text-muted-foreground">{t('consumable.noTransactionsDescription')}</p>
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>{t('consumable.transactionType')}</Table.Head>
							<Table.Head class="text-end">{t('consumable.quantity')}</Table.Head>
							<Table.Head>{t('consumable.issuedTo')}</Table.Head>
							<Table.Head class="hidden md:table-cell">
								{t('consumable.performedBy')}
							</Table.Head>
							<Table.Head class="hidden lg:table-cell">{t('lookup.notes')}</Table.Head>
							<Table.Head class="hidden text-end sm:table-cell">
								{t('consumable.timestamp')}
							</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each transactions as transaction (transaction.id)}
							<Table.Row>
								<Table.Cell>
									<Badge variant="secondary">
										{t(`consumable.type.${transaction.transaction_type}`)}
									</Badge>
								</Table.Cell>
								<Table.Cell class="text-end font-mono">{signed(transaction)}</Table.Cell>
								<Table.Cell class="text-muted-foreground">
									{transaction.user_name ?? '—'}
								</Table.Cell>
								<Table.Cell class="hidden text-muted-foreground md:table-cell">
									{transaction.performed_by_user_name ?? '—'}
								</Table.Cell>
								<Table.Cell class="hidden text-muted-foreground lg:table-cell">
									{transaction.notes ?? '—'}
								</Table.Cell>
								<Table.Cell class="hidden text-end text-muted-foreground sm:table-cell">
									{formatDate(transaction.created_at)}
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}
		</section>
	{/if}
</div>

{#if drawerOpen && consumable}
	<Sheet.Root open onOpenChange={(open) => !open && (drawerOpen = false)}>
		<Sheet.Content side="right" class="w-full sm:max-w-lg">
			<Sheet.Header>
				<Sheet.Title>{t('consumable.manageStock')}</Sheet.Title>
				<Sheet.Description>
					{t('consumable.onHandValue', { count: consumable.quantity_on_hand })}
				</Sheet.Description>
			</Sheet.Header>
			<form class="flex min-h-0 flex-1 flex-col" onsubmit={submit}>
				<div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
					{#if formError}
						<p
							class="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
						>
							{formError}
						</p>
					{/if}
					<div
						class="inline-flex w-fit rounded-md border p-0.5"
						role="group"
						aria-label={t('consumable.transactionType')}
					>
						{#each actions as item (item)}
							<button
								type="button"
								class="rounded-sm px-3 py-1 text-sm transition-colors {action === item
									? 'bg-primary text-primary-foreground'
									: 'text-muted-foreground hover:text-foreground'}"
								aria-pressed={action === item}
								onclick={() => selectAction(item)}
							>
								{t(`consumable.type.${item}`)}
							</button>
						{/each}
					</div>

					<Field>
						<FieldLabel for="transaction-quantity">
							{action === 'adjustment' ? t('consumable.delta') : t('consumable.quantity')} *
						</FieldLabel>
						<Input
							id="transaction-quantity"
							type="number"
							step="1"
							required
							value={quantity}
							oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
								(quantity = event.currentTarget.value)}
						/>
						{#if quantityError}
							<p class="text-sm text-destructive">{quantityError}</p>
						{/if}
						<FieldDescription>{t(`consumable.hint.${action}`)}</FieldDescription>
					</Field>

					{#if action === 'issue'}
						<Field>
							<FieldLabel for="transaction-user">{t('consumable.issuedTo')}</FieldLabel>
							<Input
								id="transaction-user"
								placeholder="UUID"
								value={userId}
								oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
									(userId = event.currentTarget.value)}
							/>
							<FieldDescription>{t('target.userHint')}</FieldDescription>
						</Field>
					{/if}

					<Field>
						<FieldLabel for="transaction-notes">
							{t('lookup.notes')}{action === 'adjustment' ? ' *' : ''}
						</FieldLabel>
						<Input
							id="transaction-notes"
							required={action === 'adjustment'}
							value={notes}
							oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
								(notes = event.currentTarget.value)}
						/>
					</Field>
				</div>
				<div class="flex justify-end gap-2 border-t p-4">
					<Button type="button" variant="outline" onclick={() => (drawerOpen = false)}>
						{t('common.cancel')}
					</Button>
					<Button type="submit" disabled={submitting}>
						{submitting ? t('common.saving') : t('common.save')}
					</Button>
				</div>
			</form>
		</Sheet.Content>
	</Sheet.Root>
{/if}

{#if editOpen && consumable}
	<ConsumableForm
		{consumable}
		{categories}
		{manufacturers}
		{suppliers}
		{locations}
		onclose={() => (editOpen = false)}
		onsaved={load}
	/>
{/if}
