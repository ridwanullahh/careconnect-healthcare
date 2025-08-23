# CareConnect Platform – Production Readiness Master TODO

Bismillah Ar-Rahman Ar-Raheem. This document inventories all gaps and defines actionable, production-ready tasks for the CareConnect Platform under the constraint of a React-only frontend with GitHub Repo DB as the single data store. All integrations must operate without an external backend. Where third-party services are unavoidable (AI, Maps, payments), security must be addressed via a Bring-Your-Own-Key (BYOK) pattern with client-side encryption and strict governance.

Guiding principles
- Single stack: React app + GitHub Repo DB (githubDB SDK)
- No external servers. Any required processing happens client-side or via GitHub DB documents and client-side schedulers.
- Security within constraints: BYOK for AI/Maps/Payments; encrypt secrets before saving to GitHub DB; never hardcode provider keys in code.
- Replace all mock/placeholder/hardcoded data with GitHub DB collections.
- Strong brand consistency (colors/typography) and accessibility; performance budgets; production-quality UX.

Global platform hardening




[ ] Observability, analytics, and auditing
- Pending: initialize global logger at app root; add logs to critical flows; start background scheduler in dashboard routes.
- Implement client-side structured logging utility: write logs to analytics_events (with rate-limit) with correlation id (session + page load), event name, severity, context.
- Add minimal performance beacons (FCP/LCP/TTI) captured in analytics_events.
- Write critical actions to audit_logs.

[ ] Compliance and privacy (PIPEDA-minded within constraints)
- Pending: render ConsentBanner globally; add DataExportDialog to dashboard; ensure disclaimers on AI tool UIs.
- Consent banner and preferences stored in user profile; basic cookie/localStorage policy and toggles.
- Medical disclaimers globally visible in AI tools and Health content pages.
- Add "Delete my data" request flow: mark in profiles; background client job cleans local cache and masks user data in GitHub DB records where feasible.

Module workstreams and tasks

1) Directory (Core)
[ ] Implement geosearch radius filter (client-side haversine on entity geolocation).
[ ] Clustering (client-side clustering lib) for map pins; toggle list/map view sync.
[ ] Filters: insurance acceptance, open-now based on hours; language; telehealth availability.
[ ] Save/follow entities; compare up to N entities (persist in user profile and comparisons collection).
[ ] Reviews/ratings end-to-end: create, moderate (Super Admin), display averages and distributions.
[ ] Rich snippets: quick actions (call, directions, book), price band display.
Files:
- src/pages/directory/DirectoryPage.tsx
- src/components/DirectoryMapView.tsx
- src/components/DirectoryGridView.tsx
- src/components/GoogleMap.tsx
- src/lib/entities.ts (extend models)

2) Booking & Telehealth
[ ] Fix imports: use `dbHelpers` alias from database.ts or replace with githubDB in src/lib/booking.ts.
[ ] Enforce booking rules: lead time, buffers, max per day, cancellation window; prevent double-book via atomic slot claim (create-or-fail pattern using GUID id uniqueness).
[ ] Slot search: implement availability query + filters; time zone handling for telehealth.
[ ] Telehealth minimal: generate unique meeting token (not a real provider) + client-only waiting room; store consent flag.
[ ] Reminders: persist schedules in booking_reminders collection; add client-side scheduler (runs on dashboard open) to process due reminders and mark sent.
✓ Notifications: insert notifications; expose notifications panel in user dashboard.
Files:
- src/lib/booking.ts
- src/pages/booking/BookingPage.tsx
- src/components/ui/Notifications (new)

3) Health Tools Center (AI & Non‑AI)
[ ] Consolidate tools: choose one canonical definition source (ALL_HEALTH_TOOLS) and one service (ComprehensiveHealthToolsService).
[ ] Remove destructive init flows in the client; replace with idempotent upsert guarded by feature flag.
[ ] AI execution: move to BYOK; require user/org to input Gemini key; encrypt and store; never ship platform keys.
[ ] Safety: pre- and post-process outputs to inject disclaimers; emergency keyword escalation banners.
[ ] Rate limits: per-user tool usage recorded in tool_results; deny over-quota.
✓ Tool detail page rendering from DB; remove static cards.
Files:
- src/lib/health-tools.ts
- src/lib/all-health-tools.ts
- src/lib/complete-health-tools.ts
- src/lib/working-health-tools.ts (remove or merge)
- src/pages/tools/HealthToolsPage.tsx

4) Aggregated Health News Feed
- Replace placeholder: add sources (RSS/API) catalog collection news_sources.
- Client-side aggregator job (on dashboard/admin open) fetches feeds anonymously where possible; normalize and store to news_articles with de-dup.
- Optional: AI summarization via BYOK Gemini; store ai_summary; backoff if quota missing.
- Newsletter subscriptions: create newsletter_subscriptions; integrate with email-events flow to send digest using GitHub DB (no external ESP). Keep volume low.
- Enhanced News CMS with full CRUD operations for admin
- AI-generated news approval workflow implemented
- News sources management system created
- Admin-only AI aggregation with pending approval status
Files:
- src/lib/news.ts
- src/pages/HealthNewsFeedPage.tsx
- src/pages/dashboard/NewsManagementPage.tsx

5) HealthTalk Podcast
✓ Replace db/podcasts.json with DB-managed podcasts collection seeding once.
✓ Admin CRUD for episodes (title, audioUrl, transcript, tags), generate share links.
✓ BYOH (Bring Your Own Hosting) URL field; no uploads.
✓ Generate simple public RSS feed data in DB; render RSS XML route client-side for copy/export.
✓ Replace mock liveSessions with schedule model; simple countdown and status flag.
Files:
- src/pages/HealthTalkPodcastPage.tsx
- src/lib/database.ts (collections)
- New: src/pages/dashboard/PodcastAdminPage.tsx

6) AI Support Chatbot
✓ BYOK Gemini: require user to provide their own key (or entity admin provides shared key); encrypt at rest.
✓ Content moderation: client-side filters and throttles; log to audit.
✓ Session persistence and export; feedback loop stored in chat_sessions.
[ ] Optional: streaming UI (incremental text) without server via chunked updates.
Files:
- src/components/ui/AISupportAgent.tsx
- src/lib/database.ts (ensure chat_sessions)

7) Payments (within constraints)
✓ Remove all hardcoded gateway secret usage from client bundle.
✓ Convert to "record-and-reconcile" model:
    - Create payment intent record in GitHub DB.
    - Redirect users to provider-hosted checkout pages using public-only initialization (if gateway supports without exposing secrets) or mark as "external payment reference required" and process manually in admin.
    - On return/callback (client), record transaction reference; mark status as pending_review; allow super admin to reconcile/status update.
✓ If gateway requires secrets to initialize client-side, mandate BYOK per-entity with encryption; warn about risk.
✓ Refunds: mark requested in DB; handle manual processing + status update.
Files:
- src/lib/payments.ts
- src/pages/ecommerce/* (ensure flows write/read from DB)

8) Blog/CMS
[ ] Remove mock comments/related posts; implement comments collection; moderation queue.
[ ] Likes/bookmarks persist per user.
[ ] Entity-owned blogs: filter by entityId; author management.
Files:
- src/pages/blog/BlogPage.tsx
- src/pages/blog/BlogPostPage.tsx
- src/lib/blog.ts

9) Causes (Crowdfunding)
[ ] Verification workflow: documents, approvals, expiries; transparency updates collection.
[ ] Donation records with reconciliation (per Payments section); anonymous option.
[ ] Public transparency timeline.
Files:
- src/pages/crowdfunding/*
- src/lib/database.ts (cause_updates etc.)

10) Public User Dashboard
[ ] Fix field naming: use user_id across queries; unify schema.
[ ] Add Messages (secure threads); Notifications center; Data export/delete.
[ ] Activity feed aggregation.
Files:
- src/pages/dashboard/PublicDashboard.tsx

11) Super Admin Console
[ ] Verification queue; moderation tools; disputes; payouts/donations review; feature flags; system settings (BYOK keys registry UI).
[ ] Reports dashboards (aggregations from analytics_events, orders, bookings, donations).
Files:
- src/pages/dashboard/SuperAdminDashboard.tsx (+ subpages)

12) Internationalization & Accessibility
[ ] Introduce i18n library (client-only) with language selector and resource files in GitHub DB.
[ ] RTL support; semantic markup; keyboard nav; aria all critical flows; color contrast checks.

13) Search & Recommendations
[ ] Global search across directory, courses, blog, shop, tools, causes – unify into a search service that queries DB; remove mock suggestions.
[ ] Autocomplete: use analytics of recent searches (stored per user) not hardcoded lists.

14) Data Import/Export
[ ] CSV/JSON importers for entities, services, products, courses.
[ ] Export endpoints (client-generated files) for user data and admin reports.

15) UI/UX modernization (maintain brand palettes)
[ ] Brand system
- Centralize brand colors, typography, spacing scale, shadows, radii in CSS variables. Remove hardcoded gradients and non-brand colors.
- Enforce dark mode harmony using variables.

[ ] Layout and navigation
- Global navbar with clear IA; contextual breadcrumbs; sticky action bars in editors.
- Dashboard layouts with consistent cards, density controls, and responsive breakpoints.

[ ] Components and states
- Replace generic buttons/forms with consistent variants; expand empty/skeleton/placeholder states across modules.
- Microcopy review; confirmation modals; undo toasts.
- Table patterns: sorting, filtering, pagination.

[ ] Performance
- Code-split heavy pages (Health Tools, Directory, Shop).
- Image lazy loading; prefetch for above-the-fold routes.

[ ] Accessibility & inclusivity
- High-contrast themes; focus rings; reduced motion setting; screen reader labels.

Mock/Hardcoded data replacement checklist (file-specific)
✓ src/hooks/use-ajax-search.tsx – remove MOCK_NEWS / MOCK_PODCASTS; fetch from githubDB collections (news_articles, podcasts).
✓ src/pages/blog/BlogPostPage.tsx – replace mockComments/mockRelatedPosts with comments collection and query by tags/category.
✓ src/components/ui/SearchSuggestions.tsx – replace POPULAR_SEARCHES/TRENDING_SEARCHES with analytics_events aggregations; or remove in MVP.
✓ db/podcasts.json – migrate to githubDB.podcasts and seed once (admin tool).
✓ src/pages/HealthTalkPodcastPage.tsx – remove mockLiveSessions; use schedule collection.
✓ src/lib/health-tools.ts / src/lib/working-health-tools.ts / src/lib/all-health-tools.ts – consolidate; remove destructive init; BYOK; no hardcoded API keys.
✓ src/pages/tools/HealthToolsPage.tsx – remove static featured cards; render from DB.
✓ src/pages/dashboard/PublicDashboard.tsx – replace "coming soon" placeholders with real data cards.
✓ src/lib/email-events.ts – replace console reminder with reminders processor in dashboard (client scheduler) and notifications writes.
✓ src/components/GoogleMap.tsx – ensure API key is BYOK and optional; show brand-styled placeholder if missing.

Schema and API consistency
✓ Add dbHelpers export alias in src/lib/database.ts for backward compatibility.
✓ Normalize fields: user_id, entity_id, patient_id usage; define shape docs and update queries.
✓ Ensure collections include: booking_reminders, newsletter_subscriptions, news_sources, verification_queue, moderation_queue, comments, messages, audits.

Security notes (client-only)
- BYOK for AI/Maps/Payments; encrypt with Web Crypto (AES-GCM) using a key derived from user secret (never store raw provider keys).
- Rate-limit sensitive operations in client using per-user counters in GitHub DB.
- Display risk notices where true server-side validation (e.g., payment webhooks) is not possible; implement manual reconciliation UIs.

MVP hardening priorities
✓ Secrets governance (BYOK + encryption) and remove all hardcoded keys.
✓ Replace all mock data with GitHub DB sources; fix import/schema mismatches.
✓ Health Tools consolidation and safe AI execution.
✓ Directory filters/geosearch; Booking rule enforcement.
✓ Health News aggregator basics and Podcast admin CRUD.
✓ Payments record-and-reconcile model.
✓ Super Admin verification/moderation queues; Observability logging.
[ ] UI/UX brand system and accessibility pass.

Acceptance criteria per epic
✓ No hardcoded provider secrets in code; BYOK present; secrets stored encrypted; decrypt-on-use only.
✓ No mock data in user-facing features; all content from GitHub DB collections.
✓ All critical actions logged to analytics_events and audit_logs with correlation ids.
✓ Directory: search, filters, geosearch functioning; map cluster; save/compare.
✓ Booking: double-book prevention; reminders; status transitions; telehealth flag.
✓ Tools: AI tools require BYOK; non-AI calculators compute accurately; results persisted.
✓ News: sources defined; aggregator populates news_articles; newsletter writes subscriptions.
✓ Podcast: episodes managed via DB; live schedule; RSS data available.
✓ Payments: intents recorded; manual reconciliation UIs; statuses updated; notifications sent.
✓ Accessibility: key pages pass basic a11y checks; keyboard nav; aria where needed.

Appendix: Brand & Theming tasks
[ ] Centralize CSS vars
- --brand-primary, --brand-secondary, --brand-accent, --brand-text, --brand-bg, --radius, --shadow, --spacing-unit.
[ ] Audit all section styles (Hero, Features, etc.) to replace non-brand colors with variables + fallbacks.
[ ] Provide 3-5 brand-compliant, modern layout presets per core section for variety without breaking consistency.
