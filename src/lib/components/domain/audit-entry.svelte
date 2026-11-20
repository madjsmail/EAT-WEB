<script lang="ts">
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import * as Collapsible from '#lib/components/ui/collapsible/index.js';
	import { RelativeTime } from '#lib/components/ui/relative-time/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { t } from '#lib/i18n/index.js';
	import {
		entityHref,
		eventLabel,
		eventTone,
		inlineValue,
		isStructured,
		prettyJson,
		typeLabel
	} from '#lib/config/audit.js';
	import type { AuditEntry } from '#lib/api/audit.js';

	let { entry, onopen }: { entry: AuditEntry; onopen: (entry: AuditEntry) => void } = $props();

	const href = $derived(entityHref(entry.auditable_type, entry.auditable_id));
	const actorName = $derived(entry.actor_name || t('audit.system'));
	const hasChanges = $derived(entry.changes.length > 0);
	const hasSnapshot = $derived(
		!hasChanges && (entry.old_values !== null || entry.new_values !== null)
	);
</script>

<li class="relative flex flex-col gap-2 pb-6 ps-8">
	<span class="absolute start-2 top-1 size-2 rounded-full {eventTone(entry.event)}"></span>
	<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
		<Badge variant="outline" class="border-transparent {eventTone(entry.event)}">
			{eventLabel(entry.event)}
		</Badge>
		<button
			type="button"
			class="text-sm font-medium underline-offset-4 hover:underline"
			onclick={() => onopen(entry)}
		>
			{actorName}
		</button>
		<span class="text-xs text-muted-foreground">{typeLabel(entry.auditable_type)}</span>
		{#if href}
			<a class="font-mono text-xs text-muted-foreground underline-offset-2 hover:underline" {href}>
				{entry.auditable_id.slice(0, 8)}
			</a>
		{:else}
			<span class="font-mono text-xs text-muted-foreground">
				{entry.auditable_id.slice(0, 8)}
			</span>
		{/if}
		<RelativeTime class="ms-auto text-xs text-muted-foreground" date={entry.created_at} />
	</div>

	{#if entry.actor_email}
		<p class="text-xs text-muted-foreground">{entry.actor_email}</p>
	{/if}

	<Collapsible.Root>
		<Collapsible.Trigger
			class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
		>
			<ChevronDownIcon class="size-3" />
			{t('audit.requestDetails')}
		</Collapsible.Trigger>
		<Collapsible.Content>
			<dl class="mt-2 grid gap-1 text-xs text-muted-foreground">
				<div class="flex gap-2">
					<dt class="min-w-24 font-medium">{t('audit.actorIp')}</dt>
					<dd class="font-mono">{entry.actor_ip ?? '—'}</dd>
				</div>
				<div class="flex gap-2">
					<dt class="min-w-24 font-medium">{t('audit.actorUserAgent')}</dt>
					<dd class="break-all">{entry.actor_user_agent ?? '—'}</dd>
				</div>
			</dl>
		</Collapsible.Content>
	</Collapsible.Root>

	{#if hasChanges}
		<Collapsible.Root>
			<Collapsible.Trigger
				class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
			>
				<ChevronDownIcon class="size-3" />
				{t('audit.changesCount', { count: entry.changes.length })}
			</Collapsible.Trigger>
			<Collapsible.Content>
				<dl class="mt-2 flex flex-col gap-2 rounded-md border p-3 text-xs">
					{#each entry.changes as change (change.field)}
						<div class="grid gap-1 sm:grid-cols-[minmax(0,10rem)_1fr]">
							<dt class="font-medium">{change.field}</dt>
							<dd class="flex flex-col gap-1">
								{#if isStructured(change.old) || isStructured(change.new)}
									{#if change.old !== null && change.old !== undefined}
										<pre
											class="max-h-40 overflow-auto rounded bg-rose-500/10 p-2 text-rose-700 dark:text-rose-300 line-through">{prettyJson(
												change.old
											)}</pre>
									{/if}
									{#if change.new !== null && change.new !== undefined}
										<pre
											class="max-h-40 overflow-auto rounded bg-emerald-500/10 p-2 text-emerald-700 dark:text-emerald-300">{prettyJson(
												change.new
											)}</pre>
									{/if}
								{:else}
									<span class="flex flex-wrap items-center gap-1">
										<code class="rounded bg-rose-500/10 px-1 text-rose-700 dark:text-rose-300 line-through">
											{inlineValue(change.old)}
										</code>
										<span class="text-muted-foreground">→</span>
										<code class="rounded bg-emerald-500/10 px-1 text-emerald-700 dark:text-emerald-300">
											{inlineValue(change.new)}
										</code>
									</span>
								{/if}
							</dd>
						</div>
					{/each}
				</dl>
			</Collapsible.Content>
		</Collapsible.Root>
	{:else if hasSnapshot}
		<Collapsible.Root>
			<Collapsible.Trigger
				class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
			>
				<ChevronDownIcon class="size-3" />
				{t('audit.snapshot')}
			</Collapsible.Trigger>
			<Collapsible.Content>
				<div class="mt-2 grid gap-2 text-xs sm:grid-cols-2">
					<div>
						<p class="mb-1 font-medium text-rose-700 dark:text-rose-300">{t('audit.oldValues')}</p>
						<pre class="max-h-48 overflow-auto rounded bg-rose-500/10 p-2">{prettyJson(
							entry.old_values
						)}</pre>
					</div>
					<div>
						<p class="mb-1 font-medium text-emerald-700 dark:text-emerald-300">{t('audit.newValues')}</p>
						<pre class="max-h-48 overflow-auto rounded bg-emerald-500/10 p-2">{prettyJson(
							entry.new_values
						)}</pre>
					</div>
				</div>
			</Collapsible.Content>
		</Collapsible.Root>
	{/if}

	<Button variant="ghost" size="sm" class="w-fit px-0 text-xs" onclick={() => onopen(entry)}>
		{t('audit.openDetails')}
	</Button>
</li>
