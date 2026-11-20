<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { toast } from 'svelte-sonner';
	import ScanLineIcon from '@lucide/svelte/icons/scan-line';
	import { scanAsset } from '#lib/api/assets.js';
	import { ApiError } from '#lib/api/client.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { t } from '#lib/i18n/index.js';

	let code = $state('');
	let scanning = $state(false);
	let input = $state<HTMLInputElement | null>(null);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		const value = code.trim();
		if (!value) return;
		scanning = true;
		try {
			const asset = await scanAsset(value);
			code = '';
			await goto(resolve('/dashboard/assets/[id]', { id: asset.id }));
		} catch (cause) {
			toast.error(
				cause instanceof ApiError && cause.status === 404
					? t('scan.notFound', { code: value })
					: t('auth.genericError')
			);
		} finally {
			scanning = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
			event.preventDefault();
			input?.focus();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<form class="relative hidden items-center md:flex" onsubmit={submit}>
	<ScanLineIcon class="pointer-events-none absolute ms-2 size-4 text-muted-foreground" />
	<Input
		bind:ref={input}
		class="ps-8 sm:max-w-56"
		placeholder={t('scan.placeholder')}
		aria-label={t('scan.placeholder')}
		title={`${t('scan.shortcut')} (Ctrl/Cmd+K)`}
		bind:value={code}
		disabled={scanning}
	/>
	<Button type="submit" variant="ghost" size="sm" class="ms-1" disabled={scanning || !code.trim()}>
		{t('scan.submit')}
	</Button>
</form>
