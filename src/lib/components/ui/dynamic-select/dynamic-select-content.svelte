<script lang="ts">
	import * as Popover from '#lib/components/ui/popover/index.js';
	import * as Command from '#lib/components/ui/command/index.js';
	import { getDynamicSelectContext } from './ctx';
	import { t } from '#lib/i18n/index.js';
	import type { Snippet } from 'svelte';

	let {
		children,
		placeholder = t('dynamicSelect.search'),
		emptyLabel = t('dynamicSelect.empty')
	}: { children: Snippet; placeholder?: string; emptyLabel?: string } = $props();
	const ctx = getDynamicSelectContext();

	let internalInput = $state('');
</script>

<Popover.Content
	class="w-[var(--bits-popover-anchor-width)] min-w-[var(--bits-popover-anchor-width)] bg-popover p-0 text-popover-foreground"
	align="start"
>
	<Command.Root shouldFilter>
		<Command.Input {placeholder} bind:value={internalInput} icon={false} />
		<Command.List>
			<Command.Empty>{emptyLabel}</Command.Empty>
			{@render children()}
		</Command.List>
	</Command.Root>
</Popover.Content>
