<script lang="ts">
	import { untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import * as Sheet from '#lib/components/ui/sheet/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Field, FieldDescription, FieldGroup, FieldLabel } from '#lib/components/ui/field/index.js';
	import { ApiError } from '#lib/api/client.js';
	import {
		createMaintenance,
		updateMaintenance,
		type Maintenance
	} from '#lib/api/maintenances.js';
	import type { Lookup } from '#lib/api/lookups.js';
	import { resolveI18n, t } from '#lib/i18n/index.js';
	import AssetSelect from '#lib/components/domain/asset-select.svelte';
	import UserSelect from '#lib/components/domain/user-select.svelte';

	let {
		maintenance = null,
		suppliers,
		onclose,
		onsaved
	}: {
		maintenance?: Maintenance | null;
		suppliers: Lookup[];
		onclose: () => void;
		onsaved: () => void;
	} = $props();

	const initial = untrack(() => maintenance);

	let assetId = $state(initial?.asset_id ?? '');
	let title = $state(initial?.title ?? '');
	let description = $state(initial?.description ?? '');
	let maintenanceType = $state(initial?.maintenance_type ?? 'repair');
	let priority = $state(initial?.priority ?? 'medium');
	let supplierId = $state(initial?.supplier_id ?? '');
	let rmaReference = $state(initial?.rma_reference ?? '');
	let assignedUserId = $state(initial?.assigned_user_id ?? '');
	let scheduledAt = $state(initial?.scheduled_at?.slice(0, 16) ?? '');
	let cost = $state(initial?.cost == null ? '' : String(initial.cost));
	let currency = $state(initial?.currency ?? 'USD');
	let saving = $state(false);
	let error = $state<string | null>(null);
	let fieldErrors = $state<Record<string, string>>({});

	const maintenanceTypes = ['repair', 'preventive', 'inspection', 'other'];
	const priorities = ['low', 'medium', 'high', 'critical'];
	const currencies = ['USD', 'EUR', 'GBP', 'MAD', 'AED', 'SAR'];

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		saving = true;
		error = null;
		fieldErrors = {};

		const payload = {
			title,
			description: description || null,
			maintenance_type: maintenanceType,
			priority,
			supplier_id: supplierId || null,
			rma_reference: rmaReference || null,
			assigned_user_id: assignedUserId || null,
			scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
			cost: cost || null,
			currency
		};

		try {
			if (initial) {
				await updateMaintenance(initial.id, payload);
				toast.success(t('maintenance.saved'));
			} else {
				await createMaintenance({ ...payload, asset_id: assetId });
				toast.success(t('maintenance.createdToast'));
			}
			onsaved();
			onclose();
		} catch (cause) {
			if (cause instanceof ApiError && cause.status > 0) {
				error = cause.message;
				fieldErrors = Object.fromEntries(
					cause.errors.flatMap((item) =>
						item.field ? [[item.field, item.message] as const] : []
					)
				);
				if (cause.status === 409) error = t('maintenance.closedConflict');
			} else {
				error = t('auth.genericError');
			}
		} finally {
			saving = false;
		}
	}
</script>

<Sheet.Root open onOpenChange={(open) => !open && onclose()}>
	<Sheet.Content side="right" class="w-full sm:max-w-2xl">
		<Sheet.Header>
			<Sheet.Title>
				{initial ? t('maintenance.editTitle') : t('maintenance.createTitle')}
			</Sheet.Title>
			<Sheet.Description>{t('maintenance.formDescription')}</Sheet.Description>
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
						<FieldLabel for="maintenance-asset">{t('asset.title')} *</FieldLabel>
						<AssetSelect
							label={t('asset.title')}
							value={assetId}
							disabled={initial !== null}
							onchange={(id) => (assetId = id)}
						/>
						{#if fieldErrors.asset_id}
							<p class="text-xs text-destructive">{fieldErrors.asset_id}</p>
						{/if}
					</Field>

					<Field class="sm:col-span-2">
						<FieldLabel for="maintenance-title">{t('maintenance.titleLabel')} *</FieldLabel>
						<Input
							id="maintenance-title"
							required
							bind:value={title}
						/>
						{#if fieldErrors.title}
							<p class="text-xs text-destructive">{fieldErrors.title}</p>
						{/if}
					</Field>

					<Field>
						<FieldLabel for="maintenance-type">{t('maintenance.type')} *</FieldLabel>
						<select
							id="maintenance-type"
							class="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
							bind:value={maintenanceType}
						>
							{#each maintenanceTypes as type (type)}
								<option value={type}>{t(`maintenance.type.${type}`)}</option>
							{/each}
						</select>
					</Field>

					<Field>
						<FieldLabel for="maintenance-priority">{t('maintenance.priority')} *</FieldLabel>
						<select
							id="maintenance-priority"
							class="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
							bind:value={priority}
						>
							{#each priorities as level (level)}
								<option value={level}>{t(`maintenance.priority.${level}`)}</option>
							{/each}
						</select>
					</Field>

					<Field>
						<FieldLabel for="maintenance-supplier">{t('lookup.suppliers')}</FieldLabel>
						<select
							id="maintenance-supplier"
							class="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
							bind:value={supplierId}
						>
							<option value="">—</option>
							{#each suppliers as supplier (supplier.id)}
								<option value={supplier.id}>{resolveI18n(supplier.translations)}</option>
							{/each}
						</select>
					</Field>

					<Field>
						<FieldLabel for="maintenance-rma">{t('maintenance.rmaReference')}</FieldLabel>
						<Input id="maintenance-rma" bind:value={rmaReference} />
					</Field>

					<Field>
						<span class="text-sm font-medium">{t('maintenance.assignee')}</span>
						<UserSelect
							label={t('maintenance.assignee')}
							value={assignedUserId}
							onchange={(id) => (assignedUserId = id)}
						/>
					</Field>

					<Field>
						<FieldLabel for="maintenance-scheduled">{t('maintenance.scheduledAt')}</FieldLabel>
						<Input id="maintenance-scheduled" type="datetime-local" bind:value={scheduledAt} />
					</Field>

					<Field>
						<FieldLabel for="maintenance-cost">{t('maintenance.cost')}</FieldLabel>
						<Input id="maintenance-cost" type="number" step="0.01" bind:value={cost} />
					</Field>

					<Field>
						<FieldLabel for="maintenance-currency">{t('maintenance.currency')}</FieldLabel>
						<select
							id="maintenance-currency"
							class="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
							bind:value={currency}
						>
							{#each currencies as code (code)}
								<option value={code}>{code}</option>
							{/each}
						</select>
					</Field>

					<Field class="sm:col-span-2">
						<FieldLabel for="maintenance-description">{t('maintenance.descriptionLabel')}</FieldLabel>
						<textarea
							id="maintenance-description"
							class="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
							bind:value={description}></textarea>
						<FieldDescription>{t('maintenance.descriptionHint')}</FieldDescription>
					</Field>
				</FieldGroup>
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
