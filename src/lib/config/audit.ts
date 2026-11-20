import { resolve } from '$app/paths';
import { t } from '#lib/i18n/index.js';

/** Known `event` values suggested by the audit API. */
export const auditEvents = [
	'created',
	'updated',
	'deleted',
	'assigned',
	'returned',
	'transferred',
	'issued',
	'restocked',
	'adjusted',
	'revoked',
	'login',
	'login_failed',
	'logout',
	'invited',
	'accepted',
	'status_changed',
	'maintenance_opened',
	'maintenance_closed',
	'seeded',
	'bootstrapped'
] as const;

export type AuditEvent = (typeof auditEvents)[number];

/** Known `auditable_type` slugs, in the order the filter lists them. */
export const auditableTypes = [
	'asset',
	'product',
	'maintenance',
	'license',
	'consumable',
	'accessory',
	'user',
	'department',
	'category',
	'manufacturer',
	'status',
	'location',
	'supplier',
	'depreciation_model',
	'attachment'
] as const;

const eventTones: Record<string, string> = {
	created: 'text-emerald-700 bg-emerald-500/10',
	issued: 'text-emerald-700 bg-emerald-500/10',
	accepted: 'text-emerald-700 bg-emerald-500/10',
	restocked: 'text-emerald-700 bg-emerald-500/10',
	updated: 'text-blue-700 bg-blue-500/10',
	adjusted: 'text-blue-700 bg-blue-500/10',
	status_changed: 'text-blue-700 bg-blue-500/10',
	assigned: 'text-indigo-700 bg-indigo-500/10',
	returned: 'text-indigo-700 bg-indigo-500/10',
	transferred: 'text-indigo-700 bg-indigo-500/10',
	maintenance_opened: 'text-amber-700 bg-amber-500/10',
	maintenance_closed: 'text-emerald-700 bg-emerald-500/10',
	login: 'text-slate-700 bg-slate-500/10',
	logout: 'text-slate-700 bg-slate-500/10',
	login_failed: 'text-rose-700 bg-rose-500/10',
	deleted: 'text-rose-700 bg-rose-500/10',
	revoked: 'text-rose-700 bg-rose-500/10',
	invited: 'text-sky-700 bg-sky-500/10'
};

export function eventTone(event: string): string {
	return eventTones[event] ?? 'text-muted-foreground bg-muted';
}

export function eventLabel(event: string): string {
	return t(`audit.event.${event}`);
}

export function typeLabel(type: string): string {
	return t(`audit.type.${type}`);
}

/** Detail page per auditable type; types without a page render as plain text. */
export function entityHref(type: string, id: string): string | null {
	switch (type) {
		case 'asset':
			return resolve('/dashboard/assets/[id]', { id });
		case 'product':
			return resolve('/dashboard/products/[id]', { id });
		case 'maintenance':
			return resolve('/dashboard/maintenances/[id]', { id });
		case 'license':
			return resolve('/dashboard/licenses/[id]', { id });
		case 'accessory':
			return resolve('/dashboard/accessories/[id]', { id });
		case 'consumable':
			return resolve('/dashboard/consumables/[id]', { id });
		default:
			return null;
	}
}

/** Pretty JSON for panels and drawers; never `[object Object]`. */
export function prettyJson(value: unknown): string {
	if (value === null || value === undefined) return '—';
	if (typeof value === 'string') return value;
	try {
		return JSON.stringify(value, null, 2);
	} catch {
		return String(value);
	}
}

/** Compact single-line rendering for a diff cell. */
export function inlineValue(value: unknown): string {
	if (value === null || value === undefined) return '—';
	if (typeof value === 'object') return prettyJson(value);
	return String(value);
}

/** Objects and arrays get a code block instead of an inline cell. */
export function isStructured(value: unknown): boolean {
	return value !== null && typeof value === 'object';
}
