import { apiRequest, apiRequestPage, buildQuery, type Page } from './client.js';
import type { Translations } from '#lib/i18n/index.js';

export interface Accessory {
	id: string;
	name: string;
	translations: Translations;
	category_id: string;
	category_name: string | null;
	manufacturer_id: string | null;
	manufacturer_name: string | null;
	supplier_id: string | null;
	supplier_name: string | null;
	location_id: string | null;
	location_name: string | null;
	model_number: string | null;
	total_quantity: number;
	available_quantity: number;
	assigned_quantity: number;
	min_quantity: number;
	purchase_cost: string | number | null;
	currency: string;
	purchase_date: string | null;
	order_number: string | null;
	notes: string | null;
	image_url: string | null;
	is_archived: boolean;
	created_at: string;
	updated_at: string;
}

export interface AccessoryPayload {
	translations: Translations;
	category_id: string;
	manufacturer_id?: string | null;
	supplier_id?: string | null;
	location_id?: string | null;
	model_number?: string | null;
	total_quantity: number;
	min_quantity?: number;
	purchase_cost?: string | null;
	currency?: string;
	purchase_date?: string | null;
	order_number?: string | null;
	notes?: string | null;
	image_url?: string | null;
	is_archived?: boolean;
}

export interface AccessoryFilters {
	q?: string;
	category_id?: string;
	manufacturer_id?: string;
	is_archived?: boolean;
	page?: number;
	per_page?: number;
}

export interface AccessoryAssignment {
	id: string;
	accessory_id: string;
	user_id: string | null;
	user_name: string | null;
	asset_id: string | null;
	asset_tag: string | null;
	quantity: number;
	returned_quantity: number;
	remaining_quantity: number;
	notes: string | null;
	assigned_by_user_name: string | null;
	assigned_at: string;
	returned_at: string | null;
}

export async function listAccessories(filters: AccessoryFilters = {}): Promise<Page<Accessory>> {
	return apiRequestPage<Accessory>(`/accessories${buildQuery(filters)}`);
}

export async function getAccessory(id: string): Promise<Accessory> {
	return apiRequest<Accessory>(`/accessories/${id}`);
}

export async function createAccessory(payload: AccessoryPayload): Promise<Accessory> {
	return apiRequest<Accessory>('/accessories', {
		method: 'POST',
		body: JSON.stringify(payload)
	});
}

export async function updateAccessory(
	id: string,
	payload: Partial<AccessoryPayload>
): Promise<Accessory> {
	return apiRequest<Accessory>(`/accessories/${id}`, {
		method: 'PATCH',
		body: JSON.stringify(payload)
	});
}

export async function deleteAccessory(id: string): Promise<void> {
	await apiRequest<unknown>(`/accessories/${id}`, { method: 'DELETE' });
}

export async function listAccessoryAssignments(id: string): Promise<AccessoryAssignment[]> {
	return apiRequest<AccessoryAssignment[]>(`/accessories/${id}/assignments`);
}

/** Exactly one of `user_id` / `asset_id` is expected by the API. */
export async function assignAccessory(
	id: string,
	payload: { user_id?: string; asset_id?: string; quantity: number; notes?: string }
): Promise<AccessoryAssignment> {
	return apiRequest<AccessoryAssignment>(`/accessories/${id}/assign`, {
		method: 'POST',
		body: JSON.stringify(payload)
	});
}

export async function returnAccessory(
	id: string,
	assignmentId: string,
	payload: { quantity?: number; notes?: string }
): Promise<AccessoryAssignment> {
	return apiRequest<AccessoryAssignment>(`/accessories/${id}/assignments/${assignmentId}/return`, {
		method: 'POST',
		body: JSON.stringify(payload)
	});
}
