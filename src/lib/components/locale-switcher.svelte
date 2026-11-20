<script lang="ts">
	import CheckIcon from "@lucide/svelte/icons/check";
	import GlobeIcon from "@lucide/svelte/icons/globe";
	import { getLocale, locales, setLocale, type Locale } from "#lib/paraglide/runtime.js";
	import { Button } from "#lib/components/ui/button/index.js";
	import * as DropdownMenu from "#lib/components/ui/dropdown-menu/index.js";
	import { t } from "#lib/i18n/index.js";

	const names: Record<Locale, string> = {
		en: "English",
		fr: "Français",
		ar: "العربية",
	};

	const current = getLocale();
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props }: { props: Record<string, any> })}
			<Button
				{...props}
				variant="ghost"
				size="icon"
				class="size-8"
				aria-label={t("locale.change")}
			>
				<GlobeIcon class="size-4" />
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="end" class="min-w-40">
		{#each locales as locale (locale)}
			<DropdownMenu.Item onclick={() => setLocale(locale)}>
				<span class="flex-1">{names[locale]}</span>
				{#if current === locale}
					<CheckIcon class="ms-auto size-4" />
				{/if}
			</DropdownMenu.Item>
		{/each}
	</DropdownMenu.Content>
</DropdownMenu.Root>
