import { getLocale } from "#lib/paraglide/runtime.js";

export { cn } from "cn";

export function formatDate(
	date: Date | string | number,
	opts: Intl.DateTimeFormatOptions = {},
): string {
	return new Intl.DateTimeFormat(getLocale(), {
		month: opts.month ?? "long",
		day: opts.day ?? "numeric",
		year: opts.year ?? "numeric",
		...opts,
	}).format(new Date(date));
}

export function formatNumber(value: number, opts: Intl.NumberFormatOptions = {}): string {
	return new Intl.NumberFormat(getLocale(), opts).format(value);
}

export function toSentenceCase(str: string): string {
	return str
		.replace(/_/g, " ")
		.replace(/([A-Z])/g, " $1")
		.toLowerCase()
		.replace(/^\w/, (c) => c.toUpperCase())
		.replace(/\s+/g, " ")
		.trim();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, "child"> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, "children"> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };
