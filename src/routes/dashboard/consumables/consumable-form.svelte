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
	import { ApiError } from '#lib/api/client.js';
	import { createConsumable, updateConsumable, type Consumable } from '#lib/api/consumables.js';
	import type { Lookup } from '#lib/api/lookups.js';
	import { resolveI18n, t } from '#lib/i18n/index.js';
	import type { Translations } from '#lib/i18n/index.js';

	let {
		consumable = null,
		categories,
		manufacturers,
		suppliers,
		locations,
		onclose,
		onsaved
	}: {
		consumable?: Consumable | null;
		categories: Lookup[];
		manufacturers: Lookup[];
		suppliers: Lookup[];
		locations: Lookup[];
		onclose: () => void;
		onsaved: () => void;
	} = $props();

	const initial = untrack(() => consumable);

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
	let openingQuantity = $state(String(initial?.quantity_on_hand ?? 0));
	let minStockAlert = $state(String(initial?.min_stock_alert ?? 0));
	let purchaseCost = $state(initial?.purchase_cost == null ? '' : String(initial.purchase_cost));
	let currency = $state(initial?.currency ?? 'USD');
	let orderNumber = $state(initial?.order_number ?? '');
	let notes = $state(initial?.notes ?? '');
	let imageUrl = $state(initial?.image_url ?? '');
	let isArchived = $state(initial?.is_archived ?? false);
	let saving = $state(false);
	let error = $state<string | null>(null);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
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
				min_stock_alert: Number(minStockAlert) || 0,
				purchase_cost: purchaseCost === '' ? null : purchaseCost,
				currency: currency || 'USD',
				order_number: orderNumber || null,
				notes: notes || null,
				image_url: imageUrl || null,
				is_archived: isArchived
			};
			if (consumable) {
				await updateConsumable(consumable.id, payload);
				toast.success(t('consumable.updated'));
			} else {
				await createConsumable({ ...payload, quantity_on_hand: Number(openingQuantity) || 0 });
				toast.success(t('consumable.created'));
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
			<Sheet.Title>
				{consumable ? t('consumable.editTitle') : t('consumable.createTitle')}
			</Sheet.Title>
			<Sheet.Description>{t('consumable.formDescription')}</Sheet.Description>
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
					<h3 class="text-sm font-medium">{t('consumable.section.identity')}</h3>
					<FieldGroup class="grid gap-4 sm:grid-cols-2">
						<Field>
							<FieldLabel for="consumable-category">{t('consumable.category')} *</FieldLabel>
							<select
								id="consumable-category"
								class="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
								required
								value={categoryId}
								onchange={(event: Event & { currentTarget: HTMLSelectElement }) =>
									(categoryId = event.currentTarget.value)}
							>
								<option value="">—</option>
								{#each categories as item (item.id)}
									<option value={item.id}>
										{resolveI18n(item.translations, undefined, item.code ?? '')}
									</option>
								{/each}
							</select>
						</Field>
						<Field>
							<FieldLabel for="consumable-manufacturer">{t('consumable.manufacturer')}</FieldLabel>
							<select
								id="consumable-manufacturer"
								class="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
								value={manufacturerId}
								onchange={(event: Event & { currentTarget: HTMLSelectElement }) =>
									(manufacturerId = event.currentTarget.value)}
							>
								<option value="">—</option>
								{#each manufacturers as item (item.id)}
									<option value={item.id}>{resolveI18n(item.translations)}</option>
								{/each}
							</select>
						</Field>
						<Field>
							<FieldLabel for="consumable-model">{t('consumable.modelNumber')}</FieldLabel>
							<Input
								id="consumable-model"
								value={modelNumber}
								oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
									(modelNumber = event.currentTarget.value)}
							/>
						</Field>
						<Field>
							<FieldLabel for="consumable-location">{t('consumable.location')}</FieldLabel>
							<select
								id="consumable-location"
								class="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
								value={locationId}
								onchange={(event: Event & { currentTarget: HTMLSelectElement }) =>
									(locationId = event.currentTarget.value)}
							>
								<option value="">—</option>
								{#each locations as item (item.id)}
									<option value={item.id}>{resolveI18n(item.translations)}</option>
								{/each}
							</select>
						</Field>
					</FieldGroup>
				</section>

				<section class="flex flex-col gap-3">
					<h3 class="text-sm font-medium">{t('consumable.section.stock')}</h3>
					<FieldGroup class="grid gap-4 sm:grid-cols-2">
						{#if consumable}
							<Field>
								<FieldLabel>{t('consumable.quantityOnHand')}</FieldLabel>
								<p class="text-sm font-medium">{consumable.quantity_on_hand}</p>
								<FieldDescription>{t('consumable.stockEditHint')}</FieldDescription>
							</Field>
						{:else}
							<Field>
								<FieldLabel for="consumable-opening">
									{t('consumable.openingStock')}
								</FieldLabel>
								<Input
									id="consumable-opening"
									type="number"
									min="0"
									value={openingQuantity}
									oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
										(openingQuantity = event.currentTarget.value)}
								/>
								<FieldDescription>{t('consumable.openingStockHint')}</FieldDescription>
							</Field>
						{/if}
						<Field>
							<FieldLabel for="consumable-min">{t('consumable.minStockAlert')}</FieldLabel>
							<Input
								id="consumable-min"
								type="number"
								min="0"
								value={minStockAlert}
								oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
									(minStockAlert = event.currentTarget.value)}
							/>
						</Field>
					</FieldGroup>
				</section>

				<section class="flex flex-col gap-3">
					<h3 class="text-sm font-medium">{t('consumable.section.purchasing')}</h3>
					<FieldGroup class="grid gap-4 sm:grid-cols-2">
						<Field>
							<FieldLabel for="consumable-supplier">{t('consumable.supplier')}</FieldLabel>
							<select
								id="consumable-supplier"
								class="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
								value={supplierId}
								onchange={(event: Event & { currentTarget: HTMLSelectElement }) =>
									(supplierId = event.currentTarget.value)}
							>
								<option value="">—</option>
								{#each suppliers as item (item.id)}
									<option value={item.id}>{resolveI18n(item.translations)}</option>
								{/each}
							</select>
						</Field>
						<Field>
							<FieldLabel for="consumable-cost">{t('consumable.purchaseCost')}</FieldLabel>
							<div class="flex gap-2">
								<Input
									id="consumable-cost"
									type="number"
									step="0.01"
									value={purchaseCost}
									oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
										(purchaseCost = event.currentTarget.value)}
								/>
								<Input
									class="w-24"
									aria-label={t('consumable.currency')}
									maxlength={3}
									value={currency}
									oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
										(currency = event.currentTarget.value.toUpperCase())}
								/>
							</div>
						</Field>
						<Field>
							<FieldLabel for="consumable-order">{t('consumable.orderNumber')}</FieldLabel>
							<Input
								id="consumable-order"
								value={orderNumber}
								oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
									(orderNumber = event.currentTarget.value)}
							/>
						</Field>
					</FieldGroup>
				</section>

				<section class="flex flex-col gap-3">
					<h3 class="text-sm font-medium">{t('consumable.section.extras')}</h3>
					<Field>
						<FieldLabel for="consumable-image">{t('consumable.imageUrl')}</FieldLabel>
						<Input
							id="consumable-image"
							type="url"
							value={imageUrl}
							oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
								(imageUrl = event.currentTarget.value)}
						/>
					</Field>
					<Field>
						<FieldLabel for="consumable-notes">{t('lookup.notes')}</FieldLabel>
						<textarea
							id="consumable-notes"
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
						{t('consumable.isArchived')}
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
