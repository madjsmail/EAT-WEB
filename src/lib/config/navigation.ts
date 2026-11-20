import LayoutDashboardIcon from "@lucide/svelte/icons/layout-dashboard";
import PackageIcon from "@lucide/svelte/icons/package";
import type { Component } from "svelte";

export interface NavLink {
	/** Message key resolved with `t()` so the label follows the active locale. */
	titleKey: string;
	href: string;
	icon: Component;
}

export interface NavGroup {
	labelKey: string;
	links: NavLink[];
}

/** Every sidebar destination lives here, in one typed array. */
export const links: NavLink[] = [
	{
		titleKey: "nav.dashboard",
		href: "/dashboard",
		icon: LayoutDashboardIcon,
	},
	{
		titleKey: "nav.assets",
		href: "/dashboard/table-demo",
		icon: PackageIcon,
	},
];

export const navGroups: NavGroup[] = [
	{ labelKey: "nav.group.admin", links },
	{ labelKey: "nav.group.settings", links: [] },
	{ labelKey: "nav.group.org", links: [] },
];
