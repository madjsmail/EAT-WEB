import { apiRequest } from './client.js';

export type PreferredLocale = 'en' | 'fr' | 'ar';

export interface UserProfile {
	id: string;
	organization_id: string;
	email: string;
	first_name: string;
	last_name: string;
	name: string;
	phone_number: string | null;
	avatar_url: string | null;
	status: 'invited' | 'active' | 'suspended' | 'offboarded';
	preferred_locale: PreferredLocale;
	auth_provider: string;
	employee_id: string | null;
	job_title: string | null;
	roles: string[];
	role: string | null;
	email_verified_at: string | null;
	last_login_at: string | null;
	created_at: string;
	updated_at: string;
}

/** Only these fields are self-editable; the API ignores everything else. */
export interface ProfileUpdate {
	first_name?: string;
	last_name?: string;
	phone_number?: string;
	avatar_url?: string;
	preferred_locale?: PreferredLocale;
}

export interface PasswordChange {
	current_password: string;
	new_password: string;
}

export function getProfile(): Promise<UserProfile> {
	return apiRequest<UserProfile>('/me');
}

export function updateProfile(payload: ProfileUpdate): Promise<UserProfile> {
	return apiRequest<UserProfile>('/me', {
		method: 'PATCH',
		body: JSON.stringify(payload)
	});
}

export function changePassword(payload: PasswordChange): Promise<{ revoked_sessions: number }> {
	return apiRequest<{ revoked_sessions: number }>('/me/password', {
		method: 'POST',
		body: JSON.stringify(payload)
	});
}
