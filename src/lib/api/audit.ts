import { apiRequestPage, buildQuery, type Page } from './client.js';

export interface AuditChange {
	field: string;
	old: unknown;
	new: unknown;
}

export interface AuditEntry {
	id: string;
	event: string;
	auditable_type: string;
	auditable_id: string;
	actor_id: string | null;
	/** Resolved full name; `"System"` when the change has no actor. */
	actor_name: string | null;
	actor_email: string | null;
	actor_ip: string | null;
	actor_user_agent: string | null;
	old_values: Record<string, unknown> | null;
	new_values: Record<string, unknown> | null;
	diff: Record<string, unknown> | null;
	changes: AuditChange[];
	metadata: Record<string, unknown> | null;
	created_at: string;
}

export interface AuditFilters {
	actor_id?: string;
	auditable_type?: string;
	auditable_id?: string;
	/** Repeated `event=` params. */
	event?: string[];
	date_from?: string;
	date_to?: string;
	search?: string;
	page?: number;
	per_page?: number;
}

/** Audit trail is read-only: no create, update or delete. */
export function listAuditLogs(filters: AuditFilters = {}): Promise<Page<AuditEntry>> {
	return apiRequestPage<AuditEntry>(`/audit-logs${buildQuery(filters)}`);
}
