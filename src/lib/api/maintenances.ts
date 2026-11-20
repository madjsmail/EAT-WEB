import { apiRequest, apiRequestPage, buildQuery, type Page } from './client.js';

export type MaintenanceStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';

export interface Maintenance {
	id: string;
	asset_id: string;
	asset_tag: string | null;
	asset_name: string | null;
	title: string;
	description: string | null;
	maintenance_type: string;
	priority: string;
	status: MaintenanceStatus;
	supplier_id: string | null;
	supplier_name: string | null;
	rma_reference: string | null;
	assigned_user_id: string | null;
	assigned_user_name: string | null;
	scheduled_at: string | null;
	cost: string | number | null;
	currency: string;
	completion_notes: string | null;
	cancel_reason: string | null;
	previous_status_id: string | null;
	previous_status_name: string | null;
	completed_at: string | null;
	created_at: string;
	updated_at: string;
}

export interface MaintenancePayload {
	asset_id: string;
	title: string;
	description?: string | null;
	maintenance_type: string;
	priority: string;
	supplier_id?: string | null;
	rma_reference?: string | null;
	assigned_user_id?: string | null;
	scheduled_at?: string | null;
	cost?: string | null;
	currency?: string;
}

export interface MaintenanceFilters {
	q?: string;
	asset_id?: string;
	status?: string;
	maintenance_type?: string;
	priority?: string;
	page?: number;
	per_page?: number;
}

export function listMaintenances(filters: MaintenanceFilters = {}): Promise<Page<Maintenance>> {
	return apiRequestPage<Maintenance>(`/maintenances${buildQuery(filters)}`);
}

export function getMaintenance(id: string): Promise<Maintenance> {
	return apiRequest<Maintenance>(`/maintenances/${id}`);
}

export function createMaintenance(payload: MaintenancePayload): Promise<Maintenance> {
	return apiRequest<Maintenance>('/maintenances', {
		method: 'POST',
		body: JSON.stringify(payload)
	});
}

export function updateMaintenance(
	id: string,
	payload: Partial<MaintenancePayload>
): Promise<Maintenance> {
	return apiRequest<Maintenance>(`/maintenances/${id}`, {
		method: 'PATCH',
		body: JSON.stringify(payload)
	});
}

export function startMaintenance(id: string): Promise<Maintenance> {
	return apiRequest<Maintenance>(`/maintenances/${id}/start`, { method: 'POST' });
}

export function completeMaintenance(
	id: string,
	payload: { completion_notes: string; cost?: string | null; restore_status_id?: string | null }
): Promise<Maintenance> {
	return apiRequest<Maintenance>(`/maintenances/${id}/complete`, {
		method: 'POST',
		body: JSON.stringify(payload)
	});
}

export function cancelMaintenance(
	id: string,
	payload: { reason: string }
): Promise<Maintenance> {
	return apiRequest<Maintenance>(`/maintenances/${id}/cancel`, {
		method: 'POST',
		body: JSON.stringify(payload)
	});
}

export function deleteMaintenance(id: string): Promise<void> {
	return apiRequest<void>(`/maintenances/${id}`, { method: 'DELETE' });
}

/** Closed tickets are read-only: the backend answers 409 on edit. */
export function isClosed(status: string): boolean {
	return status === 'completed' || status === 'cancelled';
}

export type MaintenanceAction = 'start' | 'complete' | 'cancel';

/** Only transitions the backend accepts, per status. */
export function legalActions(status: string): MaintenanceAction[] {
	if (status === 'open') return ['start', 'cancel'];
	if (status === 'in_progress') return ['complete', 'cancel'];
	return [];
}
