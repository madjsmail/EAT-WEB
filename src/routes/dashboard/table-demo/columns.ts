import { renderComponent } from "@tanstack/svelte-table";
import RowActions from "./row-actions.svelte";
import type { Asset } from "./data.js";
import { CATEGORIES, STATUSES } from "./data.js";
import DateAggregatedCell from "#lib/components/data-table/DateAggregatedCell.svelte";
import NumberAggregatedCell from "#lib/components/data-table/NumberAggregatedCell.svelte";
import { createAppColumnHelper } from "#lib/hooks/table.svelte.js";
import { t } from "#lib/i18n/index.js";

const columnHelper = createAppColumnHelper<Asset>();

export const columns = columnHelper.columns([
	columnHelper.display({
		id: "select",
		header: ({ header }) => renderComponent(header.SelectAllHeader),
		cell: ({ cell }) => renderComponent(cell.SelectCell),
		maxSize: 40,
		enableSorting: false,
		enableHiding: false,
		enableResizing: false,
	}),
	columnHelper.accessor("asset_tag", {
		id: "asset_tag",
		header: ({ header }) => renderComponent(header.ColumnHeader),
		cell: ({ cell }) => renderComponent(cell.TextCell),
		size: 120,
		meta: { label: t("asset.tag"), variant: "text" },
	}),
	columnHelper.accessor("name", {
		id: "name",
		header: ({ header }) => renderComponent(header.ColumnHeader),
		cell: ({ cell }) => renderComponent(cell.TextCell),
		size: 180,
		meta: { label: t("asset.name"), variant: "text" },
	}),
	columnHelper.accessor("status", {
		id: "status",
		header: ({ header }) => renderComponent(header.ColumnHeader),
		cell: ({ cell }) => renderComponent(cell.StatusCell),
		aggregatedCell: () => null,
		size: 130,
		meta: {
			label: t("asset.status"),
			variant: "select",
			options: STATUSES.map((status) => ({ label: t(`status.${status}`), value: status })),
		},
	}),
	columnHelper.accessor("category", {
		id: "category",
		header: ({ header }) => renderComponent(header.ColumnHeader),
		cell: ({ cell }) => renderComponent(cell.TextCell),
		aggregatedCell: () => null,
		size: 120,
		meta: {
			label: t("asset.category"),
			variant: "select",
			options: CATEGORIES.map((category) => ({
				label: t(`category.${category}`),
				value: category,
			})),
		},
	}),
	columnHelper.accessor("price", {
		id: "price",
		header: ({ header }) => renderComponent(header.ColumnHeader),
		cell: ({ cell }) => renderComponent(cell.NumberCell),
		aggregationFn: "mean",
		aggregatedCell: () => renderComponent(NumberAggregatedCell),
		size: 110,
		meta: { label: t("asset.price"), variant: "number" },
	}),
	columnHelper.accessor("purchase_date", {
		id: "purchase_date",
		header: ({ header }) => renderComponent(header.ColumnHeader),
		cell: ({ cell }) => renderComponent(cell.DateCell),
		aggregationFn: "min",
		aggregatedCell: () => renderComponent(DateAggregatedCell),
		size: 140,
		meta: { label: t("asset.purchaseDate"), variant: "date" },
	}),
	columnHelper.accessor("custodian", {
		id: "custodian",
		header: ({ header }) => renderComponent(header.ColumnHeader),
		cell: ({ cell }) => renderComponent(cell.TextCell),
		aggregatedCell: () => null,
		size: 160,
		meta: { label: t("asset.custodian"), variant: "text" },
	}),
	columnHelper.accessor("serial", {
		id: "serial",
		header: ({ header }) => renderComponent(header.ColumnHeader),
		cell: ({ cell }) => renderComponent(cell.TextCell),
		size: 140,
		meta: { label: t("asset.serial"), variant: "text" },
	}),
	columnHelper.accessor("imei_1", {
		id: "imei_1",
		header: ({ header }) => renderComponent(header.ColumnHeader),
		cell: ({ cell }) => renderComponent(cell.TextCell),
		size: 160,
		meta: { label: t("asset.imei"), variant: "text" },
	}),
	columnHelper.display({
		id: "actions",
		header: () => null,
		cell: ({ cell }) => renderComponent(RowActions),
		maxSize: 48,
		enableSorting: false,
		enableHiding: false,
		enableResizing: false,
	}),
]);
