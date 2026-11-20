<script lang="ts">
	import { useCellContext } from "#lib/hooks/table.svelte.js";
	import { t } from "#lib/i18n/index.js";
	import { formatNumber } from "#lib/utils.js";

	const cell = useCellContext<number | undefined>();
	const value = $derived(cell.getValue());
</script>

{#if value === undefined || value === null || Number.isNaN(value)}
	{t("table.dash")}
{:else}
	{formatNumber(Number(value))}
{/if}
