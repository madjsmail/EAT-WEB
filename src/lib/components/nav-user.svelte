<script lang="ts">
	import * as Sidebar from '#lib/components/ui/sidebar/index.js';
	import * as Avatar from '#lib/components/ui/avatar/index.js';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Button } from '#lib/components/ui/button/index.js';
	import { t } from '#lib/i18n/index.js';
	import { session } from '#lib/stores/session.svelte.js';

	let signingOut = $state(false);

	async function signOut() {
		if (signingOut) return;
		signingOut = true;
		try {
			await session.signOut();
			await goto(resolve('/login'), { replace: true });
		} finally {
			signingOut = false;
		}
	}
</script>

<Sidebar.Menu>
	<Sidebar.MenuItem>
		<div class="flex items-center gap-2 rounded-md p-2">
			<Avatar.Root class="size-8 rounded-lg">
				<Avatar.Fallback class="rounded-lg">{session.initials}</Avatar.Fallback>
			</Avatar.Root>
			<div class="grid flex-1 text-start text-sm leading-tight">
				<span class="truncate font-medium">{session.displayName}</span>
				<span class="truncate text-xs text-muted-foreground">{session.user?.email}</span>
			</div>
			<Button
				variant="ghost"
				size="icon-sm"
				aria-label={t('auth.signOut')}
				title={t('auth.signOut')}
				disabled={signingOut}
				onclick={signOut}
			>
				<LogOutIcon />
			</Button>
		</div>
	</Sidebar.MenuItem>
</Sidebar.Menu>
