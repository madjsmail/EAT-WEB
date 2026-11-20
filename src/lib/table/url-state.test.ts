import { describe, expect, it } from "vitest";
import {
	buildInitialState,
	serializeTableUrl,
	DEFAULT_PAGE_SIZE,
	type TableUrlState,
} from "./url-state.js";

const COLUMNS = ["select", "asset_tag", "name", "status", "price", "actions"];

function emptyState(): TableUrlState {
	return {
		globalFilter: "",
		pagination: { pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE },
		sorting: [],
		columnFilters: [],
		columnVisibility: {},
		columnPinning: { start: [], end: [] },
		columnOrder: [...COLUMNS],
	};
}

describe("buildInitialState", () => {
	it("returns defaults for a bare URL", () => {
		const state = buildInitialState(new URL("http://localhost/assets"), COLUMNS);
		expect(state.globalFilter).toBe("");
		expect(state.pagination).toEqual({ pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE });
		expect(state.sorting).toEqual([]);
		expect(state.columnFilters).toEqual([]);
		expect(state.columnOrder).toEqual(COLUMNS);
	});

	it("parses every supported param", () => {
		const url = new URL("http://localhost/assets");
		url.searchParams.set("q", "macbook");
		url.searchParams.set("page", "3");
		url.searchParams.set("size", "50");
		url.searchParams.set("sort", "asset_tag:asc,price:desc");
		url.searchParams.set(
			"filters",
			JSON.stringify([{ id: "status", value: "assigned", operator: "equals" }]),
		);
		url.searchParams.set("cols", "asset_tag,name");
		url.searchParams.set("pin", "start:select;end:actions");
		url.searchParams.set("order", "asset_tag,select");

		const state = buildInitialState(url, COLUMNS);
		expect(state.globalFilter).toBe("macbook");
		expect(state.pagination).toEqual({ pageIndex: 2, pageSize: 50 });
		expect(state.sorting).toEqual([
			{ id: "asset_tag", desc: false },
			{ id: "price", desc: true },
		]);
		expect(state.columnFilters).toEqual([
			{ id: "status", value: "assigned", operator: "equals" },
		]);
		expect(state.columnPinning).toEqual({ start: ["select"], end: ["actions"] });
		expect(state.columnOrder).toEqual(["asset_tag", "select", "name", "status", "price", "actions"]);
		expect(state.columnVisibility.asset_tag).toBe(true);
		expect(state.columnVisibility.status).toBe(false);
	});

	it("falls back safely on malformed values", () => {
		const url = new URL("http://localhost/assets?page=-2&size=nope&filters=%7B%7D&pin=side:x");
		const state = buildInitialState(url, COLUMNS);
		expect(state.pagination).toEqual({ pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE });
		expect(state.columnFilters).toEqual([]);
		expect(state.columnPinning).toEqual({ start: [], end: [] });
	});

	it("ignores stale column ids from the URL", () => {
		const url = new URL("http://localhost/assets?cols=asset_tag,deleted&pin=end:deleted");
		const state = buildInitialState(url, COLUMNS);
		expect(state.columnVisibility.deleted).toBeUndefined();
		expect(state.columnVisibility.asset_tag).toBe(true);
		expect(state.columnPinning.end).toEqual([]);
	});
});

describe("serializeTableUrl", () => {
	it("omits defaults and preserves unrelated params", () => {
		const base = new URL("http://localhost/assets?tenant=acme&page=4&q=old");
		const url = serializeTableUrl(emptyState(), base, COLUMNS);
		expect(url.searchParams.get("tenant")).toBe("acme");
		expect(url.searchParams.has("page")).toBe(false);
		expect(url.searchParams.has("q")).toBe(false);
		expect(url.search).toBe("?tenant=acme");
	});

	it("round-trips a populated state", () => {
		const state = emptyState();
		state.globalFilter = "dock";
		state.pagination = { pageIndex: 1, pageSize: Number.POSITIVE_INFINITY };
		state.sorting = [{ id: "price", desc: true }];
		state.columnFilters = [
			{ id: "status", value: "assigned", operator: "equals", joinOperator: "and" },
		];
		state.columnVisibility = { status: false };
		state.columnPinning = { start: ["select"], end: ["actions"] };
		state.columnOrder = ["select", "name", "asset_tag", "status", "price", "actions"];

		const url = serializeTableUrl(state, new URL("http://localhost/assets"), COLUMNS);
		const parsed = buildInitialState(url, COLUMNS);
		expect(parsed.globalFilter).toBe("dock");
		expect(parsed.pagination).toEqual({ pageIndex: 1, pageSize: Number.POSITIVE_INFINITY });
		expect(parsed.sorting).toEqual([{ id: "price", desc: true }]);
		expect(parsed.columnFilters).toEqual(state.columnFilters);
		expect(parsed.columnVisibility.status).toBe(false);
		expect(parsed.columnVisibility.asset_tag).toBe(true);
		expect(parsed.columnPinning).toEqual({ start: ["select"], end: ["actions"] });
		expect(parsed.columnOrder).toEqual(state.columnOrder);
	});
});
