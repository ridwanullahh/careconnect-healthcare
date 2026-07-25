# CareConnect — Production Completion Task Breakdown

**Bismillah Ar-Rahman Ar-Raheem.**
This file tracks every task, sub-task, and sub-sub-task required to bring CareConnect to enterprise production grade on Lightbase.

Legend: `[ ]` pending · `[~]` in progress · `[x]` done

---

## Task 1 — Lightbase Migration (Primary Database)

### 1.1 Storage Adapter
- [x] 1.1.1 Empirically test Lightbase /api/v1 (collection create, insert, filter, upsert)
- [x] 1.1.2 Design envelope storage model (record json + indexed filter fields)
- [ ] 1.1.3 Implement `LightbaseStorageAdapter` in `packages/db/src/lightbase-adapter.ts`
  - [ ] 1.1.3.a `get(collection)` — paginated `/docs`, return `record` array
  - [ ] 1.1.3.b `find(collection, filter)` — convert `{k:v}` to FilterExpr `and` group
  - [ ] 1.1.3.c `findById(collection, key)` — GET by id, fallback filter by `uid`
  - [ ] 1.1.3.d `insert(collection, item)` — POST envelope, return record with Lightbase id
  - [ ] 1.1.3.e `update(collection, key, patch)` — PATCH envelope, return record
  - [ ] 1.1.3.f `delete(collection, key)` — DELETE by id
  - [ ] 1.1.3.g `initializeAllCollections()` — idempotent collection creation
  - [ ] 1.1.3.h `save(collection, data[])` — bulk replace via delete+insert
- [ ] 1.1.4 Add storage factory `createStorage()` in `packages/db/src/index.ts` (STORAGE_PROVIDER switch)
- [ ] 1.1.5 Keep `SQLiteAdapter` fully intact as fallback (no removal)

### 1.2 Backend Wiring
- [ ] 1.2.1 Replace `sqliteDB` import in backend route with factory-selected storage
- [ ] 1.2.2 Add `/api/health` reporting active provider
- [ ] 1.2.3 Add `/api/seed` endpoint (POST) to run comprehensive seed
- [ ] 1.2.4 Harden CORS, input validation, auth on every route

### 1.3 Dev Server Integration
- [ ] 1.3.1 Add `db:push` script (no-op for lightbase / runs seed flag)
- [ ] 1.3.2 Add `dev` script that starts both Astro backend (4321) + Vite (3000)
- [ ] 1.3.3 Configure Vite proxy `/api` -> `http://localhost:4321`
- [ ] 1.3.4 Verify end-to-end: browser -> Vite -> backend -> Lightbase

---

## Task 2 — Comprehensive Seed Data

### 2.1 Platform Admin Level
- [ ] 2.1.1 Super admin user + profile (login: admin@careconnect.health)
- [ ] 2.1.2 Compliance officer, moderator, support agent users
- [ ] 2.1.3 System settings + feature flags
- [ ] 2.1.4 Audit logs (sample entries)

### 2.2 Healthcare Entities (Verified Directory)
- [ ] 2.2.1 3 verified health centers/hospitals (full profiles, addresses, hours)
- [ ] 2.2.2 2 verified pharmacies
- [ ] 2.2.3 2 verified practitioners (physician, pharmacist)
- [ ] 2.2.4 Entity staff, services, specialties, insurance providers
- [ ] 2.2.5 Verification documents + verification queue entries

### 2.3 User Accounts (all roles)
- [ ] 2.3.1 Entity owners (health_center, pharmacy, practitioner) linked to entities
- [ ] 2.3.2 Hospital admin, physician, nurse, pharmacist, lab_tech, imaging_tech, billing_clerk
- [ ] 2.3.3 Patient accounts + public_user accounts
- [ ] 2.3.4 Profiles for all users

### 2.4 HMS Clinical Data
- [ ] 2.4.1 8-10 patients (encrypted PII) with identifiers + entity links
- [ ] 2.4.2 Encounters (various statuses/types) for each patient
- [ ] 2.4.3 Vitals, conditions, allergies
- [ ] 2.4.4 Medication requests + dispenses
- [ ] 2.4.5 Lab orders + results, imaging orders
- [ ] 2.4.6 Care plans, referrals, bed management, triage notes

### 2.5 Operational Data
- [ ] 2.5.1 Bookings + appointment slots + booking payments
- [ ] 2.5.2 Products (pharmacy/health) + sample orders
- [ ] 2.5.3 Causes + donations + disbursements
- [ ] 2.5.4 Courses + modules + lessons + enrollments
- [ ] 2.5.5 Health tools (16 master tools seeded via initializer)
- [ ] 2.5.6 Forum categories + questions + answers + expert answers
- [ ] 2.5.7 News, podcasts, weekly tips, timeless facts, blog posts
- [ ] 2.5.8 Job postings + applications
- [ ] 2.5.9 Pharmacy inventory + orders
- [ ] 2.5.10 Consents + access grants

---

## Task 3 — Fix Broken Code

- [ ] 3.1 Fix `src/lib/verification.ts` (`create()` -> `insert()`)
- [ ] 3.2 Fix `src/lib/platform-integration.ts` (missing import `health-tools-consolidated` -> `health-tools-master`)
- [ ] 3.3 Fix/remove dead `DataExportDialog.tsx`, `KeyManagementModule.tsx`, `SystemMonitoringModule.tsx` (missing shadcn primitives + use-toast)
- [ ] 3.4 Add missing shadcn primitives (label, select, scroll-area, dialog, checkbox) OR rewrite components with existing primitives
- [ ] 3.5 Fix `EntityDashboard` toast bug (`showSuccess` -> `showError`) + hardcoded stats
- [ ] 3.6 Fix `HMSDashboard` hardcoded stats -> real DB queries

---

## Task 4 — Feature Completion (per PRD_AUDIT_AND_GAPS)

### 4.1 Directory & Verification
- [ ] 4.1.1 License/accreditation document upload form
- [ ] 4.1.2 Re-verification reminders (30/7/1 day scheduler)

### 4.2 Booking
- [ ] 4.2.1 ICS calendar generation for confirmed bookings
- [ ] 4.2.2 Cancellation/reschedule policy enforcement

### 4.3 Payments
- [ ] 4.3.1 Paystack/Flutterwave inline checkout wiring
- [ ] 4.3.2 Payment callback verification + receipt generation
- [ ] 4.3.3 Refund workflow + admin reconciliation

### 4.4 E-commerce
- [ ] 4.4.1 Inventory enforcement on cart/checkout
- [ ] 4.4.2 Tax/shipping computation (region-aware)
- [ ] 4.4.3 Order confirmation notifications

### 4.5 LMS
- [ ] 4.5.1 Quiz grading UI + certificate generation
- [ ] 4.5.2 Payment-aware enrollment

### 4.6 Community
- [ ] 4.6.1 Forum voting/reporting UI
- [ ] 4.6.2 Expert role tags + reply notifications

### 4.7 Crowdfunding
- [ ] 4.7.1 Donation flow + disbursements ledger
- [ ] 4.7.2 Beneficiary verification + monthly updates

### 4.8 Content
- [ ] 4.8.1 News moderation status + newsletter scheduler
- [ ] 4.8.2 Podcast admin CRUD + RSS XML

### 4.9 HMS
- [ ] 4.9.1 Full lifecycle wiring (encounter -> labs -> pharmacy -> billing)
- [ ] 4.9.2 Printable templates + code validators

### 4.10 AILab (TODO6 Tasks 4-6)
- [ ] 4.10.1 Emergency Communication Bridge
- [ ] 4.10.2 Medical Record Timeline Builder
- [ ] 4.10.3 Cultural & Religious Care Advisor

### 4.11 Auth & Security
- [ ] 4.11.1 Route protection + session hygiene
- [ ] 4.11.2 MFA/TOTP (optional)
- [ ] 4.11.3 Consent versioning on login
- [ ] 4.11.4 BYOK key rotation UX + per-service scoping

### 4.12 Observability
- [ ] 4.12.1 Error logging wiring + uptime checks
- [ ] 4.12.2 SLI/SLO dashboard

### 4.13 Accessibility & i18n
- [ ] 4.13.1 WCAG audit fixes
- [ ] 4.13.2 Language switcher + i18n foundation

### 4.14 Data Privacy
- [ ] 4.14.1 Consent version persistence
- [ ] 4.14.2 Client-side data export (JSON/CSV)
- [ ] 4.14.3 Data deletion with 30-day grace period

---

## Task 5 — Verification & Release

- [ ] 5.1 Browser end-to-end verification (all roles, golden paths)
- [ ] 5.2 Responsive + sticky footer check
- [ ] 5.3 Security review (no secrets client-side, auth on all routes)
- [ ] 5.4 Final commit + push verification (hash check)
