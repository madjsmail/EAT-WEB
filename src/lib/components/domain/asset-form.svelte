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
	import { ApiError } from '#lib/api/client.js';
	import { createAsset, updateAsset, type Asset } from '#lib/api/assets.js';
	import type { Lookup } from '#lib/api/lookups.js';
	import type { Product } from '#lib/api/products.js';
	import { t } from '#lib/i18n/index.js';
	import SearchSelect from '#lib/components/domain/search-select.svelte';
	import { lookupOptions, productOptions } from '#lib/config/select-options.js';

	let {
		asset = null,
		products,
		departments,
		statuses,
		locations,
		suppliers,
		onclose,
		onsaved
	}: {
		asset?: Asset | null;
		products: Product[];
		departments: Lookup[];
		statuses: Lookup[];
		locations: Lookup[];
		suppliers: Lookup[];
		onclose: () => void;
		onsaved: () => void;
	} = $props();

	const initial = untrack(() => asset);

	let name = $state(initial?.name ?? '');
	let productId = $state(initial?.product_id ?? '');
	let departmentId = $state(initial?.department_id ?? '');
	let assetTag = $state(initial?.asset_tag ?? '');
	let statusId = $state(initial?.status_id ?? '');
	let locationId = $state(initial?.location_id ?? '');
	let supplierId = $state(initial?.supplier_id ?? '');
	let serialNumber = $state(initial?.serial_number ?? '');
	let imei1 = $state(initial?.imei_1 ?? '');
	let imei2 = $state(initial?.imei_2 ?? '');
	let mdmEnrolled = $state(initial?.mdm_enrolled ?? false);
	let purchaseDate = $state(initial?.purchase_date?.slice(0, 10) ?? '');
	let warrantyDate = $state(initial?.warranty_date?.slice(0, 10) ?? '');
	let purchaseCost = $state(initial?.purchase_cost == null ? '' : String(initial.purchase_cost));
	let currency = $state(initial?.currency ?? 'USD');
	let orderNumber = $state(initial?.order_number ?? '');
	let scheduleAudit = $state(initial?.schedule_audit?.slice(0, 10) ?? '');
	let notes = $state(initial?.notes ?? '');
	let imageUrl = $state(initial?.image_url ?? '');
	let saving = $state(false);
	let error = $state<string | null>(null);

	const productChoices = $derived(productOptions(products));
	const departmentChoices = $derived(lookupOptions(departments));
	const statusChoices = $derived(lookupOptions(statuses));
	const locationChoices = $derived(lookupOptions(locations));
	const supplierChoices = $derived(lookupOptions(suppliers));

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!productId || !departmentId) {
			error = t('dynamicSelect.required');
			return;
		}
		saving = true;
		error = null;
		try {
			const payload = {
				name,
				product_id: productId,
				department_id: departmentId,
				asset_tag: assetTag || null,
				status_id: statusId || null,
				location_id: locationId || null,
				supplier_id: supplierId || null,
				serial_number: serialNumber || null,
				imei_1: imei1 || null,
				imei_2: imei2 || null,
				mdm_enrolled: mdmEnrolled,
				purchase_date: purchaseDate || null,
				warranty_date: warrantyDate || null,
				purchase_cost: purchaseCost === '' ? null : purchaseCost,
				currency: currency || 'USD',
				order_number: orderNumber || null,
				schedule_audit: scheduleAudit || null,
				notes: notes || null,
				image_url: imageUrl || null
			};
			if (asset) {
				await updateAsset(asset.id, payload);
				toast.success(t('asset.updated'));
			} else {
				await createAsset(payload);
				toast.success(t('asset.created'));
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
			<Sheet.Title>{asset ? t('asset.editTitle') : t('asset.createTitle')}</Sheet.Title>
			<Sheet.Description>{t('asset.formDescription')}</Sheet.Description>
		</Sheet.Header>
		<form class="flex min-h-0 flex-1 flex-col" onsubmit={submit}>
			<div class="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pb-4">
				{#if error}
					<p
						class="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
					>
						{error}
					</p>
				{/if}

				<FieldGroup class="grid gap-4 sm:grid-cols-2">
					<Field class="sm:col-span-2">
						<FieldLabel for="asset-name">{t('asset.name')} *</FieldLabel>
						<Input
							id="asset-name"
							required
							value={name}
							oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
								(name = event.currentTarget.value)}
						/>
					</Field>
					<Field>
						<FieldLabel for="asset-product">{t('asset.product')} *</FieldLabel>
						<SearchSelect
							id="asset-product"
							bind:value={productId}
							options={productChoices}
							required
						/>
					</Field>
					<Field>
						<FieldLabel for="asset-department">{t('asset.department')} *</FieldLabel>
						<SearchSelect
							id="asset-department"
							bind:value={departmentId}
							options={departmentChoices}
							required
						/>
					</Field>
					<Field>
						<FieldLabel for="asset-tag">{t('asset.tag')}</FieldLabel>
						<Input
							id="asset-tag"
							value={assetTag}
							oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
								(assetTag = event.currentTarget.value)}
						/>
						<FieldDescription>{t('asset.tagHint')}</FieldDescription>
					</Field>
					<Field>
						<FieldLabel for="asset-status">{t('asset.status')}</FieldLabel>
						<SearchSelect
							id="asset-status"
							bind:value={statusId}
							options={statusChoices}
							allowClear
							allLabel={t('asset.defaultStatus')}
						/>
					</Field>
					<Field>
						<FieldLabel for="asset-location">{t('asset.location')}</FieldLabel>
						<SearchSelect
							id="asset-location"
							bind:value={locationId}
							options={locationChoices}
							allowClear
							allLabel="—"
						/>
					</Field>
					<Field>
						<FieldLabel for="asset-supplier">{t('asset.supplier')}</FieldLabel>
						<SearchSelect
							id="asset-supplier"
							bind:value={supplierId}
							options={supplierChoices}
							allowClear
							allLabel="—"
						/>
					</Field>
					<Field>
						<FieldLabel for="asset-serial">{t('asset.serial')}</FieldLabel>
						<Input
							id="asset-serial"
							value={serialNumber}
							oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
								(serialNumber = event.currentTarget.value)}
						/>
					</Field>
					<Field>
						<FieldLabel for="asset-order">{t('asset.orderNumber')}</FieldLabel>
						<Input
							id="asset-order"
							value={orderNumber}
							oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
								(orderNumber = event.currentTarget.value)}
						/>
					</Field>
					<Field>
						<FieldLabel for="asset-purchase-date">{t('asset.purchaseDate')}</FieldLabel>
						<Input
							id="asset-purchase-date"
							type="date"
							value={purchaseDate}
							oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
								(purchaseDate = event.currentTarget.value)}
						/>
					</Field>
					<Field>
						<FieldLabel for="asset-warranty">{t('asset.warrantyDate')}</FieldLabel>
						<Input
							id="asset-warranty"
							type="date"
							value={warrantyDate}
							oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
								(warrantyDate = event.currentTarget.value)}
						/>
					</Field>
					<Field>
						<FieldLabel for="asset-cost">{t('asset.price')}</FieldLabel>
						<div class="flex gap-2">
							<Input
								id="asset-cost"
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
						<FieldLabel for="asset-audit">{t('asset.scheduleAudit')}</FieldLabel>
						<Input
							id="asset-audit"
							type="date"
							value={scheduleAudit}
							oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
								(scheduleAudit = event.currentTarget.value)}
						/>
					</Field>
				</FieldGroup>

				<section class="flex flex-col gap-3">
					<h3 class="text-sm font-medium">{t('asset.section.hardware')}</h3>
					<FieldGroup class="grid gap-4 sm:grid-cols-2">
						<Field>
							<FieldLabel for="asset-imei1">{t('asset.imei1')}</FieldLabel>
							<Input
								id="asset-imei1"
								value={imei1}
								oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
									(imei1 = event.currentTarget.value)}
							/>
						</Field>
						<Field>
							<FieldLabel for="asset-imei2">{t('asset.imei2')}</FieldLabel>
							<Input
								id="asset-imei2"
								value={imei2}
								oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
									(imei2 = event.currentTarget.value)}
							/>
						</Field>
						<Field class="sm:col-span-2">
							<label class="flex items-center gap-2 text-sm">
								<Checkbox
									checked={mdmEnrolled}
									onCheckedChange={(checked) => (mdmEnrolled = checked === true)}
								/>
								{t('asset.mdmEnrolled')}
							</label>
						</Field>
					</FieldGroup>
				</section>

				<Field>
					<FieldLabel for="asset-image">{t('asset.imageUrl')}</FieldLabel>
					<Input
						id="asset-image"
						type="url"
						value={imageUrl}
						oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
							(imageUrl = event.currentTarget.value)}
					/>
				</Field>

				<Field>
					<FieldLabel for="asset-notes">{t('lookup.notes')}</FieldLabel>
					<textarea
						id="asset-notes"
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
