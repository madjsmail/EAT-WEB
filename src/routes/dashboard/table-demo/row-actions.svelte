<script lang="ts">
	import MoreHorizontal from "@lucide/svelte/icons/ellipsis";
	import { toast } from "svelte-sonner";
	import { Button } from "#lib/components/ui/button/index.js";
	import * as DropdownMenu from "#lib/components/ui/dropdown-menu/index.js";
	import { useCellContext } from "#lib/hooks/table.svelte.js";
	import { t } from "#lib/i18n/index.js";
	import type { Asset } from "./data.js";

	const cell = useCellContext<Asset>();
	const asset = $derived(cell.row.original);
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props }: { props: Record<string, any> })}
			<Button {...props} variant="ghost" class="size-7 p-0">
				<span class="sr-only">{t("assets.actions")}</span>
				<MoreHorizontal class="size-4" />
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="end">
		<DropdownMenu.Label>{asset.asset_tag}</DropdownMenu.Label>
		<DropdownMenu.Item
			onclick={() => {
				void navigator.clipboard.writeText(asset.asset_tag);
				toast.success(t("assets.copied"));
			}}
		>
			{t("assets.copyTag")}
		</DropdownMenu.Item>
		<DropdownMenu.Separator />
		<DropdownMenu.Item onclick={() => toast.info(t("assets.view"))}>
			{t("assets.view")}
		</DropdownMenu.Item>
	</DropdownMenu.Content>
</DropdownMenu.Root>
