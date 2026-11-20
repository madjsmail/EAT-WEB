export type AssetStatus = 'in_stock' | 'assigned' | 'in_repair' | 'retired' | 'lost';
export type AssetCategory = 'laptop' | 'phone' | 'monitor' | 'accessory';

export interface Asset {
	id: string;
	asset_tag: string;
	name: string;
	status: AssetStatus;
	category: AssetCategory;
	price: number;
	purchase_date: string;
	custodian: string;
	serial: string;
	imei_1: string;
}

export const STATUSES: AssetStatus[] = ['in_stock', 'assigned', 'in_repair', 'retired', 'lost'];
export const CATEGORIES: AssetCategory[] = ['laptop', 'phone', 'monitor', 'accessory'];

const NAMES: Record<AssetCategory, string[]> = {
	laptop: ['MacBook Pro 14', 'ThinkPad T14', 'Dell XPS 13', 'Surface Laptop 6'],
	phone: ['iPhone 15', 'Pixel 9', 'Galaxy S24', 'iPhone 14'],
	monitor: ['Dell U2723QE', 'LG 27UN850', 'ThinkVision P27', 'Studio Display'],
	accessory: ['Magic Keyboard', 'MX Master 3S', 'USB-C Dock', 'Jabra Evolve2']
};
const CUSTODIANS = [
	'Amina Haddad',
	'Youssef Benali',
	'Claire Dubois',
	'Marc Lefèvre',
	'Sara Amrani',
	''
];

// ponytail: deterministic mock rows until TanStack Query is wired to the API.
// Columns and URL state stay unchanged when the data source is swapped.
export function makeAssets(count = 120): Asset[] {
	return Array.from({ length: count }, (_, index) => {
		const category = CATEGORIES[index % CATEGORIES.length];
		const name = NAMES[category][index % NAMES[category].length];
		const status = STATUSES[index % STATUSES.length];
		const purchased = new Date(2021 + (index % 5), index % 12, (index % 27) + 1);

		return {
			id: `asset-${index + 1}`,
			asset_tag: `EAT-${String(index + 1).padStart(4, '0')}`,
			name,
			status,
			category,
			price: 180 + ((index * 137) % 2800),
			purchase_date: purchased.toISOString(),
			custodian: status === 'assigned' ? CUSTODIANS[index % (CUSTODIANS.length - 1)] : '',
			serial: `SN${String(900000 + index * 37)}`,
			imei_1: category === 'phone' ? `35${String(100000000000 + index * 719)}` : ''
		};
	});
}
