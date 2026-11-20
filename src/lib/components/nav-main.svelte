<script lang="ts">
	import { page } from "$app/state";
	import * as Sidebar from "#lib/components/ui/sidebar/index.js";
	import { t } from "#lib/i18n/index.js";
	import type { NavLink } from "#lib/config/navigation.js";

	let { label, links }: { label: string; links: NavLink[] } = $props();

	function isActive(href: string) {
		const path = page.url.pathname.replace(/\/$/, "") || "/";
		return path === href || (href !== "/dashboard" && path.startsWith(`${href}/`));
	}
</script>

<Sidebar.Group>
	<Sidebar.GroupLabel>{label}</Sidebar.GroupLabel>
	{#if links.length}
		<Sidebar.Menu>
			{#each links as item (item.href)}
				<Sidebar.MenuItem>
					<Sidebar.MenuButton isActive={isActive(item.href)} tooltipContent={t(item.titleKey)}>
						{#snippet child({ props })}
							<a
								href={item.href}
								aria-current={isActive(item.href) ? "page" : undefined}
								{...props}
							>
								<item.icon />
								<span>{t(item.titleKey)}</span>
							</a>
						{/snippet}
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
			{/each}
		</Sidebar.Menu>
	{/if}
</Sidebar.Group>
