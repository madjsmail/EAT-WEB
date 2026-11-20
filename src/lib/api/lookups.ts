import { apiRequest, buildQuery } from './client.js';
import type { Translations } from '#lib/i18n/index.js';

export type LookupFamily =
	| 'categories'
	| 'manufacturers'
	| 'statuses'
	| 'departments'
	| 'locations'
	| 'suppliers'
	| 'depreciation-models';

/** Flattened superset of all lookup response shapes. */
export interface Lookup {
	id: string;
	code?: string | null;
	translations: Translations;
	created_at: string;
	updated_at: string;
	// categories
	category_type?: string;
	skip_checkout_confirmation_emails?: boolean;
	icon_url?: string | null;
	// manufacturers
	url?: string | null;
	support_url?: string | null;
	support_phone?: string | null;
	support_email?: string | null;
	notes?: string | null;
	logo_url?: string | null;
	// statuses
	status_type?: string;
	color_code?: string | null;
	show_in_nav?: boolean;
	assets_count?: number;
	// departments
	email?: string | null;
	phone_number?: string | null;
	// locations
	parent_id?: string | null;
	location_type?: string;
	address_line1?: string | null;
	address_line2?: string | null;
	city?: string | null;
	state_region?: string | null;
	postal_code?: string | null;
	country_code?: string | null;
	latitude?: number | null;
	longitude?: number | null;
	manager_user_id?: string | null;
	is_active?: boolean;
	// suppliers
	contact_name?: string | null;
	address?: string | null;
	// depreciation models
	months?: number;
	floor_value?: string | number;
}

export type LookupPayload = Record<string, unknown> & { translations: Translations };

export async function listLookups(family: LookupFamily, q = ''): Promise<Lookup[]> {
	return apiRequest<Lookup[]>(`/lookups/${family}${buildQuery({ q })}`);
}

export async function getLookup(family: LookupFamily, id: string): Promise<Lookup> {
	return apiRequest<Lookup>(`/lookups/${family}/${id}`);
}

export async function createLookup(family: LookupFamily, payload: LookupPayload): Promise<Lookup> {
	return apiRequest<Lookup>(`/lookups/${family}`, {
		method: 'POST',
		body: JSON.stringify(payload)
	});
}

export async function updateLookup(
	family: LookupFamily,
	id: string,
	payload: LookupPayload
): Promise<Lookup> {
	return apiRequest<Lookup>(`/lookups/${family}/${id}`, {
		method: 'PATCH',
		body: JSON.stringify(payload)
	});
}

export async function deleteLookup(family: LookupFamily, id: string): Promise<void> {
	await apiRequest<unknown>(`/lookups/${family}/${id}`, { method: 'DELETE' });
}
