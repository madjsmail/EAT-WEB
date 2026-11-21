<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import ImagePlusIcon from '@lucide/svelte/icons/image-plus';
	import { ApiError } from '#lib/api/client.js';
	import {
		LOGO_CONTENT_TYPES,
		MAX_LOGO_BYTES,
		createLogoUploadUrl,
		getOrganization,
		updateOrganization,
		type Organization,
		type PreferredLocale
	} from '#lib/api/organization.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Checkbox } from '#lib/components/ui/checkbox/index.js';
	import EnumSelect from '#lib/components/domain/enum-select.svelte';
	import { Field, FieldDescription, FieldLabel } from '#lib/components/ui/field/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import { t } from '#lib/i18n/index.js';
	import { session } from '#lib/stores/session.svelte.js';

	const localeOptions = [
		{ value: 'en', label: 'English' },
		{ value: 'fr', label: 'Français' },
		{ value: 'ar', label: 'العربية' }
	];

	let organization = $state<Organization | null>(null);
	let loading = $state(true);
	let loadError = $state<string | null>(null);
	let saving = $state(false);
	let saveError = $state<string | null>(null);
	let uploading = $state(false);
	let logoError = $state<string | null>(null);

	let form = $state<{
		name: string;
		default_locale: PreferredLocale;
		settings: {
			asset_tag_prefix: string;
			asset_tag_padding: string;
			warranty_alert_days: string;
			license_alert_days: string;
			currency: string;
			require_handover_signature: boolean;
		};
	}>({
		name: '',
		default_locale: 'en',
		settings: {
			asset_tag_prefix: '',
			asset_tag_padding: '4',
			warranty_alert_days: '30',
			license_alert_days: '30',
			currency: 'USD',
			require_handover_signature: false
		}
	});

	const canEdit = $derived(session.has('organizations.update'));

	function messageOf(cause: unknown, fallback: string): string {
		return cause instanceof ApiError && cause.status > 0 ? cause.message : fallback;
	}

	function seed(data: Organization) {
		organization = data;
		form = {
			name: data.name,
			default_locale: data.default_locale,
			settings: {
				asset_tag_prefix: data.settings.asset_tag_prefix,
				asset_tag_padding: String(data.settings.asset_tag_padding),
				warranty_alert_days: String(data.settings.warranty_alert_days),
				license_alert_days: String(data.settings.license_alert_days),
				currency: data.settings.currency,
				require_handover_signature: data.settings.require_handover_signature
			}
		};
	}

	async function load() {
		loading = true;
		loadError = null;
		try {
			seed(await getOrganization());
		} catch (cause) {
			loadError = messageOf(cause, t('org.loadError'));
		} finally {
			loading = false;
		}
	}

	onMount(load);

	async function save(event: SubmitEvent) {
		event.preventDefault();
		saving = true;
		saveError = null;

		try {
			const updated = await updateOrganization({
				name: form.name.trim(),
				default_locale: form.default_locale,
				settings: {
					asset_tag_prefix: form.settings.asset_tag_prefix.trim(),
					asset_tag_padding: Number(form.settings.asset_tag_padding),
					warranty_alert_days: Number(form.settings.warranty_alert_days),
					license_alert_days: Number(form.settings.license_alert_days),
					currency: form.settings.currency.trim().toUpperCase(),
					require_handover_signature: form.settings.require_handover_signature
				}
			});
			seed(updated);
			toast.success(t('org.saved'));
		} catch (cause) {
			saveError = messageOf(cause, t('auth.genericError'));
		} finally {
			saving = false;
		}
	}

	async function uploadLogo(event: Event & { currentTarget: HTMLInputElement }) {
		const input = event.currentTarget;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;

		logoError = null;
		if (!(LOGO_CONTENT_TYPES as readonly string[]).includes(file.type)) {
			logoError = t('org.logoInvalidType');
			return;
		}
		if (file.size > MAX_LOGO_BYTES) {
			logoError = t('org.logoTooLarge');
			return;
		}

		uploading = true;
		try {
			// The signature includes Content-Type, so the PUT must repeat it.
			const presign = await createLogoUploadUrl({
				file_name: file.name,
				content_type: file.type as (typeof LOGO_CONTENT_TYPES)[number]
			});
			const put = await fetch(presign.upload_url, {
				method: 'PUT',
				headers: { 'content-type': file.type },
				body: file
			});
			if (!put.ok) throw new Error(put.statusText);

			seed(await updateOrganization({ logo_object_key: presign.object_key }));
			toast.success(t('org.logoUploaded'));
		} catch (cause) {
			logoError = messageOf(cause, t('org.logoFailed'));
		} finally {
			uploading = false;
		}
	}
</script>

<svelte:head>
	<title>{t('org.title')} · EAT</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-1">
		<h1 class="text-2xl font-semibold tracking-tight">{t('org.title')}</h1>
		<p class="text-sm text-muted-foreground">{t('org.description')}</p>
	</div>

	{#if loading}
		<div class="flex flex-col gap-2 rounded-lg border bg-card p-4">
			<Skeleton class="h-8 w-full" />
			<Skeleton class="h-8 w-full" />
			<Skeleton class="h-8 w-2/3" />
		</div>
	{:else if loadError || !organization}
		<div class="flex flex-col items-start gap-3 rounded-lg border bg-card p-6">
			<p class="text-sm text-destructive">{loadError ?? t('org.loadError')}</p>
			<Button variant="outline" size="sm" onclick={load}>{t('table.retry')}</Button>
		</div>
	{:else}
		<section class="rounded-lg border bg-card">
			<div class="flex flex-col gap-4 p-4 sm:p-6">
				<h2 class="text-base font-medium">{t('org.logo')}</h2>
				<div class="flex flex-wrap items-center gap-4">
					<div
						class="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted"
					>
						{#if organization.logo_url}
							<img
								src={organization.logo_url}
								alt={t('org.logoAlt')}
								class="size-full object-contain"
							/>
						{:else}
							<ImagePlusIcon class="size-6 text-muted-foreground" />
						{/if}
					</div>
					<div class="flex flex-col gap-2">
						<Input
							type="file"
							accept={LOGO_CONTENT_TYPES.join(',')}
							disabled={!canEdit || uploading}
							onchange={uploadLogo}
							aria-label={t('org.logoUpload')}
						/>
						<p class="text-xs text-muted-foreground">
							{uploading ? t('common.saving') : t('org.logoHint')}
						</p>
						{#if logoError}
							<p class="text-xs text-destructive">{logoError}</p>
						{/if}
					</div>
				</div>
			</div>
		</section>

		<section class="rounded-lg border bg-card">
			<form class="flex flex-col gap-4 p-4 sm:p-6" onsubmit={save}>
				<div class="flex flex-wrap items-center justify-between gap-2">
					<h2 class="text-base font-medium">{t('org.details')}</h2>
					<span class="text-xs text-muted-foreground">{organization.slug}</span>
				</div>

				{#if !canEdit}
					<p class="text-sm text-muted-foreground">{t('org.readOnly')}</p>
				{/if}
				{#if saveError}
					<p
						class="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
					>
						{saveError}
					</p>
				{/if}

				<div class="grid gap-4 sm:grid-cols-2">
					<Field>
						<FieldLabel for="org-name">{t('org.name')}</FieldLabel>
						<Input
							id="org-name"
							required
							maxlength={120}
							disabled={!canEdit}
							value={form.name}
							oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
								(form.name = event.currentTarget.value)}
						/>
					</Field>
					<Field>
						<FieldLabel for="org-locale">{t('org.defaultLocale')}</FieldLabel>
						<EnumSelect
							id="org-locale"
							value={form.default_locale}
							options={localeOptions}
							disabled={!canEdit}
							onchange={(value) => (form.default_locale = value as PreferredLocale)}
						/>
					</Field>
				</div>

				<h3 class="mt-2 text-sm font-medium">{t('org.settings')}</h3>
				<div class="grid gap-4 sm:grid-cols-2">
					<Field>
						<FieldLabel for="org-prefix">{t('org.assetTagPrefix')}</FieldLabel>
						<Input
							id="org-prefix"
							required
							maxlength={10}
							disabled={!canEdit}
							value={form.settings.asset_tag_prefix}
							oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
								(form.settings.asset_tag_prefix = event.currentTarget.value)}
						/>
					</Field>
					<Field>
						<FieldLabel for="org-padding">{t('org.assetTagPadding')}</FieldLabel>
						<Input
							id="org-padding"
							type="number"
							min={1}
							max={10}
							required
							disabled={!canEdit}
							value={form.settings.asset_tag_padding}
							oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
								(form.settings.asset_tag_padding = event.currentTarget.value)}
						/>
					</Field>
					<Field>
						<FieldLabel for="org-warranty">{t('org.warrantyAlertDays')}</FieldLabel>
						<Input
							id="org-warranty"
							type="number"
							min={0}
							max={3650}
							required
							disabled={!canEdit}
							value={form.settings.warranty_alert_days}
							oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
								(form.settings.warranty_alert_days = event.currentTarget.value)}
						/>
					</Field>
					<Field>
						<FieldLabel for="org-license">{t('org.licenseAlertDays')}</FieldLabel>
						<Input
							id="org-license"
							type="number"
							min={0}
							max={3650}
							required
							disabled={!canEdit}
							value={form.settings.license_alert_days}
							oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
								(form.settings.license_alert_days = event.currentTarget.value)}
						/>
					</Field>
					<Field>
						<FieldLabel for="org-currency">{t('org.currency')}</FieldLabel>
						<Input
							id="org-currency"
							maxlength={3}
							required
							disabled={!canEdit}
							value={form.settings.currency}
							oninput={(event: Event & { currentTarget: HTMLInputElement }) =>
								(form.settings.currency = event.currentTarget.value.toUpperCase())}
						/>
						<FieldDescription>{t('org.currencyHint')}</FieldDescription>
					</Field>
					<Field class="justify-end">
						<label class="flex items-center gap-2 text-sm">
							<Checkbox
								checked={form.settings.require_handover_signature}
								disabled={!canEdit}
								onCheckedChange={(checked) =>
									(form.settings.require_handover_signature = checked === true)}
							/>
							{t('org.requireHandoverSignature')}
						</label>
					</Field>
				</div>

				<div class="flex justify-end">
					<Button type="submit" disabled={!canEdit || saving}>
						{saving ? t('common.saving') : t('common.save')}
					</Button>
				</div>
			</form>
		</section>
	{/if}
</div>
