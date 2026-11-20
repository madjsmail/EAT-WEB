<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { ApiError, type Pagination } from '#lib/api/client.js';
	import { listAuditLogs, type AuditEntry } from '#lib/api/audit.js';
	import { auditableTypes, auditEvents, entityHref, prettyJson, typeLabel } from '#lib/config/audit.js';
	import { t } from '#lib/i18n/index.js';
	import { session } from '#lib/stores/session.svelte.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import * as Sheet from '#lib/components/ui/sheet/index.js';
	import AuditEntryItem from '#lib/components/domain/audit-entry.svelte';
	import UserSelect from '#lib/components/domain/user-select.svelte';
	import TablePagination from '#lib/components/domain/table-pagination.svelte';

	const canRead = $derived(session.has('audit.read'));
	const PER_PAGE_MAX = 100;

	interface Filters {
		search: string;
		actor_id: string;
		auditable_type: string;
		auditable_id: string;
		event: string[];
		date_from: string;
		date_to: string;
		per_page: number;
	}

	function readFilters(search: { get(key: string): string | null; getAll(key: string): string[] }): Filters {
		const perPage = Number.parseInt(search.get('per_page') ?? '25', 10);
		return {
			search: search.get('search') ?? '',
			actor_id: search.get('actor_id') ?? '',
			auditable_type: search.get('auditable_type') ?? '',
			auditable_id: search.get('auditable_id') ?? '',
			event: search.getAll('event'),
			date_from: search.get('date_from') ?? '',
			date_to: search.get('date_to') ?? '',
			per_page: Number.isFinite(perPage) ? Math.min(Math.max(perPage, 1), PER_PAGE_MAX) : 25
		};
	}

	const initial = untrack(() => readFilters(page.url.searchParams));
	const initialPage = untrack(() => Number.parseInt(page.url.searchParams.get('page') ?? '1', 10));

	let filters = $state<Filters>({ ...initial });
	let currentPage = $state(Number.isFinite(initialPage) && initialPage > 0 ? initialPage : 1);
	let entries = $state<AuditEntry[]>([]);
	let pagination = $state<Pagination>({
		page: 1,
		per_page: initial.per_page,
		total: 0,
		total_pages: 0
	});
	let loading = $state(true);
	let error = $state<string | null>(null);
	let fieldErrors = $state<Record<string, string>>({});
	let active = $state<AuditEntry | null>(null);

	function toRfc3339(date: string, endOfDay = false): string | undefined {
		if (!date) return undefined;
		const parsed = new Date(`${date}T${endOfDay ? '23:59:59' : '00:00:00'}Z`);
		return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
	}

	async function load(target = currentPage) {
		loading = true;
		error = null;
		fieldErrors = {};
		currentPage = target;

		try {
			const result = await listAuditLogs({
				search: filters.search || undefined,
				actor_id: filters.actor_id || undefined,
				auditable_type: filters.auditable_type || undefined,
				auditable_id: filters.auditable_type ? filters.auditable_id || undefined : undefined,
				event: filters.event.length > 0 ? filters.event : undefined,
				date_from: toRfc3339(filters.date_from),
				date_to: toRfc3339(filters.date_to, true),
				page: target,
				per_page: filters.per_page
			});
			entries = result.items;
			pagination = result.pagination;
		} catch (cause) {
			if (cause instanceof ApiError && cause.status > 0) {
				error = cause.message;
				fieldErrors = Object.fromEntries(
					cause.errors.flatMap((item) =>
						item.field ? [[item.field, item.message] as const] : []
					)
				);
			} else {
				error = t('auth.genericError');
			}
		} finally {
			loading = false;
		}
	}

	/** The URL mirrors the applied filters so the view stays shareable. */
	function syncUrl() {
		const next = new URLSearchParams();
		if (filters.search) next.set('search', filters.search);
		if (filters.actor_id) next.set('actor_id', filters.actor_id);
		if (filters.auditable_type) next.set('auditable_type', filters.auditable_type);
		if (filters.auditable_id && filters.auditable_type) next.set('auditable_id', filters.auditable_id);
		for (const event of filters.event) next.append('event', event);
		if (filters.date_from) next.set('date_from', filters.date_from);
		if (filters.date_to) next.set('date_to', filters.date_to);
		if (filters.per_page !== 25) next.set('per_page', String(filters.per_page));
		if (currentPage > 1) next.set('page', String(currentPage));
		const query = next.toString();
		void goto(`?${query}`, { replace: true, reset: false });
	}

	function apply(event: SubmitEvent) {
		event.preventDefault();
		syncUrl();
		void load(1);
	}

	function changePage(target: number) {
		syncUrl();
		void load(target);
	}

	function toggleEvent(event: string) {
		filters.event = filters.event.includes(event)
			? filters.event.filter((item) => item !== event)
			: [...filters.event, event];
	}

	function reset() {
		filters = {
			search: '',
			actor_id: '',
			auditable_type: '',
			auditable_id: '',
			event: [],
			date_from: '',
			date_to: '',
			per_page: filters.per_page
		};
		currentPage = 1;
		void goto('?', { replace: true, reset: false });
		void load(1);
	}

	onMount(() => {
		if (canRead) void load(currentPage);
	});
</script>

<svelte:head>
	<title>{t('audit.title')} · EAT</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-1">
		<h1 class="text-2xl font-semibold tracking-tight">{t('audit.title')}</h1>
		<p class="text-sm text-muted-foreground">{t('audit.description')}</p>
	</div>

	{#if !canRead}
		<section class="rounded-lg border bg-card p-6">
			<p class="font-medium">{t('audit.noAccessTitle')}</p>
			<p class="text-sm text-muted-foreground">{t('audit.noAccessDescription')}</p>
		</section>
	{:else}
		<form class="grid gap-3 rounded-lg border bg-card p-3 md:grid-cols-2 xl:grid-cols-4" onsubmit={apply}>
			<div class="flex flex-col gap-1.5">
				<label class="text-xs font-medium" for="audit-search">{t('table.search')}</label>
				<Input
					id="audit-search"
					placeholder={t('audit.searchPlaceholder')}
					bind:value={filters.search}
				/>
			</div>

			<div class="flex flex-col gap-1.5">
				<span class="text-xs font-medium">{t('audit.actor')}</span>
				<UserSelect
					label={t('audit.actor')}
					value={filters.actor_id}
					onchange={(id) => (filters.actor_id = id)}
				/>
			</div>

			<div class="flex flex-col gap-1.5">
				<label class="text-xs font-medium" for="audit-type">{t('audit.entityType')}</label>
				<select
					id="audit-type"
					class="h-8 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
					bind:value={filters.auditable_type}
				>
					<option value="">{t('audit.allTypes')}</option>
					{#each auditableTypes as type (type)}
						<option value={type}>{typeLabel(type)}</option>
					{/each}
				</select>
			</div>

			<div class="flex flex-col gap-1.5">
				<label class="text-xs font-medium" for="audit-entity">{t('audit.entityId')}</label>
				<Input
					id="audit-entity"
					class="font-mono text-xs"
					placeholder="UUID"
					disabled={!filters.auditable_type}
					bind:value={filters.auditable_id}
				/>
				{#if fieldErrors.auditable_id}
					<p class="text-xs text-destructive">{fieldErrors.auditable_id}</p>
				{/if}
			</div>

			<div class="flex flex-col gap-1.5">
				<label class="text-xs font-medium" for="audit-from">{t('audit.dateFrom')}</label>
				<Input id="audit-from" type="date" bind:value={filters.date_from} />
				{#if fieldErrors.date_from}
					<p class="text-xs text-destructive">{fieldErrors.date_from}</p>
				{/if}
			</div>

			<div class="flex flex-col gap-1.5">
				<label class="text-xs font-medium" for="audit-to">{t('audit.dateTo')}</label>
				<Input id="audit-to" type="date" bind:value={filters.date_to} />
				{#if fieldErrors.date_to}
					<p class="text-xs text-destructive">{fieldErrors.date_to}</p>
				{/if}
			</div>

			<div class="flex flex-col gap-1.5">
				<label class="text-xs font-medium" for="audit-per-page">{t('audit.perPage')}</label>
				<select
					id="audit-per-page"
					class="h-8 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
					bind:value={filters.per_page}
				>
					{#each [25, 50, 100] as size (size)}
						<option value={size}>{size}</option>
					{/each}
				</select>
			</div>

			<details class="flex flex-col gap-1.5">
				<summary class="cursor-pointer text-xs font-medium">
					{t('audit.events')}
					{#if filters.event.length > 0}
						<span class="text-muted-foreground">({filters.event.length})</span>
					{/if}
				</summary>
				<div class="mt-2 grid max-h-48 gap-1 overflow-y-auto sm:grid-cols-2">
					{#each auditEvents as event (event)}
						<label class="flex items-center gap-2 text-xs">
							<input
								type="checkbox"
								class="size-3.5"
								checked={filters.event.includes(event)}
								onchange={() => toggleEvent(event)}
							/>
							{t(`audit.event.${event}`)}
						</label>
					{/each}
				</div>
			</details>

			<div class="flex items-end gap-2 md:col-span-2 xl:col-span-4">
				<Button type="submit">{t('table.search')}</Button>
				<Button type="button" variant="outline" onclick={reset}>{t('audit.reset')}</Button>
			</div>
		</form>

		<section class="rounded-lg border bg-card">
			{#if loading}
				<div class="flex flex-col gap-3 p-4">
					<Skeleton class="h-16 w-full" />
					<Skeleton class="h-16 w-full" />
					<Skeleton class="h-16 w-full" />
				</div>
			{:else if error}
				<div class="flex flex-col items-start gap-3 p-6">
					<p class="text-sm text-destructive">{error}</p>
					<Button variant="outline" size="sm" onclick={() => load(currentPage)}>
						{t('table.retry')}
					</Button>
				</div>
			{:else if entries.length === 0}
				<div class="flex flex-col items-center gap-1 p-10 text-center">
					<p class="font-medium">{t('audit.emptyTitle')}</p>
					<p class="text-sm text-muted-foreground">{t('audit.emptyDescription')}</p>
				</div>
			{:else}
				<ol class="relative p-4 ps-6 before:absolute before:inset-y-4 before:start-3 before:w-px before:bg-border">
					{#each entries as entry (entry.id)}
						<AuditEntryItem {entry} onopen={(value) => (active = value)} />
					{/each}
				</ol>
				<TablePagination {pagination} onpage={changePage} />
			{/if}
		</section>
	{/if}
</div>

{#if active}
	<Sheet.Root open onOpenChange={(open) => !open && (active = null)}>
		<Sheet.Content side="right" class="w-full sm:max-w-2xl">
			<Sheet.Header>
				<Sheet.Title>{t('audit.detailsTitle')}</Sheet.Title>
				<Sheet.Description>
					{active.actor_name || t('audit.system')} · {typeLabel(active.auditable_type)}
					{#if entityHref(active.auditable_type, active.auditable_id)}
						<a
							class="underline-offset-2 hover:underline"
							href={entityHref(active.auditable_type, active.auditable_id) ?? '#'}
						>
							#{active.auditable_id.slice(0, 8)}
						</a>
					{/if}
				</Sheet.Description>
			</Sheet.Header>
			<div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
				<div class="grid gap-1 text-xs text-muted-foreground">
					<span>{t('audit.actorEmail')}: {active.actor_email ?? '—'}</span>
					<span>{t('audit.actorIp')}: {active.actor_ip ?? '—'}</span>
					<span class="break-all">{t('audit.actorUserAgent')}: {active.actor_user_agent ?? '—'}</span>
				</div>
				{#each [{ label: t('audit.oldValues'), value: active.old_values }, { label: t('audit.newValues'), value: active.new_values }, { label: t('audit.diff'), value: active.diff }, { label: t('audit.metadata'), value: active.metadata }] as block (block.label)}
					<div>
						<p class="mb-1 text-xs font-medium">{block.label}</p>
						<pre class="max-h-64 overflow-auto rounded-md border bg-muted/40 p-2 text-xs">{prettyJson(
							block.value
						)}</pre>
					</div>
				{/each}
			</div>
		</Sheet.Content>
	</Sheet.Root>
{/if}
