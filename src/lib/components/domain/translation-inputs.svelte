<script lang="ts">
	import { Field, FieldLabel } from '#lib/components/ui/field/index.js';
	import { t } from '#lib/i18n/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import type { Translations } from '#lib/i18n/index.js';

	let {
		value = $bindable<Translations>({ en: '', fr: '', ar: '' }),
		required = true,
		disabled = false
	}: { value?: Translations; required?: boolean; disabled?: boolean } = $props();

	const uid = $props.id();
	const locales = [
		{ code: 'en', label: 'English' },
		{ code: 'fr', label: 'Français' },
		{ code: 'ar', label: 'العربية' }
	];
</script>

<Field>
	<FieldLabel>{t('lookup.translations')}</FieldLabel>
	<div class="grid gap-2 sm:grid-cols-3">
		{#each locales as locale (locale.code)}
			<div class="flex flex-col gap-1.5">
				<label class="text-xs text-muted-foreground" for="{uid}-{locale.code}">
					{locale.label}{required && locale.code === 'en' ? ' *' : ''}
				</label>
				<Input
					id="{uid}-{locale.code}"
					dir={locale.code === 'ar' ? 'rtl' : undefined}
					bind:value={value[locale.code]}
					required={required && locale.code === 'en'}
					{disabled}
				/>
			</div>
		{/each}
	</div>
</Field>
