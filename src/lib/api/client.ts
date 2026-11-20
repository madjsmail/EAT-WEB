export interface ApiErrorItem {
	field: string | null;
	code: string;
	message: string;
}

interface ApiEnvelope<T> {
	error: boolean;
	status: number;
	data: T;
	message: string;
	error_stack?: ApiErrorItem[];
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

export async function apiRequest<T>(
	path: string,
	init: RequestInit = {},
	fetchImpl: typeof fetch = fetch
): Promise<T> {
	const headers = new Headers(init.headers);
	if (init.body && !headers.has('content-type')) {
		headers.set('content-type', 'application/json');
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
	if (!response.ok || payload?.error) {
		const first = payload?.error_stack?.[0];
		throw new ApiError(
			response.status,
			first?.message ?? payload?.message ?? response.statusText,
			first?.code ?? 'error',
			first?.field ?? null
		);
	}

	return payload?.data as T;
}
