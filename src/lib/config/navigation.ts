import CableIcon from '@lucide/svelte/icons/cable';
import KeyRoundIcon from '@lucide/svelte/icons/key-round';
import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard';
import MailPlusIcon from '@lucide/svelte/icons/mail-plus';
import MonitorSmartphoneIcon from '@lucide/svelte/icons/monitor-smartphone';
import PackageIcon from '@lucide/svelte/icons/package';
import PackageOpenIcon from '@lucide/svelte/icons/package-open';
import ListTreeIcon from '@lucide/svelte/icons/list-tree';
import BoxesIcon from '@lucide/svelte/icons/boxes';
import WrenchIcon from '@lucide/svelte/icons/wrench';
import ScrollTextIcon from '@lucide/svelte/icons/scroll-text';
import type { Component } from 'svelte';

/** Advisory counter rendered next to the label; sourced from the alerts store. */
export type NavBadge = 'lowStock' | 'licenseExpiring';

/** Static destinations only — sidebar entries never take route params. */
export type NavHref =
	| '/dashboard'
	| '/dashboard/assets'
	| '/dashboard/products'
	| '/dashboard/accessories'
	| '/dashboard/consumables'
	| '/dashboard/licenses'
	| '/dashboard/maintenances'
	| '/dashboard/audit-logs'
	| '/dashboard/invitations'
	| '/dashboard/settings/lookups'
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
		labelKey: 'nav.group.settings',
		links: [
			{
				titleKey: 'nav.lookups',
				href: '/dashboard/settings/lookups',
				icon: ListTreeIcon,
				permission: 'lookups.read'
			},
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
