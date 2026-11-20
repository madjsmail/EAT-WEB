import { resolveI18n } from '#lib/i18n/index.js';
import type { Lookup } from '#lib/api/lookups.js';
import type { Product } from '#lib/api/products.js';
import type { SelectOption } from '#lib/components/domain/search-select.svelte';

/** Label = localized name, value = database UUID. */
export function lookupOptions(items: Lookup[], fallbackToCode = true): SelectOption[] {
	return items.map((item) => {
		const fallback = fallbackToCode ? (item.code ?? '') : '';
		const label = resolveI18n(item.translations, undefined, fallback);
		return {
			value: item.id,
			label: label || item.code || item.id,
			keywords: [item.code ?? '']
		};
	});
}

export function productOptions(items: Product[]): SelectOption[] {
	return items.map((item) => ({
		value: item.id,
		label: resolveI18n(item.translations, undefined, item.name) || item.code || item.id,
		keywords: [item.code ?? '']
	}));
}
