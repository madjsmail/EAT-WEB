<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import * as Sidebar from '#lib/components/ui/sidebar/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import AppSidebar from '#lib/components/app-sidebar.svelte';
	import SiteHeader from '#lib/components/site-header.svelte';
	import { session } from '#lib/stores/session.svelte.js';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	onMount(async () => {
		if (await session.ensure()) return;

		await goto(resolve('/login'), { replace: true });
	});
</script>

{#if !session.ready}
	<div class="flex min-h-svh flex-col gap-4 p-6">
		<Skeleton class="h-8 w-48" />
		<Skeleton class="h-64 w-full" />
		<Skeleton class="h-64 w-full" />
	</div>
{:else if session.user}
	<div class="[--header-height:calc(--spacing(14))]">
		<Sidebar.Provider class="flex flex-col">
			<SiteHeader />
			<div class="flex flex-1">
				<AppSidebar />
				<Sidebar.Inset>
					<div class="flex flex-1 flex-col gap-4 px-4 py-10">
						{@render children()}
					</div>
				</Sidebar.Inset>
			</div>
		</Sidebar.Provider>
	</div>
{/if}
