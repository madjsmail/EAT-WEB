import { apiRequest } from './client.js';
import type { PreferredLocale } from './me.js';

export type { PreferredLocale } from './me.js';

/** Mirrors the API's MIME whitelist and presigned-PUT size cap. */
export const LOGO_CONTENT_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export type LogoContentType = (typeof LOGO_CONTENT_TYPES)[number];
export const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export interface OrgSettings {
	asset_tag_prefix: string;
	asset_tag_padding: number;
	warranty_alert_days: number;
	license_alert_days: number;
	currency: string;
	require_handover_signature: boolean;
}

export type OrgSettingsUpdate = Partial<OrgSettings>;

export interface Organization {
	id: string;
	name: string;
	slug: string;
	default_locale: PreferredLocale;
	logo_object_key: string | null;
	/** Presigned GET, ~15 min. Do not cache past expiry. */
	logo_url: string | null;
	settings: OrgSettings;
	created_at: string;
	updated_at: string;
}

export interface OrganizationUpdate {
	name?: string;
	default_locale?: PreferredLocale;
	logo_object_key?: string;
	settings?: OrgSettingsUpdate;
}

export interface LogoUploadUrl {
	object_key: string;
	upload_url: string;
	expires_in_seconds: number;
	max_bytes: number;
}

export function getOrganization(): Promise<Organization> {
	return apiRequest<Organization>('/organization');
}

export function updateOrganization(payload: OrganizationUpdate): Promise<Organization> {
	return apiRequest<Organization>('/organization', {
		method: 'PATCH',
		body: JSON.stringify(payload)
	});
}

export function createLogoUploadUrl(payload: {
	file_name: string;
	content_type: LogoContentType;
}): Promise<LogoUploadUrl> {
	return apiRequest<LogoUploadUrl>('/organization/logo/upload-url', {
		method: 'POST',
		body: JSON.stringify(payload)
	});
}
