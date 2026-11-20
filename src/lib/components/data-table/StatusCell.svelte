<script lang="ts">
	import CircleAlert from "@lucide/svelte/icons/circle-alert";
	import CircleCheck from "@lucide/svelte/icons/circle-check";
	import Clock from "@lucide/svelte/icons/clock";
	import Wrench from "@lucide/svelte/icons/wrench";
	import Archive from "@lucide/svelte/icons/archive";
	import type { Component } from "svelte";
	import { Badge } from "#lib/components/ui/badge/index.js";
	import { useCellContext } from "#lib/hooks/table.svelte.js";
	import { t } from "#lib/i18n/index.js";

	const cell = useCellContext<string | undefined>();
	const status = $derived(cell.getValue());

	const styles: Record<string, { icon: Component; class: string }> = {
		in_stock: { icon: CircleCheck, class: "border-emerald-200 bg-emerald-50 text-emerald-700" },
		assigned: { icon: CircleCheck, class: "border-blue-200 bg-blue-50 text-blue-700" },
		in_repair: { icon: Wrench, class: "border-amber-200 bg-amber-50 text-amber-700" },
		retired: { icon: Archive, class: "border-rose-200 bg-rose-50 text-rose-700" },
		lost: { icon: CircleAlert, class: "border-rose-200 bg-rose-50 text-rose-700" },
	};
</script>

{#if status}
	{@const style = styles[status]}
	{@const Icon = style?.icon ?? Clock}
	<Badge
		variant="outline"
		class="{style?.class ?? ''} w-fit gap-1 rounded-full px-3 py-1 [&>svg]:size-3.5 [&>svg]:shrink-0"
	>
		<Icon />
		<span class="truncate">{t(`status.${status}`)}</span>
	</Badge>
{/if}
