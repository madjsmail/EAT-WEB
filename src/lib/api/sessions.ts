import { apiRequest } from './client.js';

export interface Session {
	id: string;
	ip_address: string | null;
	user_agent: string | null;
	created_at: string;
	last_seen_at: string;
	expires_at: string;
	current: boolean;
	/** Alias of `current`, kept for API parity. */
	is_current: boolean;
}

export function listSessions(): Promise<Session[]> {
	return apiRequest<Session[]>('/me/sessions');
}

export function revokeSession(id: string): Promise<Record<string, never>> {
	return apiRequest<Record<string, never>>(`/me/sessions/${id}`, { method: 'DELETE' });
}

/** Revokes every device except the one making the request. */
export function revokeAllSessions(): Promise<{ revoked: number }> {
	return apiRequest<{ revoked: number }>('/me/sessions', { method: 'DELETE' });
}
