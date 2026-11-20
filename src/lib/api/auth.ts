import { apiRequest } from './client.js';

export interface UserProfile {
	id: string;
	organization_id: string;
	email: string;
	first_name: string;
	last_name: string;
	phone_number: string | null;
	avatar_url: string | null;
	status: string;
	preferred_locale: string;
	auth_provider: string;
	last_login_at: string | null;
}

export interface LoginInput {
	organization_slug: string;
	email: string;
	password: string;
}

export interface LoginResult {
	user: UserProfile;
	permissions: string[];
	session_id: string;
	expires_at: string;
}

export interface MeResult {
	user: UserProfile;
	permissions: string[];
	organization_id: string;
	session_id: string;
}

export function login(input: LoginInput): Promise<LoginResult> {
	return apiRequest<LoginResult>('/auth/login', {
		method: 'POST',
		body: JSON.stringify(input)
	});
}

export function logout(): Promise<Record<string, never>> {
	return apiRequest<Record<string, never>>('/auth/logout', { method: 'POST' });
}

export function me(): Promise<MeResult> {
	return apiRequest<MeResult>('/auth/me');
}
