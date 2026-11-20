<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { SvelteMap } from 'svelte/reactivity';
	import { toast } from 'svelte-sonner';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import { ApiError } from '#lib/api/client.js';
	import { deleteLookup, listLookups, type Lookup, type LookupFamily } from '#lib/api/lookups.js';
	import { lookupConfigs, lookupFamilies } from '#lib/config/lookups.js';
	import { resolveI18n, t } from '#lib/i18n/index.js';
	import { session } from '#lib/stores/session.svelte.js';
	import { formatDate } from '#lib/utils.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import LookupForm from './lookup-form.svelte';

	const familyParam = $derived(page.url.searchParams.get('family'));
	const family = $derived(
		familyParam && familyParam in lookupConfigs ? (familyParam as LookupFamily) : 'categories'
	);
	const config = $derived(lookupConfigs[family]);
	const canWrite = $derived(session.has('lookups.write'));

	let items = $state<Lookup[]>([]);
	/** Unfiltered locations, used for the parent picker. */
	let allLocations = $state<Lookup[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let deletingId = $state<string | null>(null);
	let formOpen = $state(false);
	let editing = $state<Lookup | null>(null);
	let query = $state('');

	const filtered = $derived.by(() => {
		const needle = query.trim().toLowerCase();
		if (!needle) return items;
		return items.filter((item) =>
			[resolveI18n(item.translations), item.code ?? ''].some((value) =>
				value.toLowerCase().includes(needle)
			)
		);
	});

	/** Locations arrive flat; indent children under their parent. */
	const rows = $derived.by(() => {
		if (!config.tree) return filtered.map((item) => ({ item, depth: 0 }));
		const ids = new Set(filtered.map((item) => item.id));
		const byParent = new SvelteMap<string, Lookup[]>();
		for (const item of filtered) {
			const parent = item.parent_id && ids.has(item.parent_id) ? item.parent_id : 'root';
			byParent.set(parent, [...(byParent.get(parent) ?? []), item]);
		}
		const out: { item: Lookup; depth: number }[] = [];
		function walk(parent: string, depth: number) {
			for (const item of byParent.get(parent) ?? []) {
				out.push({ item, depth });
				walk(item.id, depth + 1);
			}
		}
		walk('root', 0);
		return out;
	});

	async function load(target: LookupFamily = family) {
		loading = true;
		error = null;
		try {
			items = await listLookups(target);
			if (target === 'locations') allLocations = items;
		} catch (cause) {
			error =
				cause instanceof ApiError && cause.status > 0 ? cause.message : t('auth.genericError');
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		const target = family;
		query = '';
		void load(target);
	});

	function openCreate() {
		editing = null;
		formOpen = true;
	}

	function openEdit(item: Lookup) {
		editing = item;
		formOpen = true;
	}

	async function remove(item: Lookup) {
		if (!confirm(t('lookup.confirmDelete'))) return;
		deletingId = item.id;
		try {
			await deleteLookup(family, item.id);
			toast.success(t('lookup.deleted'));
			await load();
		} catch (cause) {
			toast.error(
				cause instanceof ApiError && cause.status > 0 ? cause.message : t('auth.genericError')
			);
		} finally {
			deletingId = null;
		}
	}
</script>

<svelte:head>
	<title>{t(config.titleKey)} · EAT</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-semibold tracking-tight">{t('lookup.title')}</h1>
			<p class="text-sm text-muted-foreground">{t('lookup.description')}</p>
		</div>
		{#if canWrite}
			<Button onclick={openCreate}>
				<PlusIcon />
				{t('lookup.add')}
			</Button>
		{/if}
	</div>

	<nav class="flex flex-wrap gap-1 border-b pb-2" aria-label={t('lookup.title')}>
		{#each lookupFamilies as key (key)}
			<a
				href="{resolve('/dashboard/settings/lookups')}?family={key}"
				class="rounded-md px-3 py-1.5 text-sm transition-colors {family === key
					? 'bg-primary text-primary-foreground'
					: 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
				aria-current={family === key ? 'page' : undefined}
			>
				{t(lookupConfigs[key].titleKey)}
			</a>
		{/each}
	</nav>

	<div class="flex flex-col gap-1">
		<h2 class="font-medium">{t(config.titleKey)}</h2>
		<p class="text-sm text-muted-foreground">{t(config.descriptionKey)}</p>
	</div>

	<section class="rounded-lg border bg-card">
		<div class="flex items-center gap-2 border-b p-3">
			<Input
				class="sm:max-w-72"
				placeholder={t('lookup.searchPlaceholder')}
				bind:value={query}
				aria-label={t('lookup.searchPlaceholder')}
			/>
			<span class="ms-auto text-xs text-muted-foreground">
				{t('lookup.count', { count: filtered.length })}
			</span>
		</div>

		{#if loading}
			<div class="flex flex-col gap-2 p-4">
				<Skeleton class="h-8 w-full" />
				<Skeleton class="h-8 w-full" />
				<Skeleton class="h-8 w-full" />
			</div>
		{:else if error}
			<div class="flex flex-col items-start gap-3 p-6">
				<p class="text-sm text-destructive">{error}</p>
				<Button variant="outline" size="sm" onclick={() => load()}>{t('table.retry')}</Button>
			</div>
		{:else if rows.length === 0}
			<div class="flex flex-col items-center gap-1 p-10 text-center">
				<p class="font-medium">{t('lookup.emptyTitle')}</p>
				<p class="text-sm text-muted-foreground">{t('lookup.emptyDescription')}</p>
			</div>
		{:else}
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>{t('lookup.name')}</Table.Head>
						<Table.Head>{t('lookup.code')}</Table.Head>
						<Table.Head>{t(config.secondary.labelKey)}</Table.Head>
						<Table.Head class="hidden md:table-cell">{t('lookup.updatedAt')}</Table.Head>
						<Table.Head class="w-0">{t('common.actions')}</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each rows as { item, depth } (item.id)}
						<Table.Row>
							<Table.Cell>
								<div
									class="flex items-center gap-2"
									style="padding-inline-start: {depth * 1.25}rem"
								>
									{#if config.color && item.color_code}
										<span
											class="size-2.5 rounded-full ring-1 ring-black/10"
											style="background-color: {item.color_code}"
										></span>
									{/if}
									<span class="font-medium">
										{resolveI18n(item.translations, undefined, item.id)}
									</span>
								</div>
							</Table.Cell>
							<Table.Cell class="font-mono text-xs text-muted-foreground">
								{item.code ?? '—'}
							</Table.Cell>
							<Table.Cell class="text-muted-foreground">
								{#if config.secondary.labelKey === 'lookup.statusType' && item.status_type}
									<Badge variant="secondary">{t(`lookup.enum.${item.status_type}`)}</Badge>
								{:else if config.secondary.labelKey === 'lookup.categoryType' && item.category_type}
									<Badge variant="secondary">{t(`lookup.enum.${item.category_type}`)}</Badge>
								{:else}
									{config.secondary.value(item) ?? '—'}
								{/if}
							</Table.Cell>
							<Table.Cell class="hidden text-muted-foreground md:table-cell">
								{formatDate(item.updated_at)}
							</Table.Cell>
							<Table.Cell>
								{#if canWrite}
									<div class="flex justify-end gap-1">
										<Button
											variant="ghost"
											size="icon-sm"
											aria-label={t('common.edit')}
											onclick={() => openEdit(item)}
										>
											<PencilIcon />
										</Button>
										<Button
											variant="ghost"
											size="icon-sm"
											class="text-destructive"
											aria-label={t('common.delete')}
											disabled={deletingId === item.id}
											onclick={() => remove(item)}
										>
											<Trash2Icon />
										</Button>
									</div>
								{:else}
									<span class="text-muted-foreground">—</span>
								{/if}
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		{/if}
	</section>
</div>

{#if formOpen}
	<LookupForm
		{config}
		item={editing}
		locations={allLocations}
		onclose={() => (formOpen = false)}
		onsaved={() => load()}
	/>
{/if}
