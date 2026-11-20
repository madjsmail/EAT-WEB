<script lang="ts">
	import LoginForm from '#lib/components/login-form.svelte';
	import { t } from '#lib/i18n/index.js';
</script>

<svelte:head>
	<title>{t('auth.title')} · EAT</title>
</svelte:head>

<div class="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
	<div class="w-full max-w-sm">
		<LoginForm />
	</div>
</div>
