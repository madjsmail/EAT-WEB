<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { toast } from 'svelte-sonner';
	import KeyRoundIcon from '@lucide/svelte/icons/key-round';
	import {
		changePassword,
		getProfile,
		updateProfile,
		type PreferredLocale,
		type ProfileUpdate,
		type UserProfile
	} from '#lib/api/me.js';
	import { ApiError } from '#lib/api/client.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import EnumSelect from '#lib/components/domain/enum-select.svelte';
	import { Field, FieldDescription, FieldLabel } from '#lib/components/ui/field/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import { t } from '#lib/i18n/index.js';
	import { session } from '#lib/stores/session.svelte.js';

	const localeOptions = [
		{ value: 'en', label: 'English' },
		{ value: 'fr', label: 'Français' },
		{ value: 'ar', label: 'العربية' }
	];

	const emptyPassword = { current_password: '', new_password: '', confirm: '' };

	let profile = $state<UserProfile | null>(null);
	let loading = $state(true);
	let loadError = $state<string | null>(null);
	let saving = $state(false);
	let saveError = $state<string | null>(null);
	let changing = $state(false);
	let passwordError = $state<string | null>(null);

	let form = $state<{
		first_name: string;
		last_name: string;
		phone_number: string;
		avatar_url: string;
		preferred_locale: PreferredLocale;
	}>({
		first_name: '',
		last_name: '',
		phone_number: '',
		avatar_url: '',
		preferred_locale: 'en'
	});
	let password = $state({ ...emptyPassword });

	function messageOf(cause: unknown, fallback: string): string {
		return cause instanceof ApiError && cause.status > 0 ? cause.message : fallback;
	}

	async function load() {
		loading = true;
		loadError = null;
		try {
			const data = await getProfile();
			profile = data;
			form = {
				first_name: data.first_name,
				last_name: data.last_name,
				phone_number: data.phone_number ?? '',
				avatar_url: data.avatar_url ?? '',
				preferred_locale: data.preferred_locale
			};
		} catch (cause) {
			loadError = messageOf(cause, t('profile.loadError'));
		} finally {
			loading = false;
		}
	}

	onMount(load);

	async function saveProfile(event: SubmitEvent) {
		event.preventDefault();
		saving = true;
		saveError = null;

		const payload: ProfileUpdate = {
			first_name: form.first_name.trim(),
			last_name: form.last_name.trim(),
			phone_number: form.phone_number.trim(),
			preferred_locale: form.preferred_locale
		};
		// An empty URL fails server validation; leave the stored avatar untouched.
		const avatar = form.avatar_url.trim();
		if (avatar) payload.avatar_url = avatar;

		try {
			const updated = await updateProfile(payload);
			profile = updated;
			form.preferred_locale = updated.preferred_locale;
			session.user = updated;
			toast.success(t('profile.saved'));
		} catch (cause) {
			saveError = messageOf(cause, t('auth.genericError'));
		} finally {
			saving = false;
		}
	}

	async function savePassword(event: SubmitEvent) {
		event.preventDefault();
		passwordError = null;

		if (password.new_password.length < 8) {
			passwordError = t('password.tooShort');
			return;
		}
		if (password.new_password !== password.confirm) {
			passwordError = t('auth.passwordMismatch');
			return;
		}

		changing = true;
		try {
			const result = await changePassword({
				current_password: password.current_password,
				new_password: password.new_password
			});
			password = { ...emptyPassword };
			toast.success(t('password.saved', { count: result.revoked_sessions }));
		} catch (cause) {
			passwordError =
				cause instanceof ApiError && cause.status > 0
					? (cause.fieldError('new_password') ??
						cause.fieldError('current_password') ??
						cause.message)
					: t('auth.genericError');
		} finally {
			changing = false;
		}
	}
</script>

<svelte:head>
	<title>{t('profile.title')} · EAT</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-semibold tracking-tight">{t('profile.title')}</h1>
			<p class="text-sm text-muted-foreground">{t('profile.description')}</p>
		</div>
		<Button variant="outline" onclick={() => goto(resolve('/dashboard/settings/sessions'))}>
			{t('sessions.title')}
		</Button>
	</div>

	{#if loading}
		<div class="flex flex-col gap-2 rounded-lg border bg-card p-4">
			<Skeleton class="h-8 w-full" />
			<Skeleton class="h-8 w-full" />
			<Skeleton class="h-8 w-2/3" />
		</div>
	{:else if loadError || !profile}
		<div class="flex flex-col items-start gap-3 rounded-lg border bg-card p-6">
			<p class="text-sm text-destructive">{loadError ?? t('profile.loadError')}</p>
			<Button variant="outline" size="sm" onclick={load}>{t('table.retry')}</Button>
		</div>
	{:else}
		<section class="rounded-lg border bg-card">
			<form class="flex flex-col gap-4 p-4 sm:p-6" onsubmit={saveProfile}>
				<div class="flex items-center justify-between gap-2">
					<h2 class="text-base font-medium">{t('profile.details')}</h2>
					<Badge variant="secondary">{profile.status}</Badge>
				</div>

				{#if saveError}
					<p
						class="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
					>
						{saveError}
					</p>
				{/if}

				<div class="grid gap-4 sm:grid-cols-2">
					<Field>
						<FieldLabel for="profile-first-name">{t('profile.firstName')}</FieldLabel>
						<Input
							id="profile-first-name"
							required
							maxlength={100}
							value={form.first_name}
							oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
								(form.first_name = event.currentTarget.value)}
						/>
					</Field>
					<Field>
						<FieldLabel for="profile-last-name">{t('profile.lastName')}</FieldLabel>
						<Input
							id="profile-last-name"
							required
							maxlength={100}
							value={form.last_name}
							oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
								(form.last_name = event.currentTarget.value)}
						/>
					</Field>
					<Field>
						<FieldLabel for="profile-email">{t('profile.email')}</FieldLabel>
						<Input id="profile-email" type="email" value={profile.email} disabled />
						<FieldDescription>{t('profile.emailHint')}</FieldDescription>
					</Field>
					<Field>
						<FieldLabel for="profile-phone">{t('profile.phone')}</FieldLabel>
						<Input
							id="profile-phone"
							type="tel"
							maxlength={40}
							value={form.phone_number}
							oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
								(form.phone_number = event.currentTarget.value)}
						/>
					</Field>
					<Field>
						<FieldLabel for="profile-avatar">{t('profile.avatarUrl')}</FieldLabel>
						<Input
							id="profile-avatar"
							type="url"
							maxlength={1000}
							placeholder="https://"
							value={form.avatar_url}
							oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
								(form.avatar_url = event.currentTarget.value)}
						/>
					</Field>
					<Field>
						<FieldLabel for="profile-locale">{t('profile.locale')}</FieldLabel>
						<EnumSelect
							id="profile-locale"
							value={form.preferred_locale}
							options={localeOptions}
							onchange={(value) => (form.preferred_locale = value as PreferredLocale)}
						/>
					</Field>
				</div>

				<div class="flex justify-end">
					<Button type="submit" disabled={saving}>
						{saving ? t('common.saving') : t('common.save')}
					</Button>
				</div>
			</form>
		</section>

		<section class="rounded-lg border bg-card">
			<div class="flex flex-col gap-4 p-4 sm:p-6">
				<div class="flex items-center gap-2">
					<KeyRoundIcon class="size-4 text-muted-foreground" />
					<h2 class="text-base font-medium">{t('password.title')}</h2>
				</div>

				{#if profile.auth_provider !== 'local'}
					<p class="text-sm text-muted-foreground">{t('password.ssoOnly')}</p>
				{:else}
					<form class="flex max-w-md flex-col gap-4" onsubmit={savePassword}>
						{#if passwordError}
							<p
								class="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
							>
								{passwordError}
							</p>
						{/if}
						<Field>
							<FieldLabel for="password-current">{t('password.current')}</FieldLabel>
							<Input
								id="password-current"
								type="password"
								autocomplete="current-password"
								required
								value={password.current_password}
								oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
									(password.current_password = event.currentTarget.value)}
							/>
						</Field>
						<Field>
							<FieldLabel for="password-new">{t('password.new')}</FieldLabel>
							<Input
								id="password-new"
								type="password"
								autocomplete="new-password"
								minlength={8}
								required
								value={password.new_password}
								oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
									(password.new_password = event.currentTarget.value)}
							/>
							<FieldDescription>{t('password.description')}</FieldDescription>
						</Field>
						<Field>
							<FieldLabel for="password-confirm">{t('password.confirm')}</FieldLabel>
							<Input
								id="password-confirm"
								type="password"
								autocomplete="new-password"
								required
								value={password.confirm}
								oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
									(password.confirm = event.currentTarget.value)}
							/>
						</Field>
						<div class="flex justify-end">
							<Button type="submit" disabled={changing}>
								{changing ? t('common.saving') : t('password.submit')}
							</Button>
						</div>
					</form>
				{/if}
			</div>
		</section>
	{/if}
</div>
