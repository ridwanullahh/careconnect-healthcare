# Operations (MVP) — Practical, Department-Owned Plan

Bismillah Ar-Rahman Ar-Raheem.

This is the operations plan I’m running for the MVP. It is lean, specific, and tied to the product that exists: verified directory, provider/public dashboards, health tools (with disclaimers), health news, 5‑minute HealthTalk podcast, community (Q&A), causes, blog, jobs, shop foundations, LMS, weekly tips, timeless facts, and integrated HMS modules (patient registry, encounters, labs, imaging, pharmacy, billing, beds, referrals, reports).

Operating Model (MVP)
- Solo founder executing across functions. For clarity and accountability, I use lightweight “departments” (functional areas). Each SOP lists an Owner department.

Departments (functional areas)
- Provider Operations (Provider Ops): verification, listings, booking policies, HMS workflows alignment.
- Clinical Governance (Clinical): sensitive content and tool review, medical disclaimers, scope boundaries.
- Privacy & Compliance (Privacy): consent, data export/delete, encryption posture, policy updates.
- Trust & Safety (T&S): community moderation, abuse/spam handling, user safety.
- Engineering & Platform (Eng): reliability, observability, security implementation, releases.
- Support & Success (Support): help center, tickets, response/resolution.
- Finance & Payments (Finance): refunds, receipts, reconciliation, donation transparency.
- Content & Community (Content): news/blog/podcasts, weekly tips, timeless facts, community calendar.
- Partnerships & Jobs (Partnerships): jobs board quality, provider onboarding playbooks.
- HMS Operations (HMS Ops): usage guidance and SOPs for registry, encounters, orders, pharmacy, billing, beds, referrals, reports.

Core SOPs (purpose, owner, SLA/KPIs)
1) Verification & Listing Quality
- Purpose: ensure only legitimate providers (health centers, pharmacies, practitioners) are listed.
- Owner: Provider Ops
- Process: intake → document capture (licenses/org docs) → checklist review → approve/decline → re‑verify reminders at 30/7/1 days.
- SLA: initial review ≤ 2 business days; urgent appeals ≤ 24h.
- KPIs: time‑to‑verify, approval rate, re‑verification compliance.

2) Booking Policies & Pre‑Visit Readiness
- Purpose: reduce no‑shows and confusion.
- Owner: Provider Ops
- Process: publish fees/cancellation windows and pre‑visit checklist; send reminders via notifications.
- SLA: policy edits live ≤ 1 business day; reminders sent ≥ 24h before appointment.
- KPIs: no‑show %, reminder delivery rate.

3) Clinical Content & Tool Safety
- Purpose: keep public content/tools within safe, informational scope.
- Owner: Clinical
- Process: classify as informational vs. sensitive; sensitive items require clinician review; apply disclaimers consistently.
- SLA: sensitive review ≤ 3 business days; corrections ≤ 24h for urgent items.
- KPIs: flagged items resolved, correction turnaround.

4) Privacy, Consent, Export/Delete
- Purpose: respect user rights and reduce data risk.
- Owner: Privacy (with Eng)
- Process: consent banner/versioning; user data export on request; deletion with grace period; encryption of sensitive fields.
- SLA: export ≤ 7 days; deletion per policy window.
- KPIs: export/delete turnaround, consent coverage.

5) Community Moderation (Q&A, Comments)
- Purpose: safe and respectful engagement.
- Owner: T&S
- Process: triage reports (spam/abuse/medical risk) → review → action (approve/edit/remove/warn/ban) → appeal path.
- SLA: high‑severity ≤ 12h; standard ≤ 48h.
- KPIs: SLA adherence, repeat offense rate.

6) Health Tools Governance
- Purpose: reinforce safety and transparency for AI and non‑AI tools.
- Owner: Clinical (with Privacy)
- Process: standardized tool page (purpose, inputs/outputs, limitations, disclaimers); optional save/export prompts; incident reporting link.
- SLA: new/updated tool copy reviewed ≤ 2 business days.
- KPIs: tool completion, export usage, incident reports addressed.

7) Observability & Reliability
- Purpose: keep the app usable and fast.
- Owner: Eng
- Process: basic uptime checks; structured logs (no sensitive values); error tracking; weekly triage; simple rollbacks when needed.
- SLO: p95 UI route load < 2s on broadband; critical pages available 99.5% monthly.
- KPIs: SLO attainment, error rate, MTTR.

8) Incident Intake & Response
- Purpose: resolve issues quickly and communicate clearly.
- Owner: Eng (with Support)
- Process: classify severity (SEV1–SEV4) → respond → user comms (status message, help center update) → post‑incident notes.
- SLA: SEV1 acknowledgment ≤ 1h; user update ≤ 4h; rollback if applicable.
- KPIs: MTTR, user comms timeliness, recurrence.

9) Support & Success
- Purpose: fast, empathetic help.
- Owner: Support
- Process: help center + in‑app/email tickets; triage by severity; KB updates for recurring issues.
- SLA: first response ≤ 24h; high‑severity ≤ 4h.
- KPIs: CSAT proxy (thumbs up/down), backlog age, reopen rate.

10) Payments, Refunds & Causes Transparency
- Purpose: reliable financial flows and trust in donations.
- Owner: Finance
- Process: refund policy enforcement; donation receipts; basic reconciliation; causes show updates and use of funds.
- SLA: refund acknowledgment ≤ 2 business days; cause update cadence at least monthly while active.
- KPIs: refund time, chargeback rate, donor retention.

11) Content Publishing (News, Blog, HealthTalk, Weekly Tips, Timeless Facts)
- Purpose: continuous, accessible education.
- Owner: Content
- Process: editorial calendar; style and safety checklist; publish schedule.
- SLA: corrections for critical health info ≤ 24h.
- KPIs: read‑through/listens, CTR to actions (tools/booking), return visits.

12) HMS Operations
- Purpose: consistent usage of core hospital modules.
- Owner: HMS Ops (with Provider Ops)
- Process: page‑level SOPs for registry, encounters, labs/imaging orders, pharmacy dispense, billing, bed management, referrals, reports; link to booking and notifications patterns.
- SLA: SOP updates within 3 business days of feature change.
- KPIs: encounter cycle time (proxy), order tracking completeness (proxy), referral closure notes.

13) Jobs & Partnerships
- Purpose: staffing support and onboarding quality.
- Owner: Partnerships
- Process: job post standards; featured verified listings; onboarding checklist for new providers.
- SLA: featured listing updates ≤ 2 business days.
- KPIs: activation rate, applies per post, time‑to‑fill (self‑reported).

SLO/SLA Summary (MVP realistic)
- Availability (critical pages): 99.5% monthly.
- Performance: p95 route load < 2s (broadband).
- Verification: ≤ 2 business days; urgent ≤ 24h.
- Support: first response ≤ 24h; high severity ≤ 4h.
- Moderation: high severity ≤ 12h; standard ≤ 48h.
- Data export: ≤ 7 days.

30–60–90 Day Plan
- Days 0–30
  - Lock verification SOP + reminders (30/7/1). Owner: Provider Ops.
  - Standardize disclaimers across tools/pages. Owner: Clinical.
  - Add help center articles for bookings, tools, and data export/delete. Owner: Support.
  - Wire simple uptime/error monitoring and weekly triage. Owner: Eng.
- Days 31–60
  - Causes transparency section (updates, use of funds). Owner: Finance.
  - Community moderation decision tree + canned responses. Owner: T&S.
  - HMS quickstart SOPs (per page). Owner: HMS Ops.
- Days 61–90
  - Booking clarity pass (fees, cancellation, reminders). Owner: Provider Ops.
  - Accessibility checklist pass on top pages. Owner: Eng (with Content).
  - Jobs onboarding playbook for providers. Owner: Partnerships.

Hiring Triggers (post‑traction)
- Verification Ops (≥ 25 new applications/week).
- Trust & Safety (≥ 50 community threads/week or ≥ 10 high‑severity flags/week).
- Support (≥ 100 tickets/month or median resolution > 72h).
- Clinical Reviewer (≥ 10 sensitive items/month).
- Engineering (repeat SLO misses 2+ months).

Change Management (lean)
- Small, frequent releases; manual rollback plan; notes in CHANGELOG.
- Pre‑release checklist: security lint, types, basic QA on critical flows.

Policies & User‑Facing Pages
- Telehealth consent, privacy policy, terms, refund/cancellation; version/date shown.
- Medical disclaimers visible on tools and informational content.

This is a lean, department‑owned plan that matches the MVP’s real capabilities. It focuses on trust, safety, access, and measurable outcomes—without over‑promising. In’sha’Allah, it is ready to operate and scale responsibly.
