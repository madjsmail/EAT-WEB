<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
	import { setupAccount } from '#lib/api/auth.js';
	import { ApiError } from '#lib/api/client.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import {
		Field,
		FieldDescription,
		FieldError,
		FieldGroup,
		FieldLabel
	} from '#lib/components/ui/field/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import * as Select from '#lib/components/ui/select/index.js';
	import { t } from '#lib/i18n/index.js';
	import { session } from '#lib/stores/session.svelte.js';

	const token = page.url.searchParams.get('token') ?? '';

	let password = $state('');
	let confirmPassword = $state('');
	let firstName = $state('');
	let lastName = $state('');
	let phoneNumber = $state('');
	let preferredLocale = $state('en');
	let error = $state<string | null>(null);
	let submitting = $state(false);
	let invalid = $state(token === '');

	async function onSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (submitting) return;

		error = null;
		if (password.length < 8) {
			error = t('invite.passwordHint');
			return;
		}
		if (password !== confirmPassword) {
			error = t('auth.passwordMismatch');
			return;
		}

		submitting = true;
		try {
			const result = await setupAccount({
				token,
				password,
				first_name: firstName.trim() || undefined,
				last_name: lastName.trim() || undefined,
				phone_number: phoneNumber.trim() || undefined,
				preferred_locale: preferredLocale
			});
			session.applyLogin(result);
			await goto(resolve('/dashboard'), { replace: true });
		} catch (cause) {
			if (
				cause instanceof ApiError &&
				(cause.status === 401 ||
					cause.status === 404 ||
					cause.status === 410 ||
					cause.field === 'token')
			) {
				// Expired, invalid or already consumed token: no point retrying the form.
				invalid = true;
				return;
			}
			error =
				cause instanceof ApiError && cause.status > 0 ? cause.message : t('auth.genericError');
		} finally {
			submitting = false;
		}
	}

	const loginHref = $derived(resolve('/login'));
</script>

<svelte:head>
	<title>{t('auth.setupTitle')} · EAT</title>
</svelte:head>

<div class="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
	<div class="w-full max-w-md">
		{#if invalid}
			<div class="flex flex-col items-center gap-3 text-center">
				<div
					class="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground"
				>
					<ShieldCheckIcon class="size-5" />
				</div>
				<h1 class="text-xl font-bold">{t('auth.invalidTokenTitle')}</h1>
				<FieldDescription>
					{token ? t('auth.invalidTokenDescription') : t('auth.missingToken')}
				</FieldDescription>
				<Button href={loginHref} class="w-full">{t('auth.requestNewLink')}</Button>
			</div>
		{:else}
			<div class="flex flex-col gap-6">
				<div class="flex flex-col items-center gap-2 text-center">
					<div
						class="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground"
					>
						<ShieldCheckIcon class="size-5" />
					</div>
					<h1 class="text-xl font-bold">{t('auth.setupTitle')}</h1>
					<FieldDescription>{t('auth.setupDescription')}</FieldDescription>
				</div>

				<form onsubmit={onSubmit} class="flex flex-col gap-5">
					<FieldGroup>
						<div class="grid gap-4 sm:grid-cols-2">
							<Field>
								<FieldLabel for="setup-first-name">{t('auth.firstNameOptional')}</FieldLabel>
								<Input
									id="setup-first-name"
									bind:value={firstName}
									autocomplete="given-name"
									disabled={submitting}
								/>
							</Field>
							<Field>
								<FieldLabel for="setup-last-name">{t('auth.lastNameOptional')}</FieldLabel>
								<Input
									id="setup-last-name"
									bind:value={lastName}
									autocomplete="family-name"
									disabled={submitting}
								/>
							</Field>
						</div>

						<Field>
							<FieldLabel for="setup-password">{t('auth.password')}</FieldLabel>
							<Input
								id="setup-password"
								type="password"
								bind:value={password}
								autocomplete="new-password"
								minlength={8}
								required
								disabled={submitting}
							/>
							<FieldDescription>{t('invite.passwordHint')}</FieldDescription>
						</Field>

						<Field>
							<FieldLabel for="setup-confirm">{t('auth.confirmPassword')}</FieldLabel>
							<Input
								id="setup-confirm"
								type="password"
								bind:value={confirmPassword}
								autocomplete="new-password"
								minlength={8}
								required
								disabled={submitting}
							/>
						</Field>

						<Field>
							<FieldLabel for="setup-phone">{t('auth.phoneOptional')}</FieldLabel>
							<Input
								id="setup-phone"
								type="tel"
								bind:value={phoneNumber}
								autocomplete="tel"
								disabled={submitting}
							/>
						</Field>

						<Field>
							<FieldLabel for="setup-locale">{t('auth.preferredLocale')}</FieldLabel>
							<Select.Root type="single" bind:value={preferredLocale}>
								<Select.Trigger id="setup-locale" class="w-full" disabled={submitting}>
									<Select.Value />
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="en" label="English">English</Select.Item>
									<Select.Item value="fr" label="Français">Français</Select.Item>
									<Select.Item value="ar" label="العربية">العربية</Select.Item>
								</Select.Content>
							</Select.Root>
						</Field>

						{#if error}
							<FieldError>{error}</FieldError>
						{/if}

						<Field>
							<Button type="submit" class="w-full" disabled={submitting}>
								{#if submitting}
									<LoaderCircleIcon class="animate-spin" />
									{t('auth.setupSubmitting')}
								{:else}
									{t('auth.setupSubmit')}
								{/if}
							</Button>
						</Field>
					</FieldGroup>
				</form>
			</div>
		{/if}
	</div>
</div>
