import type { Lookup, LookupFamily } from '#lib/api/lookups.js';

export type LookupFieldType =
	'text' | 'email' | 'url' | 'number' | 'textarea' | 'checkbox' | 'select' | 'parent';

export interface LookupField {
	key: string;
	labelKey: string;
	type: LookupFieldType;
	required?: boolean;
	/** Only offered on create (e.g. status code is immutable). */
	createOnly?: boolean;
	options?: { value: string; labelKey?: string }[];
	hintKey?: string;
	step?: string;
}

export interface LookupConfig {
	family: LookupFamily;
	titleKey: string;
	descriptionKey: string;
	/** Secondary table column, resolved from the record. */
	secondary: { labelKey: string; value: (item: Lookup) => string | number | null };
	/** Show the status colour swatch beside the name. */
	color?: boolean;
	/** Render locations as an indented parent/child tree. */
	tree?: boolean;
	fields: LookupField[];
}

export const categoryTypes = ['accessory', 'asset', 'consumable', 'component'];
export const statusTypes = ['deployable', 'deployed', 'undeployable', 'pending', 'archived'];
export const locationTypes = ['site', 'building', 'floor', 'room', 'shelf'];

const enumOptions = (values: string[]) => values.map((value) => ({ value }));

export const lookupConfigs: Record<LookupFamily, LookupConfig> = {
	categories: {
		family: 'categories',
		titleKey: 'lookup.categories.title',
		descriptionKey: 'lookup.categories.description',
		secondary: { labelKey: 'lookup.categoryType', value: (item) => item.category_type ?? null },
		fields: [
			{ key: 'code', labelKey: 'lookup.code', type: 'text', hintKey: 'lookup.codeHint' },
			{
				key: 'category_type',
				labelKey: 'lookup.categoryType',
				type: 'select',
				required: true,
				options: enumOptions(categoryTypes)
			},
			{ key: 'icon_url', labelKey: 'lookup.iconUrl', type: 'url' },
			{
				key: 'skip_checkout_confirmation_emails',
				labelKey: 'lookup.skipEmails',
				type: 'checkbox'
			}
		]
	},
	manufacturers: {
		family: 'manufacturers',
		titleKey: 'lookup.manufacturers.title',
		descriptionKey: 'lookup.manufacturers.description',
		secondary: { labelKey: 'lookup.supportEmail', value: (item) => item.support_email ?? null },
		fields: [
			{ key: 'url', labelKey: 'lookup.url', type: 'url' },
			{ key: 'support_url', labelKey: 'lookup.supportUrl', type: 'url' },
			{ key: 'support_email', labelKey: 'lookup.supportEmail', type: 'email' },
			{ key: 'support_phone', labelKey: 'lookup.phone', type: 'text' },
			{ key: 'logo_url', labelKey: 'lookup.logoUrl', type: 'url' },
			{ key: 'notes', labelKey: 'lookup.notes', type: 'textarea' }
		]
	},
	statuses: {
		family: 'statuses',
		titleKey: 'lookup.statuses.title',
		descriptionKey: 'lookup.statuses.description',
		color: true,
		secondary: { labelKey: 'lookup.statusType', value: (item) => item.status_type ?? null },
		fields: [
			{
				key: 'code',
				labelKey: 'lookup.code',
				type: 'text',
				createOnly: true,
				hintKey: 'lookup.codeLowercaseHint'
			},
			{
				key: 'status_type',
				labelKey: 'lookup.statusType',
				type: 'select',
				required: true,
				options: enumOptions(statusTypes)
			},
			{ key: 'color_code', labelKey: 'lookup.colorCode', type: 'text' },
			{ key: 'show_in_nav', labelKey: 'lookup.showInNav', type: 'checkbox' },
			{ key: 'notes', labelKey: 'lookup.notes', type: 'textarea' }
		]
	},
	departments: {
		family: 'departments',
		titleKey: 'lookup.departments.title',
		descriptionKey: 'lookup.departments.description',
		secondary: { labelKey: 'lookup.email', value: (item) => item.email ?? null },
		fields: [
			{ key: 'code', labelKey: 'lookup.code', type: 'text', hintKey: 'lookup.codeHint' },
			{ key: 'email', labelKey: 'lookup.email', type: 'email' },
			{ key: 'phone_number', labelKey: 'lookup.phone', type: 'text' }
		]
	},
	locations: {
		family: 'locations',
		titleKey: 'lookup.locations.title',
		descriptionKey: 'lookup.locations.description',
		tree: true,
		secondary: { labelKey: 'lookup.city', value: (item) => item.city ?? null },
		fields: [
			{ key: 'code', labelKey: 'lookup.code', type: 'text', hintKey: 'lookup.codeHint' },
			{
				key: 'location_type',
				labelKey: 'lookup.locationType',
				type: 'select',
				options: enumOptions(locationTypes)
			},
			{ key: 'parent_id', labelKey: 'lookup.parent', type: 'parent' },
			{ key: 'address_line1', labelKey: 'lookup.addressLine1', type: 'text' },
			{ key: 'address_line2', labelKey: 'lookup.addressLine2', type: 'text' },
			{ key: 'city', labelKey: 'lookup.city', type: 'text' },
			{ key: 'state_region', labelKey: 'lookup.stateRegion', type: 'text' },
			{ key: 'postal_code', labelKey: 'lookup.postalCode', type: 'text' },
			{ key: 'country_code', labelKey: 'lookup.countryCode', type: 'text' },
			{ key: 'phone_number', labelKey: 'lookup.phone', type: 'text' },
			{ key: 'email', labelKey: 'lookup.email', type: 'email' },
			{ key: 'manager_user_id', labelKey: 'lookup.managerUserId', type: 'text' },
			{ key: 'notes', labelKey: 'lookup.notes', type: 'textarea' },
			{ key: 'is_active', labelKey: 'lookup.isActive', type: 'checkbox' }
		]
	},
	suppliers: {
		family: 'suppliers',
		titleKey: 'lookup.suppliers.title',
		descriptionKey: 'lookup.suppliers.description',
		secondary: { labelKey: 'lookup.contactName', value: (item) => item.contact_name ?? null },
		fields: [
			{ key: 'contact_name', labelKey: 'lookup.contactName', type: 'text' },
			{ key: 'email', labelKey: 'lookup.email', type: 'email' },
			{ key: 'phone_number', labelKey: 'lookup.phone', type: 'text' },
			{ key: 'address', labelKey: 'lookup.address', type: 'textarea' },
			{ key: 'url', labelKey: 'lookup.url', type: 'url' },
			{ key: 'notes', labelKey: 'lookup.notes', type: 'textarea' }
		]
	},
	'depreciation-models': {
		family: 'depreciation-models',
		titleKey: 'lookup.depreciationModels.title',
		descriptionKey: 'lookup.depreciationModels.description',
		secondary: {
			labelKey: 'lookup.months',
			value: (item) => (item.months ? `${item.months} mo` : null)
		},
		fields: [
			{ key: 'months', labelKey: 'lookup.months', type: 'number', required: true },
			{ key: 'floor_value', labelKey: 'lookup.floorValue', type: 'number', step: '0.01' },
			{ key: 'notes', labelKey: 'lookup.notes', type: 'textarea' }
		]
	}
};

export const lookupFamilies = Object.keys(lookupConfigs) as LookupFamily[];
