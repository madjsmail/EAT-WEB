<script lang="ts" module>
	import CommandIcon from '@lucide/svelte/icons/command';
</script>

<script lang="ts">
	import * as Sidebar from '#lib/components/ui/sidebar/index.js';
	import { navGroups } from '#lib/config/navigation.js';
	import { t } from '#lib/i18n/index.js';
	import { session } from '#lib/stores/session.svelte.js';
	import type { ComponentProps } from 'svelte';
	import NavMain from './nav-main.svelte';
	import NavUser from './nav-user.svelte';

	let { ref = $bindable(null), ...restProps }: ComponentProps<typeof Sidebar.Root> = $props();

	const groups = $derived(
		navGroups
			.map((group) => ({
				...group,
				links: group.links.filter((link) => !link.permission || session.has(link.permission))
			}))
			.filter((group) => group.links.length > 0)
	);
</script>

<Sidebar.Root
	bind:ref
	class="top-(--header-height) h-[calc(100svh_-_var(--header-height))]!"
	{...restProps}
>
	<Sidebar.Header>
		<div class="flex items-center gap-2 px-2 py-1.5">
			<div
				class="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"
			>
				<CommandIcon class="size-4" />
			</div>
			<div class="grid flex-1 text-start text-sm leading-tight">
				<span class="truncate font-medium">{t('nav.appName')}</span>
				<span class="truncate text-xs text-muted-foreground">{t('nav.appTagline')}</span>
			</div>
		</div>
	</Sidebar.Header>
	<Sidebar.Content>
		{#each groups as group (group.labelKey)}
			<NavMain label={t(group.labelKey)} links={group.links} />
		{/each}
	</Sidebar.Content>
	<Sidebar.Footer>
		<NavUser />
	</Sidebar.Footer>
</Sidebar.Root>
