<script lang="ts">
	import UploadIcon from '@lucide/svelte/icons/upload';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import FileSpreadsheetIcon from '@lucide/svelte/icons/file-spreadsheet';
	import CheckCircle2Icon from '@lucide/svelte/icons/check-circle-2';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import { resolve } from '$app/paths';
	import { ApiError } from '#lib/api/client.js';
	import { importUsers, type ImportSummary } from '#lib/api/users.js';
	import { parseCsvHeader } from '#lib/utils/csv.js';
	import { t } from '#lib/i18n/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Table from '#lib/components/ui/table/index.js';

	const REQUIRED_FIELDS = ['first_name', 'last_name', 'email'] as const;
	const OPTIONAL_FIELDS = [
		'employee_id',
		'job_title',
		'department',
		'location',
		'manager_email',
		'preferred_locale',
		'phone_number'
	] as const;
	const KNOWN_FIELDS: string[] = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];
	const MAX_BYTES = 10 * 1024 * 1024;

	let file = $state<File | null>(null);
	let headers = $state<string[] | null>(null);
	let validationError = $state<string | null>(null);
	let dragging = $state(false);
	let uploading = $state(false);
	let uploadError = $state<string | null>(null);
	let summary = $state<ImportSummary | null>(null);

	/** CSV headers are matched case-insensitively, mirroring the server's mapping. */
	const mapped = $derived(
		(headers ?? []).map((header) => {
			const field = header.trim().toLowerCase();
			return { header, field, known: KNOWN_FIELDS.includes(field) };
		})
	);

	const missingRequired = $derived.by(() => {
		if (!headers) return [];
		const present = new Set(mapped.filter((entry) => entry.known).map((entry) => entry.field));
		return REQUIRED_FIELDS.filter((field) => !present.has(field));
	});

	const isCsv = $derived((file?.name ?? '').toLowerCase().endsWith('.csv'));
	const canUpload = $derived(
		file !== null &&
			validationError === null &&
			!uploading &&
			(!isCsv || missingRequired.length === 0)
	);

	async function selectFile(next: File | null) {
		summary = null;
		uploadError = null;
		validationError = null;
		headers = null;
		file = next;
		if (!next) return;

		if (!/\.(csv|xlsx)$/i.test(next.name)) {
			validationError = t('import.invalidType');
			return;
		}
		if (next.size > MAX_BYTES) {
			validationError = t('import.tooLarge');
			return;
		}
		if (next.size === 0) {
			validationError = t('import.emptyFile');
			return;
		}

		if (!next.name.toLowerCase().endsWith('.csv')) return;
		try {
			const row = parseCsvHeader(await next.text());
			if (row.length === 0 || row.every((cell) => cell === '')) {
				validationError = t('import.noHeaders');
				return;
			}
			headers = row;
		} catch {
			validationError = t('import.noHeaders');
		}
	}

	function onDrop(event: DragEvent) {
		event.preventDefault();
		dragging = false;
		const dropped = event.dataTransfer?.files?.[0] ?? null;
		void selectFile(dropped);
	}

	async function upload() {
		if (!file || !canUpload) return;
		uploading = true;
		uploadError = null;
		try {
			summary = await importUsers(file);
		} catch (cause) {
			uploadError =
				cause instanceof ApiError && cause.status > 0 ? cause.message : t('import.genericError');
		} finally {
			uploading = false;
		}
	}

	function download(content: string, filename: string, type: string) {
		const url = URL.createObjectURL(new Blob([content], { type }));
		const link = document.createElement('a');
		link.href = url;
		link.download = filename;
		link.click();
		URL.revokeObjectURL(url);
	}

	function downloadTemplate() {
		download(
			`\uFEFF${KNOWN_FIELDS.join(',')}\n`,
			'employees-template.csv',
			'text/csv;charset=utf-8'
		);
	}

	function downloadErrors() {
		if (!summary) return;
		const rows = [
			'row,email,error',
			...summary.errors.map((entry) =>
				[
					entry.row,
					`"${(entry.email ?? '').replaceAll('"', '""')}"`,
					`"${entry.error.replaceAll('"', '""')}"`
				].join(',')
			)
		];
		download(`${rows.join('\n')}\n`, 'employee-import-errors.csv', 'text/csv;charset=utf-8');
	}

	function reset() {
		file = null;
		headers = null;
		validationError = null;
		uploadError = null;
		summary = null;
	}
</script>

<svelte:head>
	<title>{t('import.title')} · EAT</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<Button variant="ghost" size="sm" class="w-fit" href={resolve('/dashboard/users')}>
		<ArrowLeftIcon />
		{t('user.backToDirectory')}
	</Button>

	<div class="flex flex-col gap-1">
		<h1 class="text-2xl font-semibold tracking-tight">{t('import.title')}</h1>
		<p class="text-sm text-muted-foreground">{t('import.description')}</p>
	</div>

	{#if summary}
		<section class="flex flex-col gap-4 rounded-lg border bg-card p-5">
			<div class="flex items-center gap-3">
				<div
					class="flex size-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
				>
					<CheckCircle2Icon class="size-5" />
				</div>
				<h2 class="font-semibold">{t('import.summaryTitle')}</h2>
			</div>

			<dl class="grid grid-cols-3 gap-3">
				<div class="rounded-lg border p-3">
					<dt class="text-xs text-muted-foreground">{t('import.total')}</dt>
					<dd class="text-xl font-semibold">{summary.total_rows}</dd>
				</div>
				<div class="rounded-lg border p-3">
					<dt class="text-xs text-muted-foreground">{t('import.imported')}</dt>
					<dd class="text-xl font-semibold text-emerald-700 dark:text-emerald-300">
						{summary.imported}
					</dd>
				</div>
				<div class="rounded-lg border p-3">
					<dt class="text-xs text-muted-foreground">{t('import.failed')}</dt>
					<dd class="text-xl font-semibold text-destructive">{summary.failed}</dd>
				</div>
			</dl>

			{#if summary.errors.length > 0}
				<div class="flex flex-col gap-2">
					<div class="flex items-center justify-between gap-2">
						<h3 class="text-sm font-medium">{t('import.errorsTitle')}</h3>
						<Button variant="outline" size="sm" onclick={downloadErrors}>
							<DownloadIcon />
							{t('import.downloadErrors')}
						</Button>
					</div>
					<div class="overflow-x-auto rounded-lg border">
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>{t('import.row')}</Table.Head>
									<Table.Head>{t('import.errorEmail')}</Table.Head>
									<Table.Head>{t('import.reason')}</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each summary.errors as entry (entry.row)}
									<Table.Row>
										<Table.Cell class="font-mono text-xs">{entry.row}</Table.Cell>
										<Table.Cell class="text-xs">{entry.email ?? '—'}</Table.Cell>
										<Table.Cell class="text-xs text-destructive">{entry.error}</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>
				</div>
			{/if}

			<div class="flex justify-end">
				<Button variant="outline" onclick={reset}>{t('import.another')}</Button>
			</div>
		</section>
	{:else}
		<section class="flex flex-col gap-4 rounded-lg border bg-card p-5">
			<div
				class="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center {dragging
					? 'border-primary bg-primary/5'
					: ''}"
				role="button"
				tabindex="0"
				ondragover={(event) => {
					event.preventDefault();
					dragging = true;
				}}
				ondragleave={() => (dragging = false)}
				ondrop={onDrop}
				onclick={() => document.getElementById('import-file')?.click()}
				onkeydown={(event) => {
					if (event.key === 'Enter' || event.key === ' ') {
						event.preventDefault();
						document.getElementById('import-file')?.click();
					}
				}}
			>
				<FileSpreadsheetIcon class="size-8 text-muted-foreground" />
				<p class="font-medium">{t('import.dropTitle')}</p>
				<p class="text-sm text-muted-foreground">{t('import.dropHint')}</p>
				<input
					id="import-file"
					type="file"
					accept=".csv,.xlsx"
					class="hidden"
					onchange={(event: Event & { currentTarget: HTMLInputElement }) => {
						void selectFile(event.currentTarget.files?.[0] ?? null);
						event.currentTarget.value = '';
					}}
				/>
			</div>

			{#if validationError}
				<p
					class="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
				>
					{validationError}
				</p>
			{/if}

			{#if file && !validationError}
				<div class="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
					<div class="flex min-w-0 items-center gap-2">
						<FileSpreadsheetIcon class="size-4 shrink-0 text-muted-foreground" />
						<span class="truncate text-sm font-medium">{file.name}</span>
						<span class="text-xs text-muted-foreground">
							{Math.ceil(file.size / 1024)} KB
						</span>
					</div>
					<Button variant="ghost" size="sm" onclick={reset} disabled={uploading}>
						{t('import.change')}
					</Button>
				</div>

				{#if headers}
					<div class="flex flex-col gap-2">
						<h3 class="text-sm font-medium">{t('import.previewTitle')}</h3>
						<p class="text-xs text-muted-foreground">{t('import.previewHint')}</p>
						{#if missingRequired.length > 0}
							<p
								class="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
							>
								{t('import.missingRequired', { columns: missingRequired.join(', ') })}
							</p>
						{/if}
						<div class="overflow-x-auto rounded-lg border">
							<Table.Root>
								<Table.Header>
									<Table.Row>
										<Table.Head>{t('import.column')}</Table.Head>
										<Table.Head>{t('import.field')}</Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#each mapped as entry (entry.header)}
										<Table.Row>
											<Table.Cell class="font-mono text-xs">{entry.header}</Table.Cell>
											<Table.Cell class="text-sm">
												{#if entry.known}
													<span class="flex flex-wrap items-center gap-1.5">
														{entry.field}
														{#if REQUIRED_FIELDS.includes(entry.field as 'email')}
															<span class="text-xs text-muted-foreground">
																({t('import.required')})
															</span>
														{:else}
															<span class="text-xs text-muted-foreground">
																({t('import.optional')})
															</span>
														{/if}
													</span>
												{:else}
													<span
														class="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
													>
														{t('import.unmapped')}
													</span>
												{/if}
											</Table.Cell>
										</Table.Row>
									{/each}
								</Table.Body>
							</Table.Root>
						</div>
					</div>
				{:else if file.name.toLowerCase().endsWith('.xlsx')}
					<p class="text-xs text-muted-foreground">{t('import.xlsxPreview')}</p>
				{/if}
			{/if}

			{#if uploadError}
				<p
					class="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
				>
					{uploadError}
				</p>
			{/if}

			<div class="flex flex-wrap items-center justify-between gap-2">
				<Button variant="outline" onclick={downloadTemplate}>
					<DownloadIcon />
					{t('import.template')}
				</Button>
				<Button disabled={!canUpload} onclick={upload}>
					{#if uploading}
						<LoaderCircleIcon class="animate-spin" />
						{t('import.uploading')}
					{:else}
						<UploadIcon />
						{t('import.upload')}
					{/if}
				</Button>
			</div>
		</section>
	{/if}
</div>
