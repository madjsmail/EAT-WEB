# Tables & Relationships Specification

This document explains every table group, key design patterns, and how entities connect across your multi-tenant asset management platform.

---

## 1. Multi-Tenancy Strategy (`organizations`)

* **Pattern:** Shared Database, Shared Schema with strict tenant isolation via `organization_id`.
* **Rules:**
  * Every tenant-owned table includes `organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE`.
  * Uniqueness constraints are scoped per tenant—for example, `UNIQUE (organization_id, asset_tag)` and partial uniques—so two different companies using your SaaS never collide on asset tags or serial numbers.
  * Every API query must automatically inject `WHERE organization_id = :current_org_id` from the authenticated session context (or enforce PostgreSQL Row-Level Security policies).

---

## 2. Invite-Only Authentication, Sessions & RBAC

There is **no public self-signup (`POST /register`)**. Users can only enter an organization via a cryptographic invitation link.

### Tables
1. **`users`**
   * Stores user profile, hashed password (`Argon2id` or `bcrypt`), `preferred_locale` (`en`, `fr`, `ar`), `department_id`, and account `status`.
   * Belongs to one `organization_id` (Many-to-One).
2. **`invitations` (Invite-Only Onboarding)**
   * An admin creates an invitation with `email`, target `role_id`, and `expires_at` (e.g., 72 hours).
   * Stores `token_hash` (SHA-256 hash of the one-time token emailed to the user).
   * When the user accepts the invite and sets their password, `status` changes from `pending` to `accepted`, `accepted_at` is stamped, and the `users` + `user_roles` records are created atomically.
3. **`sessions` (Stateful Session Management)**
   * Stores server-side session records (`token_hash`, `ip_address`, `user_agent`, `expires_at`, `revoked_at`).
   * Enables instant session revocation ("Log out all devices"), suspicious login auditing, and admin forced-logout when an employee leaves the company.
4. **`roles`, `permissions`, `role_permissions`, `user_roles` (RBAC)**
   * **`permissions`**: Global catalog of granular capabilities (`assets.view`, `assets.create`, `assets.assign`, `consumables.issue`, `users.invite`, `audit.view`).
   * **`roles`**: Tenant-scoped roles (`Super Admin`, `IT Manager`, `Stock Keeper`, `Viewer`).
   * **`role_permissions` & `user_roles`**: Standard Many-to-Many join tables allowing flexible custom roles per organization.

---

## 3. Localization (`i18n`) & Shared Lookups

* **JSONB Localization (`name_i18n`, `description_i18n`)**:
  * Used on `departments`, `locations`, `categories`, `products`, `accessories`, `consumables`, and `licenses`.
  * Example payload: `{"en": "45W Fast Charger", "fr": "Chargeur Rapide 45W", "ar": "شاحن سريع 45 واط"}`.
  * Universal technical codes (`brands.name`, `model_code`, `asset_tag`, `sku`) remain standard `VARCHAR` fields.
* **Hierarchical Lookups**:
  * `locations.parent_location_id` (Self-referencing FK): Models `City -> Building -> Floor -> Storage Room`.
  * `departments.parent_department_id` (Self-referencing FK): Models `Division -> Department -> Team`.

---

## 4. The 4 Inventory Pillars & Operational Tables

### Pillar A: Serialized Assets (`products` + `assets` + `sim_cards` + `asset_maintenances`)
* **`products`**: Catalog definitions (`Samsung Galaxy S24 Ultra`, `Huawei Mate 60 Pro`) with `model_code` and `specs_json` (`ram_gb`, `storage_gb`, `os`, `dual_sim`).
* **`assets`**: Physical units tracked individually via `asset_tag` and `serial_number`.
* **`asset_assignments`**: Immutable custody history (`assigned_at`, `returned_at`) recording every employee who ever held a phone, while `assets.assigned_to_user_id` caches the current holder for fast queries.
* **`sim_cards`**: Tracks carrier lines (`iccid`, `phone_number`, `pin_code`, `puk_code`) independently so a SIM can be moved between spare phones or assigned directly to a user.
* **`asset_maintenances`**: Tracks hardware repairs, screen replacements, and vendor warranty claims (`started_at`, `completed_at`, `cost`).

### Pillar B: Accessories (`accessories` + `accessory_assignments`)
* Tracks bulk countable items (`total_quantity` vs. `available_quantity`) such as chargers, rugged cases, and headsets.
* **Dual-Target Assignment**: `accessory_assignments` can link to `assigned_to_user_id` (an employee) **or** `assigned_to_asset_id` (a specific phone), decrementing `available_quantity` on check-out and incrementing it on return.

### Pillar C: Consumables (`consumables` + `consumable_transactions`)
* Tracks depletable stock (`quantity_on_hand`) such as tempered glass protectors, printer toner, and packaging.
* **`consumable_transactions`**: Append-only ledger (`+quantity` for `restock`, `-quantity` for `issue` or `adjustment`). Can record which user or specific asset consumed the item.

### Pillar D: Software Licenses (`licenses` + `license_seats`)
* **`licenses`**: Master contract (`total_seats`, `expires_at`, `license_type`, `cost`).
* **`license_seats`**: Individual seat allocations (`COUNT` of active rows where `revoked_at IS NULL` cannot exceed `total_seats`). Supports both user-assigned software (Microsoft 365) and device-assigned software (Samsung Knox MDM on a specific phone).

---

## 5. Attachments & Audit Logs

1. **`attachments` (Polymorphic File Storage)**
   * Uses `(entity_type, entity_id)` to attach files to any record (`asset`, `maintenance`, `license`, `product`, `user`).
   * Stores object storage metadata (`file_url`, `mime_type`, `file_size_bytes`) for purchase invoices, warranty PDFs, signed handover receipts, and photos of damaged phones.
2. **`audit_logs` (Immutable Compliance Trail)**
   * Captures `actor_user_id`, `action`, `entity_type`, `entity_id`, `old_values` (`JSONB`), `new_values` (`JSONB`), and `ip_address`.
   * Should be append-only (no `UPDATE` or `DELETE` permissions granted to the application role) for strict security and accountability.