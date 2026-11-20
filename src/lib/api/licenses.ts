import { apiRequest, apiRequestPage, buildQuery, type Page } from './client.js';
import type { Translations } from '#lib/i18n/index.js';

export type LicenseType = 'named' | 'concurrent' | 'subscription' | 'perpetual';
export type ExpiryBucket = 'expired' | '30' | '60' | '90';

export interface License {
	id: string;
	name: string;
	translations: Translations;
	manufacturer_id: string | null;
	manufacturer_name: string | null;
	supplier_id: string | null;
	supplier_name: string | null;
	license_type: LicenseType;
	total_seats: number;
	active_seats: number;
	available_seats: number;
	purchase_date: string | null;
	expiration_date: string | null;
	/** Negative when the license already expired. */
	days_until_expiry: number | null;
	expiry_bucket: ExpiryBucket | null;
	purchase_cost: string | number | null;
	currency: string;
	order_number: string | null;
	product_key: string | null;
	notes: string | null;
	is_archived: boolean;
	created_at: string;
	updated_at: string;
}

export interface LicensePayload {
	translations: Translations;
	manufacturer_id?: string | null;
	supplier_id?: string | null;
	license_type: LicenseType;
	total_seats: number;
	purchase_date?: string | null;
	expiration_date?: string | null;
	purchase_cost?: string | null;
	currency?: string;
	order_number?: string | null;
	product_key?: string | null;
	notes?: string | null;
	is_archived?: boolean;
}

export interface LicenseFilters {
	q?: string;
	expiring_in_days?: 30 | 60 | 90;
	is_archived?: boolean;
	page?: number;
	per_page?: number;
}

export interface LicenseSeat {
	id: string;
	license_id: string;
	user_id: string | null;
	user_name: string | null;
	asset_id: string | null;
	asset_tag: string | null;
	notes: string | null;
	assigned_by_user_name: string | null;
	assigned_at: string;
	revoked_by_user_name: string | null;
	revoked_at: string | null;
}

export interface LicenseAlerts {
	expired: License[];
	within_30_days: License[];
	within_60_days: License[];
	within_90_days: License[];
}

export async function listLicenses(filters: LicenseFilters = {}): Promise<Page<License>> {
	return apiRequestPage<License>(`/licenses${buildQuery(filters)}`);
}

export async function listLicenseAlerts(): Promise<LicenseAlerts> {
	return apiRequest<LicenseAlerts>('/licenses/alerts');
}

export async function getLicense(id: string): Promise<License> {
	return apiRequest<License>(`/licenses/${id}`);
}

export async function createLicense(payload: LicensePayload): Promise<License> {
	return apiRequest<License>('/licenses', {
		method: 'POST',
		body: JSON.stringify(payload)
	});
}

export async function updateLicense(
	id: string,
	payload: Partial<LicensePayload>
): Promise<License> {
	return apiRequest<License>(`/licenses/${id}`, {
		method: 'PATCH',
		body: JSON.stringify(payload)
	});
}

export async function deleteLicense(id: string): Promise<void> {
	await apiRequest<unknown>(`/licenses/${id}`, { method: 'DELETE' });
}

export async function listLicenseSeats(id: string): Promise<LicenseSeat[]> {
	return apiRequest<LicenseSeat[]>(`/licenses/${id}/seats`);
}

/** Exactly one of `user_id` / `asset_id` is expected by the API. */
export async function allocateLicenseSeat(
	id: string,
	payload: { user_id?: string; asset_id?: string; notes?: string }
): Promise<LicenseSeat> {
	return apiRequest<LicenseSeat>(`/licenses/${id}/seats/allocate`, {
		method: 'POST',
		body: JSON.stringify(payload)
	});
}

export async function revokeLicenseSeat(
	id: string,
	seatId: string,
	payload: { notes?: string } = {}
): Promise<LicenseSeat> {
	return apiRequest<LicenseSeat>(`/licenses/${id}/seats/${seatId}/revoke`, {
		method: 'POST',
		body: JSON.stringify(payload)
	});
}
