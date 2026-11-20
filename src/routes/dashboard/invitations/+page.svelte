<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import MailPlusIcon from '@lucide/svelte/icons/mail-plus';
	import {
		createInvitation,
		listInvitations,
		listRoles,
		revokeInvitation,
		type Invitation,
		type InvitationResponse,
		type Role
	} from '#lib/api/invitations.js';
	import { ApiError } from '#lib/api/client.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Field, FieldError, FieldGroup, FieldLabel } from '#lib/components/ui/field/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import * as Select from '#lib/components/ui/select/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import SearchSelect, { type SelectOption } from '#lib/components/domain/search-select.svelte';
	import * as Table from '#lib/components/ui/table/index.js';
	import { t } from '#lib/i18n/index.js';
	import { session } from '#lib/stores/session.svelte.js';
	import { formatDate } from '#lib/utils.js';

	let invitations = $state<Invitation[]>([]);
	let roles = $state<Role[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let rolesError = $state(false);

	let email = $state('');
	let roleId = $state('');
	let expiresInHours = $state('72');
	let creating = $state(false);
	let formError = $state<string | null>(null);
	let created = $state<InvitationResponse | null>(null);

	const roleChoices = $derived<SelectOption[]>(
		roles.map((role) => ({ value: role.id, label: role.name, keywords: [role.code] }))
	);

	const canCreate = $derived(session.has('invitations.create'));
	const canRevoke = $derived(session.has('invitations.revoke'));

	const statusKeys: Record<string, string> = {
		pending: 'invitations.statusPending',
		accepted: 'invitations.statusAccepted',
		expired: 'invitations.statusExpired',
		revoked: 'invitations.statusRevoked'
	};

	const statusClasses: Record<string, string> = {
		pending: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
		accepted: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
		expired: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300',
		revoked: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300'
	};

	function roleName(roleId: string): string {
		return roles.find((role) => role.id === roleId)?.name ?? '—';
	}

	async function load() {
		loading = true;
		error = null;
		try {
			invitations = await listInvitations();
		} catch (cause) {
			error =
				cause instanceof ApiError && cause.status > 0 ? cause.message : t('auth.genericError');
		} finally {
			loading = false;
		}
	}

	async function loadRoles() {
		try {
			roles = await listRoles();
			rolesError = false;
		} catch {
			roles = [];
			rolesError = true;
		}
	}

	onMount(() => {
		void load();
		if (canCreate) void loadRoles();
	});

	async function onCreate(event: SubmitEvent) {
		event.preventDefault();
		if (creating) return;

		formError = null;
		creating = true;
		try {
			created = await createInvitation({
				email: email.trim(),
				role_id: roleId,
				expires_in_hours: Number(expiresInHours)
			});
			email = '';
			roleId = '';
			toast.success(t('invitations.createdTitle'));
			await load();
		} catch (cause) {
			formError =
				cause instanceof ApiError && cause.status > 0 ? cause.message : t('auth.genericError');
		} finally {
			creating = false;
		}
	}

	async function copyLink(link: string) {
		try {
			await navigator.clipboard.writeText(link);
			toast.success(t('invitations.copied'));
		} catch {
			toast.error(t('auth.genericError'));
		}
	}

	async function revoke(id: string) {
		if (!confirm(t('invitations.confirmRevoke'))) return;
		try {
			await revokeInvitation(id);
			toast.success(t('invitations.revokedToast'));
			await load();
		} catch (cause) {
			toast.error(
				cause instanceof ApiError && cause.status > 0 ? cause.message : t('auth.genericError')
			);
		}
	}
</script>

<svelte:head>
	<title>{t('invitations.title')} · EAT</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-1">
		<h1 class="text-2xl font-semibold tracking-tight">{t('invitations.title')}</h1>
		<p class="text-sm text-muted-foreground">{t('invitations.description')}</p>
	</div>

	{#if canCreate}
		<section class="rounded-lg border bg-card p-4">
			<form onsubmit={onCreate} class="flex flex-col gap-4">
				<FieldGroup class="grid gap-4 md:grid-cols-[1fr_12rem_10rem_auto] md:items-end">
					<Field>
						<FieldLabel for="invite-email">{t('invitations.email')}</FieldLabel>
						<Input
							id="invite-email"
							type="email"
							bind:value={email}
							placeholder="teammate@example.com"
							required
							disabled={creating}
						/>
					</Field>

					<Field>
						<FieldLabel for="invite-role">{t('invitations.role')}</FieldLabel>
						<SearchSelect
							id="invite-role"
							bind:value={roleId}
							options={roleChoices}
							disabled={creating || rolesError}
							required
							aria-label={t('invitations.role')}
						/>
					</Field>

					<Field>
						<FieldLabel for="invite-expiry">{t('invitations.expiresIn')}</FieldLabel>
						<Select.Root type="single" bind:value={expiresInHours}>
							<Select.Trigger id="invite-expiry" class="w-full">
								<Select.Value />
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="24" label={t('invitations.hours24')}>
									{t('invitations.hours24')}
								</Select.Item>
								<Select.Item value="72" label={t('invitations.hours72')}>
									{t('invitations.hours72')}
								</Select.Item>
								<Select.Item value="168" label={t('invitations.hours168')}>
									{t('invitations.hours168')}
								</Select.Item>
							</Select.Content>
						</Select.Root>
					</Field>

					<Field>
						<Button type="submit" disabled={creating || !roleId || rolesError}>
							{#if creating}
								<LoaderCircleIcon class="animate-spin" />
								{t('invitations.creating')}
							{:else}
								<MailPlusIcon />
								{t('invitations.create')}
							{/if}
						</Button>
					</Field>
				</FieldGroup>

				{#if rolesError}
					<FieldError>{t('invitations.roleUnavailable')}</FieldError>
				{:else if formError}
					<FieldError>{formError}</FieldError>
				{/if}
			</form>

			{#if created}
				{@const inviteLink = created.invite_link}
				<div
					class="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-500/30 dark:bg-emerald-500/10"
				>
					<p class="text-sm font-medium">{t('invitations.createdTitle')}</p>
					<p class="text-sm text-muted-foreground">
						{t('invitations.createdDescription', { email: created.email })}
					</p>
					<div class="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
						<code class="min-w-0 flex-1 truncate rounded-md bg-background/70 px-2 py-1 text-xs">
							{inviteLink}
						</code>
						<Button variant="outline" size="sm" onclick={() => copyLink(inviteLink)}>
							<CopyIcon />
							{t('invitations.copyLink')}
						</Button>
					</div>
				</div>
			{/if}
		</section>
	{/if}

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
				<Button variant="outline" size="sm" onclick={load}>{t('table.retry')}</Button>
			</div>
		{:else if invitations.length === 0}
			<div class="flex flex-col items-center gap-1 p-10 text-center">
				<p class="font-medium">{t('invitations.emptyTitle')}</p>
				<p class="text-sm text-muted-foreground">{t('invitations.emptyDescription')}</p>
			</div>
		{:else}
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>{t('invitations.tableEmail')}</Table.Head>
						<Table.Head>{t('invitations.tableRole')}</Table.Head>
						<Table.Head>{t('invitations.tableStatus')}</Table.Head>
						<Table.Head>{t('invitations.tableCreated')}</Table.Head>
						<Table.Head>{t('invitations.tableExpires')}</Table.Head>
						{#if canRevoke}
							<Table.Head class="w-0">{t('invitations.tableActions')}</Table.Head>
						{/if}
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each invitations as invitation (invitation.id)}
						<Table.Row>
							<Table.Cell class="font-medium">{invitation.email}</Table.Cell>
							<Table.Cell>{roleName(invitation.role_id)}</Table.Cell>
							<Table.Cell>
								<Badge class={statusClasses[invitation.status]}>
									{t(statusKeys[invitation.status] ?? invitation.status)}
								</Badge>
							</Table.Cell>
							<Table.Cell class="text-muted-foreground">
								{formatDate(invitation.created_at)}
							</Table.Cell>
							<Table.Cell class="text-muted-foreground">
								{formatDate(invitation.expires_at)}
							</Table.Cell>
							{#if canRevoke}
								<Table.Cell>
									{#if invitation.status === 'pending'}
										<Button variant="destructive" size="sm" onclick={() => revoke(invitation.id)}>
											{t('invitations.revoke')}
										</Button>
									{/if}
								</Table.Cell>
							{/if}
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		{/if}
	</section>
</div>
