<!-- Select-all checkbox. The svelte Checkbox takes `indeterminate` as its own
  boolean prop rather than react's tri-state 'indeterminate' string. -->
<script lang="ts">
	import { Checkbox } from "#lib/components/ui/checkbox/index.js";
	import { useTableContext } from "#lib/hooks/table.svelte.js";
	import { t } from "#lib/i18n/index.js";

	const table = useTableContext();
</script>

<Checkbox
	checked={table.getIsAllPageRowsSelected()}
	indeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()}
	onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
	aria-label={t("table.selectAll")}
	class="translate-y-0.5"
/>
