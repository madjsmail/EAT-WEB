import { apiRequest, apiRequestPage, buildQuery, type Page } from './client.js';

export interface Asset {
	id: string;
	asset_tag: string;
	name: string;
	product_id: string;
	product_name: string | null;
	product_code: string | null;
	category_id: string | null;
	category_name: string | null;
	manufacturer_name: string | null;
	status_id: string | null;
	status_name: string | null;
	status_type: string | null;
	status_color_code: string | null;
	supplier_id: string | null;
	supplier_name: string | null;
	location_id: string | null;
	location_name: string | null;
	department_id: string | null;
	department_name: string | null;
	assigned_user_id: string | null;
	assigned_user_name: string | null;
	serial_number: string | null;
	warranty_date: string | null;
	order_number: string | null;
	purchase_date: string | null;
	purchase_cost: string | number | null;
	currency: string;
	schedule_audit: string | null;
	notes: string | null;
	image_url: string | null;
	imei_1: string | null;
	imei_2: string | null;
	mdm_enrolled: boolean;
	created_at: string;
	updated_at: string;
}

export interface AssetPayload {
	product_id: string;
	department_id: string;
	name: string;
	asset_tag?: string | null;
	status_id?: string | null;
	supplier_id?: string | null;
	location_id?: string | null;
	serial_number?: string | null;
	warranty_date?: string | null;
	order_number?: string | null;
	purchase_date?: string | null;
	purchase_cost?: string | null;
	currency?: string;
	schedule_audit?: string | null;
	notes?: string | null;
	image_url?: string | null;
	imei_1?: string | null;
	imei_2?: string | null;
	mdm_enrolled?: boolean;
}

export interface AssetFilters {
	q?: string;
	status_id?: string;
	location_id?: string;
	department_id?: string;
	product_id?: string;
	assigned_user_id?: string;
	page?: number;
	per_page?: number;
}

export interface Assignment {
	id: string;
	asset_id: string;
	action: string;
	assigned_to_user_id: string | null;
	assigned_to_user_name: string | null;
	from_user_id: string | null;
	from_user_name: string | null;
	from_location_id: string | null;
	from_location_name: string | null;
	to_location_id: string | null;
	to_location_name: string | null;
	from_department_id: string | null;
	to_department_id: string | null;
	from_status_id: string | null;
	to_status_id: string | null;
	notes: string | null;
	performed_by_user_id: string | null;
	performed_by_user_name: string | null;
	created_at: string;
}

export async function listAssets(filters: AssetFilters = {}): Promise<Page<Asset>> {
	return apiRequestPage<Asset>(`/assets${buildQuery(filters)}`);
}

export async function getAsset(id: string): Promise<Asset> {
	return apiRequest<Asset>(`/assets/${id}`);
}

export async function scanAsset(code: string): Promise<Asset> {
	return apiRequest<Asset>(`/assets/scan${buildQuery({ code })}`);
}

export async function createAsset(payload: AssetPayload): Promise<Asset> {
	return apiRequest<Asset>('/assets', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateAsset(id: string, payload: Partial<AssetPayload>): Promise<Asset> {
	return apiRequest<Asset>(`/assets/${id}`, {
		method: 'PATCH',
		body: JSON.stringify(payload)
	});
}

export async function deleteAsset(id: string): Promise<void> {
	await apiRequest<unknown>(`/assets/${id}`, { method: 'DELETE' });
}

export async function assignAsset(
	id: string,
	payload: { user_id?: string; location_id?: string; status_id?: string; notes?: string }
): Promise<unknown> {
	return apiRequest<unknown>(`/assets/${id}/assign`, {
		method: 'POST',
		body: JSON.stringify(payload)
	});
}

export async function returnAsset(
	id: string,
	payload: { location_id?: string; status_id?: string; notes?: string }
): Promise<unknown> {
	return apiRequest<unknown>(`/assets/${id}/return`, {
		method: 'POST',
		body: JSON.stringify(payload)
	});
}

export async function transferAsset(
	id: string,
	payload: {
		location_id: string;
		department_id?: string;
		status_id?: string;
		notes?: string;
	}
): Promise<unknown> {
	return apiRequest<unknown>(`/assets/${id}/transfer`, {
		method: 'POST',
		body: JSON.stringify(payload)
	});
}

export async function listAssignments(id: string): Promise<Assignment[]> {
	return apiRequest<Assignment[]>(`/assets/${id}/assignments`);
}

export type LabelFormat = 'svg' | 'png';
export type LabelSymbology = 'qr' | 'code128';
export type LabelDataSource = 'asset_tag' | 'serial_number';

/** Direct image URL — the label endpoint returns binary/SVG, not the JSON envelope. */
export function labelUrl(
	id: string,
	format: LabelFormat = 'svg',
	symbology: LabelSymbology = 'qr',
	data: LabelDataSource = 'asset_tag'
): string {
	return `/v1/api/assets/${id}/label${buildQuery({ format, symbology, data })}`;
}

export interface Asset360Accessory {
	id: string;
	accessory_id: string;
	accessory_name: string | null;
	quantity: number;
	remaining_quantity: number;
	user_id: string | null;
	user_name: string | null;
	asset_id: string | null;
	asset_tag: string | null;
	assigned_at: string;
	notes: string | null;
}

export interface Asset360Consumable {
	id: string;
	consumable_id: string;
	consumable_name: string | null;
	transaction_type: string;
	quantity: number;
	user_id: string | null;
	user_name: string | null;
	notes: string | null;
	created_at: string;
}

export interface Asset360License {
	id: string;
	license_id: string;
	license_name: string | null;
	asset_id: string | null;
	asset_tag: string | null;
	user_id: string | null;
	user_name: string | null;
	assigned_at: string;
}

export interface Asset360Counts {
	accessories: number;
	consumables: number;
	licenses: number;
	custody_events: number;
}

export interface Asset360 {
	asset: Asset;
	accessories: Asset360Accessory[];
	consumables: Asset360Consumable[];
	licenses: Asset360License[];
	custody_history: Assignment[];
	counts: Asset360Counts;
}

/** One request powers the whole asset 360° page. */
export async function getAsset360(id: string): Promise<Asset360> {
	return apiRequest<Asset360>(`/assets/${id}/360`);
}
