<script lang="ts">
	import * as Avatar from "#lib/components/ui/avatar/index.js";
	import * as Sidebar from "#lib/components/ui/sidebar/index.js";

	let {
		user,
	}: {
		user: {
			name: string;
			email: string;
		};
	} = $props();

	const initials = $derived(
		user.name
			.split(/\s+/)
			.map((part) => part[0])
			.join("")
			.padEnd(2, user.name[1] ?? "")
			.slice(0, 2)
			.toUpperCase(),
	);
</script>

<Sidebar.Menu>
	<Sidebar.MenuItem>
		<div class="flex items-center gap-2 rounded-md p-2">
			<Avatar.Root class="size-8 rounded-lg">
				<Avatar.Fallback class="rounded-lg">{initials}</Avatar.Fallback>
			</Avatar.Root>
			<div class="grid flex-1 text-start text-sm leading-tight">
				<span class="truncate font-medium">{user.name}</span>
				<span class="truncate text-xs text-muted-foreground">{user.email}</span>
			</div>
		</div>
	</Sidebar.MenuItem>
</Sidebar.Menu>
