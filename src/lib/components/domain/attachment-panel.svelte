<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import UploadIcon from '@lucide/svelte/icons/upload';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import { ApiError, type Pagination } from '#lib/api/client.js';
	import {
		ALLOWED_ATTACHMENT_TYPES,
		MAX_ATTACHMENT_BYTES,
		deleteAttachment,
		formatFileSize,
		getAttachmentUrl,
		listAttachments,
		uploadAttachment,
		type AttachableType,
		type Attachment
	} from '#lib/api/attachments.js';
	import { t } from '#lib/i18n/index.js';
	import { session } from '#lib/stores/session.svelte.js';
	import { formatDate } from '#lib/utils.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import * as Table from '#lib/components/ui/table/index.js';

	let {
		attachableType,
		attachableId
	}: {
		attachableType: AttachableType;
		attachableId: string;
	} = $props();

	const canWrite = $derived(session.has('attachments.write'));

	let rows = $state<Attachment[]>([]);
	let pagination = $state<Pagination>({ page: 1, per_page: 20, total: 0, total_pages: 0 });
	let loading = $state(true);
	let error = $state<string | null>(null);
	let uploading = $state(false);
	let deletingId = $state<string | null>(null);
	let category = $state('other');

	const categories = ['invoice', 'warranty', 'photo', 'manual', 'contract', 'other'];

	/** Map the API error code to a message; field errors keep the form inline. */
	function uploadError(cause: unknown): string {
		if (!(cause instanceof ApiError) || cause.status <= 0) return t('auth.genericError');
		const key = `attachments.error.${cause.code}`;
		const message = t(key);
		return message === key ? cause.message : message;
	}

	async function load(page = 1) {
		loading = true;
		error = null;
		try {
			const result = await listAttachments({
				attachable_type: attachableType,
				attachable_id: attachableId,
				page,
				per_page: pagination.per_page
			});
			rows = result.items;
			pagination = result.pagination;
		} catch (cause) {
			error =
				cause instanceof ApiError && cause.status > 0 ? cause.message : t('auth.genericError');
		} finally {
			loading = false;
		}
	}

	async function upload(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		if (file.size === 0) {
			toast.error(t('attachments.error.required'));
			input.value = '';
			return;
		}
		if (file.size > MAX_ATTACHMENT_BYTES) {
			toast.error(t('attachments.error.too_large'));
			input.value = '';
			return;
		}
		if (!ALLOWED_ATTACHMENT_TYPES.some((prefix) => file.type.startsWith(prefix))) {
			toast.error(t('attachments.error.unsupported_type'));
			input.value = '';
			return;
		}

		uploading = true;
		try {
			await uploadAttachment({
				attachable_type: attachableType,
				attachable_id: attachableId,
				category: category || 'other',
				file
			});
			toast.success(t('attachments.uploaded'));
			await load(1);
		} catch (cause) {
			toast.error(uploadError(cause));
		} finally {
			uploading = false;
			input.value = '';
		}
	}

	async function open(attachment: Attachment) {
		try {
			const { url } = await getAttachmentUrl(attachment.id);
			const link = document.createElement('a');
			link.href = url;
			link.target = '_blank';
			link.rel = 'noopener';
			link.click();
		} catch (cause) {
			toast.error(uploadError(cause));
		}
	}

	async function remove(attachment: Attachment) {
		if (!confirm(t('attachments.confirmDelete'))) return;
		deletingId = attachment.id;
		try {
			await deleteAttachment(attachment.id);
			toast.success(t('attachments.deleted'));
			await load(pagination.page);
		} catch (cause) {
			toast.error(uploadError(cause));
		} finally {
			deletingId = null;
		}
	}

	onMount(() => {
		void load();
	});
</script>

<div class="flex flex-col gap-4">
	<div class="flex flex-col gap-1">
		<h2 class="text-sm font-medium">{t('attachments.title')}</h2>
		<p class="text-xs text-muted-foreground">{t('attachments.description')}</p>
	</div>

	{#if canWrite}
		<div class="flex flex-wrap items-end gap-2">
			<div class="flex flex-col gap-1.5">
				<label class="text-xs font-medium" for="attachment-category">
					{t('attachments.category')}
				</label>
				<Input
					id="attachment-category"
					class="h-9 w-40"
					list="attachment-categories"
					bind:value={category}
				/>
				<datalist id="attachment-categories">
					{#each categories as value (value)}
						<option value={value}>{t(`attachments.category.${value}`)}</option>
					{/each}
				</datalist>
			</div>
			<div class="flex flex-col gap-1.5">
				<label class="text-xs font-medium" for="attachment-file">{t('attachments.file')}</label>
				<Input
					id="attachment-file"
					class="h-9"
					type="file"
					disabled={uploading}
					onchange={upload}
				/>
				<p class="text-xs text-muted-foreground">{t('attachments.limits')}</p>
			</div>
			{#if uploading}
				<span class="flex items-center gap-1 pb-2 text-xs text-muted-foreground">
					<UploadIcon class="size-3 animate-pulse" />
					{t('attachments.uploading')}
				</span>
			{/if}
		</div>
	{/if}

	{#if loading}
		<div class="flex flex-col gap-2">
			<Skeleton class="h-8 w-full" />
			<Skeleton class="h-8 w-full" />
		</div>
	{:else if error}
		<div class="flex items-center gap-3">
			<p class="text-sm text-destructive">{error}</p>
			<Button variant="outline" size="sm" onclick={() => load(pagination.page)}>
				{t('table.retry')}
			</Button>
		</div>
	{:else if rows.length === 0}
		<p class="text-sm text-muted-foreground">{t('attachments.empty')}</p>
	{:else}
		<div class="overflow-x-auto">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>{t('attachments.fileName')}</Table.Head>
						<Table.Head>{t('attachments.category')}</Table.Head>
						<Table.Head class="hidden sm:table-cell">{t('attachments.size')}</Table.Head>
						<Table.Head class="hidden md:table-cell">{t('attachments.uploader')}</Table.Head>
						<Table.Head class="hidden md:table-cell">{t('attachments.uploadedAt')}</Table.Head>
						<Table.Head class="w-0">{t('common.actions')}</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each rows as attachment (attachment.id)}
						<Table.Row>
							<Table.Cell class="max-w-64 truncate font-medium">{attachment.file_name}</Table.Cell>
							<Table.Cell>
								<span class="inline-flex rounded-full border bg-muted px-2 py-0.5 text-xs">
									{t(`attachments.category.${attachment.category}`)}
								</span>
							</Table.Cell>
							<Table.Cell class="hidden text-muted-foreground sm:table-cell">
								{formatFileSize(attachment.size_bytes)}
							</Table.Cell>
							<Table.Cell class="hidden text-muted-foreground md:table-cell">
								{attachment.uploaded_by_name ?? '—'}
							</Table.Cell>
							<Table.Cell class="hidden text-muted-foreground md:table-cell">
								{formatDate(attachment.created_at)}
							</Table.Cell>
							<Table.Cell>
								<div class="flex justify-end gap-1">
									<Button
										variant="ghost"
										size="icon-sm"
										aria-label={t('attachments.open')}
										onclick={() => open(attachment)}
									>
										<DownloadIcon />
									</Button>
									{#if canWrite}
										<Button
											variant="ghost"
											size="icon-sm"
											class="text-destructive"
											aria-label={t('common.delete')}
											disabled={deletingId === attachment.id}
											onclick={() => remove(attachment)}
										>
											<Trash2Icon />
										</Button>
									{/if}
								</div>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
		{#if pagination.total_pages > 1}
			<div class="flex items-center justify-end gap-2">
				<Button
					variant="outline"
					size="sm"
					disabled={pagination.page <= 1}
					onclick={() => load(pagination.page - 1)}
				>
					{t('pagination.previous')}
				</Button>
				<span class="text-xs text-muted-foreground">
					{pagination.page} / {pagination.total_pages}
				</span>
				<Button
					variant="outline"
					size="sm"
					disabled={pagination.page >= pagination.total_pages}
					onclick={() => load(pagination.page + 1)}
				>
					{t('pagination.next')}
				</Button>
			</div>
		{/if}
	{/if}
</div>
