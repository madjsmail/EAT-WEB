<script lang="ts">
	import { useCellContext } from "#lib/hooks/table.svelte.js";
	import { t } from "#lib/i18n/index.js";
	import { formatNumber } from "#lib/utils.js";

	const cell = useCellContext<number | undefined>();
	const value = $derived(Number(cell.getValue()));
</script>

<span class="text-muted-foreground">
	{#if Number.isFinite(value)}
		{t("table.average", {
			value: formatNumber(Math.round(value * 100) / 100, { maximumFractionDigits: 2 }),
		})}
	{:else}
		{t("table.dash")}
	{/if}
</span>
