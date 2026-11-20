<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
	import { login } from '#lib/api/auth.js';
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
	import { t } from '#lib/i18n/index.js';
	import { session } from '#lib/stores/session.svelte.js';

	const id = $props.id();

	let organizationSlug = $state(page.url.searchParams.get('org') ?? '');
	let email = $state(page.url.searchParams.get('email') ?? '');
	let password = $state('');
	let error = $state<string | null>(null);
	let submitting = $state(false);

	async function onSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (submitting) return;

		error = null;
		submitting = true;

		try {
			const result = await login({
				organization_slug: organizationSlug.trim(),
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
			<ShieldCheckIcon class="size-5" />
		</div>
		<h1 class="text-xl font-bold">{t('auth.title')}</h1>
		<FieldDescription>{t('auth.description')}</FieldDescription>
	</div>

	<form onsubmit={onSubmit} class="flex flex-col gap-5">
		<FieldGroup>
			<Field>
				<FieldLabel for="org-{id}">{t('auth.orgSlug')}</FieldLabel>
				<Input
					id="org-{id}"
					name="organization_slug"
					bind:value={organizationSlug}
					placeholder={t('auth.orgSlugPlaceholder')}
					autocomplete="organization"
					required
					disabled={submitting}
				/>
			</Field>

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
		</FieldGroup>
	</form>

	<p class="text-center text-sm text-muted-foreground">{t('auth.noAccount')}</p>
</div>
