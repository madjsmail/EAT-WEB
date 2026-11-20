<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { toast } from 'svelte-sonner';
	import CheckCircle2Icon from '@lucide/svelte/icons/check-circle-2';
	import * as Sheet from '#lib/components/ui/sheet/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Field, FieldGroup, FieldLabel } from '#lib/components/ui/field/index.js';
	import { ApiError } from '#lib/api/client.js';
	import {
		listDirectReports,
		offboardUser,
		userLabel,
		type OffboardResponse,
		type UserResponse
	} from '#lib/api/users.js';
	import { t } from '#lib/i18n/index.js';
	import UserSelect from '#lib/components/domain/user-select.svelte';

	let {
		user,
		onclose,
		onupdated
	}: {
		user: UserResponse;
		onclose: () => void;
		onupdated: () => void;
	} = $props();

	let reports = $state<UserResponse[]>([]);
	let reportsState = $state<'loading' | 'ready' | 'error'>('loading');
	let newManagerId = $state('');
	let notes = $state('');
	let submitting = $state(false);
	let error = $state<string | null>(null);
	let result = $state<OffboardResponse | null>(null);

	const managerRequired = $derived(reports.length > 0 && newManagerId === '');

	async function loadReports() {
		reportsState = 'loading';
		try {
			reports = await listDirectReports(user.id);
			reportsState = 'ready';
		} catch {
			reportsState = 'error';
		}
	}

	onMount(loadReports);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (submitting) return;

		error = null;
		if (reportsState === 'error') return;
		if (managerRequired) {
			error = t('offboard.managerRequiredInline');
			return;
		}
		if (newManagerId === user.id) {
			error = t('offboard.managerRequiredInline');
			return;
		}

		submitting = true;
		try {
			result = await offboardUser(user.id, {
				new_manager_id: newManagerId || undefined,
				notes: notes.trim() || undefined
			});
			toast.success(t('offboard.successTitle'));
			onupdated();
		} catch (cause) {
			error =
				cause instanceof ApiError && cause.status > 0 ? cause.message : t('offboard.genericError');
		} finally {
			submitting = false;
		}
	}
</script>

<Sheet.Root open onOpenChange={(open) => !open && onclose()}>
	<Sheet.Content side="right" class="w-full sm:max-w-lg">
		<Sheet.Header>
			<Sheet.Title>{t('offboard.title')}</Sheet.Title>
			<Sheet.Description>{userLabel(user)}</Sheet.Description>
		</Sheet.Header>

		{#if result}
			<div class="flex flex-col gap-4 overflow-y-auto px-4 pb-4">
				<div
					class="flex size-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
				>
					<CheckCircle2Icon class="size-5" />
				</div>
				<p class="font-medium">{t('offboard.successTitle')}</p>
				<p class="text-sm text-muted-foreground">
					{t('offboard.successDescription', { count: result.return_requests_created })}
				</p>

				<dl class="grid grid-cols-2 gap-3">
					<div class="rounded-lg border p-3">
						<dt class="text-xs text-muted-foreground">{t('offboard.reassigned')}</dt>
						<dd class="text-xl font-semibold">{result.reassigned_reports}</dd>
					</div>
					<div class="rounded-lg border p-3">
						<dt class="text-xs text-muted-foreground">{t('offboard.returnsCreated')}</dt>
						<dd class="text-xl font-semibold">{result.return_requests_created}</dd>
					</div>
				</dl>

				{#if result.pending_returns.length > 0}
					<div class="flex flex-col gap-2">
						<p class="text-sm font-medium">{t('offboard.pendingReturns')}</p>
						<ul class="flex flex-col divide-y rounded-lg border">
							{#each result.pending_returns as item (item.id)}
								<li class="flex items-center justify-between gap-3 p-3 text-sm">
									<span class="min-w-0 truncate">{item.label}</span>
									<span class="text-xs text-muted-foreground">
										{t('user.pendingReturnQuantity', { count: item.quantity })}
									</span>
								</li>
							{/each}
						</ul>
					</div>
				{/if}

				<div class="flex justify-end gap-2">
					<Button variant="outline" href={resolve('/dashboard/users/[id]', { id: user.id })}>
						{t('offboard.viewFullList')}
					</Button>
					<Button onclick={onclose}>{t('offboard.close')}</Button>
				</div>
			</div>
		{:else}
			<form class="flex min-h-0 flex-1 flex-col" onsubmit={submit}>
				<div class="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pb-4">
					<p class="text-sm text-muted-foreground">{t('offboard.description')}</p>

					<div
						class="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-500/30 dark:bg-amber-500/10"
					>
						<p class="font-medium">{t('offboard.warning')}</p>
						<ul class="mt-1 list-disc ps-5 text-muted-foreground">
							<li>{t('offboard.warningSessions')}</li>
							<li>{t('offboard.warningReturns')}</li>
							<li>{t('offboard.warningReports')}</li>
						</ul>
					</div>

					{#if reportsState === 'loading'}
						<p class="text-sm text-muted-foreground">{t('offboard.loadingReports')}</p>
					{:else if reportsState === 'error'}
						<div class="flex flex-col items-start gap-2">
							<p class="text-sm text-destructive">{t('offboard.reportsUnavailable')}</p>
							<Button type="button" variant="outline" size="sm" onclick={loadReports}>
								{t('table.retry')}
							</Button>
						</div>
					{:else if reports.length > 0}
						<FieldGroup>
							<Field>
								<FieldLabel for="offboard-manager" class="text-amber-700 dark:text-amber-300">
									{t('offboard.newManager')} *
								</FieldLabel>
								<p class="text-sm text-muted-foreground">
									{t('offboard.managerRequired', { count: reports.length })}
								</p>
								<UserSelect
									label={t('offboard.newManager')}
									value={newManagerId}
									disabled={submitting}
									onchange={(id: string) => (newManagerId = id)}
								/>
							</Field>
						</FieldGroup>
					{/if}

					<Field>
						<FieldLabel for="offboard-notes">{t('offboard.notes')}</FieldLabel>
						<textarea
							id="offboard-notes"
							class="min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
							placeholder={t('offboard.notesPlaceholder')}
							bind:value={notes}
							disabled={submitting}></textarea>
					</Field>
				</div>
				<div class="flex flex-col gap-2 border-t p-4">
					{#if error}
						<p class="text-sm text-destructive">{error}</p>
					{:else if managerRequired && reportsState === 'ready'}
						<p class="text-sm text-destructive">{t('offboard.managerRequiredInline')}</p>
					{/if}
					<div class="flex justify-end gap-2">
						<Button type="button" variant="outline" onclick={onclose}>
							{t('common.cancel')}
						</Button>
						<Button
							type="submit"
							variant="destructive"
							disabled={submitting || reportsState !== 'ready' || managerRequired}
						>
							{submitting
								? t('offboard.submitting')
								: t('offboard.submit', { name: userLabel(user) })}
						</Button>
					</div>
				</div>
			</form>
		{/if}
	</Sheet.Content>
</Sheet.Root>
