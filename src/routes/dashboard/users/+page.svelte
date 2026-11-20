<script lang="ts">
	import { onMount } from 'svelte';
	import { debounce } from '@tanstack/pacer';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { toast } from 'svelte-sonner';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import UploadIcon from '@lucide/svelte/icons/upload';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import UserMinusIcon from '@lucide/svelte/icons/user-minus';
	import SendIcon from '@lucide/svelte/icons/send';
	import { ApiError, buildQuery, type Pagination } from '#lib/api/client.js';
	import { requestLoginLink } from '#lib/api/auth.js';
	import {
		deleteUser,
		listUsers,
		userLabel,
		type UserResponse,
		type UserStatus
	} from '#lib/api/users.js';
	import { listLookups, type Lookup } from '#lib/api/lookups.js';
	import { lookupOptions } from '#lib/config/select-options.js';
	import { currentOrgSlug } from '#lib/config/tenant.js';
	import { t } from '#lib/i18n/index.js';
	import { session } from '#lib/stores/session.svelte.js';
	import { formatDate } from '#lib/utils.js';
	import * as Avatar from '#lib/components/ui/avatar/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import TablePagination from '#lib/components/domain/table-pagination.svelte';
	import SearchSelect from '#lib/components/domain/search-select.svelte';
	import UserSelect from '#lib/components/domain/user-select.svelte';
	import UserForm from '#lib/components/domain/user-form.svelte';
	import OffboardSheet from '#lib/components/domain/offboard-sheet.svelte';

	const canCreate = $derived(session.has('users.create'));
	const canUpdate = $derived(session.has('users.update'));
	const canDelete = $derived(session.has('users.delete'));
	const canOffboard = $derived(session.has('users.offboard'));
	const canImport = $derived(session.has('users.import'));

	const STATUSES: UserStatus[] = ['invited', 'active', 'suspended', 'offboarded'];

	const statusClasses: Record<UserStatus, string> = {
		invited: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
		active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
		suspended: 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300',
		offboarded: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300'
	};

	const initial = page.url.searchParams;

	let users = $state<UserResponse[]>([]);
	let pagination = $state<Pagination>({ page: 1, per_page: 20, total: 0, total_pages: 0 });
	let loading = $state(true);
	let error = $state<string | null>(null);
	let deletingId = $state<string | null>(null);
	let resendingId = $state<string | null>(null);
	let formOpen = $state(false);
	let editing = $state<UserResponse | null>(null);
	let offboarding = $state<UserResponse | null>(null);

	let departments = $state<Lookup[]>([]);
	let locations = $state<Lookup[]>([]);

	let q = $state(initial.get('search') ?? '');
	let departmentId = $state(initial.get('department_id') ?? '');
	let locationId = $state(initial.get('location_id') ?? '');
	let managerId = $state(initial.get('manager_id') ?? '');
	let status = $state<UserStatus | ''>(
		STATUSES.includes(initial.get('status') as UserStatus)
			? (initial.get('status') as UserStatus)
			: ''
	);

	const departmentChoices = $derived(lookupOptions(departments));
	const locationChoices = $derived(lookupOptions(locations));

	/** Keep the address bar in sync so filters survive reloads and can be shared. */
	function syncUrl(pageNumber: number) {
		const query = buildQuery({
			search: q.trim(),
			department_id: departmentId,
			location_id: locationId,
			manager_id: managerId,
			status,
			page: pageNumber > 1 ? pageNumber : undefined
		});
		void goto(`${resolve('/dashboard/users')}${query}`, {
			replace: true,
			reset: false
		});
	}

	async function load(pageNumber = 1) {
		loading = true;
		error = null;
		try {
			const result = await listUsers({
				search: q.trim() || undefined,
				department_id: departmentId || undefined,
				location_id: locationId || undefined,
				manager_id: managerId || undefined,
				status: status || undefined,
				page: pageNumber,
				per_page: pagination.per_page
			});
			users = result.items;
			pagination = result.pagination;
			syncUrl(result.pagination.page);
		} catch (cause) {
			error =
				cause instanceof ApiError && cause.status > 0 ? cause.message : t('auth.genericError');
		} finally {
			loading = false;
		}
	}

	onMount(async () => {
		await load(Number(initial.get('page') ?? 1) || 1);
		try {
			const [deps, locs] = await Promise.all([
				listLookups('departments'),
				listLookups('locations')
			]);
			departments = deps;
			locations = locs;
		} catch {
			// Filters fall back to empty selects.
		}
	});

	/** Debounced while typing; filters and status tabs call `load(1)` directly. */
	const searchNow = debounce(() => void load(1), { wait: 300 });

	function changeFilter() {
		void load(1);
	}

	async function remove(user: UserResponse) {
		if (!confirm(t('user.confirmDelete'))) return;
		deletingId = user.id;
		try {
			await deleteUser(user.id);
			toast.success(t('user.deleted'));
			await load(pagination.page);
		} catch (cause) {
			toast.error(
				cause instanceof ApiError && cause.status > 0 ? cause.message : t('auth.genericError')
			);
		} finally {
			deletingId = null;
		}
	}

	async function resendInvite(user: UserResponse) {
		resendingId = user.id;
		try {
			await requestLoginLink({ organization_slug: currentOrgSlug(page.url), email: user.email });
			toast.success(t('user.inviteSent', { email: user.email }));
		} catch (cause) {
			toast.error(
				cause instanceof ApiError && cause.status > 0 ? cause.message : t('auth.genericError')
			);
		} finally {
			resendingId = null;
		}
	}

	function statusLabel(value: UserStatus | ''): string {
		return t(value ? `user.status.${value}` : 'user.status.all');
	}
</script>

<svelte:head>
	<title>{t('user.title')} · EAT</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-semibold tracking-tight">{t('user.title')}</h1>
			<p class="text-sm text-muted-foreground">{t('user.description')}</p>
		</div>
		<div class="flex flex-wrap gap-2">
			{#if canImport}
				<Button variant="outline" href={resolve('/dashboard/users/import')}>
					<UploadIcon />
					{t('user.import')}
				</Button>
			{/if}
			{#if canCreate}
				<Button
					onclick={() => {
						editing = null;
						formOpen = true;
					}}
				>
					<PlusIcon />
					{t('user.add')}
				</Button>
			{/if}
		</div>
	</div>

	<form
		class="sticky top-(--header-height) z-20 flex flex-col gap-3 rounded-lg border bg-card p-3"
		onsubmit={(event) => {
			event.preventDefault();
			void load(1);
		}}
	>
		<div class="flex flex-wrap items-center gap-2">
			<Input
				class="sm:max-w-64"
				placeholder={t('user.searchPlaceholder')}
				bind:value={q}
				oninput={() => searchNow()}
			/>
			<div class="w-44">
				<SearchSelect
					aria-label={t('user.department')}
					bind:value={departmentId}
					options={departmentChoices}
					allowClear
					allLabel={t('user.allDepartments')}
					onchange={changeFilter}
				/>
			</div>
			<div class="w-40">
				<SearchSelect
					aria-label={t('user.location')}
					bind:value={locationId}
					options={locationChoices}
					allowClear
					allLabel={t('user.allLocations')}
					onchange={changeFilter}
				/>
			</div>
			<div class="w-56">
				<UserSelect
					label={t('user.manager')}
					value={managerId}
					onchange={(id: string) => {
						managerId = id;
						changeFilter();
					}}
				/>
			</div>
			<Button type="submit" variant="outline">{t('table.search')}</Button>
		</div>

		<div class="flex flex-wrap gap-1">
			<Button
				type="button"
				size="sm"
				variant={status === '' ? 'secondary' : 'ghost'}
				onclick={() => {
					status = '';
					changeFilter();
				}}
			>
				{t('user.status.all')}
			</Button>
			{#each STATUSES as value (value)}
				<Button
					type="button"
					size="sm"
					variant={status === value ? 'secondary' : 'ghost'}
					onclick={() => {
						status = value;
						changeFilter();
					}}
				>
					{t(`user.status.${value}`)}
				</Button>
			{/each}
		</div>
	</form>

	<section class="rounded-lg border bg-card">
		{#if loading}
			<div class="flex flex-col gap-2 p-4">
				<Skeleton class="h-10 w-full" />
				<Skeleton class="h-10 w-full" />
				<Skeleton class="h-10 w-full" />
			</div>
		{:else if error}
			<div class="flex flex-col items-start gap-3 p-6">
				<p class="text-sm text-destructive">{error}</p>
				<Button variant="outline" size="sm" onclick={() => load(pagination.page)}>
					{t('table.retry')}
				</Button>
			</div>
		{:else if users.length === 0}
			<div class="flex flex-col items-center gap-1 p-10 text-center">
				<p class="font-medium">{t('user.emptyTitle')}</p>
				<p class="text-sm text-muted-foreground">{t('user.emptyDescription')}</p>
			</div>
		{:else}
			<div class="hidden md:block">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>{t('user.tableEmployee')}</Table.Head>
							<Table.Head>{t('user.tableEmployeeId')}</Table.Head>
							<Table.Head class="hidden lg:table-cell">{t('user.tableJobTitle')}</Table.Head>
							<Table.Head class="hidden lg:table-cell">{t('user.tableDepartment')}</Table.Head>
							<Table.Head class="hidden xl:table-cell">{t('user.tableLocation')}</Table.Head>
							<Table.Head class="hidden xl:table-cell">{t('user.tableManager')}</Table.Head>
							<Table.Head class="hidden lg:table-cell">{t('user.tableLocale')}</Table.Head>
							<Table.Head>{t('user.tableStatus')}</Table.Head>
							<Table.Head class="hidden xl:table-cell">{t('user.tableLastLogin')}</Table.Head>
							<Table.Head class="w-0 text-end">{t('common.actions')}</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each users as user (user.id)}
							<Table.Row>
								<Table.Cell>
									<div class="flex items-center gap-3">
										<Avatar.Root class="size-8">
											{#if user.avatar_url}
												<Avatar.Image src={user.avatar_url} alt="" />
											{/if}
											<Avatar.Fallback class="text-xs">
												{user.first_name[0] ?? ''}{user.last_name[0] ?? ''}
											</Avatar.Fallback>
										</Avatar.Root>
										<div class="flex min-w-0 flex-col">
											<a
												class="truncate font-medium underline-offset-4 hover:underline"
												href={resolve('/dashboard/users/[id]', { id: user.id })}
											>
												{userLabel(user)}
											</a>
											<span class="truncate text-xs text-muted-foreground">{user.email}</span>
										</div>
									</div>
								</Table.Cell>
								<Table.Cell class="font-mono text-xs">{user.employee_id ?? '—'}</Table.Cell>
								<Table.Cell class="hidden text-muted-foreground lg:table-cell">
									{user.job_title ?? '—'}
								</Table.Cell>
								<Table.Cell class="hidden lg:table-cell">
									{user.department_name ?? '—'}
								</Table.Cell>
								<Table.Cell class="hidden text-muted-foreground xl:table-cell">
									{user.location_name ?? '—'}
								</Table.Cell>
								<Table.Cell class="hidden text-muted-foreground xl:table-cell">
									{user.manager_name ?? '—'}
								</Table.Cell>
								<Table.Cell class="hidden lg:table-cell">
									<Badge variant="outline" class="uppercase">{user.preferred_locale}</Badge>
								</Table.Cell>
								<Table.Cell>
									<Badge class={statusClasses[user.status]}>{statusLabel(user.status)}</Badge>
								</Table.Cell>
								<Table.Cell class="hidden text-muted-foreground xl:table-cell">
									{user.last_login_at ? formatDate(user.last_login_at) : t('user.never')}
								</Table.Cell>
								<Table.Cell>
									<div class="flex items-center justify-end gap-1">
										{#if user.status === 'invited' && canUpdate}
											<Button
												variant="ghost"
												size="icon-sm"
												aria-label={t('user.resendInvite')}
												disabled={resendingId === user.id}
												onclick={() => resendInvite(user)}
											>
												<SendIcon />
											</Button>
										{/if}
										<Button
											variant="ghost"
											size="icon-sm"
											aria-label={t('user.viewProfile')}
											href={resolve('/dashboard/users/[id]', { id: user.id })}
										>
											<EyeIcon />
										</Button>
										{#if canUpdate}
											<Button
												variant="ghost"
												size="icon-sm"
												aria-label={t('common.edit')}
												onclick={() => {
													editing = user;
													formOpen = true;
												}}
											>
												<PencilIcon />
											</Button>
										{/if}
										{#if canOffboard && user.status !== 'offboarded'}
											<Button
												variant="ghost"
												size="icon-sm"
												aria-label={t('user.offboard')}
												onclick={() => (offboarding = user)}
											>
												<UserMinusIcon />
											</Button>
										{/if}
										{#if canDelete}
											<Button
												variant="ghost"
												size="icon-sm"
												class="text-destructive"
												aria-label={t('common.delete')}
												disabled={deletingId === user.id}
												onclick={() => remove(user)}
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
			</div>

			<ul class="flex flex-col divide-y md:hidden">
				{#each users as user (user.id)}
					<li class="flex flex-col gap-3 p-4">
						<div class="flex items-start gap-3">
							<Avatar.Root class="size-9">
								{#if user.avatar_url}
									<Avatar.Image src={user.avatar_url} alt="" />
								{/if}
								<Avatar.Fallback class="text-xs">
									{user.first_name[0] ?? ''}{user.last_name[0] ?? ''}
								</Avatar.Fallback>
							</Avatar.Root>
							<div class="flex min-w-0 flex-1 flex-col">
								<a
									class="truncate font-medium underline-offset-4 hover:underline"
									href={resolve('/dashboard/users/[id]', { id: user.id })}
								>
									{userLabel(user)}
								</a>
								<span class="truncate text-xs text-muted-foreground">{user.email}</span>
							</div>
							<Badge class={statusClasses[user.status]}>{statusLabel(user.status)}</Badge>
						</div>
						<dl class="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
							<div class="flex gap-1">
								<dt class="text-muted-foreground">{t('user.tableEmployeeId')}</dt>
								<dd class="truncate">{user.employee_id ?? '—'}</dd>
							</div>
							<div class="flex gap-1">
								<dt class="text-muted-foreground">{t('user.tableJobTitle')}</dt>
								<dd class="truncate">{user.job_title ?? '—'}</dd>
							</div>
							<div class="flex gap-1">
								<dt class="text-muted-foreground">{t('user.tableDepartment')}</dt>
								<dd class="truncate">{user.department_name ?? '—'}</dd>
							</div>
							<div class="flex gap-1">
								<dt class="text-muted-foreground">{t('user.tableManager')}</dt>
								<dd class="truncate">{user.manager_name ?? '—'}</dd>
							</div>
						</dl>
						<div class="flex flex-wrap justify-end gap-1">
							{#if user.status === 'invited' && canUpdate}
								<Button
									variant="outline"
									size="sm"
									disabled={resendingId === user.id}
									onclick={() => resendInvite(user)}
								>
									<SendIcon />
									{t('user.resendInvite')}
								</Button>
							{/if}
							{#if canUpdate}
								<Button
									variant="outline"
									size="sm"
									onclick={() => {
										editing = user;
										formOpen = true;
									}}
								>
									<PencilIcon />
									{t('common.edit')}
								</Button>
							{/if}
							{#if canOffboard && user.status !== 'offboarded'}
								<Button variant="outline" size="sm" onclick={() => (offboarding = user)}>
									<UserMinusIcon />
									{t('user.offboard')}
								</Button>
							{/if}
							{#if canDelete}
								<Button
									variant="ghost"
									size="sm"
									class="text-destructive"
									disabled={deletingId === user.id}
									onclick={() => remove(user)}
								>
									<Trash2Icon />
									{t('common.delete')}
								</Button>
							{/if}
						</div>
					</li>
				{/each}
			</ul>

			<TablePagination {pagination} onpage={(pageNumber: number) => load(pageNumber)} />
		{/if}
	</section>
</div>

{#if formOpen}
	<UserForm
		user={editing}
		onclose={() => (formOpen = false)}
		onsaved={() => load(pagination.page)}
	/>
{/if}

{#if offboarding}
	<OffboardSheet
		user={offboarding}
		onclose={() => (offboarding = null)}
		onupdated={() => load(pagination.page)}
	/>
{/if}
