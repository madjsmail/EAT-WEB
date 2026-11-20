import { z } from "zod";
import type { ColumnPinningState, SortingState } from "@tanstack/svelte-table";
import type { ExtendedColumnFilter, FilterOperator, JoinOperator } from "./types.js";

/**
 * URL contract shared by the client table and the future backend query.
 *
 * ?q=…&page=2&size=50&sort=asset_tag:asc,price:desc
 *   &filters=[{"id":"status","value":"assigned","operator":"equals"}]
 *   &cols=asset_tag,name,status&pin=start:select;end:actions&order=select,asset_tag,…
 *
 * Everything equal to the default is omitted so the bare route stays clean.
 * Parsing is defensive: unknown or malformed values fall back to the default
 * instead of throwing, and unrelated query params are preserved on write.
 */

export const DEFAULT_PAGE_SIZE = 20;
export const TABLE_URL_KEYS = [
	"q",
	"page",
	"size",
	"sort",
	"filters",
	"cols",
	"pin",
	"order",
] as const;

/** Minimal URL shape: SvelteKit's `page.url` is read-only but assignable to this. */
export interface UrlLike {
	href: string;
	searchParams: {
		get(name: string): string | null;
		has(name: string): boolean;
	};
}

export interface TableUrlState {
	globalFilter: string;
	pagination: { pageIndex: number; pageSize: number };
	sorting: SortingState;
	columnFilters: ExtendedColumnFilter[];
	columnVisibility: Record<string, boolean>;
	columnPinning: ColumnPinningState;
	columnOrder: string[];
}

const filterSchema = z.array(
	z.object({
		id: z.string().min(1),
		value: z.unknown(),
		filterId: z.string().optional(),
		operator: z.string().optional(),
		joinOperator: z.enum(["and", "or"]).optional(),
	}),
);

function parsePositiveInt(value: string | null): number | undefined {
	if (value === null) return undefined;
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parseSize(value: string | null): number | undefined {
	if (value === null) return undefined;
	if (value === "all") return Number.POSITIVE_INFINITY;
	const parsed = parsePositiveInt(value);
	return parsed === undefined ? undefined : Math.min(parsed, 1000);
}

function parseSorting(value: string | null): SortingState {
	if (!value) return [];
	return value.split(",").flatMap((entry) => {
		const [id, direction] = entry.split(":");
		if (!id) return [];
		return [{ id, desc: direction === "desc" }];
	});
}

function parseFilters(value: string | null): ExtendedColumnFilter[] {
	if (!value) return [];
	try {
		const parsed = filterSchema.safeParse(JSON.parse(value));
		if (!parsed.success) return [];
		return parsed.data.map((filter) => ({
			id: filter.id,
			value: filter.value as never,
			filterId: filter.filterId,
			operator: filter.operator as FilterOperator | undefined,
			joinOperator: filter.joinOperator as JoinOperator | undefined,
		}));
	} catch {
		return [];
	}
}

function parseList(value: string | null): string[] {
	if (!value) return [];
	return value
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

function parsePinning(value: string | null): ColumnPinningState {
	const pinning: ColumnPinningState = { start: [], end: [] };
	if (!value) return pinning;
	for (const group of value.split(";")) {
		const [side, ids] = group.split(":");
		if (side !== "start" && side !== "end") continue;
		pinning[side] = parseList(ids);
	}
	return pinning;
}

/**
 * Turns the current URL into the table's `initialState` slices.
 * Column ids come from the page's column definitions so stale ids in the URL
 * (renamed/removed columns) are ignored instead of hiding the whole table.
 */
export function buildInitialState(
	url: UrlLike,
	columnIds: string[],
	options: {
		defaultPageSize?: number;
		defaultSorting?: SortingState;
		defaultPinning?: ColumnPinningState;
	} = {},
): TableUrlState {
	const defaultPageSize = options.defaultPageSize ?? DEFAULT_PAGE_SIZE;
	const params = url.searchParams;
	const pageSize = parseSize(params.get("size")) ?? defaultPageSize;
	const page = parsePositiveInt(params.get("page")) ?? 1;
	const known = new Set(columnIds);

	const cols = parseList(params.get("cols")).filter((id) => known.has(id));
	const columnVisibility: Record<string, boolean> = {};
	if (params.has("cols")) {
		for (const id of columnIds) columnVisibility[id] = cols.includes(id);
	}

	const order = parseList(params.get("order")).filter((id) => known.has(id));
	for (const id of columnIds) {
		if (!order.includes(id)) order.push(id);
	}

	const sorting = params.has("sort")
		? parseSorting(params.get("sort"))
		: (options.defaultSorting ?? []);

	const parsedPinning = params.has("pin")
		? parsePinning(params.get("pin"))
		: (options.defaultPinning ?? { start: [], end: [] });
	const pinning: ColumnPinningState = {
		start: (parsedPinning.start ?? []).filter((id) => known.has(id)),
		end: (parsedPinning.end ?? []).filter((id) => known.has(id)),
	};

	return {
		globalFilter: params.get("q") ?? "",
		pagination: { pageIndex: page - 1, pageSize },
		sorting,
		columnFilters: parseFilters(params.get("filters")),
		columnVisibility,
		columnPinning: pinning,
		columnOrder: order,
	};
}

function setOrDelete(params: URLSearchParams, key: string, value: string | undefined) {
	if (value === undefined || value === "") params.delete(key);
	else params.set(key, value);
}

/**
 * Writes the table state back into a URL, preserving unrelated params.
 * Used with `goto(url, { replace: true, reset: false })`.
 */
export function serializeTableUrl(
	state: TableUrlState,
	base: UrlLike,
	columnIds: string[],
	options: { defaultPageSize?: number; defaultPinning?: ColumnPinningState } = {},
): URL {
	const defaultPageSize = options.defaultPageSize ?? DEFAULT_PAGE_SIZE;
	const url = new URL(base.href);
	const params = url.searchParams;

	for (const key of TABLE_URL_KEYS) params.delete(key);

	setOrDelete(params, "q", state.globalFilter || undefined);

	const page = state.pagination.pageIndex + 1;
	setOrDelete(params, "page", page > 1 ? String(page) : undefined);
	setOrDelete(
		params,
		"size",
		state.pagination.pageSize === Number.POSITIVE_INFINITY
			? "all"
			: state.pagination.pageSize === defaultPageSize
				? undefined
				: String(state.pagination.pageSize),
	);

	setOrDelete(
		params,
		"sort",
		state.sorting.length
			? state.sorting.map((sort) => `${sort.id}:${sort.desc ? "desc" : "asc"}`).join(",")
			: undefined,
	);

	setOrDelete(
		params,
		"filters",
		state.columnFilters.length
			? JSON.stringify(
					state.columnFilters.map((filter) => ({
						id: filter.id,
						value: filter.value,
						...(filter.filterId ? { filterId: filter.filterId } : {}),
						...(filter.operator ? { operator: filter.operator } : {}),
						...(filter.joinOperator ? { joinOperator: filter.joinOperator } : {}),
					})),
				)
			: undefined,
	);

	const hidden = columnIds.filter((id) => state.columnVisibility[id] === false);
	setOrDelete(params, "cols", hidden.length ? columnIds.filter((id) => !hidden.includes(id)).join(",") : undefined);

	const defaultPinning = options.defaultPinning ?? { start: [], end: [] };
	const sameIds = (a: string[] = [], b: string[] = []) =>
		a.length === b.length && a.every((id, index) => id === b[index]);
	const pinningIsDefault =
		sameIds(state.columnPinning.start, defaultPinning.start) &&
		sameIds(state.columnPinning.end, defaultPinning.end);

	const pinParts: string[] = [];
	if (!pinningIsDefault) {
		if (state.columnPinning.start?.length) pinParts.push(`start:${state.columnPinning.start.join(",")}`);
		if (state.columnPinning.end?.length) pinParts.push(`end:${state.columnPinning.end.join(",")}`);
	}
	setOrDelete(params, "pin", pinParts.length ? pinParts.join(";") : undefined);

	const isDefaultOrder =
		state.columnOrder.length === columnIds.length &&
		state.columnOrder.every((id, index) => id === columnIds[index]);
	setOrDelete(params, "order", isDefaultOrder ? undefined : state.columnOrder.join(","));

	return url;
}
