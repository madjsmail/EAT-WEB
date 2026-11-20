import type { PageLoad } from './$types';
import { makeAssets } from './data.js';

export const load: PageLoad = () => ({
	assets: makeAssets()
});
