import { apiRequest } from './client.js';

export interface AssetStatusBucket {
	status: string;
	color_code: string | null;
	total: number;
}

export interface ExpirationBucket {
	expired: number;
	within_30_days: number;
	within_60_days: number;
	within_90_days: number;
}

export interface Expirations {
	warranties: ExpirationBucket;
	licenses: ExpirationBucket;
}

export interface LowStockRow {
	kind: 'consumable' | 'accessory';
	id: string;
	name: string;
	on_hand: number;
	threshold: number;
	shortfall: number;
}

export interface FleetValueGroup {
	id: string;
	name: string;
	currency: string;
	assets: number;
	total_value: string | number;
}

export interface FleetValue {
	by_manufacturer: FleetValueGroup[];
	by_department: FleetValueGroup[];
	totals: { currency: string; assets: number; total_value: string | number }[];
}

export function getAssetStatus(): Promise<AssetStatusBucket[]> {
	return apiRequest<AssetStatusBucket[]>('/dashboard/asset-status');
}

export function getExpirations(): Promise<Expirations> {
	return apiRequest<Expirations>('/dashboard/expirations');
}

export function getLowStock(): Promise<LowStockRow[]> {
	return apiRequest<LowStockRow[]>('/dashboard/low-stock');
}

export function getFleetValue(): Promise<FleetValue> {
	return apiRequest<FleetValue>('/dashboard/fleet-value');
}
