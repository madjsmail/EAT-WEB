<script lang="ts">
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import { Button } from '#lib/components/ui/button/index.js';
	import { t } from '#lib/i18n/index.js';
	import type { Pagination } from '#lib/api/client.js';

	let { pagination, onpage }: { pagination: Pagination; onpage: (page: number) => void } = $props();
</script>

<div class="flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2">
	<p class="text-xs text-muted-foreground">
		{t('pagination.summary', {
			from: pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.per_page + 1,
			to: Math.min(pagination.page * pagination.per_page, pagination.total),
			total: pagination.total
		})}
	</p>
	<div class="flex items-center gap-1">
		<Button
			variant="outline"
			size="icon-sm"
			aria-label={t('pagination.previous')}
			disabled={pagination.page <= 1}
			onclick={() => onpage(pagination.page - 1)}
		>
			<ChevronLeftIcon />
		</Button>
		<span class="px-2 text-xs text-muted-foreground">
			{pagination.page} / {Math.max(pagination.total_pages, 1)}
		</span>
		<Button
			variant="outline"
			size="icon-sm"
			aria-label={t('pagination.next')}
			disabled={pagination.page >= pagination.total_pages}
			onclick={() => onpage(pagination.page + 1)}
		>
			<ChevronRightIcon />
		</Button>
	</div>
</div>
