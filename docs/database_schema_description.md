# Database Schema Description — Milestones 1–3

See `database_schema_mermaid_erd.md` for the relationship map and
`tables_relationships_specification.md` for the domain overview. The files in
`backend/migrations/` are the source of truth.

## Core tables

| Table | Notes |
| --- | --- |
| `organizations` | Tenant root. `slug` unique. `default_locale` in `en/fr/ar`. `currency char(3) DEFAULT 'DZD'`. `settings jsonb`. |
| `users` | Tenant-scoped profile + `password_hash` (Argon2id). Global case-insensitive email unique. `status in (active,suspended,deactivated)`. `department_id` optional. Soft delete. |
| `invitations` | Hashed one-time token (`token_hash char(64)`), target `role_id`, `status in (pending,accepted,expired,revoked)`. One pending invite per tenant+email. Soft delete. |
| `sessions` | Server-side sessions with hashed token, IP, user agent, expiry and `revoked_at`. No soft delete. |
| `roles` | Tenant-scoped. Unique `(organization_id, slug)` while not deleted. `is_system` marks bootstrap roles. |
| `permissions` | Global catalog, unique `code`, grouped by `module`. |
| `role_permissions`, `user_roles` | Join tables, composite PKs, cascade on delete. |

## Lookups and inventory

- `departments`, `locations`: self-referencing hierarchy, `name_i18n jsonb`
  requiring at least one of `en/fr/ar`.
- `brands`, `categories`, `vendors`: tenant-owned lookup data.
- `products`: model catalog, `specs_json jsonb`, unique-ish
  `(organization_id, model_code)` index.
- `assets`: unique `(organization_id, asset_tag)`; partial unique for
  `serial_number`; cached
  `assigned_to_user_id` plus immutable-ish `asset_assignments` custody rows.
- `sim_cards`: partial uniques for `iccid` and `phone_number`; at most one
  open SIM per asset.
- `asset_maintenances`: repair/warranty/inspection tickets.
- `accessories` + `accessory_assignments`: count-based stock with exactly one
  assignment target (user XOR asset).
- `consumables` + `consumable_transactions`: append-only stock ledger.
- `licenses` + `license_seats`: seat allocations to user XOR asset, with open
  seat uniqueness per target.
- `attachments`: polymorphic `(entity_type, entity_id)` metadata.
- `audit_logs`: append-only. `actor_user_id` nullable; `organization_id`
  required.

## Constraints and conventions

- UUID v4 primary keys (`gen_random_uuid()`).
- Plain foreign keys only; no composite FKs, no triggers, no RLS.
- All tenant tables carry `organization_id` except the two RBAC join tables,
  which inherit tenancy through `roles` / `users`.
- Mutable tables carry `updated_at` and `deleted_at`; exempt tables are
  `sessions`, `audit_logs`, `role_permissions`, `user_roles`,
  `consumable_transactions`.
- All application queries filter by the session's `organization_id`.

## Milestone 2 additions

- No new tables. M2 added the permission catalog rows
  `lookups.view`, `lookups.manage`, `products.manage`, `assets.view`,
  `assets.create`, `assets.assign`, `assets.delete`, and mapped them to the
  four system roles per tenant.
- Uniqueness indexes now enforced by migrations:
  - `products (organization_id, lower(model_code))` partial on
    `deleted_at IS NULL` (replaces the plain M1 index).
  - `categories (organization_id, item_type, lower(name_i18n->>'en'))`.
  - `vendors (organization_id, lower(name))`.
  - `locations` / `departments` on
    `(organization_id, COALESCE(parent_id, zero-uuid), lower(name_i18n->>'en'))`
    so the same name may exist under different parents.
- Localized reads resolve `name_i18n` as:
  user `preferred_locale` → organization `default_locale` → `en` → first key.
  Requests may send `name` (English shorthand) or `name_i18n`; English is
  required in `name_i18n`.
- Asset custody uses `assets.assigned_to_user_id` as a cache of the open
  `asset_assignments` row. Assign/return/transfer run in one transaction and
  write `audit_logs` before commit. PATCH may set only `in_repair`, `lost`,
  `retired`; assignment/return changes use their dedicated endpoints.
- `ASSET_QR_BASE_URL` (default `http://localhost:5173`) is combined with
  `/assets/{id}` for the QR payload.

## Milestone 3 additions

- New permission rows: `accessories.view/manage/assign`,
  `consumables.view/manage/issue`, `licenses.view/manage/assign`, mapped to
  the four system roles per tenant. `licenses.manage` is Admin-only.
- Additive columns:
  - `accessory_assignments.assigned_by_user_id uuid` (nullable).
  - `accessory_assignments.notes text` (nullable).
  - `consumable_transactions.notes text` (nullable).
  - `license_seats.notes text` (nullable).
- New partial unique index `accessory_assignments_open_pair_uniq` on
  `(accessory_id, COALESCE(assigned_to_user_id, zero-uuid),
  COALESCE(assigned_to_asset_id, zero-uuid))`
  `WHERE returned_at IS NULL AND deleted_at IS NULL`. This replaces no index;
  the M1 `accessory_assignments_open_idx` remains for lookup performance.
- Stock rules enforced in application code: accessories keep
  `available_quantity = total_quantity - SUM(open assignments)`; consumables
  mutate only through the append-only transaction ledger; licenses count
  active seats under a row lock before inserting.
- `expires_in_days` and `expiry_warning`
  (`expired/30d/60d/90d/none`) are computed at read time.
