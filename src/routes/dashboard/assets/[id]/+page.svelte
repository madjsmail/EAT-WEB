<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { toast } from 'svelte-sonner';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import PrinterIcon from '@lucide/svelte/icons/printer';
	import PackageIcon from '@lucide/svelte/icons/package';
	import PackageOpenIcon from '@lucide/svelte/icons/package-open';
	import KeyRoundIcon from '@lucide/svelte/icons/key-round';
	import HistoryIcon from '@lucide/svelte/icons/history';
	import { ApiError } from '#lib/api/client.js';
	import {
		assignAsset,
		labelUrl,
		getAsset360,
		returnAsset,
		transferAsset,
		type Assignment,
		type Asset360,
		type Asset360Accessory,
		type LabelDataSource,
		type LabelFormat,
		type LabelSymbology
	} from '#lib/api/assets.js';
	import { returnAccessory } from '#lib/api/accessories.js';
	import { listLookups, type Lookup } from '#lib/api/lookups.js';
	import { listProducts, type Product } from '#lib/api/products.js';
	import { resolveI18n, t } from '#lib/i18n/index.js';
	import { session } from '#lib/stores/session.svelte.js';
	import { formatDate } from '#lib/utils.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import { Field, FieldLabel } from '#lib/components/ui/field/index.js';
	import * as Sheet from '#lib/components/ui/sheet/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import AssetForm from '#lib/components/domain/asset-form.svelte';
	import StatusBadge from '#lib/components/domain/status-badge.svelte';
	import AttachmentPanel from '#lib/components/domain/attachment-panel.svelte';

	const id = $derived(page.params.id ?? '');
	const canWrite = $derived(session.has('assets.write'));
	const canAssign = $derived(session.has('assets.assign'));
	const canReturnAccessory = $derived(session.has('accessories.assign'));

	let view = $state<Asset360 | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let tab = $state<'accessories' | 'consumables' | 'software' | 'custody'>('accessories');
	let editOpen = $state(false);
	let labelOpen = $state(false);

	const asset = $derived(view?.asset ?? null);

	let products = $state<Product[]>([]);
	let departments = $state<Lookup[]>([]);
	let statuses = $state<Lookup[]>([]);
	let locations = $state<Lookup[]>([]);
	let suppliers = $state<Lookup[]>([]);

	let action = $state<'assign' | 'return' | 'transfer'>('assign');
	let target = $state<'user' | 'location'>('location');
	let userId = $state('');
	let locationId = $state('');
	let departmentId = $state('');
	let statusId = $state('');
	let notes = $state('');
	let submitting = $state(false);

	let format = $state<LabelFormat>('svg');
	let symbology = $state<LabelSymbology>('qr');
	let dataSource = $state<LabelDataSource>('asset_tag');

	const labelSrc = $derived(asset ? labelUrl(asset.id, format, symbology, dataSource) : '');

	const summaryCards = $derived([
		{
			key: 'accessories',
			labelKey: 'asset360.card.accessories',
			value: view?.counts.accessories ?? 0,
			icon: PackageIcon
		},
		{
			key: 'consumables',
			labelKey: 'asset360.card.consumables',
			value: view?.counts.consumables ?? 0,
			icon: PackageOpenIcon
		},
		{
			key: 'licenses',
			labelKey: 'asset360.card.licenses',
			value: view?.counts.licenses ?? 0,
			icon: KeyRoundIcon
		},
		{
			key: 'custody',
			labelKey: 'asset360.card.custody',
			value: view?.counts.custody_events ?? 0,
			icon: HistoryIcon
		}
	]);

	async function load() {
		loading = true;
		error = null;
		try {
			view = await getAsset360(id);
		} catch (cause) {
			error =
				cause instanceof ApiError && cause.status > 0 ? cause.message : t('auth.genericError');
		} finally {
			loading = false;
		}
	}

	onMount(async () => {
		await load();
		try {
			const [prod, deps, stats, locs, sups] = await Promise.all([
				listProducts({ per_page: 100 }),
				listLookups('departments'),
				listLookups('statuses'),
				listLookups('locations'),
				listLookups('suppliers')
			]);
			products = prod.items;
			departments = deps;
			statuses = stats;
			locations = locs;
			suppliers = sups;
		} catch {
			// Custody selectors just stay empty.
		}
	});

	async function submitCustody(event: SubmitEvent) {
		event.preventDefault();
		if (!asset) return;
		submitting = true;
		try {
			if (action === 'assign') {
				await assignAsset(asset.id, {
					user_id: target === 'user' ? userId.trim() : undefined,
					location_id: target === 'location' ? locationId : undefined,
					status_id: statusId || undefined,
					notes: notes || undefined
				});
			} else if (action === 'return') {
				await returnAsset(asset.id, {
					location_id: locationId || undefined,
					status_id: statusId || undefined,
					notes: notes || undefined
				});
			} else {
				await transferAsset(asset.id, {
					location_id: locationId,
					department_id: departmentId || undefined,
					status_id: statusId || undefined,
					notes: notes || undefined
				});
			}
			toast.success(t('custody.saved'));
			notes = '';
			await load();
		} catch (cause) {
			toast.error(
				cause instanceof ApiError && cause.status > 0 ? cause.message : t('auth.genericError')
			);
		} finally {
			submitting = false;
		}
	}

	async function returnPairedAccessory(item: Asset360Accessory) {
		if (!confirm(t('accessory.confirmReturn', { count: item.remaining_quantity }))) return;
		try {
			await returnAccessory(item.accessory_id, item.id, { quantity: item.remaining_quantity });
			toast.success(t('asset360.accessoryReturned'));
			await load();
		} catch (cause) {
			toast.error(
				cause instanceof ApiError && cause.status > 0 ? cause.message : t('auth.genericError')
			);
		}
	}

	function assignmentSummary(item: Assignment): string {
		const from = item.from_user_name ?? item.from_location_name ?? item.from_department_id ?? '—';
		const to = item.assigned_to_user_name ?? item.to_location_name ?? item.to_department_id ?? '—';
		return `${from} → ${to}`;
	}
</script>

<svelte:head>
	<title>{asset?.name ?? t('asset.detailTitle')} · EAT</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
		<div class="flex flex-col gap-1">
			<a
				class="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
				href={resolve('/dashboard/assets')}
			>
				<ArrowLeftIcon class="size-3" />
				{t('asset.backToList')}
			</a>
			<h1 class="text-2xl font-semibold tracking-tight">
				{asset?.name ?? t('asset.detailTitle')}
			</h1>
			{#if asset}
				<p class="font-mono text-sm text-muted-foreground">{asset.asset_tag}</p>
			{/if}
		</div>
		{#if asset}
			<div class="flex gap-2">
				<Button variant="outline" onclick={() => (labelOpen = true)}>
					<PrinterIcon />
					{t('asset.tab.label')}
				</Button>
				{#if canWrite}
					<Button variant="outline" onclick={() => (editOpen = true)}>
						<PencilIcon />
						{t('common.edit')}
					</Button>
				{/if}
			</div>
		{/if}
	</div>

	{#if loading}
		<div class="flex flex-col gap-2">
			<Skeleton class="h-10 w-64" />
			<Skeleton class="h-40 w-full" />
		</div>
	{:else if error}
		<section class="rounded-lg border bg-card p-6">
			<p class="text-sm text-destructive">{error}</p>
			<Button variant="outline" size="sm" class="mt-3" onclick={load}>{t('table.retry')}</Button>
		</section>
	{:else if asset && view}
		<section class="rounded-lg border bg-card">
			<dl class="grid gap-x-6 gap-y-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
				<div class="flex flex-col gap-1">
					<dt class="text-xs text-muted-foreground">{t('asset.status')}</dt>
					<dd><StatusBadge name={asset.status_name} color={asset.status_color_code} /></dd>
				</div>
				<div class="flex flex-col gap-1">
					<dt class="text-xs text-muted-foreground">{t('asset.product')}</dt>
					<dd>{asset.product_name ?? '—'}</dd>
				</div>
				<div class="flex flex-col gap-1">
					<dt class="text-xs text-muted-foreground">{t('asset.category')}</dt>
					<dd>{asset.category_name ?? '—'}</dd>
				</div>
				<div class="flex flex-col gap-1">
					<dt class="text-xs text-muted-foreground">{t('asset.manufacturer')}</dt>
					<dd>{asset.manufacturer_name ?? '—'}</dd>
				</div>
				<div class="flex flex-col gap-1">
					<dt class="text-xs text-muted-foreground">{t('asset.serial')}</dt>
					<dd class="font-mono">{asset.serial_number ?? '—'}</dd>
				</div>
				<div class="flex flex-col gap-1">
					<dt class="text-xs text-muted-foreground">{t('asset.location')}</dt>
					<dd>{asset.location_name ?? '—'}</dd>
				</div>
				<div class="flex flex-col gap-1">
					<dt class="text-xs text-muted-foreground">{t('asset.department')}</dt>
					<dd>{asset.department_name ?? '—'}</dd>
				</div>
				<div class="flex flex-col gap-1">
					<dt class="text-xs text-muted-foreground">{t('asset.custodian')}</dt>
					<dd>{asset.assigned_user_name ?? '—'}</dd>
				</div>
			</dl>
		</section>

		<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
			{#each summaryCards as card (card.key)}
				<div class="flex items-center justify-between rounded-lg border bg-card p-4">
					<div class="flex flex-col gap-0.5">
						<span class="text-xs text-muted-foreground">{t(card.labelKey)}</span>
						<span class="text-2xl font-semibold tabular-nums">{card.value}</span>
					</div>
					<card.icon class="size-5 text-muted-foreground" />
				</div>
			{/each}
		</div>

		<nav class="flex gap-1 overflow-x-auto border-b" aria-label={t('asset360.title')}>
			{#each [{ key: 'accessories', label: t('asset360.tab.accessories') }, { key: 'consumables', label: t('asset360.tab.consumables') }, { key: 'software', label: t('asset360.tab.software') }, { key: 'custody', label: t('asset360.tab.custody') }] as item (item.key)}
				<button
					class="-mb-px border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors {tab ===
					item.key
						? 'border-primary font-medium text-foreground'
						: 'border-transparent text-muted-foreground hover:text-foreground'}"
					aria-current={tab === item.key ? 'page' : undefined}
					onclick={() => (tab = item.key as typeof tab)}
				>
					{item.label}
				</button>
			{/each}
		</nav>

		{#if tab === 'accessories'}
			<section class="rounded-lg border bg-card">
				{#if view.accessories.length === 0}
					<div class="flex flex-col items-center gap-1 p-10 text-center">
						<p class="font-medium">{t('asset360.empty.accessories')}</p>
					</div>
				{:else}
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>{t('asset.name')}</Table.Head>
								<Table.Head class="text-end">{t('accessory.quantity')}</Table.Head>
								<Table.Head class="text-end">{t('accessory.remaining')}</Table.Head>
								<Table.Head class="hidden md:table-cell">{t('accessory.assignedAt')}</Table.Head>
								<Table.Head class="w-0">{t('common.actions')}</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each view.accessories as item (item.id)}
								<Table.Row>
									<Table.Cell class="font-medium">{item.accessory_name ?? '—'}</Table.Cell>
									<Table.Cell class="text-end tabular-nums">{item.quantity}</Table.Cell>
									<Table.Cell class="text-end tabular-nums">{item.remaining_quantity}</Table.Cell>
									<Table.Cell class="hidden text-muted-foreground md:table-cell">
										{formatDate(item.assigned_at)}
									</Table.Cell>
									<Table.Cell>
										<div class="flex justify-end">
											{#if canReturnAccessory && item.remaining_quantity > 0}
												<Button
													variant="outline"
													size="sm"
													onclick={() => returnPairedAccessory(item)}
												>
													{t('accessory.return')}
												</Button>
											{:else}
												<span class="text-muted-foreground">—</span>
											{/if}
										</div>
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				{/if}
			</section>
		{:else if tab === 'consumables'}
			<section class="rounded-lg border bg-card">
				<p class="border-b px-4 py-3 text-sm text-muted-foreground">
					{t('asset360.consumablesHint')}
				</p>
				{#if view.consumables.length === 0}
					<div class="flex flex-col items-center gap-1 p-10 text-center">
						<p class="font-medium">{t('asset360.empty.consumables')}</p>
					</div>
				{:else}
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>{t('consumable.name')}</Table.Head>
								<Table.Head>{t('consumable.type')}</Table.Head>
								<Table.Head class="text-end">{t('accessory.quantity')}</Table.Head>
								<Table.Head class="hidden md:table-cell">{t('custody.user')}</Table.Head>
								<Table.Head class="hidden lg:table-cell">{t('custody.date')}</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each view.consumables as item (item.id)}
								<Table.Row>
									<Table.Cell class="font-medium">{item.consumable_name ?? '—'}</Table.Cell>
									<Table.Cell>
										<Badge variant="secondary">
											{t(`consumable.type.${item.transaction_type}`)}
										</Badge>
									</Table.Cell>
									<Table.Cell class="text-end tabular-nums">{item.quantity}</Table.Cell>
									<Table.Cell class="hidden text-muted-foreground md:table-cell">
										{item.user_name ?? '—'}
									</Table.Cell>
									<Table.Cell class="hidden text-muted-foreground lg:table-cell">
										{formatDate(item.created_at)}
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				{/if}
			</section>
		{:else if tab === 'software'}
			<section class="rounded-lg border bg-card">
				<p class="border-b px-4 py-3 text-sm text-muted-foreground">
					{t('asset360.softwareHint')}
				</p>
				{#if view.licenses.length === 0}
					<div class="flex flex-col items-center gap-1 p-10 text-center">
						<p class="font-medium">{t('asset360.empty.software')}</p>
					</div>
				{:else}
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>{t('license.name')}</Table.Head>
								<Table.Head>{t('asset360.heldBy')}</Table.Head>
								<Table.Head class="hidden md:table-cell">{t('accessory.assignedAt')}</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each view.licenses as item (item.id)}
								<Table.Row>
									<Table.Cell class="font-medium">{item.license_name ?? '—'}</Table.Cell>
									<Table.Cell>
										{#if item.asset_id}
											<Badge variant="secondary">
												{t('asset360.heldByAsset', { tag: item.asset_tag ?? asset.asset_tag })}
											</Badge>
										{:else}
											<Badge variant="secondary">
												{t('asset360.heldByUser', { name: item.user_name ?? '—' })}
											</Badge>
										{/if}
									</Table.Cell>
									<Table.Cell class="hidden text-muted-foreground md:table-cell">
										{formatDate(item.assigned_at)}
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				{/if}
			</section>
		{:else}
			<div class="flex flex-col gap-6">
				{#if canAssign}
					<section class="rounded-lg border bg-card p-4">
						<h2 class="mb-3 text-sm font-medium">{t('custody.title')}</h2>
						<form class="flex flex-col gap-3" onsubmit={submitCustody}>
							<div class="flex flex-wrap items-end gap-3">
								<Field class="w-40">
									<FieldLabel for="custody-action">{t('custody.action')}</FieldLabel>
									<select
										id="custody-action"
										class="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
										bind:value={action}
									>
										<option value="assign">{t('custody.assign')}</option>
										<option value="return">{t('custody.return')}</option>
										<option value="transfer">{t('custody.transfer')}</option>
									</select>
								</Field>

								{#if action === 'assign'}
									<Field class="w-40">
										<FieldLabel for="custody-target">{t('custody.target')}</FieldLabel>
										<select
											id="custody-target"
											class="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
											bind:value={target}
										>
											<option value="user">{t('custody.user')}</option>
											<option value="location">{t('custody.location')}</option>
										</select>
									</Field>
									{#if target === 'user'}
										<Field class="min-w-64">
											<FieldLabel for="custody-user">{t('custody.userId')}</FieldLabel>
											<Input id="custody-user" bind:value={userId} placeholder="UUID" required />
										</Field>
										<p class="text-xs text-muted-foreground">{t('custody.userHint')}</p>
									{:else}
										<Field class="min-w-48">
											<FieldLabel for="custody-location">{t('custody.location')}</FieldLabel>
											<select
												id="custody-location"
												class="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
												bind:value={locationId}
												required
											>
												<option value="">—</option>
												{#each locations as item (item.id)}
													<option value={item.id}>{resolveI18n(item.translations)}</option>
												{/each}
											</select>
										</Field>
									{/if}
								{:else}
									<Field class="min-w-48">
										<FieldLabel for="custody-location">{t('custody.location')}</FieldLabel>
										<select
											id="custody-location"
											class="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
											bind:value={locationId}
											required={action === 'transfer'}
										>
											<option value="">—</option>
											{#each locations as item (item.id)}
												<option value={item.id}>{resolveI18n(item.translations)}</option>
											{/each}
										</select>
									</Field>
									{#if action === 'transfer'}
										<Field class="min-w-48">
											<FieldLabel for="custody-department">{t('asset.department')}</FieldLabel>
											<select
												id="custody-department"
												class="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
												bind:value={departmentId}
											>
												<option value="">—</option>
												{#each departments as item (item.id)}
													<option value={item.id}>{resolveI18n(item.translations)}</option>
												{/each}
											</select>
										</Field>
									{/if}
								{/if}

								<Field class="min-w-40">
									<FieldLabel for="custody-status">{t('asset.status')}</FieldLabel>
									<select
										id="custody-status"
										class="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
										bind:value={statusId}
									>
										<option value="">—</option>
										{#each statuses as item (item.id)}
											<option value={item.id}>{resolveI18n(item.translations)}</option>
										{/each}
									</select>
								</Field>
								<Field class="min-w-48 flex-1">
									<FieldLabel for="custody-notes">{t('lookup.notes')}</FieldLabel>
									<Input id="custody-notes" bind:value={notes} />
								</Field>
								<Button type="submit" disabled={submitting}>
									{submitting ? t('common.saving') : t('custody.save')}
								</Button>
							</div>
						</form>
					</section>
				{/if}

				<section class="rounded-lg border bg-card">
					{#if view.custody_history.length === 0}
						<div class="flex flex-col items-center gap-1 p-10 text-center">
							<p class="font-medium">{t('custody.emptyTitle')}</p>
							<p class="text-sm text-muted-foreground">{t('custody.emptyDescription')}</p>
						</div>
					{:else}
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>{t('custody.date')}</Table.Head>
									<Table.Head>{t('custody.action')}</Table.Head>
									<Table.Head>{t('custody.movement')}</Table.Head>
									<Table.Head class="hidden md:table-cell">{t('custody.by')}</Table.Head>
									<Table.Head class="hidden lg:table-cell">{t('lookup.notes')}</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each view.custody_history as item (item.id)}
									<Table.Row>
										<Table.Cell class="whitespace-nowrap text-muted-foreground">
											{formatDate(item.created_at)}
										</Table.Cell>
										<Table.Cell>
											<Badge variant="secondary">{t(`custody.${item.action}`)}</Badge>
										</Table.Cell>
										<Table.Cell>{assignmentSummary(item)}</Table.Cell>
										<Table.Cell class="hidden text-muted-foreground md:table-cell">
											{item.performed_by_user_name ?? '—'}
										</Table.Cell>
										<Table.Cell class="hidden text-muted-foreground lg:table-cell">
											{item.notes ?? '—'}
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					{/if}
				</section>
			</div>
		{/if}
	{/if}

	{#if asset && session.has('attachments.read')}
		<section class="rounded-lg border bg-card p-6">
			<AttachmentPanel attachableType="asset" attachableId={asset.id} />
		</section>
	{/if}
</div>

{#if editOpen && asset}
	<AssetForm
		{asset}
		{products}
		{departments}
		{statuses}
		{locations}
		{suppliers}
		onclose={() => (editOpen = false)}
		onsaved={load}
	/>
{/if}

{#if labelOpen && asset}
	<Sheet.Root open onOpenChange={(open) => !open && (labelOpen = false)}>
		<Sheet.Content side="right" class="w-full sm:max-w-md">
			<Sheet.Header>
				<Sheet.Title>{t('asset.tab.label')}</Sheet.Title>
				<Sheet.Description>{t('label.hint')}</Sheet.Description>
			</Sheet.Header>
			<div class="flex flex-col gap-4 overflow-y-auto px-4 pb-4">
				<Field>
					<FieldLabel for="label-format">{t('label.format')}</FieldLabel>
					<select
						id="label-format"
						class="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
						bind:value={format}
					>
						<option value="svg">SVG</option>
						<option value="png">PNG</option>
					</select>
				</Field>
				<Field>
					<FieldLabel for="label-symbology">{t('label.symbology')}</FieldLabel>
					<select
						id="label-symbology"
						class="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
						bind:value={symbology}
					>
						<option value="qr">QR</option>
						<option value="code128">Code 128</option>
					</select>
				</Field>
				<Field>
					<FieldLabel for="label-data">{t('label.dataSource')}</FieldLabel>
					<select
						id="label-data"
						class="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
						bind:value={dataSource}
					>
						<option value="asset_tag">{t('asset.tag')}</option>
						<option value="serial_number">{t('asset.serial')}</option>
					</select>
				</Field>

				<div
					class="label-print overflow-hidden rounded-md border bg-white p-2"
					style="width:50mm;height:25mm"
				>
					{#key labelSrc}
						<img class="h-full w-full object-contain" src={labelSrc} alt={asset.asset_tag} />
					{/key}
				</div>
			</div>
			<div class="flex justify-end gap-2 border-t p-4">
				<Button variant="outline" onclick={() => (labelOpen = false)}>{t('common.cancel')}</Button>
				<Button onclick={() => window.print()}>
					<PrinterIcon />
					{t('label.print')}
				</Button>
			</div>
		</Sheet.Content>
	</Sheet.Root>
{/if}
