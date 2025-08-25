# CareConnect Healthcare Platform — Comprehensive Technical Documentation

This documentation covers the entire platform for hackathon evaluation: architecture, modules, data model, workflows, security, and AI. It is designed to be complete yet efficient. All sections reflect the current codebase.

---

## 1) Platform Overview
- SPA built with React 18 + Vite + TypeScript
- TailwindCSS for styling; lucide-react for icons
- Routing via react-router-dom v6
- GitHub JSON Database via custom SDK (collections as JSON files under `db/` in a GitHub repo)
- AI: Google Gemini (Generative Language API) via REST
- Maps: Google Maps via @react-google-maps/api
- Deployment: Vercel (SPA rewrite to index.html)

Key principles: privacy-first, modular domain layers, agentic AI assistance, extensibility.

---

## 2) Repository Structure

- Root: config files, scripts, locks, vercel.json, redirects
- `db/`: static datasets (languages, specialties, podcasts, insurers)
- `src/`
  - `App.tsx`: initialization and routes
  - `components/`: UI primitives, layout, AI support, utilities
  - `hooks/`: AJAX search, analytics, responsiveness
  - `lib/`: domain modules (HMS/EHR, booking, LMS, ecommerce, community, news, payments, consents, encryption, notifications, AI tools)
  - `pages/`: route-level pages for each domain
  - `styles/`: brand CSS

---

## 3) App Initialization & Routing (src/App.tsx)

Initialization sequence (inside useEffect):
1. Theme initialization: `initializeTheme()`
2. DB collections initialization: `initializeDatabase()` (via GitHub DB SDK)
3. Health tools initialization: `initializeAllHealthTools()` (or master versions)
4. LMS seeds: `LMSService.initializeStarterCourses()`
5. Refresh user: `useAuth().refreshUser()`

Routing:
- Public: Home, Directory, EntityDetail, HealthTools, ToolDetail, Courses (+detail, learning, completion), Shop/Cart/Checkout/Success, Blog/Article, Community/Forum, News Feed/Article, Weekly Tips, Timeless Facts, Jobs/JobDetail, Help, Contact, Legal
- Protected (role-based): HMS dashboards (Hospital, PatientRegistry, EncounterBoard, Lab/Imaging Orders, Care Plans, Referrals, Bed Mgmt, Billing, Reports), Patient Portal (Records, Medications, Consents, Providers, Billing), Super Admin areas (News, Weekly Tips, Timeless Facts, Forum, Jobs)
- Floating utilities: `AISupportAgent`, `AccessibilityTools`, `ConsentBanner`

---

## 4) Data Layer — GitHub JSON DB

SDK: `src/lib/github-db-sdk.ts`
- Collections are JSON blobs at `db/<collection>.json`
- API auth via `VITE_GITHUB_TOKEN`; repo set by `VITE_GITHUB_OWNER`/`VITE_GITHUB_REPO`
- Caching with ETag; optimistic writes queued; conflict retries
- Core Methods:
  - `get(collection)`: read full array; auto-initialize if missing
  - `find(collection, filter | fn)`: filter by object or predicate
  - `findById(collection, id)`
  - `insert(collection, item)` => returns item with `id` + `uid`
  - `update(collection, id|uid, patch)`
  - `delete(collection, id|uid)`
- Schemas: defined in constructor (hundreds of fields); validation on insert/update
- `src/lib/database.ts` exposes `collections` (canonical names) and `initializeDatabase()` wrapper

Suitability: Ideal for demos, content, meta/config; not for PHI. For health data, use encrypted fields with consent/access controls, or swap to compliant backend.

---

## 5) Authentication & Privacy

- `src/lib/auth.tsx` (lightweight): user session management, roles (`public_user`, `patient`, `health_center`, `hospital_admin`, `physician`, `nurse`, `pharmacist`, etc.)
- Privacy modules:
  - `consents.ts`: consent records (type, scope, purpose, status)
  - `access-grants.ts`: organization/person access control to patient data (scope + levels)
  - `encryption.ts`: helpers for encrypting identifiers
- Do not store PHI/PII in GitHub DB. If needed, encrypt contents and gate with consents/access grants.

---

## 6) AI — Gemini Integration & Agentic Support

Primary component: `src/components/ui/AISupportAgent.tsx`
- Works for anonymous and authenticated users
- Persists sessions for authenticated users in `chat_sessions`
- AI pipeline:
  1) Collect conversation context (last messages)
  2) Pull dynamic knowledge (`ai_chatbot_support`)
  3) Query live platform collections (entities, health_tools, courses, blog_posts, causes, products)
  4) Run agentic search over user query to construct result snippets with internal links
  5) Build system prompt with counts, links, and constraints (privacy, emergency guidance)
  6) Call Gemini REST API using `VITE_GEMINI_API_KEYS`
  7) Extract response + `SUGGESTIONS:`; fallback suggestions are generated from live collection availability

- Error handling: if Gemini fails, reply references real counts and internal URLs (no hardcoded content)
- Security: no PHI/PII; includes medical safety guidance in system prompt

AI Utilities:
- `src/lib/ai/gemini-service.ts` (if present): centralized Gemini client wrapper; else direct fetch from component

---

## 7) Domain Modules (src/lib)

The platform implements a comprehensive healthcare ecosystem. Key modules:

7.1 Booking & Scheduling
- `booking.ts`, `booking-enhanced.ts`, `booking-complete.ts`: appointment lifecycle, slot management, payments coupling

7.2 Learning Management System (LMS)
- `lms.ts`, `lms-enhanced.ts`:
  - Entities: Course, Module, Lesson, Quiz, Enrollment, Progress, Certificate
  - Payments integration for paid courses
  - Certificate HTML template generation

7.3 E-Commerce & Shop
- `ecommerce.ts`, `shop-enhanced.ts`, `payments.ts`, `payments-enhanced.ts`:
  - Cart, Order, Inventory, Variants, Addresses
  - PaymentIntent and settlement logic (client-side demo)

7.4 Community & Forum
- `community.ts`, `forum.ts`, `forum-enhanced.ts`:
  - Posts, Replies, Votes, Reports, Moderation, Expert answers, Categories

7.5 Crowdfunding (Causes)
- `crowdfunding.ts`, `crowdfunding-enhanced.ts`, `causes-enhanced.ts`:
  - Causes, Donations, Disbursements, Updates, In-kind Donations
  - Verification flows and transparency

7.6 News & Content
- `news.ts`, `news-enhanced.ts`, `news-aggregator.ts`, `blog.ts`:
  - Sources, Articles, Newsletters, Digests, RSS/API ingestion

7.7 Directory & Entities
- `entities.ts`, `directory-enhanced.ts`:
  - Entities/providers, staff, services, specialties, insurance networks
  - Search utilities (see `hooks/use-ajax-search.tsx`)

7.8 HMS/EHR-like Modules
- `patients.ts`, `encounters.ts`, `labs.ts`, `imaging.ts`, `medications.ts`, `care-plans.ts`, `referrals.ts`, `bed-management.ts`, `observations.ts`, `conditions.ts`, `documents` (within schemas)
  - Scaffolding for clinical workflows: orders, results, pharmacy, referrals, care plans, billing items

7.9 Security & Privacy
- `consents.ts`, `access-grants.ts`, `encryption.ts`, `key-management.ts`
- Audit and governance schemas included in SDK

7.10 Notifications & Emails
- `notifications-enhanced.ts`, `email.ts`, `email-notifications.ts`, `email-events.ts`:
  - Templates, Preferences, Delivery (client demo), EmailJS rendering

7.11 Observability & Scheduling
- `observability.ts`, `background-scheduler.ts`, `scheduler.ts`:
  - Background jobs, periodic tasks, logging helpers

7.12 Health Tools (Master)
- `health-tools-master.ts`:
  - Canonical catalog of health tools (categories, types, AI chat tools)
  - `initializeMasterHealthTools()` seeds tools into DB if missing
  0  - `geminiAI` hook point for AI tool interactions

7.13 Content Initialization
- `content-initializer.ts`: seeds news, podcasts, forum, causes, blogs, jobs, products, tips, facts; ensures expert answers

---

## 8) Pages (src/pages)

- Directory: `directory/DirectoryPage.tsx`, `directory/EntityDetailPage.tsx`
- Health Tools: `tools/HealthToolsPage.tsx`, `tools/ToolDetailPage.tsx`
- LMS: `lms/CoursesPage.tsx`, `lms/CourseDetailPage.tsx`, `lms/CourseLearningPage.tsx`, `lms/CourseCompletionPage.tsx`, `lms/CourseCreationPage.tsx`, `lms/LMSDashboard.tsx`
- E-commerce: `shop/ShopPage.tsx`, `ecommerce/ProductPage.tsx`, `ecommerce/CartPage.tsx`, `ecommerce/CheckoutPage.tsx`, `ecommerce/OrderSuccessPage.tsx`
- Community: `community/CommunityPage.tsx`, `community/ForumPostPage.tsx`, `community/CreateForumPostPage.tsx`
- News: `HealthNewsFeedPage.tsx`, `HealthNewsArticlePage.tsx`
- Support/Legal: `support/HelpCenterPage.tsx`, `support/ContactPage.tsx`, `legal/PrivacyPolicyPage.tsx`, `legal/TermsOfServicePage.tsx`
- Patient Portal: `patient/*` (Records, Medications, Consents, Providers, Billing)
- Dashboards: `dashboard/*` for Hospital, Admin, Super Admin

---

## 9) Hooks & UI

- Hooks:
  - `use-ajax-search.tsx`: directory search
  - `use-search-analytics.tsx`: search telemetry
  - `use-mobile.tsx`: responsive helpers
- UI components: `components/ui/*` (button, input, card, tabs, toast, loading spinner, notifications, consent banner, theme toggle, search modal/suggestions)
- Layout: `components/layout/*` (Header/Footer/Sidebar/DashboardLayout)

---

## 10) Configuration & Build

- `vite.config.ts`: Vite + React plugin, dev server
- `tailwind.config.ts`: Tailwind setup
- `eslint.config.js`: ESLint rules
- `tsconfig*.json`: TypeScript configs
- `vercel.json`: SPA rewrite

---

## 11) Security, Compliance, and Data Governance

- No PHI/PII in GitHub DB; use encrypted fields when unavoidable
- Manage access via `consents.ts` and `access-grants.ts`
- Emergency messaging in AI to route users to local emergency services
- Email templates and notifications are informational; for production, swap to server-side email

---

## 12) Environment & Secrets

- `.env.example` documents all keys
- Required:
  - `VITE_GITHUB_OWNER`, `VITE_GITHUB_REPO`, `VITE_GITHUB_TOKEN`
  - `VITE_GEMINI_API_KEYS`
  - `VITE_GOOGLE_MAPS_API_KEY`
- Optional: Cloudinary, API base URL

---

## 13) Build/Run/Deploy

- Dev: `npm run dev`
- Lint: `npm run lint`
- Build: `npm run build`
- Preview: `npm run preview`
- Deploy: Vercel (auto-detects Vite; rewrite to SPA)

---

## 14) Extension Points & Best Practices

- Add collection: define schema in `github-db-sdk.ts`, add key in `database.ts`
- Add feature module: place in `src/lib`, expose typed interfaces, use `githubDB`
- Add page: place under `src/pages`, wire route in `App.tsx`
- Add AI feature: reuse Gemini client/pattern; store curated content in `ai_chatbot_support`
- Avoid schema drift by using `collections` constants
- Keep secrets in `.env.local`; never commit

---

## 15) Troubleshooting

- Gemini errors: verify `VITE_GEMINI_API_KEYS`, check network call and CORS
- GitHub DB writes failing: validate token scope (repo), repo/owner envs, network
- SPA 404: confirm `vercel.json` rewrites
- Maps missing: check Google Maps key

---

## 16) Collections Glossary (high level)

See `schemas` in `src/lib/github-db-sdk.ts` for exact fields. Major groups:
- Messaging: `chat_sessions`, `messages`, `notifications`
- Content: `blog_posts`, `news_articles`, `pages`, `media_files`, `weekly_tips`, `timeless_facts`, `podcasts`
- Directory & Healthcare: `entities`, `specialties`, `insurance_providers`, `languages`, `entity_*`
- LMS: `courses`, `course_modules`, `course_lessons`, `course_enrollments`, `course_progress`, `certificates`
- E-commerce: `products`, `orders`, `order_items`
- Crowdfunding: `causes`, `donations`, `cause_updates`
- HMS/EHR: `patients`, `encounters`, `vitals`, `conditions`, `allergies`, `lab_orders`, `lab_results`, `imaging_orders`, `care_plans`, `referrals`, `documents`, `billing_items`, `pharmacy_inventory`, `pharmacy_orders`, `insurance_claims`
- Security & Admin: `consents`, `access_grants`, `audit_logs`, `feature_flags`, `system_settings`
- AI: `ai_chatbot_support`, `ai_consultations`, `health_tools`

---

## 17) Future Enhancements (suggested)

- Server-side proxy for AI calls + secure secret storage
- Streaming AI responses, RAG with vector search
- Role-aware AI (restrict context by user type/consent)
- Replace GitHub DB with compliant backend for PHI scenarios
- Unified observability across modules (logs, metrics, traces)

---

This document is comprehensive and aligned with the current code. For additional artifacts (architecture diagram, sequence diagrams, API reference per module), request ARCHITECTURE.md and SDK_API.md.
