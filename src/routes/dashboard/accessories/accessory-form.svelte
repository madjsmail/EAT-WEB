<script lang="ts">
	import { untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import * as Sheet from '#lib/components/ui/sheet/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Checkbox } from '#lib/components/ui/checkbox/index.js';
	import {
		Field,
		FieldDescription,
		FieldGroup,
		FieldLabel
	} from '#lib/components/ui/field/index.js';
	import TranslationInputs from '#lib/components/domain/translation-inputs.svelte';
	import SearchSelect from '#lib/components/domain/search-select.svelte';
	import { ApiError } from '#lib/api/client.js';
	import { createAccessory, updateAccessory, type Accessory } from '#lib/api/accessories.js';
	import type { Lookup } from '#lib/api/lookups.js';
	import { lookupOptions } from '#lib/config/select-options.js';
	import { t } from '#lib/i18n/index.js';
	import type { Translations } from '#lib/i18n/index.js';

	let {
		accessory = null,
		categories,
		manufacturers,
		suppliers,
		locations,
		onclose,
		onsaved
	}: {
		accessory?: Accessory | null;
		categories: Lookup[];
		manufacturers: Lookup[];
		suppliers: Lookup[];
		locations: Lookup[];
		onclose: () => void;
		onsaved: () => void;
	} = $props();

	const initial = untrack(() => accessory);

	let translations = $state<Translations>({
		en: initial?.translations?.en ?? '',
		fr: initial?.translations?.fr ?? '',
		ar: initial?.translations?.ar ?? ''
	});
	let categoryId = $state(initial?.category_id ?? '');
	let manufacturerId = $state(initial?.manufacturer_id ?? '');
	let supplierId = $state(initial?.supplier_id ?? '');
	let locationId = $state(initial?.location_id ?? '');
	let modelNumber = $state(initial?.model_number ?? '');
	let totalQuantity = $state(String(initial?.total_quantity ?? 0));
	let minQuantity = $state(String(initial?.min_quantity ?? 0));
	let purchaseCost = $state(initial?.purchase_cost == null ? '' : String(initial.purchase_cost));
	let currency = $state(initial?.currency ?? 'USD');
	let purchaseDate = $state(initial?.purchase_date?.slice(0, 10) ?? '');
	let orderNumber = $state(initial?.order_number ?? '');
	let notes = $state(initial?.notes ?? '');
	let imageUrl = $state(initial?.image_url ?? '');
	let isArchived = $state(initial?.is_archived ?? false);
	let saving = $state(false);
	let error = $state<string | null>(null);

	const categoryChoices = $derived(lookupOptions(categories, true));
	const manufacturerChoices = $derived(lookupOptions(manufacturers));
	const locationChoices = $derived(lookupOptions(locations));
	const supplierChoices = $derived(lookupOptions(suppliers));

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
				supplier_id: supplierId || null,
				location_id: locationId || null,
				model_number: modelNumber || null,
				total_quantity: Number(totalQuantity) || 0,
				min_quantity: Number(minQuantity) || 0,
				purchase_cost: purchaseCost === '' ? null : purchaseCost,
				currency: currency || 'USD',
				purchase_date: purchaseDate || null,
				order_number: orderNumber || null,
				notes: notes || null,
				image_url: imageUrl || null,
				is_archived: isArchived
			};
			if (accessory) {
				await updateAccessory(accessory.id, payload);
				toast.success(t('accessory.updated'));
			} else {
				await createAccessory(payload);
				toast.success(t('accessory.created'));
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
			<Sheet.Title>{accessory ? t('accessory.editTitle') : t('accessory.createTitle')}</Sheet.Title>
			<Sheet.Description>{t('accessory.formDescription')}</Sheet.Description>
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
					<h3 class="text-sm font-medium">{t('accessory.section.stock')}</h3>
					<FieldGroup class="grid gap-4 sm:grid-cols-2">
						<Field>
							<FieldLabel for="accessory-category">{t('accessory.category')} *</FieldLabel>
							<SearchSelect
								id="accessory-category"
								bind:value={categoryId}
								options={categoryChoices}
								required
							/>
						</Field>
						<Field>
							<FieldLabel for="accessory-manufacturer">{t('accessory.manufacturer')}</FieldLabel>
							<SearchSelect
								id="accessory-manufacturer"
								bind:value={manufacturerId}
								options={manufacturerChoices}
								allowClear
								allLabel="—"
							/>
						</Field>
						<Field>
							<FieldLabel for="accessory-model">{t('accessory.modelNumber')}</FieldLabel>
							<Input
								id="accessory-model"
								value={modelNumber}
								oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
									(modelNumber = event.currentTarget.value)}
							/>
						</Field>
						<Field>
							<FieldLabel for="accessory-location">{t('accessory.location')}</FieldLabel>
							<SearchSelect
								id="accessory-location"
								bind:value={locationId}
								options={locationChoices}
								allowClear
								allLabel="—"
							/>
						</Field>
						<Field>
							<FieldLabel for="accessory-total">{t('accessory.totalQuantity')} *</FieldLabel>
							<Input
								id="accessory-total"
								type="number"
								min="0"
								required
								value={totalQuantity}
								oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
									(totalQuantity = event.currentTarget.value)}
							/>
							{#if accessory}
								<FieldDescription>{t('accessory.totalHint')}</FieldDescription>
							{/if}
						</Field>
						<Field>
							<FieldLabel for="accessory-min">{t('accessory.minQuantity')}</FieldLabel>
							<Input
								id="accessory-min"
								type="number"
								min="0"
								value={minQuantity}
								oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
									(minQuantity = event.currentTarget.value)}
							/>
						</Field>
						{#if accessory}
							<Field class="sm:col-span-2">
								<FieldLabel>{t('accessory.availableQuantity')}</FieldLabel>
								<p class="text-sm">
									{accessory.available_quantity} / {accessory.total_quantity}
								</p>
								<FieldDescription>{t('accessory.availableHint')}</FieldDescription>
							</Field>
						{/if}
					</FieldGroup>
				</section>

				<section class="flex flex-col gap-3">
					<h3 class="text-sm font-medium">{t('accessory.section.purchasing')}</h3>
					<FieldGroup class="grid gap-4 sm:grid-cols-2">
						<Field>
							<FieldLabel for="accessory-supplier">{t('accessory.supplier')}</FieldLabel>
							<SearchSelect
								id="accessory-supplier"
								bind:value={supplierId}
								options={supplierChoices}
								allowClear
								allLabel="—"
							/>
						</Field>
						<Field>
							<FieldLabel for="accessory-cost">{t('accessory.purchaseCost')}</FieldLabel>
							<div class="flex gap-2">
								<Input
									id="accessory-cost"
									type="number"
									step="0.01"
									value={purchaseCost}
									oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
										(purchaseCost = event.currentTarget.value)}
								/>
								<Input
									class="w-24"
									aria-label={t('accessory.currency')}
									maxlength={3}
									value={currency}
									oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
										(currency = event.currentTarget.value.toUpperCase())}
								/>
							</div>
						</Field>
						<Field>
							<FieldLabel for="accessory-purchase-date">{t('accessory.purchaseDate')}</FieldLabel>
							<Input
								id="accessory-purchase-date"
								type="date"
								value={purchaseDate}
								oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
									(purchaseDate = event.currentTarget.value)}
							/>
						</Field>
						<Field>
							<FieldLabel for="accessory-order">{t('accessory.orderNumber')}</FieldLabel>
							<Input
								id="accessory-order"
								value={orderNumber}
								oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
									(orderNumber = event.currentTarget.value)}
							/>
						</Field>
					</FieldGroup>
				</section>

				<section class="flex flex-col gap-3">
					<h3 class="text-sm font-medium">{t('accessory.section.extras')}</h3>
					<Field>
						<FieldLabel for="accessory-image">{t('accessory.imageUrl')}</FieldLabel>
						<Input
							id="accessory-image"
							type="url"
							value={imageUrl}
							oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
								(imageUrl = event.currentTarget.value)}
						/>
					</Field>
					<Field>
						<FieldLabel for="accessory-notes">{t('lookup.notes')}</FieldLabel>
						<textarea
							id="accessory-notes"
							class="min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
							value={notes}
							oninput={(event: Event & { currentTarget: HTMLTextAreaElement }) =>
								(notes = event.currentTarget.value)}></textarea>
					</Field>
					<label class="flex items-center gap-2 text-sm">
						<Checkbox
							checked={isArchived}
							onCheckedChange={(checked) => (isArchived = checked === true)}
						/>
						{t('accessory.isArchived')}
					</label>
				</section>
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
