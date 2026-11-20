import { apiRequest } from './client.js';

export interface Session {
	id: string;
	ip_address: string | null;
	user_agent: string | null;
	created_at: string;
	expires_at: string;
	current: boolean;
}

export function listSessions(): Promise<Session[]> {
	return apiRequest<Session[]>('/sessions');
}

export function revokeSession(id: string): Promise<Record<string, never>> {
	return apiRequest<Record<string, never>>(`/sessions/${id}`, { method: 'DELETE' });
}

export function revokeAllSessions(): Promise<{ revoked: number }> {
	return apiRequest<{ revoked: number }>('/sessions', { method: 'DELETE' });
}
