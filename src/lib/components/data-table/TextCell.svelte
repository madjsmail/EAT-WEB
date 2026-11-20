<script lang="ts">
	import { useCellContext } from "#lib/hooks/table.svelte.js";

	const cell = useCellContext<string | undefined>();
</script>

{String(cell.getValue() ?? "")}
