<script lang="ts">
	import CheckIcon from "@lucide/svelte/icons/check";
	import MonitorIcon from "@lucide/svelte/icons/monitor";
	import MoonIcon from "@lucide/svelte/icons/moon";
	import SunIcon from "@lucide/svelte/icons/sun";
	import { setMode, userPrefersMode } from "mode-watcher";
	import { Button } from "#lib/components/ui/button/index.js";
	import * as Popover from "#lib/components/ui/popover/index.js";
	import { t } from "#lib/i18n/index.js";
	import { cn } from "#lib/utils.js";

	type ThemeMode = "light" | "dark" | "system";

	const options: Array<{
		value: ThemeMode;
		label: string;
		preview: string;
		bars: string;
	}> = [
		{
			value: "light",
			label: t("theme.light"),
			preview: "border-slate-200 bg-slate-100",
			bars: "bg-slate-400/60",
		},
		{
			value: "dark",
			label: t("theme.dark"),
			preview: "border-slate-700 bg-slate-900",
			bars: "bg-slate-500/70",
		},
		{
			value: "system",
			label: t("theme.system"),
			preview: "border-slate-300 bg-[linear-gradient(90deg,#f1f5f9_50%,#0f172a_50%)]",
			bars: "bg-slate-400/60",
		},
	];

	const currentMode = $derived(userPrefersMode.current as ThemeMode);
	let open = $state(false);
</script>

<Popover.Root bind:open>
	<Popover.Trigger>
		{#snippet child({ props })}
			<Button {...props} variant="ghost" size="icon" class="size-8" aria-label={t("theme.label")}>
				{#if currentMode === "light"}
					<SunIcon class="size-4" />
				{:else if currentMode === "dark"}
					<MoonIcon class="size-4" />
				{:else}
					<MonitorIcon class="size-4" />
				{/if}
			</Button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content align="end" class="w-64 p-2">
		<p class="px-1 pb-2 text-xs font-medium text-muted-foreground">{t("theme.label")}</p>
		<div class="grid grid-cols-3 gap-2">
			{#each options as option (option.value)}
				<button
					type="button"
					aria-pressed={currentMode === option.value}
					class={cn(
						"flex flex-col gap-1.5 rounded-md border p-1.5 text-start transition-colors hover:bg-muted",
						currentMode === option.value && "border-primary ring-1 ring-primary",
					)}
					onclick={() => {
						setMode(option.value);
						open = false;
					}}
				>
					<span
						class={cn(
							"flex h-12 w-full flex-col justify-end gap-1 overflow-hidden rounded border p-1.5",
							option.preview,
						)}
					>
						<span class={cn("h-1 w-2/3 rounded-full", option.bars)}></span>
						<span class={cn("h-1 w-full rounded-full", option.bars, "opacity-70")}></span>
						<span class={cn("h-1 w-1/2 rounded-full", option.bars, "opacity-50")}></span>
					</span>
					<span class="flex items-center justify-between gap-1 text-xs font-medium">
						{option.label}
						{#if currentMode === option.value}
							<CheckIcon class="size-3" />
						{/if}
					</span>
				</button>
			{/each}
		</div>
	</Popover.Content>
</Popover.Root>
