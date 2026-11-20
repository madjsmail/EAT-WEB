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
	import {
		createLicense,
		updateLicense,
		type License,
		type LicenseType
	} from '#lib/api/licenses.js';
	import type { Lookup } from '#lib/api/lookups.js';
	import { lookupOptions } from '#lib/config/select-options.js';
	import { t } from '#lib/i18n/index.js';
	import type { Translations } from '#lib/i18n/index.js';

	let {
		license = null,
		manufacturers,
		suppliers,
		onclose,
		onsaved
	}: {
		license?: License | null;
		manufacturers: Lookup[];
		suppliers: Lookup[];
		onclose: () => void;
		onsaved: () => void;
	} = $props();

	const initial = untrack(() => license);
	const licenseTypes: LicenseType[] = ['named', 'concurrent', 'subscription', 'perpetual'];

	let translations = $state<Translations>({
		en: initial?.translations?.en ?? '',
		fr: initial?.translations?.fr ?? '',
		ar: initial?.translations?.ar ?? ''
	});
	let manufacturerId = $state(initial?.manufacturer_id ?? '');
	let supplierId = $state(initial?.supplier_id ?? '');
	let licenseType = $state<LicenseType>(initial?.license_type ?? 'named');
	let totalSeats = $state(String(initial?.total_seats ?? 1));
	let purchaseDate = $state(initial?.purchase_date?.slice(0, 10) ?? '');
	let expirationDate = $state(initial?.expiration_date?.slice(0, 10) ?? '');
	let purchaseCost = $state(initial?.purchase_cost == null ? '' : String(initial.purchase_cost));
	let currency = $state(initial?.currency ?? 'USD');
	let orderNumber = $state(initial?.order_number ?? '');
	let productKey = $state(initial?.product_key ?? '');
	let notes = $state(initial?.notes ?? '');
	let isArchived = $state(initial?.is_archived ?? false);
	let saving = $state(false);
	let error = $state<string | null>(null);

	const manufacturerChoices = $derived(lookupOptions(manufacturers));
	const supplierChoices = $derived(lookupOptions(suppliers));

	const minSeats = $derived(initial?.active_seats ?? 0);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		saving = true;
		error = null;
		try {
			const payload = {
				translations: { ...translations },
				manufacturer_id: manufacturerId || null,
				supplier_id: supplierId || null,
				license_type: licenseType,
				total_seats: Number(totalSeats) || 0,
				purchase_date: purchaseDate || null,
				expiration_date: expirationDate || null,
				purchase_cost: purchaseCost === '' ? null : purchaseCost,
				currency: currency || 'USD',
				order_number: orderNumber || null,
				product_key: productKey || null,
				notes: notes || null,
				is_archived: isArchived
			};
			if (license) {
				await updateLicense(license.id, payload);
				toast.success(t('license.updated'));
			} else {
				await createLicense(payload);
				toast.success(t('license.created'));
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
			<Sheet.Title>{license ? t('license.editTitle') : t('license.createTitle')}</Sheet.Title>
			<Sheet.Description>{t('license.formDescription')}</Sheet.Description>
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
					<h3 class="text-sm font-medium">{t('license.section.identity')}</h3>
					<FieldGroup class="grid gap-4 sm:grid-cols-2">
						<Field>
							<FieldLabel for="license-manufacturer">{t('license.manufacturer')}</FieldLabel>
							<SearchSelect
								id="license-manufacturer"
								bind:value={manufacturerId}
								options={manufacturerChoices}
								allowClear
								allLabel="—"
							/>
						</Field>
						<Field>
							<FieldLabel for="license-supplier">{t('license.supplier')}</FieldLabel>
							<SearchSelect
								id="license-supplier"
								bind:value={supplierId}
								options={supplierChoices}
								allowClear
								allLabel="—"
							/>
						</Field>
						<Field>
							<FieldLabel for="license-type">{t('license.type')} *</FieldLabel>
							<select
								id="license-type"
								class="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
								required
								value={licenseType}
								onchange={(event: Event & { currentTarget: HTMLSelectElement }) =>
									(licenseType = event.currentTarget.value as LicenseType)}
							>
								{#each licenseTypes as type (type)}
									<option value={type}>{t(`license.type.${type}`)}</option>
								{/each}
							</select>
						</Field>
						<Field>
							<FieldLabel for="license-seats">{t('license.totalSeats')} *</FieldLabel>
							<Input
								id="license-seats"
								type="number"
								min={minSeats}
								required
								value={totalSeats}
								oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
									(totalSeats = event.currentTarget.value)}
							/>
							{#if license}
								<FieldDescription>
									{t('license.seatsHint', { count: license.active_seats })}
								</FieldDescription>
							{/if}
						</Field>
						<Field class="sm:col-span-2">
							<FieldLabel for="license-key">{t('license.productKey')}</FieldLabel>
							<Input
								id="license-key"
								class="font-mono"
								value={productKey}
								oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
									(productKey = event.currentTarget.value)}
							/>
						</Field>
					</FieldGroup>
				</section>

				<section class="flex flex-col gap-3">
					<h3 class="text-sm font-medium">{t('license.section.purchasing')}</h3>
					<FieldGroup class="grid gap-4 sm:grid-cols-2">
						<Field>
							<FieldLabel for="license-purchase-date">{t('license.purchaseDate')}</FieldLabel>
							<Input
								id="license-purchase-date"
								type="date"
								value={purchaseDate}
								oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
									(purchaseDate = event.currentTarget.value)}
							/>
						</Field>
						<Field>
							<FieldLabel for="license-expiration">{t('license.expirationDate')}</FieldLabel>
							<Input
								id="license-expiration"
								type="date"
								value={expirationDate}
								oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
									(expirationDate = event.currentTarget.value)}
							/>
						</Field>
						<Field>
							<FieldLabel for="license-cost">{t('license.purchaseCost')}</FieldLabel>
							<div class="flex gap-2">
								<Input
									id="license-cost"
									type="number"
									step="0.01"
									value={purchaseCost}
									oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
										(purchaseCost = event.currentTarget.value)}
								/>
								<Input
									class="w-24"
									aria-label={t('license.currency')}
									maxlength={3}
									value={currency}
									oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
										(currency = event.currentTarget.value.toUpperCase())}
								/>
							</div>
						</Field>
						<Field>
							<FieldLabel for="license-order">{t('license.orderNumber')}</FieldLabel>
							<Input
								id="license-order"
								value={orderNumber}
								oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
									(orderNumber = event.currentTarget.value)}
							/>
						</Field>
					</FieldGroup>
				</section>

				<Field>
					<FieldLabel for="license-notes">{t('lookup.notes')}</FieldLabel>
					<textarea
						id="license-notes"
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
					{t('license.isArchived')}
				</label>
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
