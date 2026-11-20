<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { ApiError } from '#lib/api/client.js';
	import {
		getAssetStatus,
		getExpirations,
		getFleetValue,
		getLowStock,
		type AssetStatusBucket,
		type ExpirationBucket,
		type Expirations,
		type FleetValue,
		type LowStockRow
	} from '#lib/api/dashboard.js';
	import { t } from '#lib/i18n/index.js';
	import { formatNumber } from '#lib/utils.js';
	import DashboardWidget from '#lib/components/domain/dashboard-widget.svelte';

	interface Slot<T> {
		data: T | null;
		loading: boolean;
		error: string | null;
	}

	function slot<T>(): Slot<T> {
		return { data: null, loading: true, error: null };
	}

	let statuses = $state(slot<AssetStatusBucket[]>());
	let expirations = $state(slot<Expirations>());
	let lowStock = $state(slot<LowStockRow[]>());
	let fleet = $state(slot<FleetValue>());

	function message(cause: unknown): string {
		return cause instanceof ApiError && cause.status > 0 ? cause.message : t('auth.genericError');
	}

	async function loadStatuses() {
		statuses = { data: statuses.data, loading: true, error: null };
		try {
			statuses = { data: await getAssetStatus(), loading: false, error: null };
		} catch (cause) {
			statuses = { data: null, loading: false, error: message(cause) };
		}
	}

	async function loadExpirations() {
		expirations = { data: expirations.data, loading: true, error: null };
		try {
			expirations = { data: await getExpirations(), loading: false, error: null };
		} catch (cause) {
			expirations = { data: null, loading: false, error: message(cause) };
		}
	}

	async function loadLowStock() {
		lowStock = { data: lowStock.data, loading: true, error: null };
		try {
			lowStock = { data: await getLowStock(), loading: false, error: null };
		} catch (cause) {
			lowStock = { data: null, loading: false, error: message(cause) };
		}
	}

	async function loadFleet() {
		fleet = { data: fleet.data, loading: true, error: null };
		try {
			fleet = { data: await getFleetValue(), loading: false, error: null };
		} catch (cause) {
			fleet = { data: null, loading: false, error: message(cause) };
		}
	}

	onMount(() => {
		void Promise.allSettled([loadStatuses(), loadExpirations(), loadLowStock(), loadFleet()]);
	});

	const totalAssets = $derived(
		(statuses.data ?? []).reduce((sum, bucket) => sum + bucket.total, 0)
	);

	function percent(value: number, total: number): number {
		return total > 0 ? Math.round((value / total) * 100) : 0;
	}

	function money(value: string | number, currency: string): string {
		return formatNumber(Number(value), { style: 'currency', currency });
	}

	const expirationRows = $derived(
		expirations.data
			? (['warranties', 'licenses'] as const).map((group) => ({
					group,
					buckets: expirations.data?.[group] as ExpirationBucket
				}))
			: []
	);

	const expirationMax = $derived(
		Math.max(
			1,
			...expirationRows.flatMap((row) => Object.values(row.buckets) as number[])
		)
	);

	const buckets = ['expired', 'within_30_days', 'within_60_days', 'within_90_days'] as const;
</script>

<svelte:head>
	<title>{t('dashboard.title')} · EAT</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-1">
		<h1 class="text-2xl font-semibold tracking-tight">{t('dashboard.title')}</h1>
		<p class="text-sm text-muted-foreground">{t('dashboard.description')}</p>
	</div>

	<div class="grid gap-4 lg:grid-cols-2">
		<DashboardWidget
			title={t('dashboard.assetStatus.title')}
			description={t('dashboard.assetStatus.description')}
			loading={statuses.loading}
			error={statuses.error}
			onretry={loadStatuses}
		>
			{#if (statuses.data ?? []).length === 0}
				<p class="text-sm text-muted-foreground">{t('dashboard.assetStatus.empty')}</p>
			{:else}
				<ul class="flex flex-col gap-2">
					{#each statuses.data ?? [] as bucket (bucket.status)}
						<li class="flex flex-col gap-1">
							<div class="flex items-center justify-between gap-2 text-sm">
								<span class="flex items-center gap-2">
									<span
										class="size-2 rounded-full ring-1 ring-black/10"
										style:background-color={bucket.color_code ?? 'var(--color-muted)'}
									></span>
									{bucket.status}
								</span>
								<span class="text-muted-foreground">
									{formatNumber(bucket.total)}
									<span class="text-xs">({percent(bucket.total, totalAssets)}%)</span>
								</span>
							</div>
							<div class="h-2 overflow-hidden rounded-full bg-muted">
								<div
									class="h-full rounded-full"
									style:width="{percent(bucket.total, totalAssets)}%"
									style:background-color={bucket.color_code ?? 'currentColor'}
								></div>
							</div>
						</li>
					{/each}
				</ul>
				<p class="text-xs text-muted-foreground">
					{t('dashboard.assetStatus.total', { total: formatNumber(totalAssets) })}
				</p>
			{/if}
		</DashboardWidget>

		<DashboardWidget
			title={t('dashboard.expirations.title')}
			description={t('dashboard.expirations.description')}
			loading={expirations.loading}
			error={expirations.error}
			onretry={loadExpirations}
		>
			<div class="flex flex-col gap-4">
				{#each expirationRows as row (row.group)}
					<div class="flex flex-col gap-2">
						<p class="text-xs font-medium">{t(`dashboard.expirations.${row.group}`)}</p>
						<ul class="flex flex-col gap-1.5">
							{#each buckets as bucket (bucket)}
								<li class="flex items-center gap-2 text-xs">
									<span class="w-28 shrink-0 text-muted-foreground">
										{t(`dashboard.expirations.${bucket}`)}
									</span>
									<div class="h-2 flex-1 overflow-hidden rounded-full bg-muted">
										<div
											class="h-full rounded-full bg-primary"
											style:width="{percent(row.buckets[bucket], expirationMax)}%"
										></div>
									</div>
									<span class="w-10 text-end tabular-nums">
										{formatNumber(row.buckets[bucket])}
									</span>
								</li>
							{/each}
						</ul>
					</div>
				{/each}
				<p class="text-xs text-muted-foreground">{t('dashboard.expirations.cumulativeHint')}</p>
			</div>
		</DashboardWidget>

		<DashboardWidget
			title={t('dashboard.lowStock.title')}
			description={t('dashboard.lowStock.description')}
			loading={lowStock.loading}
			error={lowStock.error}
			onretry={loadLowStock}
		>
			{#if (lowStock.data ?? []).length === 0}
				<p class="text-sm text-muted-foreground">{t('dashboard.lowStock.empty')}</p>
			{:else}
				<ul class="flex flex-col divide-y">
					{#each lowStock.data ?? [] as row (row.kind + row.id)}
						<li class="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
							<div class="flex flex-col">
								<a
									class="font-medium underline-offset-4 hover:underline"
									href={row.kind === 'consumable'
										? resolve('/dashboard/consumables/[id]', { id: row.id })
										: resolve('/dashboard/accessories/[id]', { id: row.id })}
								>
									{row.name}
								</a>
								<span class="text-xs text-muted-foreground">
									{t(`dashboard.lowStock.${row.kind}`)}
								</span>
							</div>
							<div class="flex items-center gap-3 text-xs">
								<span>{t('dashboard.lowStock.onHand', { count: row.on_hand })}</span>
								<span class="text-muted-foreground">
									{t('dashboard.lowStock.threshold', { count: row.threshold })}
								</span>
								<span class="rounded-full bg-rose-500/10 px-2 py-0.5 font-medium text-rose-700">
									{t('dashboard.lowStock.shortfall', { count: row.shortfall })}
								</span>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</DashboardWidget>

		<DashboardWidget
			title={t('dashboard.fleetValue.title')}
			description={t('dashboard.fleetValue.description')}
			loading={fleet.loading}
			error={fleet.error}
			onretry={loadFleet}
		>
			{#if !fleet.data || fleet.data.totals.length === 0}
				<p class="text-sm text-muted-foreground">{t('dashboard.fleetValue.empty')}</p>
			{:else}
				<div class="flex flex-col gap-5">
					{#each fleet.data.totals as total (total.currency)}
						<div class="flex flex-col gap-2">
							<div class="flex items-baseline justify-between gap-2">
								<h3 class="text-sm font-medium">{total.currency}</h3>
								<span class="text-sm tabular-nums">
									{money(total.total_value, total.currency)}
								</span>
							</div>
							<p class="text-xs text-muted-foreground">
								{t('dashboard.fleetValue.assetCount', { count: total.assets })}
							</p>
							{#if fleet.data.by_manufacturer.some((row) => row.currency === total.currency)}
								<div class="flex flex-col gap-1">
									<p class="text-xs font-medium">{t('dashboard.fleetValue.byManufacturer')}</p>
									{#each fleet.data.by_manufacturer.filter((row) => row.currency === total.currency) as row (row.id)}
										<div class="flex items-center justify-between gap-2 text-xs">
											<span class="truncate">{row.name}</span>
											<span class="tabular-nums">
												{money(row.total_value, row.currency)}
												<span class="text-muted-foreground">· {row.assets}</span>
											</span>
										</div>
									{/each}
								</div>
							{/if}
							{#if fleet.data.by_department.some((row) => row.currency === total.currency)}
								<div class="flex flex-col gap-1">
									<p class="text-xs font-medium">{t('dashboard.fleetValue.byDepartment')}</p>
									{#each fleet.data.by_department.filter((row) => row.currency === total.currency) as row (row.id)}
										<div class="flex items-center justify-between gap-2 text-xs">
											<span class="truncate">{row.name}</span>
											<span class="tabular-nums">
												{money(row.total_value, row.currency)}
												<span class="text-muted-foreground">· {row.assets}</span>
											</span>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</DashboardWidget>
	</div>
</div>
