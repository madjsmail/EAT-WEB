import { createTableHook } from "@tanstack/svelte-table";
import type { RowData } from "@tanstack/svelte-table";
import { features } from "#lib/table/features.js";
import { dynamicFilterFn } from "#lib/table/filters.js";

import ColumnHeader from "#lib/components/data-table/ColumnHeader.svelte";
import DataTableFilterList from "#lib/components/data-table/DataTableFilterList.svelte";
import DataTablePagination from "#lib/components/data-table/DataTablePagination.svelte";
import DataTableSortList from "#lib/components/data-table/DataTableSortList.svelte";
import DataTableViewOptions from "#lib/components/data-table/DataTableViewOptions.svelte";
import DateAggregatedCell from "#lib/components/data-table/DateAggregatedCell.svelte";
import DateCell from "#lib/components/data-table/DateCell.svelte";
import GroupedCell from "#lib/components/data-table/GroupedCell.svelte";
import NumberAggregatedCell from "#lib/components/data-table/NumberAggregatedCell.svelte";
import NumberCell from "#lib/components/data-table/NumberCell.svelte";
import ResizeHandle from "#lib/components/data-table/ResizeHandle.svelte";
import SelectAllHeader from "#lib/components/data-table/SelectAllHeader.svelte";
import SelectCell from "#lib/components/data-table/SelectCell.svelte";
import StatusCell from "#lib/components/data-table/StatusCell.svelte";
import TextCell from "#lib/components/data-table/TextCell.svelte";

export const {
	createAppColumnHelper,
	createAppTable,
	useTableContext,
	useCellContext,
	useHeaderContext,
} = createTableHook({
	features,
	defaultColumn: {
		size: 120,
		minSize: 60,
		maxSize: 800,
		filterFn: dynamicFilterFn,
	},
	globalFilterFn: "fuzzy",
	getRowId: (row: any) => String(row.id),
	enableRowSelection: true,
	columnResizeMode: "onChange" as const,

	tableComponents: {
		Pagination: DataTablePagination,
		FilterList: DataTableFilterList,
		SortList: DataTableSortList,
		ViewOptions: DataTableViewOptions,
	},

	cellComponents: {
		SelectCell,
		TextCell,
		NumberCell,
		DateCell,
		StatusCell,
		GroupedCell,
		NumberAggregatedCell,
		DateAggregatedCell,
	},

	headerComponents: {
		ColumnHeader,
		SelectAllHeader,
		ResizeHandle,
	},
});

export type AppTable<TData extends RowData> = ReturnType<typeof createAppTable<TData>>;
