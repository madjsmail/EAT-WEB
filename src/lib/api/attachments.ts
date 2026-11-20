import { apiRequest, apiRequestPage, buildQuery, type Page } from './client.js';

export type AttachableType =
	| 'asset'
	| 'product'
	| 'maintenance'
	| 'license'
	| 'accessory'
	| 'consumable';

export interface Attachment {
	id: string;
	attachable_type: string;
	attachable_id: string;
	category: string;
	file_name: string;
	mime_type: string;
	size_bytes: number;
	uploaded_by_id: string | null;
	uploaded_by_name: string | null;
	created_at: string;
}

export interface AttachmentUrl {
	attachment_id: string;
	url: string;
	/** Seconds; the presigned URL must be opened immediately. */
	expires_in: number;
}

export interface AttachmentFilters {
	attachable_type: AttachableType | string;
	attachable_id: string;
	page?: number;
	per_page?: number;
}

/** 20 MB, enforced before the request leaves the browser. */
export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

/** MIME allowlist mirrored in the UI; the backend is still authoritative. */
export const ALLOWED_ATTACHMENT_TYPES = [
	'image/',
	'application/pdf',
	'text/',
	'application/zip',
	'application/msword',
	'application/vnd.openxmlformats-officedocument'
];

export function isAllowedFile(file: File): boolean {
	return ALLOWED_ATTACHMENT_TYPES.some((prefix) => file.type.startsWith(prefix));
}

export function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function listAttachments(filters: AttachmentFilters): Promise<Page<Attachment>> {
	return apiRequestPage<Attachment>(`/attachments${buildQuery(filters)}`);
}

/** One request per file, multipart. */
export function uploadAttachment(input: {
	attachable_type: AttachableType | string;
	attachable_id: string;
	category: string;
	file: File;
}): Promise<Attachment> {
	const body = new FormData();
	body.set('attachable_type', input.attachable_type);
	body.set('attachable_id', input.attachable_id);
	body.set('category', input.category);
	body.set('file', input.file);
	return apiRequest<Attachment>('/attachments', { method: 'POST', body });
}

/** Short-lived presigned URL — never cache or pre-fetch. */
export function getAttachmentUrl(id: string): Promise<AttachmentUrl> {
	return apiRequest<AttachmentUrl>(`/attachments/${id}/url`);
}

export function deleteAttachment(id: string): Promise<void> {
	return apiRequest<void>(`/attachments/${id}`, { method: 'DELETE' });
}
