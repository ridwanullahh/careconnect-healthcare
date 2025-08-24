# TODO5.md — Remaining Work Only (Verified, Client‑Only Architecture)

This file lists only what has NOT been completed yet, tailored to the constraint: ReactJS + GitHub DB only (no external server). Items are phrased to achieve maximum security within a client‑only model.

1) Directory & Verification
- Add DB collections: `verification_requests`, `verification_documents` in `src/lib/database.ts`
- Implement admin review queue UI (approve/reject with notes) and reviewer audit logging (client writes to GitHub DB)
- Implement entity verification states on `entities` (pending/verified/rejected/re‑verify with timestamps)
- Implement upload and storage of license/accreditation docs (base64 + metadata persisted)
- Display verified badges in directory lists and entity profiles
- Implement re‑verification reminders (30/7/1 days) using the client scheduler + in‑app notifications and optional client‑safe email

2) Booking & Scheduling
- Add DB collections: `services`, `slot_locks`, `scheduled_emails` (or use a single `booking_reminders`)
- Persist availability slots and slot locks; enforce locking on selection
- Implement ICS calendar file generation client‑side and attach to confirmation (download link)
- Implement policy enforcement (cancellation/reschedule windows) and link to real routes/pages
- Implement reminder sending via client scheduler: convert due reminders to in‑app notifications (optional email via client‑safe provider)

3) Payments & Checkout (Client‑Only, Secure As Possible)
- Replace server‑side Stripe flow with gateways that support client‑only checkout using publishable keys (e.g., Paystack/Flutterwave inline/hosted checkout with public key)
- Implement `/payment/callback` and `/payment/cancelled` client routes that read gateway reference from query params and set intent status to `pending_review`
- Implement an admin reconciliation workflow in the dashboard to manually mark intents `completed/failed/refunded` using gateway reference and donor/customer supplied receipt (no webhooks)
- Generate and deliver receipts client‑side (downloadable HTML/PDF); optional client‑safe email send
- Implement refunds as “admin action with external gateway portal,” then reflect status in DB (no direct API secrets in client)

4) Shop (Cart, Products, Orders)
- Add `carts` collection (or reuse `orders` with status `cart`) and persist per‑user items
- Compute tax/shipping client‑side; enforce inventory constraints using `products.inventory_qty`
- On payment callback, transition cart → order with status `pending_review` and show order detail page
- Send order confirmation via in‑app notification; optional client‑safe email

5) Health Tools Governance & Safety
- Persist prompt versioning (version records in DB linked to tools)
- Implement incident reporting link and backend (client writes to `tool_incidents` collection)
- Standardize input validation per tool (schema/guardrails in client)

6) LMS (Courses)
- Implement course create/edit/save UI + persistence
- Payment‑aware enrollment (set enrollment `pending_review` on payment callback, activate after admin reconciliation)
- Persist/display progress; add basic quiz grading client‑side; store results
- Generate downloadable certificates client‑side and store metadata in `certificates`

7) Community Q&A
- Resolve schema mismatch: either add `forum_posts`/`forum_replies` to DB or change code to use `forum_questions`/`forum_answers`
- Implement voting/reporting/moderation queues with consistent collections; reflect expert role tags
- Reply notifications via in‑app notifications; optional client‑safe email

8) Causes (Crowdfunding)
- Use client‑only gateway checkout (public key), then set donation `pending_review` on callback; admin reconciliation
- Add `disbursements` collection for ledger entries; show ledger in UI
- Implement beneficiary verification flow and monthly update scheduler (client scheduler + in‑app notifications)
- Implement in‑kind request UI with persistence

9) Health News
- Replace simulated fetch with real RSS/API calls that allow CORS; parse client‑side and cache to DB
- Persist news articles with moderation status and source metadata
- Implement newsletter scheduler with in‑app digest + optional client‑safe email; add unsubscribe flag/record in DB

10) 5‑Minute HealthTalk Podcast
- Add `podcast_series`, `podcast_episodes`, `podcast_rss_feeds` to DB schema
- Persist series/episodes; store transcripts; host audio on public URLs (no secrets) and reference them
- Generate RSS XML client‑side and save in DB; provide public read view (client route renders XML)

11) HMS Modules (Registry, Labs, Imaging, Pharmacy, Billing, Beds, Referrals)
- Wire full lifecycles using existing libs and DB only; ensure each state change is persisted and visible in UI
- Add printable HTML templates (labels/orders/invoices) as client‑generated print/download documents
- Implement basic code validators client‑side (no secrets)

12) Notifications & Email (Client‑Only)
- Replace simulated email with a client‑safe provider (e.g., EmailJS with public/service ID) OR rely solely on in‑app notifications + gateway/provider‑sent emails
- Implement unsubscribe flags in DB and suppress optional emails in client when opted out
- Link notifications to domain events (booking, orders, donations, courses)

13) Auth & RBAC
- Enforce role/permission route protection across pages in client
- Implement session hygiene; password reset (token flow stored in DB), optional MFA via TOTP app (client‑side generation/verification with shared secret stored encrypted in DB)
- Persist consent version on login/first use

14) Key Management (BYOK) — Client‑Side Only
- Keep BYOK in encrypted form in DB and decrypt with user‑specific secret stored locally; never hardcode secrets
- Implement key rotation UX and expand audit logs (who used which key type and when)
- Enforce per‑service scoping client‑side

15) Observability & Error Handling
- Add client‑side uptime checks (heartbeat to DB or timestamp updates) and error tracking (Sentry browser SDK if allowed)
- Define client‑visible SLIs/SLOs; add dashboards in admin UI reading from DB logs

16) Accessibility & Localization
- Run client‑side WCAG audits on top pages (axe‑core in dev) and fix issues
- Implement language switcher and i18n (e.g., i18next) and translate key strings

17) Data Privacy: Consent, Export/Delete
- Persist consent version; implement client‑side data export (JSON/CSV) reading from DB
- Implement delete request with grace period flag in DB and inform user via in‑app notification/optional email

18) Search & Analytics (Privacy‑Aware)
- Define event taxonomy and retention windows; store minimal events in DB
- Build provider and platform dashboards that query DB
- Implement privacy‑aware tracking in client across key funnels (search→booking, tool→booking)

Critical Schema Alignment (Start Here)
- Update `src/lib/database.ts` to add/align collections referenced by code:
  - verification_requests, verification_documents, services, slot_locks, scheduled_emails (or booking_reminders), carts,
    forum_posts/forum_replies (or switch code to forum_questions/forum_answers), podcast_series, podcast_episodes,
    podcast_rss_feeds, disbursements, tool_incidents
- Ensure all modules reference the exact collection names in `database.ts`
