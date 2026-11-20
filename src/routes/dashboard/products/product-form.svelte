<script lang="ts">
	import { untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import * as Sheet from '#lib/components/ui/sheet/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Checkbox } from '#lib/components/ui/checkbox/index.js';
	import { Field, FieldGroup, FieldLabel } from '#lib/components/ui/field/index.js';
	import TranslationInputs from '#lib/components/domain/translation-inputs.svelte';
	import JsonObjectEditor from '#lib/components/domain/json-object-editor.svelte';
	import SearchSelect, { type SelectOption } from '#lib/components/domain/search-select.svelte';
	import { lookupOptions } from '#lib/config/select-options.js';
	import { ApiError } from '#lib/api/client.js';
	import { createProduct, updateProduct, type EolType, type Product } from '#lib/api/products.js';
	import type { Lookup } from '#lib/api/lookups.js';
	import { t, type Translations } from '#lib/i18n/index.js';

	let {
		product = null,
		categories,
		manufacturers,
		suppliers,
		depreciationModels,
		onclose,
		onsaved
	}: {
		product?: Product | null;
		categories: Lookup[];
		manufacturers: Lookup[];
		suppliers: Lookup[];
		depreciationModels: Lookup[];
		onclose: () => void;
		onsaved: () => void;
	} = $props();

	const eolTypes: EolType[] = [
		'fixed_date',
		'months_from_purchase',
		'months_from_warranty',
		'individual'
	];

	const categoryOptions = $derived(lookupOptions(categories, true));
	const manufacturerOptions = $derived(lookupOptions(manufacturers));
	const supplierOptions = $derived(lookupOptions(suppliers));
	const depreciationOptions = $derived(lookupOptions(depreciationModels));
	const eolOptions = $derived(
		eolTypes.map((type) => ({ value: type, label: t(`product.eol.${type}`) }))
	);

	const initial = untrack(() => product);

	let translations = $state<Translations>({
		en: initial?.translations?.en ?? '',
		fr: initial?.translations?.fr ?? '',
		ar: initial?.translations?.ar ?? ''
	});
	let categoryId = $state(initial?.category_id ?? '');
	let manufacturerId = $state(initial?.manufacturer_id ?? '');
	let supplierId = $state(initial?.default_supplier_id ?? '');
	let depreciationId = $state(initial?.depreciation_model_id ?? '');
	let modelCode = $state(initial?.model_code ?? '');
	let eolType = $state<string>(initial?.eol_type ?? '');
	let eolDate = $state(initial?.eol_date?.slice(0, 10) ?? '');
	let purchaseCost = $state(
		initial?.default_purchase_cost == null ? '' : String(initial?.default_purchase_cost)
	);
	let currency = $state(initial?.default_currency ?? 'USD');
	let minQuantity = $state(String(initial?.min_quantity ?? 0));
	let chip = $state(initial?.chip ?? '');
	let operatingSystem = $state(initial?.operating_system ?? '');
	let notes = $state(initial?.notes ?? '');
	let isArchived = $state(initial?.is_archived ?? false);
	let customFields = $state<Record<string, unknown>>(initial?.custom_fields_json ?? {});
	let specs = $state<Record<string, unknown>>(initial?.specs_json ?? {});
	let saving = $state(false);
	let error = $state<string | null>(null);

	const eolDateVisible = $derived(eolType === 'fixed_date');

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!categoryId) {
			error = t('dynamicSelect.required');
			return;
		}
		saving = true;
		error = null;
		try {
			const payload = {
				translations: { ...translations },
				category_id: categoryId,
				manufacturer_id: manufacturerId || null,
				default_supplier_id: supplierId || null,
				depreciation_model_id: depreciationId || null,
				model_code: modelCode || null,
				eol_type: (eolType || null) as EolType | null,
				eol_date: eolDateVisible && eolDate ? eolDate : null,
				default_purchase_cost: purchaseCost === '' ? null : purchaseCost,
				default_currency: currency || 'USD',
				min_quantity: Number(minQuantity) || 0,
				chip: chip || null,
				operating_system: operatingSystem || null,
				notes: notes || null,
				custom_fields_json: customFields,
				specs_json: specs,
				is_archived: isArchived
			};
			if (product) {
				await updateProduct(product.id, payload);
				toast.success(t('product.updated'));
			} else {
				await createProduct(payload);
				toast.success(t('product.created'));
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
	<Sheet.Content side="right" class="w-full sm:max-w-3xl">
		<Sheet.Header>
			<Sheet.Title>{product ? t('product.editTitle') : t('product.createTitle')}</Sheet.Title>
			<Sheet.Description>{t('product.formDescription')}</Sheet.Description>
		</Sheet.Header>
		<form class="flex min-h-0 flex-1 flex-col" onsubmit={submit}>
			<div class="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 pb-4">
				{#if error}
					<p
						class="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
					>
						{error}
					</p>
				{/if}

				<TranslationInputs bind:value={translations} />

				<section class="flex flex-col gap-3">
					<h3 class="text-sm font-medium">{t('product.section.identity')}</h3>
					<FieldGroup class="grid gap-4 sm:grid-cols-2">
						<Field>
							<FieldLabel for="product-category">{t('product.category')} *</FieldLabel>
							<SearchSelect
								id="product-category"
								bind:value={categoryId}
								options={categoryOptions}
								required
							/>
						</Field>
						<Field>
							<FieldLabel for="product-manufacturer">{t('product.manufacturer')}</FieldLabel>
							<SearchSelect
								id="product-manufacturer"
								bind:value={manufacturerId}
								options={manufacturerOptions}
								allowClear
							/>
						</Field>
						<Field>
							<FieldLabel for="product-model-code">{t('product.modelCode')}</FieldLabel>
							<Input
								id="product-model-code"
								value={modelCode}
								oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
									(modelCode = event.currentTarget.value)}
							/>
						</Field>
					</FieldGroup>
				</section>

				<section class="flex flex-col gap-3">
					<h3 class="text-sm font-medium">{t('product.section.lifecycle')}</h3>
					<FieldGroup class="grid gap-4 sm:grid-cols-2">
						<Field>
							<FieldLabel for="product-eol-type">{t('product.eolType')}</FieldLabel>
							<SearchSelect
								id="product-eol-type"
								bind:value={eolType}
								options={eolOptions}
								allowClear
							/>
						</Field>
						{#if eolDateVisible}
							<Field>
								<FieldLabel for="product-eol-date">{t('product.eolDate')} *</FieldLabel>
								<Input
									id="product-eol-date"
									type="date"
									required
									value={eolDate}
									oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
										(eolDate = event.currentTarget.value)}
								/>
							</Field>
						{/if}
						<Field>
							<FieldLabel for="product-depreciation">{t('product.depreciationModel')}</FieldLabel>
							<SearchSelect
								id="product-depreciation"
								bind:value={depreciationId}
								options={depreciationOptions}
								allowClear
							/>
						</Field>
						<Field>
							<label class="flex items-center gap-2 text-sm">
								<Checkbox
									checked={isArchived}
									onCheckedChange={(checked) => (isArchived = checked === true)}
								/>
								{t('product.isArchived')}
							</label>
						</Field>
					</FieldGroup>
				</section>

				<section class="flex flex-col gap-3">
					<h3 class="text-sm font-medium">{t('product.section.purchasing')}</h3>
					<FieldGroup class="grid gap-4 sm:grid-cols-2">
						<Field>
							<FieldLabel for="product-supplier">{t('product.defaultSupplier')}</FieldLabel>
							<SearchSelect
								id="product-supplier"
								bind:value={supplierId}
								options={supplierOptions}
								allowClear
							/>
						</Field>
						<Field>
							<FieldLabel for="product-cost">{t('product.purchaseCost')}</FieldLabel>
							<div class="flex gap-2">
								<Input
									id="product-cost"
									type="number"
									step="0.01"
									value={purchaseCost}
									oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
										(purchaseCost = event.currentTarget.value)}
								/>
								<Input
									class="w-24"
									aria-label={t('product.currency')}
									maxlength={3}
									value={currency}
									oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
										(currency = event.currentTarget.value.toUpperCase())}
								/>
							</div>
						</Field>
						<Field>
							<FieldLabel for="product-min-quantity">{t('product.minQuantity')}</FieldLabel>
							<Input
								id="product-min-quantity"
								type="number"
								min="0"
								value={minQuantity}
								oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
									(minQuantity = event.currentTarget.value)}
							/>
						</Field>
					</FieldGroup>
				</section>

				<section class="flex flex-col gap-3">
					<h3 class="text-sm font-medium">{t('product.section.technical')}</h3>
					<FieldGroup class="grid gap-4 sm:grid-cols-2">
						<Field>
							<FieldLabel for="product-chip">{t('product.chip')}</FieldLabel>
							<Input
								id="product-chip"
								value={chip}
								oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
									(chip = event.currentTarget.value)}
							/>
						</Field>
						<Field>
							<FieldLabel for="product-os">{t('product.operatingSystem')}</FieldLabel>
							<Input
								id="product-os"
								value={operatingSystem}
								oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
									(operatingSystem = event.currentTarget.value)}
							/>
						</Field>
					</FieldGroup>
				</section>

				<JsonObjectEditor bind:value={customFields} label={t('product.customFields')} />
				<JsonObjectEditor bind:value={specs} label={t('product.specs')} />

				<Field>
					<FieldLabel for="product-notes">{t('lookup.notes')}</FieldLabel>
					<textarea
						id="product-notes"
						class="min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
						value={notes}
						oninput={(event: Event & { currentTarget: HTMLTextAreaElement }) =>
							(notes = event.currentTarget.value)}></textarea>
				</Field>
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
