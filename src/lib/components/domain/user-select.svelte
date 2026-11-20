<script lang="ts">
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

	let users = $state<UserSummary[]>([]);
	let loading = $state(true);
	/** A failed lookup falls back to the raw UUID so the filter keeps working. */
	let unavailable = $state(false);

	// Single control: the popover's own command input filters this list.
	// ponytail: first 100 users only; add server-side search when directories grow past that.
	$effect(() => {
		let cancelled = false;
		(async () => {
			try {
				const result = await searchUsers('', 100);
				if (!cancelled) {
					users = result.items;
					unavailable = false;
				}
			} catch (cause) {
				if (!cancelled) {
					unavailable = !(cause instanceof ApiError);
					users = [];
				}
			} finally {
				if (!cancelled) loading = false;
			}
		})();
		return () => {
			cancelled = true;
		};
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
