# PRD Audit & Gaps Implementation Plan

**Bismillah Ar-Rahman Ar-Raheem**

## Audit Methodology

This document audits the CareConnect Healthcare Platform codebase against its PRD documents (TODO5.md, TODO6.md, docs/4_features_current_and_roadmap.md, DOCUMENTATION.md) and identifies gaps requiring implementation.

**Status Legend:**
- [x] Fully implemented and functional
- [~] Partially implemented (needs work)
- [ ] Not implemented (gap)

---

## 1. DIRECTORY & VERIFICATION

| Feature | Status | Gap |
|---------|--------|-----|
| Rich entity profiles | [x] | - |
| Specialties, languages, insurance | [x] | - |
| Telehealth flags | [x] | - |
| Reviews & ratings | [~] | Reviews exist in schema but limited UI for submit/display |
| Map/search | [x] | - |
| Verification requests collection | [x] | Added to database.ts |
| Verification documents collection | [x] | Added to database.ts |
| Admin review queue UI | [~] | VerificationQueuePage exists, needs full approve/reject with notes |
| Entity verification states | [~] | Schema has status field, needs lifecycle enforcement |
| License/accreditation doc upload | [ ] | No upload implementation |
| Verified badges display | [x] | VerificationBadge component exists |
| Re-verification reminders | [ ] | No reminder scheduler |

**Actions:** Implement doc upload (base64), reminder scheduler, full verification workflow.

---

## 2. BOOKING & SCHEDULING

| Feature | Status | Gap |
|---------|--------|-----|
| Services collection | [x] | Added to database.ts |
| Slot locks collection | [x] | Added to database.ts |
| Availability slots persistence | [~] | Schema exists, needs full CRUD in booking lib |
| ICS calendar generation | [ ] | Not implemented |
| Cancellation/reschedule policies | [ ] | Not enforced |
| Reminder scheduling | [ ] | scheduled_emails collection exists but no scheduler |
| Booking payments | [~] | Schema exists, needs payment flow integration |

**Actions:** Implement ICS generation, policy enforcement, reminder scheduler.

---

## 3. PAYMENTS & CHECKOUT

| Feature | Status | Gap |
|---------|--------|-----|
| Client-only payment gateway | [~] | Payment schemas exist, no gateway integration |
| Payment callback routes | [ ] | No /payment/callback route |
| Admin reconciliation workflow | [ ] | Not implemented |
| Receipt generation | [ ] | No receipt generation |
| Refund workflow | [ ] | Not implemented |

**Actions:** Integrate Paystack/Flutterwave inline checkout, callback handling, admin reconciliation.

---

## 4. SHOP (CART, PRODUCTS, ORDERS)

| Feature | Status | Gap |
|---------|--------|-----|
| Products CRUD | [x] | Products collection and seed data |
| Cart persistence | [~] | carts collection exists, needs persistence logic |
| Tax/shipping calculation | [ ] | Not implemented |
| Inventory enforcement | [ ] | Not enforced |
| Order lifecycle | [~] | Orders schema exists, needs full flow |
| Order confirmation notifications | [ ] | Not implemented |

**Actions:** Implement cart persistence, tax/shipping calc, inventory checks, order flow.

---

## 5. HEALTH TOOLS

| Feature | Status | Gap |
|---------|--------|-----|
| Health tools catalog | [x] | Initialized via health-tools-master |
| AI/non-AI calculators | [x] | Multiple tools implemented |
| Medical disclaimers | [x] | MedicalDisclaimer component |
| Prompt versioning | [ ] | tool_versions collection exists but not used |
| Incident reporting | [ ] | tool_incidents collection exists but no UI |
| Input validation per tool | [~] | Partial validation |

**Actions:** Add prompt versioning, incident reporting UI, standardize validation.

---

## 6. LMS (COURSES)

| Feature | Status | Gap |
|---------|--------|-----|
| Course creation UI | [x] | CourseCreationPage exists |
| Starter courses seeding | [x] | LMSService.initializeStarterCourses |
| Payment-aware enrollment | [ ] | Not implemented |
| Progress tracking | [x] | course_progress collection |
| Quiz grading | [ ] | Not implemented |
| Certificate generation | [ ] | certificates collection exists but no generation |

**Actions:** Implement quiz system, certificate generation, payment-gated enrollment.

---

## 7. COMMUNITY Q&A

| Feature | Status | Gap |
|---------|--------|-----|
| Forum posts/replies | [x] | forum_posts collection, ForumPostPage |
| Categories | [x] | forum_categories collection |
| Voting/reporting | [ ] | Not implemented |
| Moderation queues | [~] | ForumManagementPage exists, needs moderation actions |
| Expert role tags | [ ] | Not implemented |
| Reply notifications | [ ] | Not implemented |

**Actions:** Implement voting, reporting, expert tags, notifications.

---

## 8. CAUSES (CROWDFUNDING)

| Feature | Status | Gap |
|---------|--------|-----|
| Cause CRUD | [x] | CausesPage, CauseDetailPage |
| Donations | [~] | donations schema exists, needs flow |
| Client-only gateway checkout | [ ] | Not implemented |
| Disbursements ledger | [ ] | disbursements collection exists but no UI |
| Beneficiary verification | [ ] | Not implemented |
| Monthly update scheduler | [ ] | Not implemented |
| In-kind request UI | [ ] | Not implemented |

**Actions:** Implement donation flow, disbursement ledger, beneficiary verification.

---

## 9. HEALTH NEWS

| Feature | Status | Gap |
|---------|--------|-----|
| News feed page | [x] | HealthNewsFeedPage |
| Article page | [x] | HealthNewsArticlePage |
| News aggregator | [x] | news-aggregator.ts exists |
| Real RSS/API integration | [~] | Has structure but simulated data |
| Moderation status | [ ] | Not implemented |
| Newsletter scheduler | [ ] | Not implemented |
| Unsubscribe handling | [ ] | unsubscribe_records collection exists but no logic |

**Actions:** Wire real RSS feeds, add moderation, newsletter scheduler.

---

## 10. PODCAST (5-MIN HEALTH TALK)

| Feature | Status | Gap |
|---------|--------|-----|
| Podcast page | [x] | HealthTalkPodcastPage |
| Series/episodes collections | [x] | podcast_series, podcast_episodes |
| Episode persistence | [~] | Seed data exists, needs admin CRUD |
| Transcript storage | [ ] | Not implemented |
| RSS XML generation | [ ] | Not implemented |
| Audio hosting references | [ ] | Not implemented |

**Actions:** Implement admin CRUD, RSS generation, audio reference system.

---

## 11. HMS MODULES

| Feature | Status | Gap |
|---------|--------|-----|
| Patient Registry | [x] | PatientRegistry page, patients collection |
| Encounters | [x] | EncounterBoard, encounters collection |
| Lab Orders | [x] | LabOrdersPage, lab_orders/results |
| Imaging Orders | [x] | ImagingOrdersPage |
| Pharmacy Dispense | [x] | PharmacyDispensePage |
| Billing | [x] | BillingPage |
| Bed Management | [x] | BedManagementPage |
| Referrals | [x] | ReferralsPage |
| Care Plans | [x] | CarePlansPage |
| Reports | [x] | ReportsHMS |
| Full lifecycle wiring | [~] | Pages exist, needs complete state transitions |
| Printable templates | [ ] | No print template generation |
| Code validators | [ ] | Not implemented |

**Actions:** Complete lifecycle wiring, add print templates, validators.

---

## 12. NOTIFICATIONS & EMAIL

| Feature | Status | Gap |
|---------|--------|-----|
| Email service | [x] | email-service.ts, email-events.ts |
| In-app notifications | [x] | NotificationsPanel, notifications collection |
| Client-safe email provider | [~] | EmailJS pattern exists, needs real config |
| Unsubscribe flags | [ ] | Not implemented |
| Domain event linking | [~] | Some events trigger emails, needs full coverage |

**Actions:** Wire all domain events to notifications, implement unsubscribe.

---

## 13. AUTH & RBAC

| Feature | Status | Gap |
|---------|--------|-----|
| Registration | [x] | RegisterPage, auth store |
| Login | [x] | LoginPage, auth store |
| Session management | [x] | Token-based with encryption |
| Role-based routing | [x] | Conditional routes in App.tsx |
| Permission checks | [x] | hasPermission, withPermission |
| Password reset | [ ] | Not implemented |
| MFA/TOTP | [ ] | Not implemented |
| Consent versioning on login | [ ] | Not implemented |

**Actions:** Implement password reset flow, consent versioning, optional MFA.

---

## 14. KEY MANAGEMENT (BYOK)

| Feature | Status | Gap |
|---------|--------|-----|
| Encrypted key storage | [x] | EncryptionService, encrypted_keys collection |
| Key management UI | [x] | KeyManagementModule |
| Key rotation UX | [ ] | Not implemented |
| Per-service scoping | [ ] | Not implemented |
| Audit logging | [~] | Partial logging |

**Actions:** Implement key rotation, per-service scoping, enhanced audit.

---

## 15. OBSERVABILITY

| Feature | Status | Gap |
|---------|--------|-----|
| Observability module | [x] | observability.ts exists |
| Error logging | [~] | error_logs collection, needs wiring |
| Uptime checks | [ ] | uptime_checks collection exists but no logic |
| SLIs/SLOs dashboard | [ ] | Not implemented |

**Actions:** Wire error logging, implement heartbeat checks, basic SLI dashboard.

---

## 16. ACCESSIBILITY & LOCALIZATION

| Feature | Status | Gap |
|---------|--------|-----|
| Accessibility tools | [x] | AccessibilityTools component |
| Accessibility provider | [x] | AccessibilityProvider |
| WCAG audit | [ ] | Not performed |
| Language switcher | [ ] | Not implemented |
| i18n | [ ] | Not implemented |

**Actions:** Add language switcher scaffolding, run WCAG audit.

---

## 17. DATA PRIVACY

| Feature | Status | Gap |
|---------|--------|-----|
| Consent management | [x] | Consents page, consents collection |
| Access grants | [x] | access_grants collection, Consents page |
| Consent banner | [x] | ConsentBanner component |
| Data export | [ ] | data_export_requests collection exists but no logic |
| Data deletion | [~] | data-deletion.ts exists, needs grace period |
| Consent version persistence | [ ] | Not implemented |

**Actions:** Implement data export (JSON/CSV), deletion with grace period.

---

## 18. SEARCH & ANALYTICS

| Feature | Status | Gap |
|---------|--------|-----|
| Search modal | [x] | SearchModal, SearchSuggestions |
| Search analytics | [~] | use-search-analytics hook |
| Event taxonomy | [ ] | Not defined |
| Provider dashboards | [~] | EntityDashboard exists, needs analytics widgets |
| Privacy-aware tracking | [ ] | Not implemented |

**Actions:** Define event taxonomy, implement privacy-aware tracking, analytics widgets.

---

## 19. AILAB (TODO6)

| Feature | Status | Gap |
|---------|--------|-----|
| AI Care Path Cards | [x] | care-path.ts, CarePathPage |
| AI Lab & Imaging Explainer | [x] | order-explainer.ts, LabExplainerPage |
| AI Procedure Navigator | [x] | procedure-navigator.ts, ProcedureNavigatorPage |
| AILab Dashboard | [x] | AILabPage |
| Gemini integration | [x] | gemini-service.ts |
| Safety framework | [x] | PHI redaction, emergency detection |
| Emergency Communication Bridge | [ ] | Not implemented |
| Medical Record Timeline | [ ] | Not implemented |
| Cultural & Religious Advisor | [ ] | Not implemented |

**Actions:** Implement remaining AILab features (Tasks 4-6).

---

## PRIORITY IMPLEMENTATION ORDER

### Phase 1: Critical Gaps (Security & Core Flows)
1. Password reset flow
2. Cart persistence and order lifecycle
3. Payment gateway integration (Paystack inline)
4. Data export and deletion (GDPR compliance)
5. Document upload for verification
6. Consent versioning

### Phase 2: Feature Completion
7. ICS calendar generation for bookings
8. Booking policy enforcement
9. Quiz grading and certificate generation (LMS)
10. Forum voting/reporting
11. Crowdfunding donation flow and disbursement ledger
12. Newsletter scheduler
13. HMS print templates

### Phase 3: Enhancement & Polish
14. Key rotation UX
15. Observability dashboard
16. Event taxonomy and analytics
17. Language switcher scaffolding
18. AILab Tasks 4-6
19. Podcast admin CRUD and RSS generation
20. WCAG audit fixes

---

## ARCHITECTURE CHANGES COMPLETED

| Change | Status |
|--------|--------|
| SQLite database adapter (better-sqlite3) | [x] packages/db/src/adapter.ts |
| Astro backend with API routes | [x] apps/backend/ |
| Frontend API client | [x] src/lib/api-client.ts |
| DB mode switching (github/sqlite) | [x] VITE_DB_MODE env var |
| Monorepo with workspaces | [x] root package.json |
| Backward compatibility with GitHub DB | [x] Default mode is 'github' |
| Cloud backup support | [x] SQLite WAL mode + backup command |
| Backend security layer | [x] Auth tokens, RBAC, audit logging |

---

*This audit reflects the current state of the codebase as of the implementation date. All gaps listed are actionable and prioritized for production readiness.*
