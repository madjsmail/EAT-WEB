<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { toast } from 'svelte-sonner';
	import MonitorSmartphoneIcon from '@lucide/svelte/icons/monitor-smartphone';
	import {
		listSessions,
		revokeAllSessions,
		revokeSession,
		type Session
	} from '#lib/api/sessions.js';
	import { ApiError } from '#lib/api/client.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import { t } from '#lib/i18n/index.js';
	import { session } from '#lib/stores/session.svelte.js';
	import { formatDate } from '#lib/utils.js';

	let sessions = $state<Session[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let revokingId = $state<string | null>(null);
	let revokingAll = $state(false);

	async function load() {
		loading = true;
		error = null;
		try {
			sessions = await listSessions();
		} catch (cause) {
			error =
				cause instanceof ApiError && cause.status > 0 ? cause.message : t('auth.genericError');
		} finally {
			loading = false;
		}
	}

	onMount(load);

	async function leave() {
		session.clear();
		await goto(resolve('/login'), { replace: true });
	}

	async function revokeCurrent(id: string, current: boolean) {
		if (!confirm(t('sessions.confirmRevoke'))) return;

		revokingId = id;
		try {
			await revokeSession(id);
			toast.success(t('sessions.revokedToast'));
			if (current) {
				await leave();
				return;
			}
			await load();
		} catch (cause) {
			toast.error(
				cause instanceof ApiError && cause.status > 0 ? cause.message : t('auth.genericError')
			);
		} finally {
			revokingId = null;
		}
	}

	async function revokeEverywhere() {
		if (!confirm(t('sessions.confirmRevokeAll'))) return;

		revokingAll = true;
		try {
			// The current session is kept, so the user stays signed in.
			const result = await revokeAllSessions();
			toast.success(t('sessions.revokedAllToast', { count: result.revoked }));
			await load();
		} catch (cause) {
			toast.error(
				cause instanceof ApiError && cause.status > 0 ? cause.message : t('auth.genericError')
			);
		} finally {
			revokingAll = false;
		}
	}
</script>

<svelte:head>
	<title>{t('sessions.title')} · EAT</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-semibold tracking-tight">{t('sessions.title')}</h1>
			<p class="text-sm text-muted-foreground">{t('sessions.description')}</p>
		</div>
		<Button
			variant="destructive"
			disabled={revokingAll || sessions.length === 0}
			onclick={revokeEverywhere}
		>
			{t('sessions.revokeAll')}
		</Button>
	</div>

	<section class="rounded-lg border bg-card">
		{#if loading}
			<div class="flex flex-col gap-2 p-4">
				<Skeleton class="h-8 w-full" />
				<Skeleton class="h-8 w-full" />
			</div>
		{:else if error}
			<div class="flex flex-col items-start gap-3 p-6">
				<p class="text-sm text-destructive">{error}</p>
				<Button variant="outline" size="sm" onclick={load}>{t('table.retry')}</Button>
			</div>
		{:else if sessions.length === 0}
			<div class="flex flex-col items-center gap-1 p-10 text-center">
				<p class="font-medium">{t('sessions.emptyTitle')}</p>
				<p class="text-sm text-muted-foreground">{t('sessions.emptyDescription')}</p>
			</div>
		{:else}
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>{t('sessions.device')}</Table.Head>
						<Table.Head>{t('sessions.ip')}</Table.Head>
						<Table.Head>{t('sessions.created')}</Table.Head>
						<Table.Head>{t('sessions.lastSeen')}</Table.Head>
						<Table.Head>{t('sessions.expires')}</Table.Head>
						<Table.Head class="w-0">{t('common.actions')}</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each sessions as item (item.id)}
						<Table.Row>
							<Table.Cell class="max-w-64">
								<div class="flex items-center gap-2">
									<MonitorSmartphoneIcon class="size-4 text-muted-foreground" />
									<span class="truncate" title={item.user_agent ?? ''}>
										{item.user_agent ?? t('sessions.unknownDevice')}
									</span>
									{#if item.current}
										<Badge variant="secondary">{t('sessions.current')}</Badge>
									{/if}
								</div>
							</Table.Cell>
							<Table.Cell class="text-muted-foreground">{item.ip_address ?? '—'}</Table.Cell>
							<Table.Cell class="text-muted-foreground">
								{formatDate(item.created_at)}
							</Table.Cell>
							<Table.Cell class="text-muted-foreground">
								{formatDate(item.last_seen_at)}
							</Table.Cell>
							<Table.Cell class="text-muted-foreground">
								{formatDate(item.expires_at)}
							</Table.Cell>
							<Table.Cell>
								<Button
									variant="destructive"
									size="sm"
									disabled={revokingId === item.id}
									onclick={() => revokeCurrent(item.id, item.current)}
								>
									{t('sessions.revoke')}
								</Button>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		{/if}
	</section>
</div>
