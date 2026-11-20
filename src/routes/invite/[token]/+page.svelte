<script lang="ts">
	import { page } from '$app/state';
	import CheckCircle2Icon from '@lucide/svelte/icons/check-circle-2';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import { acceptInvitation } from '#lib/api/invitations.js';
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
	import { formatDate } from '#lib/utils.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const token = $derived(page.params.token ?? '');

	let firstName = $state('');
	let lastName = $state('');
	let password = $state('');
	let phoneNumber = $state('');
	let preferredLocale = $state('en');
	let error = $state<string | null>(null);
	let submitting = $state(false);
	let accepted = $state(false);

	const expired = $derived(
		data.preview !== null &&
			(data.preview.status === 'expired' || new Date(data.preview.expires_at) <= new Date())
	);

	const loginHref = $derived.by(() => {
		const query: string[] = [];
		if (data.preview?.email) query.push(`email=${encodeURIComponent(data.preview.email)}`);
		if (data.preview?.organization_slug) {
			query.push(`org=${encodeURIComponent(data.preview.organization_slug)}`);
		}
		return query.length > 0 ? `/login?${query.join('&')}` : '/login';
	});

	async function onSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (submitting) return;

		error = null;
		if (password.length < 8) {
			error = t('invite.passwordHint');
			return;
		}

		submitting = true;
		try {
			await acceptInvitation({
				token,
				password,
				first_name: firstName.trim(),
				last_name: lastName.trim(),
				phone_number: phoneNumber.trim() || undefined,
				preferred_locale: preferredLocale
			});
			accepted = true;
		} catch (cause) {
			error =
				cause instanceof ApiError && cause.status > 0 ? cause.message : t('invite.genericError');
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>{t('invite.title')} · EAT</title>
</svelte:head>

<div class="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
	<div class="w-full max-w-md">
		{#if accepted}
			<div class="flex flex-col items-center gap-4 text-center">
				<div
					class="flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
				>
					<CheckCircle2Icon class="size-6" />
				</div>
				<h1 class="text-xl font-bold">{t('invite.successTitle')}</h1>
				<FieldDescription>{t('invite.successDescription')}</FieldDescription>
				<Button href={loginHref} class="w-full">{t('invite.goToLogin')}</Button>
			</div>
		{:else if !data.preview}
			<div class="flex flex-col items-center gap-3 text-center">
				<h1 class="text-xl font-bold">{t('invite.invalidTitle')}</h1>
				<FieldDescription>{t('invite.invalidDescription')}</FieldDescription>
				<Button variant="outline" href="/login">{t('invite.backToLogin')}</Button>
			</div>
		{:else if data.preview.status !== 'pending' || expired}
			<div class="flex flex-col items-center gap-3 text-center">
				<h1 class="text-xl font-bold">
					{data.preview.status === 'accepted'
						? t('invite.alreadyUsedTitle')
						: t('invite.expiredTitle')}
				</h1>
				<FieldDescription>
					{data.preview.status === 'accepted'
						? t('invite.alreadyUsedDescription')
						: t('invite.expiredDescription')}
				</FieldDescription>
				<Button variant="outline" href="/login">{t('invite.backToLogin')}</Button>
			</div>
		{:else}
			<div class="flex flex-col gap-6">
				<div class="flex flex-col gap-1 text-center">
					<h1 class="text-xl font-bold">{t('invite.title')}</h1>
					<FieldDescription>
						{t('invite.description', {
							organization: data.preview.organization_name,
							role: data.preview.role_name
						})}
					</FieldDescription>
					<p class="text-xs text-muted-foreground">
						{t('invite.expiresOn', { date: formatDate(data.preview.expires_at) })}
					</p>
				</div>

				<form onsubmit={onSubmit} class="flex flex-col gap-5">
					<FieldGroup>
						<Field>
							<FieldLabel for="invite-email">{t('invite.email')}</FieldLabel>
							<Input id="invite-email" value={data.preview.email} readonly disabled />
						</Field>

						<div class="grid gap-4 sm:grid-cols-2">
							<Field>
								<FieldLabel for="invite-first-name">{t('invite.firstName')}</FieldLabel>
								<Input
									id="invite-first-name"
									bind:value={firstName}
									autocomplete="given-name"
									required
									disabled={submitting}
								/>
							</Field>
							<Field>
								<FieldLabel for="invite-last-name">{t('invite.lastName')}</FieldLabel>
								<Input
									id="invite-last-name"
									bind:value={lastName}
									autocomplete="family-name"
									required
									disabled={submitting}
								/>
							</Field>
						</div>

						<Field>
							<FieldLabel for="invite-phone">{t('invite.phone')}</FieldLabel>
							<Input
								id="invite-phone"
								type="tel"
								bind:value={phoneNumber}
								autocomplete="tel"
								disabled={submitting}
							/>
						</Field>

						<Field>
							<FieldLabel for="invite-password">{t('invite.password')}</FieldLabel>
							<Input
								id="invite-password"
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
							<FieldLabel for="invite-locale">{t('invite.locale')}</FieldLabel>
							<Select.Root type="single" bind:value={preferredLocale}>
								<Select.Trigger id="invite-locale" class="w-full">
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
									{t('invite.submitting')}
								{:else}
									{t('invite.submit')}
								{/if}
							</Button>
						</Field>
					</FieldGroup>
				</form>
			</div>
		{/if}
	</div>
</div>
