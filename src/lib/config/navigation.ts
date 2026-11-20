import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard';
import MailPlusIcon from '@lucide/svelte/icons/mail-plus';
import MonitorSmartphoneIcon from '@lucide/svelte/icons/monitor-smartphone';
import PackageIcon from '@lucide/svelte/icons/package';
import type { Component } from 'svelte';

export interface NavLink {
	/** Message key resolved with `t()` so the label follows the active locale. */
	titleKey: string;
	href: string;
	icon: Component;
	/** When set, the link is only rendered for sessions holding this permission. */
	permission?: string;
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
				href: '/dashboard/table-demo',
				icon: PackageIcon
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
				titleKey: 'nav.sessions',
				href: '/dashboard/settings/sessions',
				icon: MonitorSmartphoneIcon
			}
		]
	}
];

/** Flat list used by the breadcrumb. */
export const links: NavLink[] = navGroups.flatMap((group) => group.links);
