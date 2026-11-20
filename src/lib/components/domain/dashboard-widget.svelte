<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import { t } from '#lib/i18n/index.js';

	let {
		title,
		description,
		loading,
		error,
		onretry,
		children
	}: {
		title: string;
		description?: string;
		loading: boolean;
		error: string | null;
		onretry: () => void;
		children: Snippet;
	} = $props();
</script>

<section class="flex flex-col gap-3 rounded-lg border bg-card p-4">
	<div class="flex flex-col gap-1">
		<h2 class="text-sm font-medium">{title}</h2>
		{#if description}
			<p class="text-xs text-muted-foreground">{description}</p>
		{/if}
	</div>
	{#if loading}
		<div class="flex flex-col gap-2">
			<Skeleton class="h-6 w-full" />
			<Skeleton class="h-6 w-full" />
			<Skeleton class="h-6 w-full" />
		</div>
	{:else if error}
		<div class="flex flex-col items-start gap-2">
			<p class="text-sm text-destructive">{error}</p>
			<Button variant="outline" size="sm" onclick={onretry}>{t('table.retry')}</Button>
		</div>
	{:else}
		{@render children()}
	{/if}
</section>
