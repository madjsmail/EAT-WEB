<!-- Column header dropdown with sort / group / pin / hide actions. -->
<script lang="ts">
	import ArrowDown from "@lucide/svelte/icons/arrow-down";
	import ArrowUp from "@lucide/svelte/icons/arrow-up";
	import ChevronsUpDown from "@lucide/svelte/icons/chevrons-up-down";
	import EyeOff from "@lucide/svelte/icons/eye-off";
	import Group from "@lucide/svelte/icons/group";
	import Pin from "@lucide/svelte/icons/pin";
	import PinOff from "@lucide/svelte/icons/pin-off";
	import Ungroup from "@lucide/svelte/icons/ungroup";
	import { Button } from "#lib/components/ui/button/index.js";
	import * as DropdownMenu from "#lib/components/ui/dropdown-menu/index.js";
	import { useHeaderContext } from "#lib/hooks/table.svelte.js";
	import { t } from "#lib/i18n/index.js";
	import { cn } from "#lib/utils.js";

	let { title, class: className }: { title?: string; class?: string } = $props();

	const header = useHeaderContext();
	const column = $derived(header.column);

	const displayTitle = $derived(column.columnDef.meta?.label ?? title ?? column.id);

	const canSort = $derived(column.getCanSort());
	const canHide = $derived(column.getCanHide());
	const canPin = $derived(column.getCanPin());
	const canGroup = $derived(column.getCanGroup());

	const sorted = $derived(canSort ? column.getIsSorted() : false);
	const pinned = $derived(canPin ? column.getIsPinned() : false);
	const grouped = $derived(canGroup ? column.getIsGrouped() : false);
</script>

{#if !canSort && !canHide && !canPin && !canGroup}
	<div class={cn(className)}>{displayTitle}</div>
{:else}
	<div class={cn("flex items-center gap-2", className)}>
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props }: { props: Record<string, any> })}
					<Button
						{...props}
						variant="ghost"
						size="sm"
						class="group -ms-3 h-7 data-open:bg-accent"
					>
						<span>{displayTitle}</span>
						{#if sorted === "desc"}
							<ArrowDown class="ms-2 size-4" />
						{:else if sorted === "asc"}
							<ArrowUp class="ms-2 size-4" />
						{:else if canSort}
							<ChevronsUpDown
								class="ms-2 size-4 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 group-data-open:opacity-100"
							/>
						{/if}
					</Button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="start">
				{#if canSort}
					<DropdownMenu.Item onclick={() => column.toggleSorting(false)}>
						<ArrowUp class="me-2 size-3.5 text-muted-foreground/70" />
						{t("table.asc")}
					</DropdownMenu.Item>
					<DropdownMenu.Item onclick={() => column.toggleSorting(true)}>
						<ArrowDown class="me-2 size-3.5 text-muted-foreground/70" />
						{t("table.desc")}
					</DropdownMenu.Item>
				{/if}
				{#if canGroup}
					{#if canSort}
						<DropdownMenu.Separator />
					{/if}
					<DropdownMenu.Item onclick={column.getToggleGroupingHandler()}>
						{#if grouped}
							<Ungroup class="me-2 size-3.5 text-muted-foreground/70" />
							{t("table.ungroup")}
						{:else}
							<Group class="me-2 size-3.5 text-muted-foreground/70" />
							{t("table.groupBy")}
						{/if}
					</DropdownMenu.Item>
				{/if}
				{#if canPin}
					{#if canSort || canGroup}
						<DropdownMenu.Separator />
					{/if}
					<DropdownMenu.Item
						onclick={() => column.pin("start")}
						disabled={pinned === "start"}
					>
						<Pin class="me-2 size-3.5 text-muted-foreground/70 rtl:rotate-180" />
						{t("table.pinStart")}
					</DropdownMenu.Item>
					<DropdownMenu.Item
						onclick={() => column.pin("end")}
						disabled={pinned === "end"}
					>
						<Pin class="me-2 size-3.5 rotate-180 text-muted-foreground/70 rtl:rotate-0" />
						{t("table.pinEnd")}
					</DropdownMenu.Item>
					{#if pinned}
						<DropdownMenu.Item onclick={() => column.pin(false)}>
							<PinOff class="me-2 size-3.5 text-muted-foreground/70" />
							{t("table.unpin")}
						</DropdownMenu.Item>
					{/if}
				{/if}
				{#if canHide}
					<DropdownMenu.Separator />
					<DropdownMenu.Item onclick={() => column.toggleVisibility(false)}>
						<EyeOff class="me-2 size-3.5 text-muted-foreground/70" />
						{t("table.hide")}
					</DropdownMenu.Item>
				{/if}
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</div>
{/if}
