# CareConnect — Production Completion Tasks (Phase 2)

**Bismillah Ar-Rahman Ar-Raheem.**
Derived from AUDIT-1 findings. Legend: `[ ]` pending · `[~]` in progress · `[x]` done

---

## Task A — Security Fixes (CRITICAL)

### A.1 Remove leaked Gmail credentials & route email through backend
- [ ] A.1.1 Remove hardcoded Gmail password from src/lib/email.ts and src/lib/email-notifications.ts
- [ ] A.1.2 Add backend /api/email/send endpoint (server-side SMTP or provider SDK)
- [ ] A.1.3 Replace 3 client-side email services (email.ts, notifications/email-service.ts, email-notifications.ts) with backend-routed calls
- [ ] A.1.4 Wire EmailSchedulerService.processDueEmails to actually send via backend

### A.2 Move payment secrets to backend & implement real verification
- [ ] A.2.1 Add backend /api/payments/initiate (server-side Paystack/Flutterwave transaction init)
- [ ] A.2.2 Add backend /api/payments/verify (real gateway verify, not fake)
- [ ] A.2.3 Add backend /api/payments/webhook (real signature verification)
- [ ] A.2.4 Add backend /api/payments/refund (refund workflow)
- [ ] A.2.5 Remove all secret-key fetch calls from src/lib/payments.ts (browser)
- [ ] A.2.6 Wire PaymentCallbackPage to backend /api/payments/verify

### A.3 Fix payment-webhooks.ts fake signature verification
- [ ] A.3.1 Replace `return true` in verifyWebhookSignature with real Paystack/Flutterwave signature check (backend only)

### A.4 Fix ResetPasswordPage displaying reset URL in UI
- [ ] A.4.1 Send reset link via email (backend) instead of displaying in UI

---

## Task B — Broken SDK Calls (123 calls across 14 files)

### B.1 Fix all `create` -> `insert`, `findMany` -> `find`, `findOne` -> `find(...)[0]`, `query` -> `find`
- [ ] B.1.1 src/lib/payments-enhanced.ts
- [ ] B.1.2 src/lib/booking-enhanced.ts
- [ ] B.1.3 src/lib/forum-enhanced.ts
- [ ] B.1.4 src/lib/news-enhanced.ts
- [ ] B.1.5 src/lib/shop-enhanced.ts
- [ ] B.1.6 src/lib/notifications-enhanced.ts
- [ ] B.1.7 src/lib/lms-enhanced.ts
- [ ] B.1.8 src/lib/podcast-enhanced.ts
- [ ] B.1.9 src/lib/crowdfunding-enhanced.ts
- [ ] B.1.10 src/lib/background-scheduler.ts
- [ ] B.1.11 src/lib/ai/care-path.ts
- [ ] B.1.12 src/lib/ai/order-explainer.ts
- [ ] B.1.13 src/lib/ai/procedure-navigator.ts
- [ ] B.1.14 src/pages/ailab/AILabPage.tsx

---

## Task C — Booking Flow (CRITICAL stub)

### C.1 Wire BookingPage.tsx handleSubmit
- [ ] C.1.1 Replace console.log with real CompleteBookingService.createBooking call
- [ ] C.1.2 Fetch real available slots from backend (appointment_slots collection)
- [ ] C.1.3 On confirm, generate ICS calendar file via ics-generator.ts
- [ ] C.1.4 Trigger booking confirmation email via backend

---

## Task D — AILab Tasks 4-6 (0% implemented)

### D.1 Emergency Communication Bridge (TODO6 Task 4)
- [ ] D.1.1 Create src/lib/ai/emergency-bridge.ts service
- [ ] D.1.2 Create src/pages/ailab/EmergencyBridgePage.tsx
- [ ] D.1.3 Add route /ailab/emergency-bridge in App.tsx
- [ ] D.1.4 Add card/link on AILabPage

### D.2 Medical Record Timeline Builder (TODO6 Task 5)
- [ ] D.2.1 Create src/lib/ai/medical-timeline.ts service
- [ ] D.2.2 Create src/pages/ailab/MedicalTimelinePage.tsx
- [ ] D.2.3 Add route /ailab/medical-timeline in App.tsx
- [ ] D.2.4 Add card/link on AILabPage

### D.3 Cultural & Religious Care Advisor (TODO6 Task 6)
- [ ] D.3.1 Create src/lib/ai/cultural-advisor.ts service
- [ ] D.3.2 Create src/pages/ailab/CulturalAdvisorPage.tsx
- [ ] D.3.3 Add route /ailab/cultural-advisor in App.tsx
- [ ] D.3.4 Add card/link on AILabPage

---

## Task E — Dead/Broken Service Wiring

### E.1 Create missing shadcn primitives + use-toast
- [ ] E.1.1 Create src/components/ui/label.tsx
- [ ] E.1.2 Create src/components/ui/select.tsx
- [ ] E.1.3 Create src/components/ui/scroll-area.tsx
- [ ] E.1.4 Create src/components/ui/dialog.tsx
- [ ] E.1.5 Create src/components/ui/checkbox.tsx
- [ ] E.1.6 Create src/hooks/use-toast.ts
- [ ] E.1.7 Fix 3 dead admin components (DataExportDialog, KeyManagementModule, SystemMonitoringModule)
- [ ] E.1.8 Wire DataExportDialog into patient portal
- [ ] E.1.9 Wire KeyManagementModule + SystemMonitoringModule into SuperAdminDashboard

### E.2 Wire dead service files into UI
- [ ] E.2.1 Wire forum-interactions.ts into ForumPostPage (voting/reporting UI)
- [ ] E.2.2 Wire quiz-service.ts into CourseLearningPage (quiz grading UI)
- [ ] E.2.3 Wire verification-documents.ts into entity verification upload form
- [ ] E.2.4 Wire cart-service.ts into CartPage + CheckoutPage
- [ ] E.2.5 Wire podcast-production.ts into a PodcastManagementPage (admin)
- [ ] E.2.6 Wire news-aggregator.ts into backend /api/news/aggregate

---

## Task F — Hardcoded Mock Data Removal (9 UI pages)

### F.1 Replace mock data with real DB queries
- [ ] F.1.1 src/pages/shop/ProductPage.tsx (mockProduct + mockReviews)
- [ ] F.1.2 src/pages/dashboard/BillingPage.tsx (fake invoices + claims)
- [ ] F.1.3 src/pages/patient/PatientPortal.tsx (fake pending tasks)
- [ ] F.1.4 src/pages/patient/Providers.tsx (random ratings + hardcoded contacts)
- [ ] F.1.5 src/pages/HealthTalkPodcastPage.tsx (fake live session)
- [ ] F.1.6 src/pages/blog/BlogPostPage.tsx (mockComments + mockRelatedPosts + non-functional like/bookmark/comment)
- [ ] F.1.7 src/hooks/use-ajax-search.ts (MOCK_NEWS + MOCK_PODCASTS)
- [ ] F.1.8 src/components/ui/SearchSuggestions.tsx (fake popular + trending)
- [ ] F.1.9 src/pages/directory/EntityDetailPage.tsx (hardcoded services)

---

## Task G — Schedulers Consolidation

### G.1 Consolidate 3 schedulers into 1 backend-cron-driven scheduler
- [ ] G.1.1 Audit scheduler.ts, schedulers.ts, background-scheduler.ts
- [ ] G.1.2 Create single backend /api/cron endpoint (protected)
- [ ] G.1.3 Wire real jobs (email processing, re-verification reminders, booking reminders)

---

## Task H — AI Features (Gemini)

### H.1 Wire real Gemini API
- [ ] H.1.1 Route AI calls through backend /api/ai/* (key stays server-side)
- [ ] H.1.2 Remove client-side VITE_GEMINI_API_KEYS usage
- [ ] H.1.3 Add UI warning when AI is unavailable (not silent fallback)

---

## Task I — Missing Features

### I.1 Forum voting/reporting UI
- [ ] I.1.1 Upvote/downvote buttons wired to forum-interactions
- [ ] I.1.2 Report button + moderation queue

### I.2 Certificate generation
- [ ] I.2.1 Real PDF certificate generation (backend)
- [ ] I.2.2 Real certificate URL (not fake domain)

### I.3 News RSS aggregation
- [ ] I.3.1 Real RSS fetch in backend /api/news/aggregate

### I.4 Podcast RSS XML
- [ ] I.4.1 Backend /api/podcast/rss.xml route

### I.5 HMS print templates + code validators
- [ ] I.5.1 Printable encounter/prescription/lab templates
- [ ] I.5.2 ICD-10/CPT/NDC validators

### I.6 Consent versioning + MFA
- [ ] I.6.1 Consent version enforcement on login
- [ ] I.6.2 Optional MFA/TOTP setup

### I.7 "Coming soon" placeholders
- [ ] I.7.1 SuperAdminDashboard (verifications, content, reports, settings)
- [ ] I.7.2 LmsManagementPage (students, analytics, content)
- [ ] I.7.3 BedManagementPage (Reports)
- [ ] I.7.4 PublicDashboard (activity feed, tool results)

---

## Task J — Environment & Config

### J.1 Update .env.example with ALL env vars
- [ ] J.1.1 Add Lightbase vars (STORAGE_PROVIDER, LIGHTBASE_*)
- [ ] J.1.2 Add backend vars (SESSION_SECRET, SEED_KEY, CORS_ORIGIN)
- [ ] J.1.3 Add VITE_PAYSTACK_PUBLIC_KEY
- [ ] J.1.4 Add VITE_DISABLE_CONSOLE / VITE_ENABLE_CONSOLE
- [ ] J.1.5 Set VITE_DB_MODE=api as default (lightbase primary)
- [ ] J.1.6 Document each var

### J.2 Seed data gaps
- [ ] J.2.1 Add compliance_officer, moderator, support_agent users
- [ ] J.2.2 Add verification documents + verification queue entries
- [ ] J.2.3 Add sample orders + payment intents
- [ ] J.2.4 Add forum interactions (votes) sample data

---

## Task K — Verification & Commit

### K.1 Browser verification
- [ ] K.1.1 All public pages render real data
- [ ] K.1.2 Login + dashboard for each role
- [ ] K.1.3 Booking flow end-to-end
- [ ] K.1.4 Payment flow (initiate + verify)
- [ ] K.1.5 AILab 4-6 pages functional
- [ ] K.1.6 No console errors

### K.2 Commit + push (hash-verified, after each sub-task group)
