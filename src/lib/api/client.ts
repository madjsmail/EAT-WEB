import { getLocale } from '#lib/paraglide/runtime.js';

export interface ApiErrorItem {
	field: string | null;
	code: string;
	message: string;
}

export interface Pagination {
	page: number;
	per_page: number;
	total: number;
	total_pages: number;
}

export interface Page<T> {
	items: T[];
	pagination: Pagination;
}

interface ApiEnvelope<T> {
	error: boolean;
	status: number;
	data: T;
	pagination?: Pagination;
	message: string;
	error_stack?: ApiErrorItem[];
}

/** Build a query string, dropping empty values and repeating array params. */
export function buildQuery(params: object): string {
	const query = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value === undefined || value === null || value === '') continue;
		if (Array.isArray(value)) {
			for (const item of value) {
				if (item === undefined || item === null || item === '') continue;
				query.append(key, String(item));
			}
			continue;
		}
		query.set(key, String(value));
	}
	const encoded = query.toString();
	return encoded ? `?${encoded}` : '';
}

export class ApiError extends Error {
	readonly status: number;
	readonly code: string;
	readonly field: string | null;
	/** Every entry from the envelope, so forms can show each field error inline. */
	readonly errors: ApiErrorItem[];

	constructor(
		status: number,
		message: string,
		code = 'error',
		field: string | null = null,
		errors: ApiErrorItem[] = []
	) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
		this.code = code;
		this.field = field;
		this.errors = errors.length > 0 ? errors : field ? [{ field, code, message }] : [];
	}

	/** Message registered for a specific form field, when the API reported one. */
	fieldError(field: string): string | null {
		return this.errors.find((item) => item.field === field)?.message ?? null;
	}

	get isUnauthorized(): boolean {
		return this.status === 401;
	}
}

/** Same-origin path; Vite proxies it to the Rust API in development. */
const API_BASE = '/v1/api';

async function request<T>(
	path: string,
	init: RequestInit = {},
	fetchImpl: typeof fetch = fetch
): Promise<ApiEnvelope<T>> {
	const headers = new Headers(init.headers);
	const isForm = init.body instanceof FormData;
	if (init.body && !isForm && !headers.has('content-type')) {
		headers.set('content-type', 'application/json');
	}
	if (!headers.has('accept-language')) {
		headers.set('accept-language', getLocale());
	}

	let response: Response;
	try {
		response = await fetchImpl(`${API_BASE}${path}`, {
			...init,
			headers,
			credentials: 'include'
		});
	} catch {
		throw new ApiError(0, 'Network request failed', 'network_error');
	}

	// An expired/revoked session only shows up as 401 on the next API call.
	// Auth endpoints are excluded so a bad password stays a form error.
	if (
		response.status === 401 &&
		!path.startsWith('/auth/') &&
		typeof window !== 'undefined' &&
		window.location.pathname !== '/login'
	) {
		window.location.assign('/login');
	}

	const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
	if (!response.ok || payload?.error || !payload) {
		const errors = payload?.error_stack ?? [];
		const first = errors[0];
		throw new ApiError(
			response.status,
			first?.message ?? payload?.message ?? response.statusText,
			first?.code ?? 'error',
			first?.field ?? null,
			errors
		);
	}

	return payload;
}

export async function apiRequest<T>(
	path: string,
	init: RequestInit = {},
	fetchImpl: typeof fetch = fetch
): Promise<T> {
	const payload = await request<T>(path, init, fetchImpl);
	return payload.data;
}

/** Same as `apiRequest`, but keeps the envelope pagination metadata. */
export async function apiRequestPage<T>(
	path: string,
	init: RequestInit = {},
	fetchImpl: typeof fetch = fetch
): Promise<Page<T>> {
	const payload = await request<T[]>(path, init, fetchImpl);
	return {
		items: payload.data ?? [],
		pagination: payload.pagination ?? {
			page: 1,
			per_page: (payload.data ?? []).length,
			total: (payload.data ?? []).length,
			total_pages: 1
		}
	};
}
