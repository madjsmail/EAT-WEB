<script lang="ts">
	import { createTableState } from "@tanstack/svelte-table";
	import type { ColumnPinningState, Updater } from "@tanstack/svelte-table";
	import { page } from "$app/state";
	import { toast } from "svelte-sonner";
	import { Button } from "#lib/components/ui/button/index.js";
	import DataTable from "#lib/components/data-table/DataTable.svelte";
	import { createAppTable } from "#lib/hooks/table.svelte.js";
	import { t } from "#lib/i18n/index.js";
	import type { ExtendedColumnFilter } from "#lib/table/types.js";
	import { buildInitialState } from "#lib/table/url-state.js";
	import type { PageProps } from "./$types";
	import { columns } from "./columns.js";

	let { data }: PageProps = $props();

	const COLUMN_IDS = columns.map((column) => column.id ?? "");
	const DEFAULT_PINNING: ColumnPinningState = {
		start: ["select"],
		end: ["actions"],
	};
	const initialState = buildInitialState(page.url, COLUMN_IDS, {
		defaultPinning: DEFAULT_PINNING,
	});

	const [columnFilters, setColumnFilters] = createTableState<Array<ExtendedColumnFilter>>(
		initialState.columnFilters,
	);
	const [globalFilter, setGlobalFilter] = createTableState(initialState.globalFilter);

	const table = createAppTable({
		key: "assets-demo",
		columns,
		get data() {
			return data.assets;
		},
		state: {
			get columnFilters() {
				return columnFilters();
			},
			get globalFilter() {
				return globalFilter();
			},
		},
		onColumnFiltersChange: setColumnFilters as (
			updater: Updater<Array<ExtendedColumnFilter>>,
		) => void,
		onGlobalFilterChange: setGlobalFilter,
		initialState: {
			pagination: initialState.pagination,
			sorting: initialState.sorting,
			columnVisibility: initialState.columnVisibility,
			columnPinning: initialState.columnPinning,
			columnOrder: initialState.columnOrder,
		},
	});
</script>

<div class="flex flex-col gap-4">
	<header class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">{t("assets.title")}</h1>
			<p class="text-sm text-muted-foreground">{t("assets.description")}</p>
		</div>
		<Button onclick={() => toast.info(t("assets.new"))}>{t("assets.new")}</Button>
	</header>

	<DataTable {table} defaultPinning={DEFAULT_PINNING}>
		{#snippet bulkActions()}
			<Button
				size="sm"
				onclick={() => toast.success(t("assets.bulkAssign"))}
				disabled={table.getFilteredSelectedRowModel().rows.length === 0}
			>
				{t("assets.bulkAssign")}
			</Button>
			<Button
				size="sm"
				variant="outline"
				onclick={() => toast.success(t("assets.bulkRetire"))}
				disabled={table.getFilteredSelectedRowModel().rows.length === 0}
			>
				{t("assets.bulkRetire")}
			</Button>
		{/snippet}
	</DataTable>
</div>
