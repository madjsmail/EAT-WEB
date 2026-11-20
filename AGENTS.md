# AGENTS.md — SvelteKit Asset Tracking UI (`web/`)

## 1. Mission & Strict Scope Guardrails
You are working strictly inside the **SvelteKit Web Frontend** (`web/`).
- **NEVER** modify Rust backend files (`backend/`), SQL migrations, or backend configs.
- **ONE PAGE / FLOW AT A TIME:** Only create or edit files directly required for the requested route or component.
- **NO INVENTED ENDPOINTS:** Only call API endpoints explicitly defined in `src/lib/api/` or provided in the prompt. If an endpoint contract is missing, ask before guessing.
- **STOP ON 2 TYPE/BUILD ERRORS:** If `npm run check` fails twice on the same issue, stop and report the exact error.

---

## 2. Locked Tech Stack
- **Framework:** SvelteKit (Svelte 5 runes: `$state`, `$derived`, `$props`, `$effect`) + TypeScript (strict mode)
- **Styling & UI:** Tailwind CSS (logical properties for LTR/RTL) + `shadcn-svelte`
- **Icons:** `lucide-svelte`
- **QR Codes:** `qrcode` (generation) + `html5-qrcode` (camera scan)
- **Forms & Validation:** Native SvelteKit form actions / typed fetch + `zod`
- **Localization (`i18n`):** English (`en`), French (`fr`), Arabic (`ar` with `dir="rtl"`)

---

## 3. Canonical Directory Structure
```text
web/src/
├── lib/
│   ├── api/
│   │   ├── client.ts            # Typed fetch wrapper (credentials: 'include', error normalization)
│   │   └── <module>.ts          # Typed API calls & TS interfaces matching Rust DTOs
│   ├── components/
│   │   ├── ui/                  # Reusable primitives (Button, Badge, Modal, DataTable, EmptyState)
│   │   ├── layout/              # Sidebar, Topbar, TenantSwitcher, LocaleSwitcher
│   │   └── domain/              # AssetStatusBadge, QrLabelCard, AttachmentUploader, AuditDiff
│   ├── stores/
│   │   └── session.svelte.ts    # Current user, organization, permissions[], preferred_locale
│   └── i18n/
│       ├── index.ts             # t(key) UI dictionary + resolveI18n(record.name_i18n, locale)
│       └── locales/             # en.json, fr.json, ar.json
└── routes/
    ├── (public)/
    │   ├── login/+page.svelte           # Login only (NO signup link)
    │   └── invite/[token]/+page.svelte  # Invite acceptance & password setup
    └── (app)/
        ├── +layout.svelte               # Authenticated shell, RBAC nav filtering, RTL dir handler
        ├── dashboard/+page.svelte
        ├── assets/                      # List, create, [id] 360° view, QR scan modal
        ├── products/+page.svelte
        ├── accessories/+page.svelte
        ├── consumables/+page.svelte
        ├── licenses/+page.svelte
        ├── sim-cards/+page.svelte
        ├── maintenance/+page.svelte
        └── settings/                    # Lookups, users, invitations, roles, audit-logs
```

---

## 4. UI, Design & RTL Precision Rules
1. **Clean Operational Aesthetic:**
   - Design like a crisp, high-density IT operations tool (Linear / Snipe-IT modern aesthetic): neutral slate surfaces (`bg-slate-50`, `bg-white`, `border-slate-200`), high-contrast typography, semantic status pills (`in_stock` = emerald, `assigned` = blue, `in_repair` = amber, `retired/lost` = rose).
   - Every data view MUST handle 4 states explicitly: **Loading** (skeleton), **Empty** (clear CTA), **Error** (retry banner), and **Populated** (searchable/filterable table).
2. **Mandatory RTL & Multilingual Support (`en` / `fr` / `ar`):**
   - Set `<html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>` reactively when locale changes.
   - **ALWAYS** use Tailwind logical spacing/alignment classes: `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`, `text-end` instead of `ml-*`, `mr-*`, `pl-*`, `pr-*`, `left-*`, `right-*`, `text-left`, `text-right`.
   - Render catalog names using `resolveI18n(item.name_i18n, currentLocale)` with automatic fallback (`locale -> 'fr' -> 'en' -> first available key`).
3. **RBAC-Aware UI:**
   - Hide or disable create/edit/delete buttons using `hasPermission('assets.create')` from `session.svelte.ts`. Never show a public "Sign Up" button anywhere.
4. **Asset 360° & Phone Details:**
   - Phone/device detail pages must prominently display `asset_tag`, `imei_1`, `imei_2`, `serial_number`, printable QR badge, current custodian, paired accessories, active SIM card, software seats, repair history, and Garage S3 attachments.

---

## 5. Verification Checklist (Before Finishing Any Task)
1. Run `npm run check` (`svelte-check`) and confirm 0 TypeScript or Svelte errors.
2. Verify no hardcoded English-only strings in new UI components (use `t(...)`) and no physical `ml-`/`mr-` classes that break Arabic RTL layout.
3. Keep your final response concise: list modified files and `npm run check` status only.
---

## 6. GitHub Project Board

All backlog items, bugs, and deferred work go to **EAT**:
https://github.com/users/madjsmail/projects/17

Repository: `madjsmail/EAT-BAVCEND`. Add issues to project `17` and set
Status to **Backlog**. Project and field IDs are in `.opencode/instructions.md`.
