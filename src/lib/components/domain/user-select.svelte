<script lang="ts">
	import { debounce } from '@tanstack/pacer';
	import { t } from '#lib/i18n/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { ApiError } from '#lib/api/client.js';
	import { searchUsers, userLabel, type UserSummary } from '#lib/api/users.js';
	import SearchSelect, { type SelectOption } from '#lib/components/domain/search-select.svelte';

	let {
		value = '',
		label,
		onchange,
		disabled = false,
		valueLabel = ''
	}: {
		value?: string;
		label: string;
		onchange: (userId: string) => void;
		disabled?: boolean;
		/** Label for a value that is set before the search results load (edit forms). */
		valueLabel?: string;
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

	let chosen = $state<UserSummary | null>(null);

	$effect(() => {
		if (!value) {
			chosen = null;
			return;
		}
		const found = users.find((user) => user.id === value);
		if (found) {
			chosen = found;
		} else if (valueLabel) {
			chosen = { id: value, email: '', first_name: valueLabel, last_name: '' };
		}
	});

	const options = $derived<SelectOption[]>([
		...(chosen && !users.some((user) => user.id === chosen?.id)
			? [{ value: chosen.id, label: userLabel(chosen), keywords: [chosen.email] }]
			: []),
		...users.map((user) => ({
			value: user.id,
			label: userLabel(user),
			keywords: [user.email]
		}))
	]);
</script>

<div class="flex flex-col gap-1.5">
	<Input
		class="h-8 text-sm"
		placeholder={t('userSelect.search')}
		aria-label={t('userSelect.searchLabel', { label })}
		{disabled}
		bind:value={query}
	/>
	{#if unavailable}
		<Input
			class="h-8 font-mono text-xs"
			placeholder="UUID"
			aria-label={label}
			{disabled}
			{value}
			oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
				onchange(event.currentTarget.value)}
		/>
	{:else}
		<SearchSelect
			aria-label={label}
			{value}
			{options}
			placeholder={t('dynamicSelect.select')}
			{disabled}
			allowClear
			allLabel={t('userSelect.any')}
			{onchange}
		/>
	{/if}
	{#if loading}
		<span class="text-xs text-muted-foreground">{t('table.loading')}</span>
	{/if}
</div>
