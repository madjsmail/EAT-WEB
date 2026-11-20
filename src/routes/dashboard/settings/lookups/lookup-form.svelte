<script lang="ts">
	import { untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import * as Sheet from '#lib/components/ui/sheet/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Checkbox } from '#lib/components/ui/checkbox/index.js';
	import { Field, FieldDescription, FieldLabel } from '#lib/components/ui/field/index.js';
	import TranslationInputs from '#lib/components/domain/translation-inputs.svelte';
	import { ApiError } from '#lib/api/client.js';
	import { createLookup, updateLookup, type Lookup, type LookupPayload } from '#lib/api/lookups.js';
	import type { LookupConfig } from '#lib/config/lookups.js';
	import { t } from '#lib/i18n/index.js';
	import type { Translations } from '#lib/i18n/index.js';

	let {
		config,
		item = null,
		locations = [],
		onclose,
		onsaved
	}: {
		config: LookupConfig;
		item?: Lookup | null;
		locations?: Lookup[];
		onclose: () => void;
		onsaved: () => void;
	} = $props();

	const initial = untrack(() => item);

	let translations = $state<Translations>({
		en: initial?.translations?.en ?? '',
		fr: initial?.translations?.fr ?? '',
		ar: initial?.translations?.ar ?? ''
	});
	let values = $state<Record<string, unknown>>(seed());
	let saving = $state(false);
	let error = $state<string | null>(null);

	function seed(): Record<string, unknown> {
		const next: Record<string, unknown> = {};
		for (const field of config.fields) {
			const current = initial?.[field.key as keyof Lookup];
			next[field.key] =
				field.type === 'checkbox' ? Boolean(current ?? field.key === 'is_active') : (current ?? '');
		}
		return next;
	}

	function textValue(key: string): string {
		const raw = values[key];
		return typeof raw === 'string' ? raw : typeof raw === 'number' ? String(raw) : '';
	}

	const parentOptions = $derived(locations.filter((location) => location.id !== item?.id));

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		saving = true;
		error = null;

		const payload: LookupPayload = { translations: { ...translations } };
		for (const field of config.fields) {
			if (field.createOnly && item) continue;
			const raw = values[field.key];
			if (field.type === 'checkbox') payload[field.key] = Boolean(raw);
			else if (field.type === 'number') payload[field.key] = raw === '' ? null : Number(raw);
			else payload[field.key] = raw === '' ? null : raw;
		}

		try {
			if (item) {
				await updateLookup(config.family, item.id, payload);
				toast.success(t('lookup.updated'));
			} else {
				await createLookup(config.family, payload);
				toast.success(t('lookup.created'));
			}
			onsaved();
			onclose();
		} catch (cause) {
			error =
				cause instanceof ApiError && cause.status > 0 ? cause.message : t('auth.genericError');
		} finally {
			saving = false;
		}
	}
</script>

<Sheet.Root open onOpenChange={(open) => !open && onclose()}>
	<Sheet.Content side="right" class="w-full sm:max-w-2xl">
		<Sheet.Header>
			<Sheet.Title>{item ? t('lookup.editTitle') : t('lookup.createTitle')}</Sheet.Title>
			<Sheet.Description>{t(config.descriptionKey)}</Sheet.Description>
		</Sheet.Header>
		<form class="flex min-h-0 flex-1 flex-col" onsubmit={submit}>
			<div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
				{#if error}
					<p
						class="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
					>
						{error}
					</p>
				{/if}
				<TranslationInputs bind:value={translations} />
				{#each config.fields as field (field.key)}
					{#if !(field.createOnly && item)}
						<Field>
							{#if field.type === 'checkbox'}
								<label class="flex items-center gap-2 text-sm">
									<Checkbox
										checked={Boolean(values[field.key])}
										onCheckedChange={(checked) => (values[field.key] = checked === true)}
									/>
									{t(field.labelKey)}
								</label>
							{:else}
								<FieldLabel for="lookup-{field.key}">{t(field.labelKey)}</FieldLabel>
								{#if field.type === 'select'}
									<select
										id="lookup-{field.key}"
										class="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
										value={textValue(field.key)}
										onchange={(event: Event & { currentTarget: HTMLSelectElement }) =>
											(values[field.key] = event.currentTarget.value)}
										required={field.required}
									>
										<option value="">—</option>
										{#each field.options ?? [] as option (option.value)}
											<option value={option.value}>
												{option.labelKey ? t(option.labelKey) : t(`lookup.enum.${option.value}`)}
											</option>
										{/each}
									</select>
								{:else if field.type === 'parent'}
									<select
										id="lookup-{field.key}"
										class="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
										value={textValue(field.key)}
										onchange={(event: Event & { currentTarget: HTMLSelectElement }) =>
											(values[field.key] = event.currentTarget.value)}
									>
										<option value="">—</option>
										{#each parentOptions as location (location.id)}
											<option value={location.id}>
												{location.translations?.en ?? location.code ?? location.id}
											</option>
										{/each}
									</select>
								{:else if field.type === 'textarea'}
									<textarea
										id="lookup-{field.key}"
										class="min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
										value={textValue(field.key)}
										oninput={(event: Event & { currentTarget: HTMLTextAreaElement }) =>
											(values[field.key] = event.currentTarget.value)}></textarea>
								{:else}
									<Input
										id="lookup-{field.key}"
										type={field.type === 'number'
											? 'number'
											: field.type === 'email'
												? 'email'
												: field.type === 'url'
													? 'url'
													: 'text'}
										step={field.step}
										required={field.required}
										value={textValue(field.key)}
										oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
											(values[field.key] = event.currentTarget.value)}
									/>
								{/if}
								{#if field.hintKey}
									<FieldDescription>{t(field.hintKey)}</FieldDescription>
								{/if}
							{/if}
						</Field>
					{/if}
				{/each}
			</div>
			<div class="flex justify-end gap-2 border-t p-4">
				<Button type="button" variant="outline" onclick={onclose}>{t('common.cancel')}</Button>
				<Button type="submit" disabled={saving}>
					{saving ? t('common.saving') : t('common.save')}
				</Button>
			</div>
		</form>
	</Sheet.Content>
</Sheet.Root>
