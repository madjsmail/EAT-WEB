<script lang="ts">
	import { page } from "$app/state";
	import SidebarIcon from "@lucide/svelte/icons/sidebar";
	import * as Breadcrumb from "#lib/components/ui/breadcrumb/index.js";
	import * as Sidebar from "#lib/components/ui/sidebar/index.js";
	import { Button } from "#lib/components/ui/button/index.js";
	import { Separator } from "#lib/components/ui/separator/index.js";
	import { links } from "#lib/config/navigation.js";
	import { t } from "#lib/i18n/index.js";
	import LocaleSwitcher from "./locale-switcher.svelte";
	import ScanInput from "./scan-input.svelte";
	import SearchForm from "./search-form.svelte";
	import ThemeSwatches from "./theme-swatches.svelte";

	const sidebar = Sidebar.useSidebar();
	const pathname = $derived(page.url.pathname.replace(/\/+$/, "") || "/");
	const currentLink = $derived(links.find((link) => link.href === pathname));
</script>

<header class="sticky top-0 z-50 flex w-full items-center border-b bg-background">
	<div class="flex h-(--header-height) w-full items-center gap-2 px-4">
		<Button
			class="size-8"
			variant="ghost"
			size="icon"
			aria-label={t("nav.toggleSidebar")}
			onclick={sidebar.toggle}
		>
			<SidebarIcon />
		</Button>
		<Separator orientation="vertical" class="me-2 data-vertical:h-4 data-vertical:self-auto" />
		<Breadcrumb.Root class="hidden sm:block" aria-label={t("nav.breadcrumb")}>
			<Breadcrumb.List>
				{#if pathname === "/dashboard" || !currentLink}
					<Breadcrumb.Item>
						<Breadcrumb.Page>{t("nav.dashboard")}</Breadcrumb.Page>
					</Breadcrumb.Item>
				{:else}
					<Breadcrumb.Item>
						<Breadcrumb.Link href="/dashboard">{t("nav.dashboard")}</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator />
					<Breadcrumb.Item>
						<Breadcrumb.Page>{t(currentLink.titleKey)}</Breadcrumb.Page>
					</Breadcrumb.Item>
				{/if}
			</Breadcrumb.List>
		</Breadcrumb.Root>
		<ScanInput />
		<SearchForm class="min-w-0 flex-1 sm:ms-auto sm:max-w-64" />
		<LocaleSwitcher />
		<ThemeSwatches />
	</div>
</header>
