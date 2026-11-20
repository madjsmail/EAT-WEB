import { apiRequestPage, buildQuery, type Page } from './client.js';

export interface UserSummary {
	id: string;
	email: string;
	first_name: string;
	last_name: string;
	status?: string;
}

export function userLabel(user: UserSummary): string {
	const name = `${user.first_name} ${user.last_name}`.trim();
	return name || user.email;
}

/** Searchable user picker source (audit actor filter, ticket assignee). */
export function searchUsers(q = '', perPage = 20): Promise<Page<UserSummary>> {
	return apiRequestPage<UserSummary>(`/users${buildQuery({ q, per_page: perPage })}`);
}
