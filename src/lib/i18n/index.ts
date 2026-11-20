import { m } from '#lib/paraglide/messages.js';
import { getLocale } from '#lib/paraglide/runtime.js';

type MessageFn = (inputs?: Record<string, string | number>) => unknown;
export type Translations = Record<string, string>;

/**
 * Resolve an API `name_i18n`/`translations` map for the active locale.
 * Fallback chain: locale -> fr -> en -> first available key.
 */
export function resolveI18n(
	translations: Translations | null | undefined,
	locale: string = getLocale(),
	fallback = ''
): string {
	if (!translations) return fallback;
	return (
		translations[locale] ??
		translations.fr ??
		translations.en ??
		Object.values(translations).find(Boolean) ??
		fallback
	);
}

/**
 * Look up a paraglide message by key. Falls back to the key itself so a
 * missing translation is visible instead of crashing the page.
 */
export function t(key: string, params?: Record<string, string | number>): string {
	const message = (m as unknown as Record<string, unknown>)[key];
	if (typeof message !== 'function') return key;

	try {
		const result = params ? (message as MessageFn)(params) : (message as MessageFn)();
		return String(result);
	} catch {
		return key;
	}
}
