import { apiRequest, apiRequestPage, buildQuery, type Page } from './client.js';

export type UserStatus = 'invited' | 'active' | 'suspended' | 'offboarded';
export type PreferredLocale = 'en' | 'fr' | 'ar';

/** Trimmed shape used by the searchable user picker. */
export interface UserSummary {
	id: string;
	email: string;
	first_name: string;
	last_name: string;
	status?: string;
}

export interface UserResponse {
	id: string;
	email: string;
	first_name: string;
	last_name: string;
	full_name: string;
	employee_id: string | null;
	job_title: string | null;
	department_id: string | null;
	department_name: string | null;
	location_id: string | null;
	location_name: string | null;
	manager_id: string | null;
	manager_name: string | null;
	preferred_locale: PreferredLocale;
	status: UserStatus;
	avatar_url: string | null;
	phone_number: string | null;
	email_verified_at: string | null;
	last_login_at: string | null;
	created_at: string;
}

export interface UserFilters {
	search?: string;
	department_id?: string;
	location_id?: string;
	status?: UserStatus | '';
	manager_id?: string;
	page?: number;
	per_page?: number;
}

/** Create payload; `role_ids` are assigned in addition to the default employee role. */
export interface UserPayload {
	email?: string;
	first_name?: string;
	last_name?: string;
	employee_id?: string | null;
	job_title?: string | null;
	department_id?: string | null;
	location_id?: string | null;
	manager_id?: string | null;
	preferred_locale?: PreferredLocale;
	phone_number?: string | null;
	role_ids?: string[];
}

export interface CreateUserResult {
	user: UserResponse;
	setup_link: string;
	expires_at: string;
}

export interface PendingReturn {
	id: string;
	entity_type: 'asset' | 'accessory' | 'license';
	entity_id: string;
	label: string;
	quantity: number;
	status: string;
	created_at: string;
}

export interface OffboardInput {
	new_manager_id?: string;
	notes?: string;
}

export interface OffboardResponse {
	user: UserResponse;
	reassigned_reports: number;
	return_requests_created: number;
	pending_returns: PendingReturn[];
}

export interface ImportRowError {
	row: number;
	email: string | null;
	error: string;
}

export interface ImportSummary {
	total_rows: number;
	imported: number;
	failed: number;
	errors: ImportRowError[];
}

export function userLabel(user: UserSummary | UserResponse): string {
	if ('full_name' in user && user.full_name) return user.full_name;
	const name = `${user.first_name} ${user.last_name}`.trim();
	return name || user.email;
}

/** Searchable user picker source (audit actor filter, ticket assignee). */
export function searchUsers(q = '', perPage = 20): Promise<Page<UserSummary>> {
	return apiRequestPage<UserSummary>(`/users${buildQuery({ q, per_page: perPage })}`);
}

export function listUsers(filters: UserFilters = {}): Promise<Page<UserResponse>> {
	return apiRequestPage<UserResponse>(`/users${buildQuery(filters)}`);
}

export function getUser(id: string): Promise<UserResponse> {
	return apiRequest<UserResponse>(`/users/${id}`);
}

export function createUser(payload: UserPayload): Promise<CreateUserResult> {
	return apiRequest<CreateUserResult>('/users', {
		method: 'POST',
		body: JSON.stringify(payload)
	});
}

export function updateUser(id: string, payload: Partial<UserPayload>): Promise<UserResponse> {
	return apiRequest<UserResponse>(`/users/${id}`, {
		method: 'PATCH',
		body: JSON.stringify(payload)
	});
}

export function deleteUser(id: string): Promise<void> {
	return apiRequest<unknown>(`/users/${id}`, { method: 'DELETE' }).then(() => undefined);
}

export function offboardUser(id: string, payload: OffboardInput = {}): Promise<OffboardResponse> {
	return apiRequest<OffboardResponse>(`/users/${id}/offboard`, {
		method: 'POST',
		body: JSON.stringify(payload)
	});
}

export function listDirectReports(id: string): Promise<UserResponse[]> {
	return apiRequest<UserResponse[]>(`/users/${id}/direct-reports`);
}

export function listPendingReturns(id: string): Promise<PendingReturn[]> {
	return apiRequest<PendingReturn[]>(`/users/${id}/pending-returns`);
}

export function importUsers(file: File): Promise<ImportSummary> {
	const body = new FormData();
	body.append('file', file);
	return apiRequest<ImportSummary>('/users/import', { method: 'POST', body });
}
