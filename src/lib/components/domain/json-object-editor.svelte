<script lang="ts">
	import PlusIcon from '@lucide/svelte/icons/plus';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Field, FieldLabel } from '#lib/components/ui/field/index.js';
	import { t } from '#lib/i18n/index.js';

	let {
		value = $bindable<Record<string, unknown>>({}),
		label,
		disabled = false
	}: { value?: Record<string, unknown>; label: string; disabled?: boolean } = $props();

	// Rows are seeded once; the editor owns them and pushes objects up on input.
	let rows = $state<{ key: string; value: string }[]>(
		Object.entries(value).map(([key, val]) => ({
			key,
			value: typeof val === 'string' ? val : JSON.stringify(val)
		}))
	);

	function sync() {
		const next: Record<string, unknown> = {};
		for (const row of rows) {
			if (!row.key.trim()) continue;
			next[row.key.trim()] = row.value;
		}
		value = next;
	}

	function addRow() {
		rows = [...rows, { key: '', value: '' }];
	}

	function removeRow(index: number) {
		rows = rows.filter((_, i) => i !== index);
		sync();
	}
</script>

<Field>
	<FieldLabel>{label}</FieldLabel>
	<div class="flex flex-col gap-2">
		{#each rows as row, index (index)}
			<div class="flex items-start gap-2">
				<Input
					class="sm:max-w-48"
					placeholder="key"
					bind:value={row.key}
					oninput={sync}
					{disabled}
				/>
				<Input placeholder="value" bind:value={row.value} oninput={sync} {disabled} />
				<Button
					variant="ghost"
					size="icon"
					class="shrink-0"
					aria-label={t('common.remove')}
					{disabled}
					onclick={() => removeRow(index)}
				>
					<Trash2Icon />
				</Button>
			</div>
		{/each}
		<Button variant="outline" size="sm" class="self-start" {disabled} onclick={addRow}>
			<PlusIcon />
			{t('common.addEntry')}
		</Button>
	</div>
</Field>
