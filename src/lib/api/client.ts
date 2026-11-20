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

/** Build a query string, dropping empty values. */
export function buildQuery(params: object): string {
	const query = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value === undefined || value === null || value === '') continue;
		query.set(key, String(value));
	}
	const encoded = query.toString();
	return encoded ? `?${encoded}` : '';
}

export class ApiError extends Error {
	readonly status: number;
	readonly code: string;
	readonly field: string | null;

	constructor(status: number, message: string, code = 'error', field: string | null = null) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
		this.code = code;
		this.field = field;
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
	if (init.body && !headers.has('content-type')) {
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

	const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
	if (!response.ok || payload?.error || !payload) {
		const first = payload?.error_stack?.[0];
		throw new ApiError(
			response.status,
			first?.message ?? payload?.message ?? response.statusText,
			first?.code ?? 'error',
			first?.field ?? null
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
