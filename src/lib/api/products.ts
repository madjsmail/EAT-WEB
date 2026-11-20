import { apiRequest, apiRequestPage, buildQuery, type Page } from './client.js';
import type { Translations } from '#lib/i18n/index.js';

export type EolType = 'fixed_date' | 'months_from_purchase' | 'months_from_warranty' | 'individual';

export interface Product {
	id: string;
	code: string;
	name: string;
	translations: Translations;
	category_id: string;
	category_name: string | null;
	manufacturer_id: string | null;
	manufacturer_name: string | null;
	depreciation_model_id: string | null;
	depreciation_model_name: string | null;
	model_code: string | null;
	eol_type: EolType | null;
	eol_date: string | null;
	default_purchase_cost: string | number | null;
	default_currency: string;
	default_supplier_id: string | null;
	default_supplier_name: string | null;
	min_quantity: number;
	chip: string | null;
	operating_system: string | null;
	notes: string | null;
	custom_fields_json: Record<string, unknown>;
	specs_json: Record<string, unknown>;
	is_archived: boolean;
	image_url: string | null;
	created_at: string;
	updated_at: string;
}

export interface ProductPayload {
	translations: Translations;
	category_id: string;
	manufacturer_id?: string | null;
	depreciation_model_id?: string | null;
	model_code?: string | null;
	eol_type?: EolType | null;
	eol_date?: string | null;
	default_purchase_cost?: string | null;
	default_currency?: string;
	default_supplier_id?: string | null;
	min_quantity?: number;
	chip?: string | null;
	operating_system?: string | null;
	notes?: string | null;
	custom_fields_json?: Record<string, unknown>;
	specs_json?: Record<string, unknown>;
	is_archived?: boolean;
	image_url?: string | null;
}

export interface ProductFilters {
	q?: string;
	category_id?: string;
	manufacturer_id?: string;
	is_archived?: boolean;
	page?: number;
	per_page?: number;
}

export async function listProducts(filters: ProductFilters = {}): Promise<Page<Product>> {
	return apiRequestPage<Product>(`/products${buildQuery(filters)}`);
}

export async function getProduct(id: string): Promise<Product> {
	return apiRequest<Product>(`/products/${id}`);
}

export async function createProduct(payload: ProductPayload): Promise<Product> {
	return apiRequest<Product>('/products', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateProduct(
	id: string,
	payload: Partial<ProductPayload>
): Promise<Product> {
	return apiRequest<Product>(`/products/${id}`, {
		method: 'PATCH',
		body: JSON.stringify(payload)
	});
}

export async function deleteProduct(id: string): Promise<void> {
	await apiRequest<unknown>(`/products/${id}`, { method: 'DELETE' });
}
