import { apiRequest, apiRequestPage, buildQuery, type Page } from './client.js';
import type { Translations } from '#lib/i18n/index.js';

export interface Consumable {
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
	quantity_on_hand: number;
	min_stock_alert: number;
	is_low_stock: boolean;
	purchase_cost: string | number | null;
	currency: string;
	order_number: string | null;
	notes: string | null;
	image_url: string | null;
	is_archived: boolean;
	created_at: string;
	updated_at: string;
}

export interface ConsumablePayload {
	translations: Translations;
	category_id: string;
	manufacturer_id?: string | null;
	supplier_id?: string | null;
	location_id?: string | null;
	model_number?: string | null;
	/** Opening stock on create only; the API records it as a restock. */
	quantity_on_hand?: number;
	min_stock_alert?: number;
	purchase_cost?: string | null;
	currency?: string;
	order_number?: string | null;
	notes?: string | null;
	image_url?: string | null;
	is_archived?: boolean;
}

export interface ConsumableFilters {
	q?: string;
	category_id?: string;
	low_stock?: boolean;
	is_archived?: boolean;
	page?: number;
	per_page?: number;
}

export type ConsumableTransactionType = 'restock' | 'issue' | 'adjustment';

export interface ConsumableTransaction {
	id: string;
	consumable_id: string;
	transaction_type: ConsumableTransactionType;
	quantity: number;
	user_id: string | null;
	user_name: string | null;
	notes: string | null;
	performed_by_user_name: string | null;
	created_at: string;
}

export async function listConsumables(filters: ConsumableFilters = {}): Promise<Page<Consumable>> {
	return apiRequestPage<Consumable>(`/consumables${buildQuery(filters)}`);
}

export async function listConsumableAlerts(): Promise<Consumable[]> {
	return apiRequest<Consumable[]>('/consumables/alerts');
}

export async function getConsumable(id: string): Promise<Consumable> {
	return apiRequest<Consumable>(`/consumables/${id}`);
}

export async function createConsumable(payload: ConsumablePayload): Promise<Consumable> {
	return apiRequest<Consumable>('/consumables', {
		method: 'POST',
		body: JSON.stringify(payload)
	});
}

export async function updateConsumable(
	id: string,
	payload: Partial<ConsumablePayload>
): Promise<Consumable> {
	return apiRequest<Consumable>(`/consumables/${id}`, {
		method: 'PATCH',
		body: JSON.stringify(payload)
	});
}

export async function deleteConsumable(id: string): Promise<void> {
	await apiRequest<unknown>(`/consumables/${id}`, { method: 'DELETE' });
}

export async function listConsumableTransactions(id: string): Promise<ConsumableTransaction[]> {
	return apiRequest<ConsumableTransaction[]>(`/consumables/${id}/transactions`);
}

export async function createConsumableTransaction(
	id: string,
	payload: {
		transaction_type: ConsumableTransactionType;
		quantity: number;
		user_id?: string;
		notes?: string;
	}
): Promise<ConsumableTransaction> {
	return apiRequest<ConsumableTransaction>(`/consumables/${id}/transactions`, {
		method: 'POST',
		body: JSON.stringify(payload)
	});
}
