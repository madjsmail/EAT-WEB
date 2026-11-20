<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { toast } from 'svelte-sonner';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import UserMinusIcon from '@lucide/svelte/icons/user-minus';
	import { ApiError } from '#lib/api/client.js';
	import {
		deleteUser,
		getUser,
		listDirectReports,
		listPendingReturns,
		userLabel,
		type PendingReturn,
		type UserResponse
	} from '#lib/api/users.js';
	import { listAssets, returnAsset, type Asset } from '#lib/api/assets.js';
	import { returnAccessory } from '#lib/api/accessories.js';
	import { revokeLicenseSeat } from '#lib/api/licenses.js';
	import { t } from '#lib/i18n/index.js';
	import { session } from '#lib/stores/session.svelte.js';
	import { formatDate } from '#lib/utils.js';
	import * as Avatar from '#lib/components/ui/avatar/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import UserForm from '#lib/components/domain/user-form.svelte';
	import OffboardSheet from '#lib/components/domain/offboard-sheet.svelte';

	const canUpdate = $derived(session.has('users.update'));
	const canDelete = $derived(session.has('users.delete'));
	const canOffboard = $derived(session.has('users.offboard'));

	const userId = $derived(page.params.id ?? '');

	const statusClasses: Record<string, string> = {
		invited: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
		active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
		suspended: 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300',
		offboarded: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300'
	};

	let user = $state<UserResponse | null>(null);
	let reports = $state<UserResponse[]>([]);
	let assets = $state<Asset[]>([]);
	let pendingReturns = $state<PendingReturn[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let editOpen = $state(false);
	let offboardOpen = $state(false);
	let returningId = $state<string | null>(null);
	let deleting = $state(false);

	async function load() {
		loading = true;
		error = null;
		try {
			user = await getUser(userId);
		} catch (cause) {
			error =
				cause instanceof ApiError && cause.status > 0 ? cause.message : t('auth.genericError');
			loading = false;
			return;
		}

		const [reportResult, assetResult, returnResult] = await Promise.allSettled([
			listDirectReports(userId),
			listAssets({ assigned_user_id: userId, per_page: 100 }),
			listPendingReturns(userId)
		]);
		reports = reportResult.status === 'fulfilled' ? reportResult.value : [];
		assets = assetResult.status === 'fulfilled' ? assetResult.value.items : [];
		pendingReturns = returnResult.status === 'fulfilled' ? returnResult.value : [];
		loading = false;
	}

	onMount(load);

	async function markReturned(item: PendingReturn) {
		returningId = item.id;
		try {
			if (item.entity_type === 'asset') {
				await returnAsset(item.entity_id, {});
			} else if (item.entity_type === 'accessory') {
				await returnAccessory(item.entity_id, item.id, { quantity: item.quantity });
			} else {
				await revokeLicenseSeat(item.entity_id, item.id);
			}
			pendingReturns = pendingReturns.filter((entry) => entry.id !== item.id);
			toast.success(t('user.returned'));
		} catch (cause) {
			toast.error(
				cause instanceof ApiError && cause.status > 0 ? cause.message : t('auth.genericError')
			);
		} finally {
			returningId = null;
		}
	}

	async function remove() {
		if (!user || !confirm(t('user.confirmDelete'))) return;
		deleting = true;
		try {
			await deleteUser(user.id);
			toast.success(t('user.deleted'));
			await goto(resolve('/dashboard/users'));
		} catch (cause) {
			toast.error(
				cause instanceof ApiError && cause.status > 0 ? cause.message : t('auth.genericError')
			);
			deleting = false;
		}
	}
</script>

<svelte:head>
	<title>{user ? userLabel(user) : t('user.title')} · EAT</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<Button variant="ghost" size="sm" class="w-fit" href={resolve('/dashboard/users')}>
		<ArrowLeftIcon />
		{t('user.backToDirectory')}
	</Button>

	{#if loading}
		<Skeleton class="h-40 w-full" />
		<Skeleton class="h-64 w-full" />
	{:else if error || !user}
		<div class="flex flex-col items-start gap-3 rounded-lg border bg-card p-6">
			<p class="text-sm text-destructive">{error ?? t('auth.genericError')}</p>
			<Button variant="outline" size="sm" onclick={load}>{t('table.retry')}</Button>
		</div>
	{:else}
		<section class="flex flex-col gap-4 rounded-lg border bg-card p-5">
			<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div class="flex items-start gap-4">
					<Avatar.Root class="size-14">
						{#if user.avatar_url}
							<Avatar.Image src={user.avatar_url} alt="" />
						{/if}
						<Avatar.Fallback class="text-lg">
							{user.first_name[0] ?? ''}{user.last_name[0] ?? ''}
						</Avatar.Fallback>
					</Avatar.Root>
					<div class="flex flex-col gap-1">
						<div class="flex flex-wrap items-center gap-2">
							<h1 class="text-2xl font-semibold tracking-tight">{userLabel(user)}</h1>
							<Badge class={statusClasses[user.status]}>{t(`user.status.${user.status}`)}</Badge>
						</div>
						<p class="text-sm text-muted-foreground">{user.job_title ?? '—'}</p>
						<p class="text-sm">{user.email}</p>
						<p class="text-sm text-muted-foreground">
							{user.phone_number ?? t('user.noPhone')}
						</p>
					</div>
				</div>

				<div class="flex flex-wrap gap-2">
					{#if canUpdate}
						<Button variant="outline" onclick={() => (editOpen = true)}>
							<PencilIcon />
							{t('common.edit')}
						</Button>
					{/if}
					{#if canOffboard && user.status !== 'offboarded'}
						<Button variant="outline" onclick={() => (offboardOpen = true)}>
							<UserMinusIcon />
							{t('user.offboard')}
						</Button>
					{/if}
					{#if canDelete}
						<Button variant="ghost" class="text-destructive" disabled={deleting} onclick={remove}>
							<Trash2Icon />
							{t('common.delete')}
						</Button>
					{/if}
				</div>
			</div>

			<dl class="grid gap-3 border-t pt-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
				<div class="flex flex-col gap-0.5">
					<dt class="text-xs text-muted-foreground">{t('user.tableEmployeeId')}</dt>
					<dd class="font-mono">{user.employee_id ?? '—'}</dd>
				</div>
				<div class="flex flex-col gap-0.5">
					<dt class="text-xs text-muted-foreground">{t('user.tableDepartment')}</dt>
					<dd>{user.department_name ?? '—'}</dd>
				</div>
				<div class="flex flex-col gap-0.5">
					<dt class="text-xs text-muted-foreground">{t('user.tableLocation')}</dt>
					<dd>{user.location_name ?? '—'}</dd>
				</div>
				<div class="flex flex-col gap-0.5">
					<dt class="text-xs text-muted-foreground">{t('user.tableManager')}</dt>
					<dd>{user.manager_name ?? t('user.managerNone')}</dd>
				</div>
				<div class="flex flex-col gap-0.5">
					<dt class="text-xs text-muted-foreground">{t('user.tableLocale')}</dt>
					<dd class="uppercase">{user.preferred_locale}</dd>
				</div>
				<div class="flex flex-col gap-0.5">
					<dt class="text-xs text-muted-foreground">{t('user.tableStatus')}</dt>
					<dd>{user.email_verified_at ? t('user.emailVerified') : t('user.emailNotVerified')}</dd>
				</div>
				<div class="flex flex-col gap-0.5">
					<dt class="text-xs text-muted-foreground">{t('user.tableLastLogin')}</dt>
					<dd>{user.last_login_at ? formatDate(user.last_login_at) : t('user.never')}</dd>
				</div>
				<div class="flex flex-col gap-0.5">
					<dt class="text-xs text-muted-foreground">{t('user.details')}</dt>
					<dd>{formatDate(user.created_at)}</dd>
				</div>
			</dl>
		</section>

		<div class="grid gap-6 lg:grid-cols-2">
			<section class="flex flex-col gap-3 rounded-lg border bg-card p-5">
				<h2 class="font-semibold">{t('user.directReports')}</h2>
				{#if reports.length === 0}
					<p class="text-sm text-muted-foreground">{t('user.directReportsEmpty')}</p>
				{:else}
					<ul class="flex flex-col divide-y">
						{#each reports as report (report.id)}
							<li>
								<a
									class="flex items-center gap-3 py-2 underline-offset-4 hover:underline"
									href={resolve('/dashboard/users/[id]', { id: report.id })}
								>
									<Avatar.Root class="size-7">
										<Avatar.Fallback class="text-xs">
											{report.first_name[0] ?? ''}{report.last_name[0] ?? ''}
										</Avatar.Fallback>
									</Avatar.Root>
									<span class="flex min-w-0 flex-col">
										<span class="truncate text-sm font-medium">{userLabel(report)}</span>
										<span class="truncate text-xs text-muted-foreground">
											{report.job_title ?? report.email}
										</span>
									</span>
								</a>
							</li>
						{/each}
					</ul>
				{/if}
			</section>

			{#if user.status === 'offboarded' || pendingReturns.length > 0}
				<section class="flex flex-col gap-3 rounded-lg border bg-card p-5">
					<h2 class="font-semibold">{t('user.pendingReturnsTitle')}</h2>
					{#if pendingReturns.length === 0}
						<p class="text-sm text-muted-foreground">{t('user.pendingReturnsEmpty')}</p>
					{:else}
						<p class="text-sm text-muted-foreground">{t('user.pendingReturnsDescription')}</p>
						<ul class="flex flex-col divide-y">
							{#each pendingReturns as item (item.id)}
								<li class="flex items-center justify-between gap-3 py-2">
									<div class="flex min-w-0 flex-col">
										<span class="truncate text-sm">{item.label}</span>
										<span class="text-xs text-muted-foreground">
											{t(`user.entity.${item.entity_type}`)} ·
											{t('user.pendingReturnQuantity', { count: item.quantity })}
										</span>
									</div>
									<Button
										variant="outline"
										size="sm"
										disabled={returningId === item.id}
										onclick={() => markReturned(item)}
									>
										{t('user.markReturned')}
									</Button>
								</li>
							{/each}
						</ul>
					{/if}
				</section>
			{/if}
		</div>

		<section class="rounded-lg border bg-card">
			<div class="p-5 pb-3">
				<h2 class="font-semibold">{t('user.assignedAssets')}</h2>
			</div>
			{#if assets.length === 0}
				<p class="px-5 pb-5 text-sm text-muted-foreground">{t('user.assignedAssetsEmpty')}</p>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>{t('user.assetTag')}</Table.Head>
							<Table.Head>{t('user.assetName')}</Table.Head>
							<Table.Head class="hidden sm:table-cell">{t('user.assetStatus')}</Table.Head>
							<Table.Head class="hidden sm:table-cell">{t('user.assetLocation')}</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each assets as asset (asset.id)}
							<Table.Row>
								<Table.Cell class="font-mono text-xs">
									<a
										class="underline-offset-4 hover:underline"
										href={resolve('/dashboard/assets/[id]', { id: asset.id })}
									>
										{asset.asset_tag}
									</a>
								</Table.Cell>
								<Table.Cell>{asset.name}</Table.Cell>
								<Table.Cell class="hidden sm:table-cell">{asset.status_name ?? '—'}</Table.Cell>
								<Table.Cell class="hidden text-muted-foreground sm:table-cell">
									{asset.location_name ?? '—'}
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}
		</section>
	{/if}
</div>

{#if editOpen && user}
	<UserForm {user} onclose={() => (editOpen = false)} onsaved={load} />
{/if}

{#if offboardOpen && user}
	<OffboardSheet
		{user}
		onclose={() => (offboardOpen = false)}
		onupdated={() => {
			offboardOpen = false;
			void load();
		}}
	/>
{/if}
