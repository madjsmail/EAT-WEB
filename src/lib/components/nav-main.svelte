<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import * as Sidebar from '#lib/components/ui/sidebar/index.js';
	import { t } from '#lib/i18n/index.js';
	import { alerts } from '#lib/stores/alerts.svelte.js';
	import type { NavHref, NavLink } from '#lib/config/navigation.js';

	let { label, links }: { label: string; links: NavLink[] } = $props();

	function isActive(href: NavHref) {
		const path = page.url.pathname.replace(/\/$/, '') || '/';
		return path === href || (href !== '/dashboard' && path.startsWith(`${href}/`));
	}

	function badgeCount(link: NavLink): number {
		if (link.badge === 'lowStock') return alerts.lowStock;
		if (link.badge === 'licenseExpiring') return alerts.licenseExpiring;
		return 0;
	}
</script>

<Sidebar.Group>
	<Sidebar.GroupLabel>{label}</Sidebar.GroupLabel>
	{#if links.length}
		<Sidebar.Menu>
			{#each links as item (item.href)}
				{@const count = badgeCount(item)}
				<Sidebar.MenuItem>
					<Sidebar.MenuButton isActive={isActive(item.href)} tooltipContent={t(item.titleKey)}>
						{#snippet child({ props })}
							<a
								href={resolve(item.href)}
								aria-current={isActive(item.href) ? 'page' : undefined}
								{...props}
							>
								<item.icon />
								<span>{t(item.titleKey)}</span>
								{#if count > 0}
									<span
										class="ms-auto rounded-full bg-sidebar-primary px-1.5 text-xs font-medium text-sidebar-primary-foreground tabular-nums"
										aria-label={t('alerts.count', { count })}
									>
										{count}
									</span>
								{/if}
							</a>
						{/snippet}
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
			{/each}
		</Sidebar.Menu>
	{/if}
</Sidebar.Group>
