<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { toast } from 'svelte-sonner';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import UserPlusIcon from '@lucide/svelte/icons/user-plus';
	import BanIcon from '@lucide/svelte/icons/ban';
	import { ApiError } from '#lib/api/client.js';
	import {
		allocateLicenseSeat,
		getLicense,
		listLicenseSeats,
		revokeLicenseSeat,
		type License,
		type LicenseSeat
	} from '#lib/api/licenses.js';
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
	import LicenseForm from '../license-form.svelte';

	const id = $derived(page.params.id ?? '');
	const canWrite = $derived(session.has('licenses.write'));
	const canAssign = $derived(session.has('licenses.assign'));

	let license = $state<License | null>(null);
	let seats = $state<LicenseSeat[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let editOpen = $state(false);

	let manufacturers = $state<Lookup[]>([]);
	let suppliers = $state<Lookup[]>([]);
	let assets = $state<Asset[]>([]);

	let allocateOpen = $state(false);
	let target = $state<'user' | 'asset'>('user');
	let userId = $state('');
	let assetId = $state('');
	let notes = $state('');
	let submitting = $state(false);
	let formError = $state<string | null>(null);

	let revokeOpen = $state(false);
	let revoking = $state<LicenseSeat | null>(null);
	let revokeNotes = $state('');

	const seatsPercent = $derived(
		license && license.total_seats > 0
			? Math.min(100, Math.round((license.active_seats / license.total_seats) * 100))
			: 0
	);

	async function load() {
		loading = true;
		error = null;
		try {
			license = await getLicense(id);
			seats = await listLicenseSeats(id);
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
			const [mans, sups, list] = await Promise.all([
				listLookups('manufacturers'),
				listLookups('suppliers'),
				listAssets({ per_page: 100 })
			]);
			manufacturers = mans;
			suppliers = sups;
			assets = list.items;
		} catch {
			// Pickers stay empty when lookups are unavailable.
		}
	});

	function openAllocate() {
		target = 'user';
		userId = '';
		assetId = '';
		notes = '';
		formError = null;
		allocateOpen = true;
	}

	async function submitAllocate(event: SubmitEvent) {
		event.preventDefault();
		if (!license) return;
		submitting = true;
		formError = null;
		try {
			await allocateLicenseSeat(license.id, {
				user_id: target === 'user' ? userId.trim() || undefined : undefined,
				asset_id: target === 'asset' ? assetId || undefined : undefined,
				notes: notes || undefined
			});
			toast.success(t('license.seatAllocated'));
			allocateOpen = false;
			await load();
		} catch (cause) {
			formError =
				cause instanceof ApiError && cause.status > 0 ? cause.message : t('auth.genericError');
		} finally {
			submitting = false;
		}
	}

	function openRevoke(seat: LicenseSeat) {
		revoking = seat;
		revokeNotes = '';
		formError = null;
		revokeOpen = true;
	}

	async function submitRevoke(event: SubmitEvent) {
		event.preventDefault();
		if (!license || !revoking) return;
		submitting = true;
		formError = null;
		try {
			await revokeLicenseSeat(license.id, revoking.id, { notes: revokeNotes || undefined });
			toast.success(t('license.seatRevoked'));
			revokeOpen = false;
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
	<title>{license?.name ?? t('license.detailTitle')} · EAT</title>
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
	{:else if license}
		<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
			<div class="flex flex-col gap-1">
				<a
					class="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
					href={resolve('/dashboard/licenses')}
				>
					<ArrowLeftIcon class="size-3" />
					{t('license.backToList')}
				</a>
				<h1 class="text-2xl font-semibold tracking-tight">{license.name}</h1>
				<p class="text-sm text-muted-foreground">
					{t(`license.type.${license.license_type}`)}
					{#if license.manufacturer_name}
						· {license.manufacturer_name}
					{/if}
				</p>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				{#if license.is_archived}
					<Badge variant="secondary">{t('license.isArchived')}</Badge>
				{/if}
				{#if canWrite}
					<Button variant="outline" onclick={() => (editOpen = true)}>
						<PencilIcon />
						{t('common.edit')}
					</Button>
				{/if}
				{#if canAssign}
					<Button onclick={openAllocate} disabled={license.available_seats <= 0}>
						<UserPlusIcon />
						{t('license.allocate')}
					</Button>
				{/if}
			</div>
		</div>

		<div class="grid gap-3 sm:grid-cols-3">
			<section class="rounded-lg border bg-card p-4">
				<p class="text-xs text-muted-foreground">{t('license.seats')}</p>
				<p class="mt-1 text-2xl font-semibold">
					{license.active_seats} / {license.total_seats}
				</p>
				<div class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
					<div class="h-full rounded-full bg-primary" style="width: {seatsPercent}%"></div>
				</div>
			</section>
			<section class="rounded-lg border bg-card p-4">
				<p class="text-xs text-muted-foreground">{t('license.availableSeats')}</p>
				<p class="mt-1 text-2xl font-semibold">{license.available_seats}</p>
			</section>
			<section class="rounded-lg border bg-card p-4">
				<p class="text-xs text-muted-foreground">{t('license.expirationDate')}</p>
				<p class="mt-1 text-sm font-medium">
					{license.expiration_date ? formatDate(license.expiration_date) : '—'}
				</p>
				{#if license.days_until_expiry !== null}
					{#if license.days_until_expiry < 0}
						<Badge variant="destructive" class="mt-1 w-fit">
							{t('license.expiredDays', { days: Math.abs(license.days_until_expiry) })}
						</Badge>
					{:else}
						<Badge variant="secondary" class="mt-1 w-fit">
							{t('license.daysLeft', { days: license.days_until_expiry })}
						</Badge>
					{/if}
				{/if}
			</section>
		</div>

		<section class="rounded-lg border bg-card">
			<div class="border-b p-3">
				<h2 class="text-sm font-medium">{t('license.allocatedSeats')}</h2>
			</div>
			{#if seats.length === 0}
				<div class="flex flex-col items-center gap-1 p-10 text-center">
					<p class="font-medium">{t('license.noSeatsTitle')}</p>
					<p class="text-sm text-muted-foreground">{t('license.noSeatsDescription')}</p>
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>{t('license.target')}</Table.Head>
							<Table.Head>{t('license.seatStatus')}</Table.Head>
							<Table.Head class="hidden md:table-cell">{t('license.assignedBy')}</Table.Head>
							<Table.Head class="hidden lg:table-cell">{t('license.assignedAt')}</Table.Head>
							<Table.Head class="hidden lg:table-cell">{t('license.revokedAt')}</Table.Head>
							<Table.Head class="hidden lg:table-cell">{t('lookup.notes')}</Table.Head>
							<Table.Head class="w-0">{t('common.actions')}</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each seats as seat (seat.id)}
							<Table.Row class={seat.revoked_at ? 'text-muted-foreground' : ''}>
								<Table.Cell>
									{#if seat.user_name}
										{seat.user_name}
									{:else if seat.asset_tag}
										<span class="font-mono text-xs">{seat.asset_tag}</span>
									{:else}
										—
									{/if}
								</Table.Cell>
								<Table.Cell>
									{#if seat.revoked_at}
										<Badge variant="secondary">{t('license.seat.revoked')}</Badge>
									{:else}
										<Badge>{t('license.seat.active')}</Badge>
									{/if}
								</Table.Cell>
								<Table.Cell class="hidden md:table-cell">
									{seat.assigned_by_user_name ?? '—'}
								</Table.Cell>
								<Table.Cell class="hidden lg:table-cell">
									{formatDate(seat.assigned_at)}
								</Table.Cell>
								<Table.Cell class="hidden lg:table-cell">
									{seat.revoked_at ? formatDate(seat.revoked_at) : '—'}
								</Table.Cell>
								<Table.Cell class="hidden lg:table-cell">{seat.notes ?? '—'}</Table.Cell>
								<Table.Cell>
									<div class="flex justify-end">
										{#if canAssign && !seat.revoked_at}
											<Button variant="outline" size="sm" onclick={() => openRevoke(seat)}>
												<BanIcon />
												{t('license.revoke')}
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

	{#if license && session.has('attachments.read')}
		<section class="rounded-lg border bg-card p-6">
			<AttachmentPanel attachableType="license" attachableId={license.id} />
		</section>
	{/if}
</div>

{#if allocateOpen && license}
	<Sheet.Root open onOpenChange={(open) => !open && (allocateOpen = false)}>
		<Sheet.Content side="right" class="w-full sm:max-w-lg">
			<Sheet.Header>
				<Sheet.Title>{t('license.allocateTitle')}</Sheet.Title>
				<Sheet.Description>
					{t('license.seatsValue', {
						active: license.active_seats,
						total: license.total_seats
					})}
				</Sheet.Description>
			</Sheet.Header>
			<form class="flex min-h-0 flex-1 flex-col" onsubmit={submitAllocate}>
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
						<FieldLabel for="allocate-notes">{t('lookup.notes')}</FieldLabel>
						<Input
							id="allocate-notes"
							value={notes}
							oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
								(notes = event.currentTarget.value)}
						/>
					</Field>
				</div>
				<div class="flex justify-end gap-2 border-t p-4">
					<Button type="button" variant="outline" onclick={() => (allocateOpen = false)}>
						{t('common.cancel')}
					</Button>
					<Button type="submit" disabled={submitting}>
						{submitting ? t('common.saving') : t('license.allocate')}
					</Button>
				</div>
			</form>
		</Sheet.Content>
	</Sheet.Root>
{/if}

{#if revokeOpen && revoking}
	<Sheet.Root open onOpenChange={(open) => !open && (revokeOpen = false)}>
		<Sheet.Content side="right" class="w-full sm:max-w-md">
			<Sheet.Header>
				<Sheet.Title>{t('license.revokeTitle')}</Sheet.Title>
				<Sheet.Description>{t('license.revokeDescription')}</Sheet.Description>
			</Sheet.Header>
			<form class="flex min-h-0 flex-1 flex-col" onsubmit={submitRevoke}>
				<div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
					{#if formError}
						<p
							class="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
						>
							{formError}
						</p>
					{/if}
					<Field>
						<FieldLabel for="revoke-notes">{t('license.revokeNotes')}</FieldLabel>
						<Input
							id="revoke-notes"
							value={revokeNotes}
							oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
								(revokeNotes = event.currentTarget.value)}
						/>
					</Field>
				</div>
				<div class="flex justify-end gap-2 border-t p-4">
					<Button type="button" variant="outline" onclick={() => (revokeOpen = false)}>
						{t('common.cancel')}
					</Button>
					<Button type="submit" variant="destructive" disabled={submitting}>
						{submitting ? t('common.saving') : t('license.revoke')}
					</Button>
				</div>
			</form>
		</Sheet.Content>
	</Sheet.Root>
{/if}

{#if editOpen && license}
	<LicenseForm
		{license}
		{manufacturers}
		{suppliers}
		onclose={() => (editOpen = false)}
		onsaved={load}
	/>
{/if}
