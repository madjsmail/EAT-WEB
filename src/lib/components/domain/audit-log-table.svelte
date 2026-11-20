<script lang="ts">
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import * as Collapsible from '#lib/components/ui/collapsible/index.js';
	import * as Select from '#lib/components/ui/select/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import { RelativeTime } from '#lib/components/ui/relative-time/index.js';
	import { SvelteSet } from 'svelte/reactivity';
	import { eventLabel, typeLabel } from '#lib/config/audit.js';
	import { t } from '#lib/i18n/index.js';
	import { cn } from '#lib/utils.js';

	interface Change {
		field: string;
		old: string | null;
		new: string | null;
	}

	interface AuditEvent {
		id: string;
		action: string;
		actorName: string;
		actorEmail: string;
		entityType: string;
		entityId: string;
		changedFields: number | null;
		timestamp: string;
		details: Change[];
	}

	const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

	const auditEvents: AuditEvent[] = [
		{
			id: '1',
			action: 'updated',
			actorName: 'Majdil Ismail',
			actorEmail: 'admin@demo.local',
			entityType: 'maintenance',
			entityId: '4651d4f',
			changedFields: 2,
			timestamp: ago(3),
			details: [
				{ field: 'status', old: 'scheduled', new: 'in_progress' },
				{ field: 'assignee', old: 'unassigned', new: 'Ada Lovelace' }
			]
		},
		{
			id: '2',
			action: 'deleted',
			actorName: 'System',
			actorEmail: 'system@demo.local',
			entityType: 'asset',
			entityId: '9a12b7c',
			changedFields: null,
			timestamp: ago(18),
			details: [{ field: 'deleted_at', old: null, new: '2026-11-20T09:12:00Z' }]
		},
		{
			id: '3',
			action: 'assigned',
			actorName: 'Ada Lovelace',
			actorEmail: 'ada@acme.test',
			entityType: 'asset',
			entityId: 'b7710ea',
			changedFields: 3,
			timestamp: ago(45),
			details: [
				{ field: 'assigned_to', old: null, new: 'Ada Lovelace' },
				{ field: 'status', old: 'in_stock', new: 'assigned' },
				{ field: 'assigned_at', old: null, new: '2026-11-20T08:30:00Z' }
			]
		},
		{
			id: '4',
			action: 'maintenance_opened',
			actorName: 'Majdil Ismail',
			actorEmail: 'admin@demo.local',
			entityType: 'maintenance',
			entityId: '4651d4f',
			changedFields: 1,
			timestamp: ago(120),
			details: [{ field: 'opened_at', old: null, new: '2026-11-20T07:15:00Z' }]
		},
		{
			id: '5',
			action: 'created',
			actorName: 'System',
			actorEmail: 'system@demo.local',
			entityType: 'request_details',
			entityId: 'f0c9a21',
			changedFields: null,
			timestamp: ago(240),
			details: [{ field: 'request_type', old: null, new: 'asset_return' }]
		},
		{
			id: '6',
			action: 'updated',
			actorName: 'Ada Lovelace',
			actorEmail: 'ada@acme.test',
			entityType: 'request_details',
			entityId: 'f0c9a21',
			changedFields: 1,
			timestamp: ago(1440),
			details: [{ field: 'status', old: 'pending', new: 'approved' }]
		},
		{
			id: '7',
			action: 'assigned',
			actorName: 'Majdil Ismail',
			actorEmail: 'admin@demo.local',
			entityType: 'asset',
			entityId: '3d4e5f6',
			changedFields: 2,
			timestamp: ago(2880),
			details: [
				{ field: 'location', old: 'HQ', new: 'Warehouse' },
				{ field: 'custodian', old: 'Grace Hopper', new: 'Ada Lovelace' }
			]
		}
	];

	const actors = [...new Set(auditEvents.map((event) => event.actorName))];
	const entityTypes = [...new Set(auditEvents.map((event) => event.entityType))];

	const actionClasses: Record<string, string> = {
		created: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
		updated: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300',
		deleted: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300',
		assigned: 'bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300',
		maintenance_opened: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'
	};

	let search = $state('');
	let actor = $state('');
	let entityType = $state('');
	let entityId = $state('');
	let dateFrom = $state('');
	let dateTo = $state('');
	let perPage = $state(25);
	let currentPage = $state(1);
	let expanded = new SvelteSet<string>();

	const filtered = $derived.by(() => {
		const term = search.trim().toLowerCase();
		return auditEvents.filter((event) => {
			if (actor && event.actorName !== actor) return false;
			if (entityType && event.entityType !== entityType) return false;
			if (entityId && !event.entityId.toLowerCase().includes(entityId.toLowerCase())) return false;
			if (dateFrom && event.timestamp.slice(0, 10) < dateFrom) return false;
			if (dateTo && event.timestamp.slice(0, 10) > dateTo) return false;
			if (!term) return true;
			return [
				event.actorName,
				event.actorEmail,
				event.entityId,
				typeLabel(event.entityType),
				eventLabel(event.action)
			]
				.join(' ')
				.toLowerCase()
				.includes(term);
		});
	});

	const pageCount = $derived(Math.max(1, Math.ceil(filtered.length / perPage)));
	const page = $derived(Math.min(currentPage, pageCount));
	const start = $derived(filtered.length === 0 ? 0 : (page - 1) * perPage + 1);
	const end = $derived(Math.min(page * perPage, filtered.length));
	const paged = $derived(filtered.slice((page - 1) * perPage, page * perPage));

	function toggle(id: string) {
		if (expanded.has(id)) expanded.delete(id);
		else expanded.add(id);
	}

	function reset() {
		search = '';
		actor = '';
		entityType = '';
		entityId = '';
		dateFrom = '';
		dateTo = '';
		currentPage = 1;
	}
</script>

<div class="flex flex-col gap-4">
	<form
		class="flex flex-wrap items-end gap-2 rounded-lg border bg-card p-3"
		onsubmit={(event) => {
			event.preventDefault();
			currentPage = 1;
		}}
	>
		<div class="flex min-w-48 flex-1 flex-col gap-1.5">
			<label class="text-xs font-medium" for="audit-table-search">{t('table.search')}</label>
			<Input
				id="audit-table-search"
				placeholder={t('audit.searchPlaceholder')}
				bind:value={search}
			/>
		</div>

		<div class="flex w-40 flex-col gap-1.5">
			<span class="text-xs font-medium">{t('audit.actor')}</span>
			<Select.Root
				type="single"
				value={actor || 'any'}
				onValueChange={(value) => {
					actor = value === 'any' ? '' : value;
					currentPage = 1;
				}}
			>
				<Select.Trigger class="h-8 w-full" aria-label={t('audit.actor')}>
					<Select.Value placeholder={t('audit.anyActor')} />
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="any" label={t('audit.anyActor')}>{t('audit.anyActor')}</Select.Item>
					{#each actors as name (name)}
						<Select.Item value={name} label={name}>{name}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>

		<div class="flex w-40 flex-col gap-1.5">
			<span class="text-xs font-medium">{t('audit.entityType')}</span>
			<Select.Root
				type="single"
				value={entityType || 'all'}
				onValueChange={(value) => {
					entityType = value === 'all' ? '' : value;
					currentPage = 1;
				}}
			>
				<Select.Trigger class="h-8 w-full" aria-label={t('audit.entityType')}>
					<Select.Value placeholder={t('audit.allTypes')} />
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="all" label={t('audit.allTypes')}>{t('audit.allTypes')}</Select.Item>
					{#each entityTypes as type (type)}
						<Select.Item value={type} label={typeLabel(type)}>{typeLabel(type)}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>

		<div class="flex w-36 flex-col gap-1.5">
			<label class="text-xs font-medium" for="audit-table-entity">{t('audit.entityId')}</label>
			<Input
				id="audit-table-entity"
				class="h-8 font-mono text-xs"
				placeholder="4651d4f"
				bind:value={entityId}
				oninput={() => (currentPage = 1)}
			/>
		</div>

		<div class="flex w-36 flex-col gap-1.5">
			<label class="text-xs font-medium" for="audit-table-from">{t('audit.dateFrom')}</label>
			<Input
				id="audit-table-from"
				class="h-8"
				type="date"
				bind:value={dateFrom}
				oninput={() => (currentPage = 1)}
			/>
		</div>

		<div class="flex w-36 flex-col gap-1.5">
			<label class="text-xs font-medium" for="audit-table-to">{t('audit.dateTo')}</label>
			<Input
				id="audit-table-to"
				class="h-8"
				type="date"
				bind:value={dateTo}
				oninput={() => (currentPage = 1)}
			/>
		</div>

		<div class="flex w-24 flex-col gap-1.5">
			<span class="text-xs font-medium">{t('audit.perPage')}</span>
			<Select.Root
				type="single"
				value={String(perPage)}
				onValueChange={(value) => {
					perPage = Number(value);
					currentPage = 1;
				}}
			>
				<Select.Trigger class="h-8 w-full" aria-label={t('audit.perPage')}>
					<Select.Value />
				</Select.Trigger>
				<Select.Content>
					{#each [25, 50, 100] as size (size)}
						<Select.Item value={String(size)} label={String(size)}>{size}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>

		<div class="flex gap-2">
			<Button type="submit" size="sm" class="h-8">{t('table.search')}</Button>
			<Button type="button" size="sm" variant="outline" class="h-8" onclick={reset}>
				{t('audit.reset')}
			</Button>
		</div>
	</form>

	<section class="overflow-hidden rounded-lg border bg-card">
		<Table.Root>
			<Table.Header>
				<Table.Row class="hover:bg-transparent">
					<Table.Head class="w-32">{t('audit.action')}</Table.Head>
					<Table.Head>{t('audit.actor')}</Table.Head>
					<Table.Head>{t('audit.entity')}</Table.Head>
					<Table.Head class="w-32">{t('audit.changes')}</Table.Head>
					<Table.Head class="w-32 text-end">{t('audit.timestamp')}</Table.Head>
					<Table.Head class="w-32 text-end">{t('audit.details')}</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#if paged.length === 0}
					<Table.Row class="hover:bg-transparent">
						<Table.Cell colspan={6} class="h-32 text-center">
							<p class="font-medium">{t('audit.emptyTitle')}</p>
							<p class="text-sm text-muted-foreground">{t('audit.emptyDescription')}</p>
						</Table.Cell>
					</Table.Row>
				{/if}
				{#each paged as event (event.id)}
					<Table.Row
						class="cursor-pointer text-sm hover:bg-muted/50"
						aria-expanded={expanded.has(event.id)}
						onclick={() => toggle(event.id)}
					>
						<Table.Cell>
							<Badge
								variant="outline"
								class={cn(
									'border-transparent',
									actionClasses[event.action] ?? 'bg-muted text-muted-foreground'
								)}
							>
								{eventLabel(event.action)}
							</Badge>
						</Table.Cell>
						<Table.Cell>
							<div class="flex flex-col">
								<span class="font-medium">{event.actorName}</span>
								<span class="text-xs text-muted-foreground">{event.actorEmail}</span>
							</div>
						</Table.Cell>
						<Table.Cell>
							<div class="flex flex-col">
								<span>{typeLabel(event.entityType)}</span>
								<span class="font-mono text-xs text-muted-foreground">{event.entityId}</span>
							</div>
						</Table.Cell>
						<Table.Cell class="text-xs text-muted-foreground">
							{#if event.changedFields}
								{t('audit.changesCount', { count: event.changedFields })}
							{/if}
						</Table.Cell>
						<Table.Cell class="text-end text-xs text-muted-foreground">
							<RelativeTime date={event.timestamp} />
						</Table.Cell>
						<Table.Cell class="text-end">
							<Button
								type="button"
								variant="ghost"
								size="sm"
								class="h-7 gap-1 text-xs"
								aria-expanded={expanded.has(event.id)}
								onclick={(click) => {
									click.stopPropagation();
									toggle(event.id);
								}}
							>
								{t('audit.openDetails')}
								<ChevronDownIcon
									class={cn(
										'size-3.5 transition-transform',
										expanded.has(event.id) && 'rotate-180'
									)}
								/>
							</Button>
						</Table.Cell>
					</Table.Row>

					{#if expanded.has(event.id)}
						<Table.Row class="hover:bg-transparent">
							<Table.Cell colspan={6} class="p-0">
								<Collapsible.Root open>
									<Collapsible.Content>
										<div class="border-s-2 border-primary/40 bg-muted/30 px-4 py-3">
											<p class="mb-2 text-xs font-medium text-muted-foreground">
												{t('audit.detailsTitle')}
											</p>
											<dl class="flex flex-col gap-2 text-xs">
												{#each event.details as change (change.field)}
													<div class="flex flex-wrap items-center gap-2">
														<dt class="min-w-28 font-medium">{change.field}</dt>
														<dd class="flex items-center gap-1">
															<code
																class="rounded bg-rose-500/10 px-1 text-rose-700 line-through dark:text-rose-300"
															>
																{change.old ?? '—'}
															</code>
															<span class="text-muted-foreground">→</span>
															<code
																class="rounded bg-emerald-500/10 px-1 text-emerald-700 dark:text-emerald-300"
															>
																{change.new ?? '—'}
															</code>
														</dd>
													</div>
												{/each}
											</dl>
										</div>
									</Collapsible.Content>
								</Collapsible.Root>
							</Table.Cell>
						</Table.Row>
					{/if}
				{/each}
			</Table.Body>
		</Table.Root>

		<div class="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
			<p class="text-xs text-muted-foreground">
				{start}-{end} {t('audit.of')} {filtered.length}
			</p>
			<div class="flex items-center gap-1">
				<Button
					type="button"
					variant="outline"
					size="icon-sm"
					disabled={page <= 1}
					aria-label={t('pagination.previous')}
					onclick={() => (currentPage = Math.max(1, page - 1))}
				>
					<ChevronLeftIcon />
				</Button>
				<span class="px-2 text-xs text-muted-foreground">{page} / {pageCount}</span>
				<Button
					type="button"
					variant="outline"
					size="icon-sm"
					disabled={page >= pageCount}
					aria-label={t('pagination.next')}
					onclick={() => (currentPage = Math.min(pageCount, page + 1))}
				>
					<ChevronRightIcon />
				</Button>
			</div>
		</div>
	</section>
</div>
