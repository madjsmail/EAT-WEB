import type { BuiltInFilterFn, ColumnFilter, TableFeatures } from "@tanstack/svelte-table";

export type TableFilterFeatures<TFeatures extends TableFeatures> = Pick<
	TFeatures,
	"columnFilteringFeature" | "columnFacetingFeature"
>;

export type FilterOperator =
	| BuiltInFilterFn
	| "notIncludesString"
	| "notEqualsString"
	| "notEquals"
	| "greaterThan"
	| "notGreaterThan"
	| "greaterThanOrEqualTo"
	| "notGreaterThanOrEqualTo"
	| "lessThan"
	| "notLessThan"
	| "lessThanOrEqualTo"
	| "notLessThanOrEqualTo"
	| "isRelativeToToday"
	| "inRange"
	| "startsWith"
	| "endsWith"
	| "isEmpty"
	| "isNotEmpty";

export type JoinOperator = "and" | "or";

export interface ExtendedColumnFilter extends ColumnFilter {
	filterId?: string;
	operator?: FilterOperator;
	joinOperator?: JoinOperator;
}

export type ColumnVariant = "text" | "number" | "date" | "boolean" | "select" | "multi-select";

export interface TableColumnMeta {
	label?: string;
	variant?: ColumnVariant;
	options?: Array<{ label: string; value: string; count?: number }>;
}
