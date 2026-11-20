<script lang="ts">
	import { onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import MailCheckIcon from '@lucide/svelte/icons/mail-check';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
	import { login, requestLoginLink } from '#lib/api/auth.js';
	import { ApiError } from '#lib/api/client.js';
	import { currentOrgSlug } from '#lib/config/tenant.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import {
		Field,
		FieldDescription,
		FieldError,
		FieldGroup,
		FieldLabel
	} from '#lib/components/ui/field/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { t } from '#lib/i18n/index.js';
	import { session } from '#lib/stores/session.svelte.js';

	const id = $props.id();
	const organizationSlug = currentOrgSlug(page.url);
	const RESEND_SECONDS = 60;

	let email = $state(page.url.searchParams.get('email') ?? '');
	let password = $state('');
	let mode = $state<'email' | 'password'>('email');
	let sent = $state(false);
	let error = $state<string | null>(null);
	let submitting = $state(false);
	let cooldown = $state(0);
	let timer: ReturnType<typeof setInterval> | undefined;

	onDestroy(() => clearInterval(timer));

	function startCooldown() {
		cooldown = RESEND_SECONDS;
		clearInterval(timer);
		timer = setInterval(() => {
			cooldown -= 1;
			if (cooldown <= 0) clearInterval(timer);
		}, 1000);
	}

	async function sendLink(event?: SubmitEvent) {
		event?.preventDefault();
		if (submitting || cooldown > 0) return;

		error = null;
		submitting = true;
		try {
			await requestLoginLink({ organization_slug: organizationSlug, email: email.trim() });
			sent = true;
			startCooldown();
		} catch {
			// Never hint whether the address exists: network failures stay generic.
			error = t('auth.genericError');
		} finally {
			submitting = false;
		}
	}

	async function onSubmitPassword(event: SubmitEvent) {
		event.preventDefault();
		if (submitting) return;

		error = null;
		submitting = true;
		try {
			const result = await login({
				organization_slug: organizationSlug,
				email: email.trim(),
				password
			});
			session.applyLogin(result);
			await goto(resolve('/dashboard'), { replace: true });
		} catch (cause) {
			error =
				cause instanceof ApiError && cause.status === 401
					? t('auth.invalidCredentials')
					: cause instanceof ApiError && cause.status > 0
						? cause.message
						: t('auth.genericError');
		} finally {
			submitting = false;
		}
	}
</script>

<div class="flex flex-col gap-6">
	<div class="flex flex-col items-center gap-2 text-center">
		<div
			class="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground"
		>
			{#if sent}
				<MailCheckIcon class="size-5" />
			{:else}
				<ShieldCheckIcon class="size-5" />
			{/if}
		</div>
		<h1 class="text-xl font-bold">
			{sent ? t('auth.checkEmailTitle') : t('auth.title')}
		</h1>
		<FieldDescription>
			{#if sent}
				{t('auth.checkEmailDescription', { email: email.trim() })}
			{:else if mode === 'email'}
				{t('auth.emailFirstDescription')}
			{:else}
				{t('auth.description')}
			{/if}
		</FieldDescription>
	</div>

	{#if sent}
		<div class="flex flex-col gap-3">
			<Button class="w-full" disabled={submitting || cooldown > 0} onclick={() => sendLink()}>
				{#if submitting}
					<LoaderCircleIcon class="animate-spin" />
					{t('auth.sending')}
				{:else if cooldown > 0}
					{t('auth.resendIn', { seconds: cooldown })}
				{:else}
					{t('auth.resend')}
				{/if}
			</Button>
			<Button
				variant="ghost"
				class="w-full"
				onclick={() => {
					sent = false;
					error = null;
					password = '';
				}}
			>
				{t('auth.useDifferentEmail')}
			</Button>
			{#if error}
				<FieldError>{error}</FieldError>
			{/if}
		</div>
	{:else if mode === 'email'}
		<form onsubmit={sendLink} class="flex flex-col gap-5">
			<FieldGroup>
				<Field>
					<FieldLabel for="email-{id}">{t('auth.email')}</FieldLabel>
					<Input
						id="email-{id}"
						name="email"
						type="email"
						bind:value={email}
						placeholder="you@example.com"
						autocomplete="email"
						required
						disabled={submitting}
					/>
				</Field>
				{#if error}
					<FieldError>{error}</FieldError>
				{/if}
				<Field>
					<Button type="submit" class="w-full" disabled={submitting}>
						{#if submitting}
							<LoaderCircleIcon class="animate-spin" />
							{t('auth.sending')}
						{:else}
							{t('auth.sendLink')}
						{/if}
					</Button>
				</Field>
				<Field>
					<Button
						type="button"
						variant="ghost"
						class="w-full"
						onclick={() => {
							mode = 'password';
							error = null;
						}}
					>
						{t('auth.passwordInstead')}
					</Button>
				</Field>
			</FieldGroup>
		</form>
	{:else}
		<form onsubmit={onSubmitPassword} class="flex flex-col gap-5">
			<FieldGroup>
				<Field>
					<FieldLabel for="email-password-{id}">{t('auth.email')}</FieldLabel>
					<Input
						id="email-password-{id}"
						name="email"
						type="email"
						bind:value={email}
						placeholder="you@example.com"
						autocomplete="email"
						required
						disabled={submitting}
					/>
				</Field>
				<Field>
					<FieldLabel for="password-{id}">{t('auth.password')}</FieldLabel>
					<Input
						id="password-{id}"
						name="password"
						type="password"
						bind:value={password}
						autocomplete="current-password"
						required
						disabled={submitting}
					/>
				</Field>
				{#if error}
					<FieldError>{error}</FieldError>
				{/if}
				<Field>
					<Button type="submit" class="w-full" disabled={submitting}>
						{#if submitting}
							<LoaderCircleIcon class="animate-spin" />
							{t('auth.submitting')}
						{:else}
							{t('auth.submit')}
						{/if}
					</Button>
				</Field>
				<Field>
					<Button
						type="button"
						variant="ghost"
						class="w-full"
						onclick={() => {
							mode = 'email';
							error = null;
						}}
					>
						{t('auth.linkInstead')}
					</Button>
				</Field>
			</FieldGroup>
		</form>
	{/if}

	<p class="text-center text-sm text-muted-foreground">{t('auth.noAccount')}</p>
</div>
