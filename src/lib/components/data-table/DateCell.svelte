<script lang="ts">
	import { useCellContext } from "#lib/hooks/table.svelte.js";
	import { t } from "#lib/i18n/index.js";
	import { formatDate } from "#lib/utils.js";

	const cell = useCellContext<string | undefined>();
	const value = $derived(cell.getValue());
</script>

{#if value && !Number.isNaN(new Date(value).getTime())}
	{formatDate(value)}
{:else}
	{t("table.dash")}
{/if}
