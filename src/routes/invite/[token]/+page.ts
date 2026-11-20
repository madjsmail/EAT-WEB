import { ApiError } from '#lib/api/client.js';
import { previewInvitation } from '#lib/api/invitations.js';
import type { PageLoad } from './$types';

// The API lives on another origin in development; fetch it from the browser.
export const ssr = false;

export const load: PageLoad = async ({ params, fetch }) => {
	try {
		return { preview: await previewInvitation(params.token, fetch), errorStatus: 0, errorCode: '' };
	} catch (cause) {
		const apiError = cause instanceof ApiError ? cause : null;
		return {
			preview: null,
			errorStatus: apiError?.status ?? 0,
			errorCode: apiError?.code ?? 'network_error'
		};
	}
};
