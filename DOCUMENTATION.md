# CareConnect Healthcare Platform — Technical Documentation

This document provides a comprehensive, factual, and concise technical overview of the CareConnect Healthcare Platform codebase. It is structured to give engineers, DevOps, data privacy, and product teams a clear understanding of architecture, modules, data model, workflows, and extension points without wasting words.

---

## 1. Stack Overview
- Runtime: Browser SPA (React 18), Vite build tool, TypeScript
- UI: TailwindCSS, lucide-react icons
- Routing: react-router-dom v6
- State/Utils: Zustand (light usage), clsx, tailwind-merge
- Maps: @react-google-maps/api (Google Maps JS)
- Data layer: GitHub as JSON-backed store via custom SDK (`src/lib/github-db-sdk.ts`)
- AI: Google Gemini (Generative Language API) via REST
- Deployment: Vercel (see `vercel.json`), SPA rewrite to `index.html`

---

## 2. Project Structure

- `src/`
  - `App.tsx`: App bootstrap, theme initialization, DB init, LMS and health-tools initialization. Declares routes and mounts floating tools (AI support, accessibility tools, consent banner).
  - `components/`
    - `layout/`: Header, Footer, Sidebar, Dashboard layout pieces
    - `ui/`: Reusable UI (buttons, inputs, cards, tabs, toasts, loaders), AccessibilityTools, ConsentBanner, ThemeToggle
    - `ui/AISupportAgent.tsx`: Floating, agentic Gemini-powered support assistant
    - `ai/`: Feature-specific AI components (e.g., ProcedureNavigator/LabImagingExplainer)
  - `hooks/`: Custom hooks including AJAX directory search and analytics
  - `lib/`: Domain modules (booking, LMS, payments, HMS, EHR-like records, news, forum, ecommerce, consents, encryption, etc.) and platform initialization
  - `pages/`: Route-level pages for directory, LMS, ecommerce, community, patient portal, dashboards, etc.
  - `styles/`: Styling tokens and brand system
- `db/`: Static seed/lookups (languages, specialties, podcasts, insurers)
- `ProjectsDetails/`: Meta docs/specs
- Root config: `vite.config.ts`, `tailwind.config.ts`, `eslint.config.js`, TS configs

---

## 3. Application Bootstrapping

Boot flow in `App.tsx`:
1. Initialize theme: `initializeTheme()`
2. Initialize GitHub DB collections: `initializeDatabase()` (calls `githubDB.initializeAllCollections()`)
3. Initialize health tools: `initializeAllHealthTools()`
4. Initialize LMS starter content: `LMSService.initializeStarterCourses()`
5. Refresh user auth: `useAuth().refreshUser()`
6. Render router with public + protected areas
7. Mount floating utilities: `AISupportAgent`, `AccessibilityTools`, `ConsentBanner`

Protected routes are conditionally rendered by `user.user_type`. Patient Portal and HMS dashboards are only available for authenticated users with specific roles.

---

## 4. Data Layer (GitHub JSON DB)

- SDK: `src/lib/github-db-sdk.ts`
  - Stores collections as JSON files under `db/<collection>.json` in a GitHub repo
  - Auth via `VITE_GITHUB_TOKEN`; repo config via `VITE_GITHUB_OWNER`, `VITE_GITHUB_REPO`
  - Methods: `get`, `find`, `findById`, `insert`, `update`, `delete`
  - Optimistic updates with write queue; handles ETags/SHA for conflict resolution
  - Schemas are defined in SDK constructor; undefined collections auto-initialize
- Database helpers + collection keys: `src/lib/database.ts`
  - Exposes `collections` map for consistency
  - `initializeDatabase()` runs `githubDB.initializeAllCollections()`

Privacy: Do not store PHI/PII directly in GitHub DB; use encrypted fields if absolutely necessary and follow consent/access controls in `consents.ts` and `access-grants.ts`.

---

## 5. Environment Variables (.env.local)

See `.env.example` for all keys. Important ones:
- `VITE_GITHUB_OWNER`, `VITE_GITHUB_REPO`, `VITE_GITHUB_TOKEN` — JSON DB
- `VITE_GEMINI_API_KEYS` — comma-separated Gemini keys for load-balancing
- `VITE_GOOGLE_MAPS_API_KEY` — maps
- `VITE_CLOUDINARY_*` — media uploads (if used)
- `VITE_API_BASE_URL` — for any external APIs

Never commit `.env.local`.

---

## 6. AI Support Agent (src/components/ui/AISupportAgent.tsx)

Purpose: Provide platform-aware, privacy-preserving, agentic support via Gemini.

Key behaviors:
- Works for both anonymous and authenticated users
- Persists sessions to GitHub DB for authenticated users (`collections.chat_sessions`)
- Generates responses by calling Gemini with a system prompt containing:
  - Conversation context (last messages)
  - Dynamic knowledge base from `ai_chatbot_support` collection
  - Live platform signals: entity/tool/course/blog/cause/product counts
  - Agentic search results with internal links (e.g., `/directory/:id`, `/health-tools/:id`)
- Extracts AI-provided suggestions from `SUGGESTIONS:` line; else generates suggestions from available data
- Includes strict privacy and medical safety guidance in the prompt

Integration details:
- API: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=<API_KEY>`
- Request includes `generationConfig` and `safetySettings`
- Robust error handling: if Gemini fails, fallback responses reference actual platform data with direct links

Security & Privacy:
- No PHI/PII collection in chat
- Emergency guidance handled by AI instruction; no storage of sensitive info

UX details:
- Floating button opens chat window
- Message sending via submit, Enter key, or button click
- Loading/thinking states; feedback buttons on bot replies; session management and export

---

## 7. Domain Modules (src/lib)

Representative modules (not exhaustive):
- `booking*.ts`: appointment scheduling, slots, payments
- `lms*.ts`: courses, modules, lessons, enrollments, progress, certificates
- `payments*.ts`: payments, subscriptions, methods
- `news*.ts`, `blog.ts`, `news-aggregator.ts`: content aggregation and publishing
- `community.ts`, `forum*.ts`: forums, categories, moderation
- `directory*.ts`, `entities.ts`: provider discovery, entity metadata
- `patients.ts`, `encounters.ts`, `labs.ts`, `imaging.ts`, `medications.ts`, `care-plans.ts`, `referrals.ts`: HMS/EHR-inspired features
- `consents.ts`, `access-grants.ts`, `encryption.ts`: privacy, consent and access control helpers
- `ecommerce*.ts`, `shop-enhanced.ts`, `products`, `orders` collections
- `observability.ts`: logging/metrics scaffolding

Each module uses `githubDB` to CRUD collections named in `src/lib/database.ts`.

---

## 8. Pages & Routing

- Public pages: Home, Directory, Entity detail, Health Tools (+ detail), Courses (+ detail/learning/completion), Shop/Cart/Checkout/Success, Blog/Article, Community/Forum, News, Jobs, Weekly Tips, Timeless Facts, Support (Help/Contact), Legal
- Patient Portal: Records, Medications, Consents, Providers, Billing
- HMS Admin: HospitalDashboard, PatientRegistry, EncounterBoard, Lab/Imaging Orders, Care Plans, Referrals, Bed Management, Billing, Reports
- Super Admin: News/Weekly Tips/Timeless Facts Management, Forum, Jobs

Routes are declared in `App.tsx` using `react-router-dom`. Role-gated sections redirect unauthenticated users to `/login`.

---

## 9. Styling & UI System

- TailwindCSS configured in `tailwind.config.ts`
- Shared primitives under `components/ui/*`: `button.tsx`, `input.tsx`, `card.tsx`, `tabs.tsx`, `LoadingSpinner.tsx`, etc.
- Accessibility helpers: `AccessibilityProvider`, `AccessibilityTools`
- Theme toggle: `ThemeToggle.tsx`, theme initialization in `lib/theme.tsx`

---

## 10. Security, Privacy, Compliance

- Strong guidance to avoid PHI/PII in chat and general UI
- Consents & Access Grants modules to manage secure sharing
- Encryption helpers available for sensitive identifiers
- Data storage via GitHub JSON collections: suitable for non-PHI content; for PHI, integrate a compliant backend
- Emergency messaging in AI to direct users to local emergency services

---

## 11. Initialization & Seeding

- Database initialization: `initializeDatabase()` -> `githubDB.initializeAllCollections()` creates missing collections
- Health tools initialization: `initializeAllHealthTools()` seeds catalog if missing
- LMS: `LMSService.initializeStarterCourses()` seeds courses/modules/lessons
- Optional seed scripts are present under `src/lib/seeds/*`

---

## 12. Building, Running, Deploying

- Dev: `npm run dev` or `pnpm dev`
- Lint: `npm run lint`
- Build: `npm run build` (TypeScript + Vite)
- Preview: `npm run preview`
- Deploy: Vercel (SPA rewrite in `vercel.json` routes all to `index.html`)

---

## 13. Extensibility & Best Practices

- Add new collections: update schema in `github-db-sdk.ts` + key in `database.ts`
- Add new pages/routes: update `App.tsx`; colocate page components under `src/pages/...`
- Add new AI tools: follow `AISupportAgent.tsx` pattern; use `ai_chatbot_support` for curated context
- Use `githubDB.get/find/insert/update/delete` consistently to avoid schema drift
- Keep PHI/PII out of GitHub DB; if needed, encrypt and gate behind consents/access grants

---

## 14. Troubleshooting

- Chatbot not responding:
  - Ensure `VITE_GEMINI_API_KEYS` is set and valid
  - Check browser console for fetch errors to Google API
  - Verify DB collections auto-initialized (network tab to GitHub API)
- Maps not loading: check `VITE_GOOGLE_MAPS_API_KEY`
- Data not saving: check GitHub token scopes and repo name
- SPA routing 404: confirm Vercel rewrite to `index.html`

---

## 15. Glossary of Collections (partial)

- Messaging: `chat_sessions`, `messages`, `notifications`
- Content: `blog_posts`, `news_articles`, `podcasts`, `pages`, `media_files`, `weekly_tips`, `timeless_facts`
- Directory & Healthcare: `entities`, `specialties`, `insurance_providers`, `languages`, `entity_*`
- LMS: `courses`, `course_modules`, `course_lessons`, `course_enrollments`, `course_progress`, `certificates`
- E-commerce: `products`, `orders`, `order_items`
- Crowdfunding: `causes`, `donations`, `cause_updates`
- HMS/EHR: `patients`, `encounters`, `vitals`, `conditions`, `allergies`, `lab_orders`, `lab_results`, `imaging_orders`, `care_plans`, `referrals`, `documents`
- Security: `consents`, `access_grants`, `encrypted_keys`, `audit_logs`
- AI: `ai_chatbot_support`, `ai_consultations`

For full schema definitions, see the `schemas` object in `src/lib/github-db-sdk.ts`.


---

This documentation reflects the current architecture and implementation within the repository. For questions or contributions, open a PR with suggested improvements.
