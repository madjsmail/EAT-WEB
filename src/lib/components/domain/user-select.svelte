<script lang="ts">
	import { debounce } from '@tanstack/pacer';
	import { t } from '#lib/i18n/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { ApiError } from '#lib/api/client.js';
	import { searchUsers, userLabel, type UserSummary } from '#lib/api/users.js';

	let {
		value = '',
		label,
		onchange
	}: {
		value?: string;
		label: string;
		onchange: (userId: string) => void;
	} = $props();

	let query = $state('');
	let users = $state<UserSummary[]>([]);
	let loading = $state(false);
	/** A failed lookup falls back to the raw UUID so the filter keeps working. */
	let unavailable = $state(false);

	const search = debounce(
		async (q: string) => {
			loading = true;
			try {
				const result = await searchUsers(q, 20);
				users = result.items;
				unavailable = false;
			} catch (cause) {
				unavailable = !(cause instanceof ApiError);
				users = [];
			} finally {
				loading = false;
			}
		},
		{ wait: 250 }
	);

	$effect(() => {
		void search(query);
	});

	const selected = $derived(users.find((user) => user.id === value) ?? null);
</script>

<div class="flex flex-col gap-1.5">
	<Input
		class="h-8 text-sm"
		placeholder={t('userSelect.search')}
		aria-label={t('userSelect.searchLabel', { label })}
		bind:value={query}
	/>
	{#if unavailable}
		<Input
			class="h-8 font-mono text-xs"
			placeholder="UUID"
			aria-label={label}
			value={value}
			oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
				onchange(event.currentTarget.value)}
		/>
	{:else}
		<select
			class="h-8 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
			aria-label={label}
			value={value}
			onchange={(event: Event & { currentTarget: HTMLSelectElement }) =>
				onchange(event.currentTarget.value)}
		>
			<option value="">{t('userSelect.any')}</option>
			{#if selected && !users.some((user) => user.id === selected.id)}
				<option value={selected.id}>{userLabel(selected)}</option>
			{/if}
			{#each users as user (user.id)}
				<option value={user.id}>{userLabel(user)}</option>
			{/each}
		</select>
	{/if}
	{#if loading}
		<span class="text-xs text-muted-foreground">{t('table.loading')}</span>
	{/if}
</div>
