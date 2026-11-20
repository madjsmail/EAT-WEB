import CableIcon from '@lucide/svelte/icons/cable';
import KeyRoundIcon from '@lucide/svelte/icons/key-round';
import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard';
import MailPlusIcon from '@lucide/svelte/icons/mail-plus';
import MonitorSmartphoneIcon from '@lucide/svelte/icons/monitor-smartphone';
import UsersIcon from '@lucide/svelte/icons/users';
import PackageIcon from '@lucide/svelte/icons/package';
import PackageOpenIcon from '@lucide/svelte/icons/package-open';
import BoxesIcon from '@lucide/svelte/icons/boxes';
import WrenchIcon from '@lucide/svelte/icons/wrench';
import ScrollTextIcon from '@lucide/svelte/icons/scroll-text';
import TagsIcon from '@lucide/svelte/icons/tags';
import FactoryIcon from '@lucide/svelte/icons/factory';
import CircleDotIcon from '@lucide/svelte/icons/circle-dot';
import Building2Icon from '@lucide/svelte/icons/building-2';
import MapPinIcon from '@lucide/svelte/icons/map-pin';
import TruckIcon from '@lucide/svelte/icons/truck';
import TrendingDownIcon from '@lucide/svelte/icons/trending-down';
import type { Component } from 'svelte';

/** Advisory counter rendered next to the label; sourced from the alerts store. */
export type NavBadge = 'lowStock' | 'licenseExpiring';

/** Static destinations only — sidebar entries never take route params. */
export type NavHref =
	| '/dashboard'
	| '/dashboard/users'
	| '/dashboard/assets'
	| '/dashboard/products'
	| '/dashboard/accessories'
	| '/dashboard/consumables'
	| '/dashboard/licenses'
	| '/dashboard/maintenances'
	| '/dashboard/audit-logs'
	| '/dashboard/invitations'
	| '/dashboard/settings/lookups/categories'
	| '/dashboard/settings/lookups/manufacturers'
	| '/dashboard/settings/lookups/statuses'
	| '/dashboard/settings/lookups/departments'
	| '/dashboard/settings/lookups/locations'
	| '/dashboard/settings/lookups/suppliers'
	| '/dashboard/settings/lookups/depreciation-models'
	| '/dashboard/settings/sessions';

export interface NavLink {
	/** Message key resolved with `t()` so the label follows the active locale. */
	titleKey: string;
	href: NavHref;
	icon: Component;
	/** When set, the link is only rendered for sessions holding this permission. */
	permission?: string;
	badge?: NavBadge;
}

export interface NavGroup {
	labelKey: string;
	links: NavLink[];
}

/** Every sidebar destination lives here, in one typed array. */
export const navGroups: NavGroup[] = [
	{
		labelKey: 'nav.group.admin',
		links: [
			{
				titleKey: 'nav.dashboard',
				href: '/dashboard',
				icon: LayoutDashboardIcon
			},
			{
				titleKey: 'nav.users',
				href: '/dashboard/users',
				icon: UsersIcon,
				permission: 'users.read'
			},
			{
				titleKey: 'nav.assets',
				href: '/dashboard/assets',
				icon: PackageIcon,
				permission: 'assets.read'
			},
			{
				titleKey: 'nav.products',
				href: '/dashboard/products',
				icon: BoxesIcon,
				permission: 'products.read'
			},
			{
				titleKey: 'nav.accessories',
				href: '/dashboard/accessories',
				icon: CableIcon,
				permission: 'accessories.read'
			},
			{
				titleKey: 'nav.consumables',
				href: '/dashboard/consumables',
				icon: PackageOpenIcon,
				permission: 'consumables.read',
				badge: 'lowStock'
			},
			{
				titleKey: 'nav.licenses',
				href: '/dashboard/licenses',
				icon: KeyRoundIcon,
				permission: 'licenses.read',
				badge: 'licenseExpiring'
			},
			{
				titleKey: 'nav.maintenances',
				href: '/dashboard/maintenances',
				icon: WrenchIcon,
				permission: 'maintenances.read'
			},
			{
				titleKey: 'nav.auditLogs',
				href: '/dashboard/audit-logs',
				icon: ScrollTextIcon,
				permission: 'audit.read'
			},
			{
				titleKey: 'nav.invitations',
				href: '/dashboard/invitations',
				icon: MailPlusIcon,
				permission: 'invitations.read'
			}
		]
	},
	{
		labelKey: 'nav.group.lookups',
		links: [
			{
				titleKey: 'lookup.categories.title',
				href: '/dashboard/settings/lookups/categories',
				icon: TagsIcon,
				permission: 'lookups.read'
			},
			{
				titleKey: 'lookup.manufacturers.title',
				href: '/dashboard/settings/lookups/manufacturers',
				icon: FactoryIcon,
				permission: 'lookups.read'
			},
			{
				titleKey: 'lookup.statuses.title',
				href: '/dashboard/settings/lookups/statuses',
				icon: CircleDotIcon,
				permission: 'lookups.read'
			},
			{
				titleKey: 'lookup.departments.title',
				href: '/dashboard/settings/lookups/departments',
				icon: Building2Icon,
				permission: 'lookups.read'
			},
			{
				titleKey: 'lookup.locations.title',
				href: '/dashboard/settings/lookups/locations',
				icon: MapPinIcon,
				permission: 'lookups.read'
			},
			{
				titleKey: 'lookup.suppliers.title',
				href: '/dashboard/settings/lookups/suppliers',
				icon: TruckIcon,
				permission: 'lookups.read'
			},
			{
				titleKey: 'lookup.depreciationModels.title',
				href: '/dashboard/settings/lookups/depreciation-models',
				icon: TrendingDownIcon,
				permission: 'lookups.read'
			}
		]
	},
	{
		labelKey: 'nav.group.settings',
		links: [
			{
				titleKey: 'nav.sessions',
				href: '/dashboard/settings/sessions',
				icon: MonitorSmartphoneIcon
			}
		]
	}
];

/** Flat list used by the breadcrumb. */
export const links: NavLink[] = navGroups.flatMap((group) => group.links);
