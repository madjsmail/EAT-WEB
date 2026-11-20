<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { toast } from 'svelte-sonner';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import { ApiError, type Pagination } from '#lib/api/client.js';
	import { deleteLicense, listLicenses, type License } from '#lib/api/licenses.js';
	import { listLookups, type Lookup } from '#lib/api/lookups.js';
	import { t } from '#lib/i18n/index.js';
	import { session } from '#lib/stores/session.svelte.js';
	import { formatDate } from '#lib/utils.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import TablePagination from '#lib/components/domain/table-pagination.svelte';
	import EnumSelect from '#lib/components/domain/enum-select.svelte';
	import LicenseForm from './license-form.svelte';

	const canWrite = $derived(session.has('licenses.write'));

	let licenses = $state<License[]>([]);
	let pagination = $state<Pagination>({ page: 1, per_page: 25, total: 0, total_pages: 0 });
	let loading = $state(true);
	let error = $state<string | null>(null);
	let deletingId = $state<string | null>(null);
	let formOpen = $state(false);
	let editing = $state<License | null>(null);

	let manufacturers = $state<Lookup[]>([]);
	let suppliers = $state<Lookup[]>([]);

	let q = $state('');
	let expiringInDays = $state('');
	let archived = $state('');

	function seatsPercent(license: License): number {
		if (license.total_seats <= 0) return 0;
		return Math.min(100, Math.round((license.active_seats / license.total_seats) * 100));
	}

	function daysLabel(license: License): string | null {
		if (license.days_until_expiry === null) return null;
		return license.days_until_expiry < 0
			? t('license.expiredDays', { days: Math.abs(license.days_until_expiry) })
			: t('license.daysLeft', { days: license.days_until_expiry });
	}

	async function load(page = 1) {
		loading = true;
		error = null;
		try {
			const result = await listLicenses({
				q,
				expiring_in_days:
					expiringInDays === '' ? undefined : (Number(expiringInDays) as 30 | 60 | 90),
				is_archived: archived === '' ? undefined : archived === 'true',
				page,
				per_page: pagination.per_page
			});
			licenses = result.items;
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
			const [mans, sups] = await Promise.all([
				listLookups('manufacturers'),
				listLookups('suppliers')
			]);
			manufacturers = mans;
			suppliers = sups;
		} catch {
			// The form falls back to empty selects.
		}
	});

	function search(event: SubmitEvent) {
		event.preventDefault();
		void load(1);
	}

	async function remove(license: License) {
		if (!confirm(t('license.confirmDelete'))) return;
		deletingId = license.id;
		try {
			await deleteLicense(license.id);
			toast.success(t('license.deleted'));
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
	<title>{t('license.title')} · EAT</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-semibold tracking-tight">{t('license.title')}</h1>
			<p class="text-sm text-muted-foreground">{t('license.description')}</p>
		</div>
		{#if canWrite}
			<Button
				onclick={() => {
					editing = null;
					formOpen = true;
				}}
			>
				<PlusIcon />
				{t('license.add')}
			</Button>
		{/if}
	</div>

	<form class="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3" onsubmit={search}>
		<Input class="sm:max-w-64" placeholder={t('license.searchPlaceholder')} bind:value={q} />
		<EnumSelect
			id="license-expiry"
			value={expiringInDays}
			onchange={(value) => {
				expiringInDays = value;
				load(1);
			}}
			aria-label={t('license.expiringIn')}
			clearLabel={t('license.anyExpiry')}
			options={[
				{ value: '30', label: t('license.withinDays', { days: 30 }) },
				{ value: '60', label: t('license.withinDays', { days: 60 }) },
				{ value: '90', label: t('license.withinDays', { days: 90 }) }
			]}
		/>
		<EnumSelect
			id="license-archived"
			value={archived}
			onchange={(value) => {
				archived = value;
				load(1);
			}}
			aria-label={t('license.isArchived')}
			clearLabel={t('license.allStatuses')}
			options={[
				{ value: 'false', label: t('license.activeOnly') },
				{ value: 'true', label: t('license.archivedOnly') }
			]}
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
				<Button variant="outline" size="sm" onclick={() => load(pagination.page)}>
					{t('table.retry')}
				</Button>
			</div>
		{:else if licenses.length === 0}
			<div class="flex flex-col items-center gap-1 p-10 text-center">
				<p class="font-medium">{t('license.emptyTitle')}</p>
				<p class="text-sm text-muted-foreground">{t('license.emptyDescription')}</p>
			</div>
		{:else}
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>{t('license.name')}</Table.Head>
						<Table.Head class="hidden md:table-cell">{t('license.type')}</Table.Head>
						<Table.Head class="min-w-40">{t('license.seats')}</Table.Head>
						<Table.Head class="hidden sm:table-cell">{t('license.expirationDate')}</Table.Head>
						<Table.Head class="hidden lg:table-cell">{t('license.supplier')}</Table.Head>
						<Table.Head class="w-0">{t('common.actions')}</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each licenses as license (license.id)}
						<Table.Row>
							<Table.Cell>
								<div class="flex flex-col">
									<a
										class="font-medium underline-offset-4 hover:underline"
										href={resolve('/dashboard/licenses/[id]', { id: license.id })}
									>
										{license.name}
									</a>
									{#if license.manufacturer_name}
										<span class="text-xs text-muted-foreground">{license.manufacturer_name}</span>
									{/if}
								</div>
							</Table.Cell>
							<Table.Cell class="hidden md:table-cell">
								<Badge variant="secondary">{t(`license.type.${license.license_type}`)}</Badge>
							</Table.Cell>
							<Table.Cell>
								<div class="flex flex-col gap-1">
									<span class="text-xs text-muted-foreground">
										{t('license.seatsValue', {
											active: license.active_seats,
											total: license.total_seats
										})}
									</span>
									<div class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
										<div
											class="h-full rounded-full bg-primary"
											style="width: {seatsPercent(license)}%"
										></div>
									</div>
								</div>
							</Table.Cell>
							<Table.Cell class="hidden sm:table-cell">
								<div class="flex flex-col gap-1">
									<span class="text-sm whitespace-nowrap">
										{license.expiration_date ? formatDate(license.expiration_date) : '—'}
									</span>
									{#if license.days_until_expiry !== null}
										{#if license.days_until_expiry < 0}
											<Badge variant="destructive" class="w-fit">{daysLabel(license)}</Badge>
										{:else if license.days_until_expiry <= 30}
											<Badge
												class="w-fit bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
											>
												{daysLabel(license)}
											</Badge>
										{:else}
											<Badge variant="secondary" class="w-fit">{daysLabel(license)}</Badge>
										{/if}
									{/if}
								</div>
							</Table.Cell>
							<Table.Cell class="hidden text-muted-foreground lg:table-cell">
								{license.supplier_name ?? '—'}
							</Table.Cell>
							<Table.Cell>
								<div class="flex items-center justify-end gap-1">
									{#if license.is_archived}
										<Badge variant="secondary">{t('license.isArchived')}</Badge>
									{/if}
									{#if canWrite}
										<Button
											variant="ghost"
											size="icon-sm"
											aria-label={t('common.edit')}
											onclick={() => {
												editing = license;
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
											disabled={deletingId === license.id}
											onclick={() => remove(license)}
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
	<LicenseForm
		license={editing}
		{manufacturers}
		{suppliers}
		onclose={() => (formOpen = false)}
		onsaved={() => load(pagination.page)}
	/>
{/if}
