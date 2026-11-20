<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import CheckCircle2Icon from '@lucide/svelte/icons/check-circle-2';
	import * as Sheet from '#lib/components/ui/sheet/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Field, FieldGroup, FieldLabel } from '#lib/components/ui/field/index.js';
	import { ApiError } from '#lib/api/client.js';
	import {
		createUser,
		updateUser,
		type CreateUserResult,
		type UserResponse
	} from '#lib/api/users.js';
	import { listLookups, type Lookup } from '#lib/api/lookups.js';
	import { lookupOptions } from '#lib/config/select-options.js';
	import { t } from '#lib/i18n/index.js';
	import SearchSelect from '#lib/components/domain/search-select.svelte';
	import UserSelect from '#lib/components/domain/user-select.svelte';

	let {
		user = null,
		onclose,
		onsaved
	}: {
		user?: UserResponse | null;
		onclose: () => void;
		onsaved: () => void;
	} = $props();

	const initial = untrack(() => user);

	let email = $state(initial?.email ?? '');
	let firstName = $state(initial?.first_name ?? '');
	let lastName = $state(initial?.last_name ?? '');
	let employeeId = $state(initial?.employee_id ?? '');
	let jobTitle = $state(initial?.job_title ?? '');
	let departmentId = $state(initial?.department_id ?? '');
	let locationId = $state(initial?.location_id ?? '');
	let managerId = $state(initial?.manager_id ?? '');
	let locale = $state(initial?.preferred_locale ?? 'en');
	let phone = $state(initial?.phone_number ?? '');

	let departments = $state<Lookup[]>([]);
	let locations = $state<Lookup[]>([]);
	let saving = $state(false);
	let error = $state<string | null>(null);
	let created = $state<CreateUserResult | null>(null);

	const departmentChoices = $derived(lookupOptions(departments));
	const locationChoices = $derived(lookupOptions(locations));
	const localeChoices = [
		{ value: 'en', label: 'English' },
		{ value: 'fr', label: 'Français' },
		{ value: 'ar', label: 'العربية' }
	];

	onMount(async () => {
		try {
			const [deps, locs] = await Promise.all([
				listLookups('departments'),
				listLookups('locations')
			]);
			departments = deps;
			locations = locs;
		} catch {
			// Optional selects fall back to empty.
		}
	});

	/** Empty optional text becomes null so PATCH can clear the field. */
	function nullable(value: string): string | null {
		const trimmed = value.trim();
		return trimmed === '' ? null : trimmed;
	}

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (saving) return;

		error = null;
		saving = true;
		const payload = {
			email: email.trim(),
			first_name: firstName.trim(),
			last_name: lastName.trim(),
			employee_id: nullable(employeeId),
			job_title: nullable(jobTitle),
			department_id: departmentId || null,
			location_id: locationId || null,
			manager_id: managerId || null,
			preferred_locale: locale,
			phone_number: nullable(phone)
		};

		try {
			if (user) {
				await updateUser(user.id, payload);
				toast.success(t('user.updated'));
				onsaved();
				onclose();
			} else {
				created = await createUser(payload);
				toast.success(t('user.created'));
			}
		} catch (cause) {
			error =
				cause instanceof ApiError && cause.status > 0 ? cause.message : t('auth.genericError');
		} finally {
			saving = false;
		}
	}

	async function copyLink(link: string) {
		try {
			await navigator.clipboard.writeText(link);
			toast.success(t('user.copied'));
		} catch {
			toast.error(t('auth.genericError'));
		}
	}
</script>

<Sheet.Root open onOpenChange={(open) => !open && onclose()}>
	<Sheet.Content side="right" class="w-full sm:max-w-xl">
		<Sheet.Header>
			<Sheet.Title>{user ? t('user.editTitle') : t('user.createTitle')}</Sheet.Title>
			<Sheet.Description>{t('user.formDescription')}</Sheet.Description>
		</Sheet.Header>

		{#if created}
			<div class="flex flex-col gap-4 overflow-y-auto px-4 pb-4">
				<div
					class="flex size-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
				>
					<CheckCircle2Icon class="size-5" />
				</div>
				<div class="flex flex-col gap-1">
					<p class="font-medium">{t('user.setupLinkTitle')}</p>
					<p class="text-sm text-muted-foreground">
						{t('user.setupLinkDescription', { email: created.user.email })}
					</p>
				</div>
				<code class="rounded-md border bg-muted/40 p-3 text-xs break-all">
					{created.setup_link}
				</code>
				<div class="flex gap-2">
					<Button variant="outline" onclick={() => copyLink(created?.setup_link ?? '')}>
						<CopyIcon />
						{t('user.copyLink')}
					</Button>
					<Button
						onclick={() => {
							onsaved();
							onclose();
						}}
					>
						{t('user.done')}
					</Button>
				</div>
			</div>
		{:else}
			<form class="flex min-h-0 flex-1 flex-col" onsubmit={submit}>
				<div class="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pb-4">
					{#if error}
						<p
							class="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
						>
							{error}
						</p>
					{/if}

					<FieldGroup class="grid gap-4 sm:grid-cols-2">
						<Field class="sm:col-span-2">
							<FieldLabel for="user-email">{t('user.email')} *</FieldLabel>
							<Input
								id="user-email"
								type="email"
								bind:value={email}
								autocomplete="email"
								required
								disabled={saving}
							/>
						</Field>
						<Field>
							<FieldLabel for="user-first-name">{t('user.firstName')} *</FieldLabel>
							<Input
								id="user-first-name"
								bind:value={firstName}
								autocomplete="given-name"
								required
								disabled={saving}
							/>
						</Field>
						<Field>
							<FieldLabel for="user-last-name">{t('user.lastName')} *</FieldLabel>
							<Input
								id="user-last-name"
								bind:value={lastName}
								autocomplete="family-name"
								required
								disabled={saving}
							/>
						</Field>
						<Field>
							<FieldLabel for="user-employee-id">{t('user.employeeId')}</FieldLabel>
							<Input id="user-employee-id" bind:value={employeeId} disabled={saving} />
						</Field>
						<Field>
							<FieldLabel for="user-job-title">{t('user.jobTitle')}</FieldLabel>
							<Input id="user-job-title" bind:value={jobTitle} disabled={saving} />
						</Field>
						<Field>
							<FieldLabel for="user-department">{t('user.department')}</FieldLabel>
							<SearchSelect
								id="user-department"
								bind:value={departmentId}
								options={departmentChoices}
								allowClear
								disabled={saving}
							/>
						</Field>
						<Field>
							<FieldLabel for="user-location">{t('user.location')}</FieldLabel>
							<SearchSelect
								id="user-location"
								bind:value={locationId}
								options={locationChoices}
								allowClear
								disabled={saving}
							/>
						</Field>
						<Field>
							<FieldLabel for="user-locale">{t('user.preferredLocale')}</FieldLabel>
							<SearchSelect
								id="user-locale"
								bind:value={locale}
								options={localeChoices}
								disabled={saving}
							/>
						</Field>
						<Field>
							<FieldLabel for="user-phone">{t('user.phone')}</FieldLabel>
							<Input
								id="user-phone"
								type="tel"
								bind:value={phone}
								autocomplete="tel"
								disabled={saving}
							/>
						</Field>
						<Field class="sm:col-span-2">
							<FieldLabel for="user-manager">{t('user.manager')}</FieldLabel>
							<UserSelect
								label={t('user.manager')}
								value={managerId}
								valueLabel={initial?.manager_name ?? ''}
								disabled={saving}
								onchange={(id: string) => (managerId = id)}
							/>
						</Field>
					</FieldGroup>
				</div>
				<div class="flex justify-end gap-2 border-t p-4">
					<Button type="button" variant="outline" onclick={onclose}>{t('common.cancel')}</Button>
					<Button type="submit" disabled={saving}>
						{saving ? t('common.saving') : t('common.save')}
					</Button>
				</div>
			</form>
		{/if}
	</Sheet.Content>
</Sheet.Root>
