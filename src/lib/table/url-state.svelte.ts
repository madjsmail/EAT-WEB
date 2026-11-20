import { goto } from "$app/navigation";
import { page } from "$app/state";
import { debounce } from "@tanstack/pacer";
import { serializeTableUrl, type TableUrlState } from "./url-state.js";
import type { ColumnPinningState } from "@tanstack/svelte-table";

export interface TableUrlSyncOptions {
	defaultPageSize?: number;
	defaultPinning?: ColumnPinningState;
	wait?: number;
}

/**
 * Mirrors table state into the URL with `replaceState` so back/forward is not
 * spammed on every keystroke. The table is initialised from the URL on mount,
 * so no URL -> state loop is needed; identical URLs are skipped entirely.
 */
export function createTableUrlSync(
	getState: () => TableUrlState,
	columnIds: string[],
	options: TableUrlSyncOptions = {},
) {
	let destroyed = false;

	const write = debounce(
		() => {
			if (destroyed) return;
			const next = serializeTableUrl(getState(), page.url, columnIds, options);
			if (next.href === page.url.href) return;
			void goto(next, { replace: true, reset: false });
		},
		{ wait: options.wait ?? 250 },
	);

	$effect(() => {
		// Reading the slices here makes the effect rerun on any table state change.
		void getState();
		write();
	});

	$effect(() => () => {
		destroyed = true;
	});
}
