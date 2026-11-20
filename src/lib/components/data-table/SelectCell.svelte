<!-- Row-selection checkbox cell. -->
<script lang="ts">
	import { Checkbox } from "#lib/components/ui/checkbox/index.js";
	import { useCellContext } from "#lib/hooks/table.svelte.js";
	import { t } from "#lib/i18n/index.js";

	const cell = useCellContext();
	const row = $derived(cell.row);
</script>

<Checkbox
	checked={row.getIsSelected()}
	onCheckedChange={(value) => row.toggleSelected(!!value)}
	aria-label={t("table.selectRow")}
	class="translate-y-0.5"
/>
