import { apiRequest } from './client.js';

export interface Role {
	id: string;
	code: string;
	name: string;
	description: string | null;
	is_system: boolean;
}

export interface Invitation {
	id: string;
	organization_id: string;
	email: string;
	phone_number: string | null;
	role_id: string;
	invited_by: string | null;
	status: 'pending' | 'accepted' | 'expired' | 'revoked';
	expires_at: string;
	accepted_at: string | null;
	created_at: string;
}

export interface InvitationResponse {
	id: string;
	email: string;
	phone_number: string | null;
	role_code: string;
	status: string;
	expires_at: string;
	invite_link: string;
}

export interface InvitePreview {
	organization_name: string;
	organization_slug?: string;
	email: string;
	role_name: string;
	expires_at: string;
	status: 'pending' | 'accepted' | 'expired' | 'revoked';
}

export interface CreateInvitationInput {
	email: string;
	phone_number?: string;
	role_id: string;
	expires_in_hours?: number;
}

export interface AcceptInvitationInput {
	token: string;
	password: string;
	first_name: string;
	last_name: string;
	phone_number?: string;
	preferred_locale?: string;
}

/**
 * Backend contract needed by the invite form: `GET /v1/api/roles` returning
 * the roles visible to the current tenant.
 */
export function listRoles(): Promise<Role[]> {
	return apiRequest<Role[]>('/roles');
}

export function createInvitation(input: CreateInvitationInput): Promise<InvitationResponse> {
	return apiRequest<InvitationResponse>('/invitations', {
		method: 'POST',
		body: JSON.stringify(input)
	});
}

export function listInvitations(): Promise<Invitation[]> {
	return apiRequest<Invitation[]>('/invitations');
}

export function revokeInvitation(id: string): Promise<Record<string, never>> {
	return apiRequest<Record<string, never>>(`/invitations/${id}`, { method: 'DELETE' });
}

export function previewInvitation(
	token: string,
	fetchImpl: typeof fetch = fetch
): Promise<InvitePreview> {
	return apiRequest<InvitePreview>(`/invite/${encodeURIComponent(token)}`, {}, fetchImpl);
}

export function acceptInvitation(input: AcceptInvitationInput): Promise<unknown> {
	return apiRequest<unknown>('/invitations/accept', {
		method: 'POST',
		body: JSON.stringify(input)
	});
}
