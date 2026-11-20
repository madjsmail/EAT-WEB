<script lang="ts">
	import ChevronLeft from "@lucide/svelte/icons/chevron-left";
	import ChevronRight from "@lucide/svelte/icons/chevron-right";
	import ChevronsLeft from "@lucide/svelte/icons/chevrons-left";
	import ChevronsRight from "@lucide/svelte/icons/chevrons-right";
	import { Button } from "#lib/components/ui/button/index.js";
	import * as Select from "#lib/components/ui/select/index.js";
	import { useTableContext } from "#lib/hooks/table.svelte.js";
	import { t } from "#lib/i18n/index.js";
	import { formatNumber } from "#lib/utils.js";

	let {
		pageSizeOptions = [10, 20, 30, 40, 50, Number.POSITIVE_INFINITY],
	}: {
		pageSizeOptions?: Array<number>;
	} = $props();

	const table = useTableContext();
	const pagination = $derived(table.atoms.pagination.get());
</script>

<div
	class="flex w-full flex-col-reverse items-center justify-between gap-2 overflow-auto sm:flex-row sm:gap-4"
>
	<div class="flex-1 whitespace-nowrap text-xs text-muted-foreground">
		{t("table.rowsSelected", {
			selected: formatNumber(table.getFilteredSelectedRowModel().rows.length),
			total: formatNumber(table.getFilteredRowModel().rows.length),
		})}
	</div>
	<div class="flex flex-col-reverse items-center gap-2 sm:flex-row sm:gap-4">
		<div class="flex items-center gap-2">
			<p class="whitespace-nowrap text-sm font-medium">{t("table.rowsPerPage")}</p>
			<!-- bits-ui's Select has no SelectValue part — the trigger renders the
			     selected value directly as its children. -->
			<Select.Root
				type="single"
				value={`${pagination.pageSize}`}
				onValueChange={(value) => table.setPageSize(Number(value))}
			>
				<Select.Trigger class="h-8 w-[4.5rem]">
					{pagination.pageSize === Number.POSITIVE_INFINITY
						? t("table.all")
						: formatNumber(pagination.pageSize)}
				</Select.Trigger>
				<Select.Content side="top">
					{#each pageSizeOptions as pageSize (pageSize)}
						<Select.Item
							value={`${pageSize}`}
							label={pageSize === Number.POSITIVE_INFINITY
								? t("table.all")
								: formatNumber(pageSize)}
						/>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
		<div class="flex items-center justify-center text-xs font-medium">
			{t("table.pageOf", {
				page: formatNumber(pagination.pageIndex + 1),
				total: formatNumber(table.getPageCount()),
			})}
		</div>
		<div class="flex items-center gap-2">
			<Button
				aria-label={t("table.firstPage")}
				variant="outline"
				class="hidden size-8 p-0 lg:flex"
				onclick={() => table.setPageIndex(0)}
				disabled={!table.getCanPreviousPage()}
			>
				<ChevronsLeft class="size-4 rtl:rotate-180" aria-hidden="true" />
			</Button>
			<Button
				aria-label={t("table.previousPage")}
				variant="outline"
				size="icon"
				class="size-8"
				onclick={() => table.previousPage()}
				disabled={!table.getCanPreviousPage()}
			>
				<ChevronLeft class="size-4 rtl:rotate-180" aria-hidden="true" />
			</Button>
			<Button
				aria-label={t("table.nextPage")}
				variant="outline"
				size="icon"
				class="size-8"
				onclick={() => table.nextPage()}
				disabled={!table.getCanNextPage()}
			>
				<ChevronRight class="size-4 rtl:rotate-180" aria-hidden="true" />
			</Button>
			<Button
				aria-label={t("table.lastPage")}
				variant="outline"
				size="icon"
				class="hidden size-8 lg:flex"
				onclick={() => table.lastPage()}
				disabled={!table.getCanLastPage()}
			>
				<ChevronsRight class="size-4 rtl:rotate-180" aria-hidden="true" />
			</Button>
		</div>
	</div>
</div>
