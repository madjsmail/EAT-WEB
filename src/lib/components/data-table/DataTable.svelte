<script lang="ts" generics="TData extends RowData">
	import CircleAlert from "@lucide/svelte/icons/circle-alert";
	import Search from "@lucide/svelte/icons/search";
	import { debounce } from "@tanstack/pacer";
	import type { ColumnPinningState, RowData } from "@tanstack/svelte-table";
	import { untrack, type Snippet } from "svelte";
	import { Button } from "#lib/components/ui/button/index.js";
	import { Input } from "#lib/components/ui/input/index.js";
	import { Skeleton } from "#lib/components/ui/skeleton/index.js";
	import * as Table from "#lib/components/ui/table/index.js";
	import type { AppTable } from "#lib/hooks/table.svelte.js";
	import { t } from "#lib/i18n/index.js";
	import { getCommonPinningStyles } from "#lib/table/pinning.js";
	import type { ExtendedColumnFilter } from "#lib/table/types.js";
	import { createTableUrlSync } from "#lib/table/url-state.svelte.js";
	import type { TableUrlState } from "#lib/table/url-state.js";
	import { cn } from "#lib/utils.js";

	let {
		table,
		loading = false,
		error = null,
		onretry,
		emptyAction,
		bulkActions,
		searchPlaceholder = t("table.search"),
		defaultPinning,
		class: className,
	}: {
		table: AppTable<TData>;
		loading?: boolean;
		error?: string | null;
		onretry?: () => void;
		emptyAction?: Snippet;
		bulkActions?: Snippet;
		searchPlaceholder?: string;
		defaultPinning?: ColumnPinningState;
		class?: string;
	} = $props();

	const columnIds = untrack(() => table.getAllLeafColumns().map((column) => column.id));
	const globalFilter = $derived(table.atoms.globalFilter.get());
	const columnFilters = $derived(
		table.atoms.columnFilters.get() as Array<ExtendedColumnFilter>,
	);
	const selectedCount = $derived(table.getFilteredSelectedRowModel().rows.length);
	const hasQuery = $derived(globalFilter.length > 0 || columnFilters.length > 0);

	let searchValue = $state(untrack(() => globalFilter));
	const search = debounce((value: string) => table.setGlobalFilter(value), { wait: 300 });

	function clearFilters() {
		searchValue = "";
		table.setGlobalFilter("");
		table.resetColumnFilters();
	}

	function getState(): TableUrlState {
		return {
			globalFilter: table.atoms.globalFilter.get(),
			pagination: table.atoms.pagination.get(),
			sorting: table.atoms.sorting.get(),
			columnFilters: table.atoms.columnFilters.get() as Array<ExtendedColumnFilter>,
			columnVisibility: table.atoms.columnVisibility.get(),
			columnPinning: table.atoms.columnPinning.get(),
			columnOrder: table.atoms.columnOrder.get(),
		};
	}

	createTableUrlSync(getState, columnIds, { defaultPinning: untrack(() => defaultPinning) });
</script>

<table.AppTable>
	<div class={cn("flex flex-col gap-3", className)}>
		<div class="flex flex-wrap items-center gap-2">
			<div class="relative w-full max-w-64">
				<Search
					class="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
				/>
				<Input
					value={searchValue}
					placeholder={searchPlaceholder}
					aria-label={searchPlaceholder}
					class="h-8 ps-8"
					oninput={(event: Event & { currentTarget: HTMLInputElement }) => {
						searchValue = event.currentTarget.value;
						search(searchValue);
					}}
				/>
			</div>
			<table.FilterList />
			<table.SortList />
			<table.ViewOptions />
		</div>

		{#if loading}
			<div class="rounded-md border" aria-busy="true">
				<div class="flex items-center justify-between border-b p-2">
					<Skeleton class="h-4 w-40" />
					<Skeleton class="h-4 w-20" />
				</div>
				{#each Array.from({ length: 6 }, (_, index) => index) as row (row)}
					<div class="flex items-center gap-4 border-b p-2 last:border-b-0">
						<Skeleton class="size-4 shrink-0" />
						<Skeleton class="h-4 w-24" />
						<Skeleton class="h-4 flex-1" />
						<Skeleton class="h-4 w-20" />
						<Skeleton class="h-4 w-16" />
					</div>
				{/each}
			</div>
		{:else if error}
			<div
				role="alert"
				class="flex flex-wrap items-center gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
			>
				<CircleAlert class="size-4 shrink-0" />
				<div class="flex-1">
					<p class="font-medium">{t("table.errorTitle")}</p>
					<p class="text-rose-700">{error}</p>
				</div>
				{#if onretry}
					<Button variant="outline" size="sm" onclick={onretry}>
						{t("table.retry")}
					</Button>
				{/if}
			</div>
		{:else if table.getFilteredRowModel().rows.length === 0}
			<div class="flex flex-col items-center gap-3 rounded-md border border-dashed p-8 text-center">
				{#if table.getPreFilteredRowModel().rows.length === 0}
					<p class="text-base font-medium">{t("table.emptyTitle")}</p>
					<p class="text-sm text-muted-foreground">{t("table.emptyDescription")}</p>
					{#if emptyAction}
						{@render emptyAction()}
					{/if}
				{:else}
					<p class="text-base font-medium">{t("table.noResultsTitle")}</p>
					<p class="text-sm text-muted-foreground">{t("table.noResultsDescription")}</p>
					<Button variant="outline" size="sm" onclick={clearFilters}>
						{t("table.clearFilters")}
					</Button>
				{/if}
			</div>
		{:else}
			<div class="rounded-md border">
				<Table.Root>
					<Table.Header>
						{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
							<Table.Row>
								{#each headerGroup.headers.filter((header) => header.column.getIsVisible()) as header (header.id)}
									<table.AppHeader {header}>
										{#snippet children(h)}
											<Table.Head
												colspan={h.colSpan}
												class={cn("relative h-8 px-2", {
													"text-center [&>[role=checkbox]]:mx-auto":
														h.column.id === "select",
												})}
												style={`width: ${h.getSize()}px; ${getCommonPinningStyles(h.column)}`}
											>
												{#if !h.isPlaceholder}
													<h.FlexRender header={h} />
												{/if}
												<h.ResizeHandle />
											</Table.Head>
										{/snippet}
									</table.AppHeader>
								{/each}
							</Table.Row>
						{/each}
					</Table.Header>
					<Table.Body>
						{#each table.getRowModel().rows as row (row.id)}
							<Table.Row
								data-state={row.getIsSelected() ? "selected" : undefined}
								aria-selected={row.getIsSelected()}
							>
								{#each row.getVisibleCells() as cell (cell.id)}
									<table.AppCell {cell}>
										{#snippet children(c)}
											<Table.Cell
												class={cn("px-2 py-0.5", {
													"text-center [&>[role=checkbox]]:mx-auto":
														c.column.id === "select",
												})}
												style={`width: ${c.column.getSize()}px; ${getCommonPinningStyles(
													c.column,
													row.getIsSelected(),
												)}`}
											>
												{#if c.getIsGrouped()}
													<c.GroupedCell />
												{:else}
													<c.FlexRender cell={c} />
												{/if}
											</Table.Cell>
										{/snippet}
									</table.AppCell>
								{/each}
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
			<table.Pagination />
		{/if}
	</div>
</table.AppTable>

{#if selectedCount > 0}
	<div class="fixed inset-x-0 bottom-6 z-50 mx-auto w-fit">
		<div
			class="flex items-center gap-2 rounded-lg border bg-background px-3 py-1.5 shadow-lg"
			role="status"
			aria-live="polite"
		>
			<span class="text-sm font-medium">
				{t("table.selectedCount", { count: selectedCount })}
			</span>
			<Button variant="ghost" size="sm" onclick={() => table.resetRowSelection()}>
				{t("table.clearSelection")}
			</Button>
			{#if bulkActions}
				{@render bulkActions()}
			{/if}
		</div>
	</div>
{/if}
