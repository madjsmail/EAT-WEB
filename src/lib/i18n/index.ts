import { m } from "#lib/paraglide/messages.js";

type MessageFn = (inputs?: Record<string, string | number>) => unknown;

/**
 * Look up a paraglide message by key. Falls back to the key itself so a
 * missing translation is visible instead of crashing the page.
 */
export function t(key: string, params?: Record<string, string | number>): string {
	const message = (m as unknown as Record<string, unknown>)[key];
	if (typeof message !== "function") return key;

	try {
		const result = params ? (message as MessageFn)(params) : (message as MessageFn)();
		return String(result);
	} catch {
		return key;
	}
}
