# TODO3.md – Hospital Management System (HMS) and Care Linkages

Bismillah Ar-Rahman Ar-Raheem. In'sha'Allah, this document defines a production-focused roadmap to add a robust Hospital Management System (HMS) for Health Care/Hospital entities and a connected Patient/Individual portal, with seamless linkage between Hospitals/Clinics, Pharmacies, and Patients. It follows the CareConnect constraints: React-only client, GitHub Repo DB (githubDB), BYOK for provider integrations, client-side encryption for PHI, and auditability.

Guiding principles
- Single stack: React + githubDB. No server. Background tasks via client scheduler.
- PHI protection: Encrypt sensitive fields at rest via Web Crypto (AES-GCM). Never store raw provider keys. Decrypt on use with user/organization secret.
- Interop-aware schemas: FHIR-inspired shapes (Patient, Encounter, Observation, MedicationRequest, MedicationDispense, CarePlan, Condition, AllergyIntolerance) within our collections.
- Seamless integration: Reuse/extend existing modules (booking-enhanced, payments-enhanced, email-notifications, background-scheduler, directory-enhanced, entities.ts, encryption.ts, auth.tsx).

---

## 1) New Collections and Schema (githubDB)
[ ] patients – demographics, identifiers, emergency contacts, insurance, consents (encrypted fields)
[ ] patient_identifiers – MRN, national IDs, insurance member IDs (normalized)
[ ] patient_entity_links – link patient ↔ entity (primary care, admission, referral, discharged)
[ ] encounters – visits/admissions with type (OPD/ER/IPD/Telehealth), timestamps, status
[ ] vitals – Observation style: BP, HR, SpO2, Temp, Height/Weight, BMI; encounter_id, performer
[ ] conditions – diagnoses/problem list with codes (ICD-10 optional), onset, status
[ ] allergies – Allergy/Intolerance list with reaction, criticality
[ ] medications – active med list at patient level; source, start/stop
[ ] medication_requests – e-prescriptions (Hospital/Clinic → Pharmacy) with status
[ ] medication_dispenses – Pharmacy dispenses and status tracking
[ ] lab_orders – test orders with panels, priority, status
[ ] lab_results – observations/results linked to lab_orders with reference ranges
[ ] imaging_orders – basic imaging orders (XR, CT, MRI) with notes
[ ] documents – uploaded reports (PDF/Images) metadata
[ ] care_plans – care goals, activities, next steps, assigned team
[ ] referrals – referral records between entities; reason, priority, status
[ ] bed_management – beds, wards, occupancy, transfers (for IPD)
[ ] staff_schedules – rosters for hospital staff; supports booking
[ ] triage_notes – ER triage with acuity and initial assessment
[ ] pharmacy_inventory – stock at pharmacy entity; NDC/SKU, lots, expirations
[ ] pharmacy_orders – purchase orders and inventory movements
[ ] insurance_claims – claim shell records (record-and-reconcile; no payer APIs)
[ ] billing_items – charges per encounter (CPT-like codes optional)
[ ] consents – signed consents per patient/scope; references documentation
[ ] access_grants – share tokens/relationships for caregiver access (patient ↔ trusted person)

Notes
- Encrypt-at-rest fields: demographics, contact, identifiers, lab_results.result_values, documents.content pointers, medications.sig, allergies.reaction_notes, care_plans.notes. Use src/lib/encryption.ts.
- Indexing: patient_id, entity_id, encounter_id across all clinical collections.

---

## 2) Services (src/lib/*)
Create new services with CRUD, validation, encryption wrappers, audit logging, and cross-module hooks.

[ ] src/lib/patients.ts – PatientService
- create/update with encrypted PHI fields; merge identifiers; consent management
- link/unlink to entities; primary provider; emergency contact; insurance cards (photo refs)
- search (name, DOB, phone/email, identifier), with safe field projections

[ ] src/lib/encounters.ts – EncounterService
- create outpatient, ER, inpatient, telehealth encounters
- status transitions: planned → in_progress → completed/cancelled → discharged
- auto-generate admission numbers; record bed allocations via BedService

[ ] src/lib/observations.ts – ObservationService
- record vitals; support LOINC-like codes (optional simple code strings)
- compute derived metrics (BMI) client-side; flag abnormal

[ ] src/lib/conditions.ts – ConditionService
- manage problem list; active/resolved; coding support (free text + optional codes)

[ ] src/lib/medications.ts – MedicationService
- manage med list; check basic interactions (static rules list optional)
- MedicationRequest (eRx): create e-prescription to a selected Pharmacy entity; notify
- MedicationDispense: receive status updates from pharmacy workflow (client-driven)

[ ] src/lib/labs.ts – LabService
- create lab orders; attach results; reference ranges; critical value flags; notify

[ ] src/lib/imaging.ts – ImagingService
- imaging orders; attach reports/images (documents); notify

[ ] src/lib/care-plans.ts – CarePlanService
- goals, tasks, assignments to staff; reminders via background-scheduler

[ ] src/lib/referrals.ts – ReferralService
- create referral between entities; track acceptance/decline; transfer records subset

[ ] src/lib/bed-management.ts – BedService
- wards, beds, occupancy; transfers; discharge; conflict checks

[ ] src/lib/pharmacy.ts – PharmacyService
- inventory CRUD, stock adjustments; expiry alerts; low-stock alerts
- receive MedicationRequest → create dispense tasks; mark ready/picked-up/delivered

[ ] src/lib/billing.ts – BillingService
- add billing items to encounter; estimate; generate invoices; tie to payments-enhanced
- insurance_claims shell: record status, amounts, manual reconciliation

[ ] src/lib/consents.ts – ConsentService
- manage consent records and scopes (telehealth, data sharing, treatment)

[ ] src/lib/access-grants.ts – AccessGrantService
- create caregiver access links; revoke; time-bound grants

Integration hooks
- All services write audit logs to collections.audit_logs.
- Use email-notifications.ts to notify patients about appointments, lab results, prescription readiness.
- Leverage background-scheduler for reminders (medication refills, follow-ups, lab pickups).

---

## 3) UI/Pages
Hospital-side (Dashboard)
[ ] src/pages/dashboard/HospitalDashboard.tsx – clinical overview, today’s appointments, admissions
[ ] src/pages/dashboard/PatientRegistry.tsx – CRUD/search patients; link to encounters
[ ] src/pages/dashboard/EncounterBoard.tsx – OPD/ER/IPD boards; status lanes
[ ] src/pages/dashboard/LabOrdersPage.tsx – orders, results, critical flags
[ ] src/pages/dashboard/ImagingOrdersPage.tsx – orders and reports
[ ] src/pages/dashboard/PharmacyDispensePage.tsx – eRx queue and inventory
[ ] src/pages/dashboard/CarePlansPage.tsx – goals/tasks, reminders
[ ] src/pages/dashboard/ReferralsPage.tsx – incoming/outgoing referrals
[ ] src/pages/dashboard/BedManagementPage.tsx – wards, beds, transfers
[ ] src/pages/dashboard/BillingPage.tsx – charges and invoices per encounter
[ ] src/pages/dashboard/ReportsHMS.tsx – metrics (LOS, volumes, turnaround times)

Patient/Individual Portal
[ ] src/pages/patient/PatientPortal.tsx – summary, upcoming appointments, tasks
[ ] src/pages/patient/Records.tsx – visit summaries, labs, imaging, prescriptions
[ ] src/pages/patient/Medications.tsx – active meds, refill requests
[ ] src/pages/patient/Consents.tsx – view/manage consents and sharing
[ ] src/pages/patient/Providers.tsx – linked hospitals/clinics/pharmacies; referrals
[ ] src/pages/patient/Billing.tsx – invoices, payments (record-and-reconcile)

Shared UI Components
[ ] src/components/ui/PatientSearch.tsx – encrypted-aware search with safe summary results
[ ] src/components/ui/EncounterCard.tsx – compact encounter summary
[ ] src/components/ui/VitalsForm.tsx – capture flows with validation
[ ] src/components/ui/LabResultViewer.tsx – result ranges and flags
[ ] src/components/ui/PrescriptionCard.tsx – eRx summary and status
[ ] src/components/ui/BedMap.tsx – simple ward/beds visualization

Routing
[ ] Wire routes from App.tsx; guard pages by entity role (hospital_staff/physician/pharmacist/patient).

---

## 4) Linking Hospitals ↔ Pharmacies ↔ Patients (End-to-End Flows)

E‑Prescription (Hospital → Pharmacy → Patient)
1. Clinician creates MedicationRequest for patient; selects Pharmacy (directory-enhanced query for nearby or preferred pharmacy)
2. System notifies Pharmacy (notifications + email). PharmacyService mint a dispense task.
3. Pharmacy reviews inventory, accepts, and sets status. If out-of-stock, offers alternatives or referral to another pharmacy.
4. Patient notified when ready; pickup/delivery choice recorded. MedicationDispense completes and updates patient med list.

Referrals (Hospital/Clinic → Hospital/Clinic/Pharmacy)
1. Provider creates referral record with reason, urgency, receiving entity.
2. Receiving entity accepts and schedules (integrates with booking-enhanced).
3. Patient sees referral in portal; can share records subset via AccessGrantService.

Lab/Imaging
1. Order created and linked to encounter.
2. Lab/Imaging attaches results/reports. Critical values generate high-priority notifications.
3. Patient can view summaries after clinician release toggle.

Admissions/Discharge
1. Admission creates bed allocation; transfers handled by BedService.
2. Discharge creates summary document and follow-up tasks (care_plan + booking reminders).

Billing & Claims
1. Billing items accumulate on encounter; invoice generated.
2. Payments flow uses payments-enhanced record-and-reconcile model.
3. Claims recorded as insurance_claims for manual reconciliation. Status updates by admin.

---

## 5) Security, Roles, and Compliance
[ ] Extend roles in auth.tsx/user_roles: hospital_admin, physician, nurse, pharmacist, lab_tech, imaging_tech, billing_clerk, patient, caregiver.
[ ] Field-level access: decrypt-on-read only for authorized roles. Never expose raw PHI in list endpoints; show safe summaries.
[ ] Audit trail: every create/update/delete and view of PHI writes audit_logs with correlation ids.
[ ] Consent enforcement: Respect consents before exposing data to pharmacies or other entities.
[ ] Data export/delete: integrate with DataExportDialog and DataDeletionService for patients.

---

## 6) Integration with Existing Modules
[ ] booking-enhanced: hospital slot types (clinic, telehealth, lab, imaging); pre-visit questionnaires
[ ] email-notifications: templates for lab ready, eRx ready, discharge summary, referral accepted
[ ] background-scheduler: due medications refill reminders; follow-up tasks; inventory expiry alerts
[ ] directory-enhanced/entities.ts: extend features and badges for hospital/pharmacy (ER, 24/7, pediatric, eRx)
[ ] payments-enhanced: bills and plans tied to encounters and invoices

---

## 7) Data Models (shapes) – Draft

Patient (patients)
- id, org_id?, created_by, created_at, updated_at
- encrypted: name, dob, sex, phones, emails, address, emergency_contacts
- non-encrypted: patient_code, primary_entity_id, photo_url, preferences

Encounter (encounters)
- id, patient_id, entity_id, type(OPD/ER/IPD/Tele), status, start_at, end_at, reason, attending_staff

MedicationRequest (medication_requests)
- id, patient_id, encounter_id, prescriber_id, entity_id, pharmacy_entity_id, meds [{drug, strength, form, route, sig, qty, refills}], status

MedicationDispense (medication_dispenses)
- id, medication_request_id, pharmacy_entity_id, status(ready/picked-up/delivered/partial/denied), lot_info

LabOrder/LabResult, ImagingOrder
- order: id, patient_id, encounter_id, tests, priority, status
- result: id, order_id, analytes[{code, name, value, unit, ref_range, flag}], released_at, released_by

CarePlan
- id, patient_id, encounter_id?, goals, activities, owners, due_at, reminders

Referral
- id, from_entity_id, to_entity_id, patient_id, reason, priority, status

Bed
- id, entity_id, ward, number, status(available/occupied/out_of_service), current_encounter_id?

Billing/Claims
- invoice: id, encounter_id, items[{code, desc, qty, unit_price}], totals, status
- claim: id, encounter_id, payer_name, amounts, status

---

## 8) Phased Delivery Plan

Phase 1 – Foundations (MVP Hospital + Patient)
[ ] Collections: patients, patient_entity_links, encounters, vitals, medications, medication_requests, medication_dispenses
[ ] Services: PatientService, EncounterService, ObservationService, MedicationService
[ ] UI: PatientRegistry, EncounterBoard (OPD), PharmacyDispensePage; PatientPortal (summary)
[ ] Security: encryption wrappers; RBAC roles; audit on CRUD
[ ] Notifications: eRx ready; appointment reminders integration

Phase 2 – Diagnostics & Care Planning
[ ] Add lab_orders/results and imaging_orders; Lab/Imaging pages; LabResultViewer
[ ] CarePlanService and CarePlansPage with reminders
[ ] Patient portal records views for labs/imaging

Phase 3 – Admissions & Bed Management
[ ] bed_management, triage_notes; BedManagementPage
[ ] Admission/transfer/discharge flows; discharge summary document
[ ] Billing basic invoices per encounter; payments-enhanced hook

Phase 4 – Referrals & Inter-Entity Workflows
[ ] referrals; ReferralService and page; accept/decline
[ ] AccessGrantService for sharing with caregiver/receiving entity
[ ] Inventory alerts and pharmacy stock flows

Phase 5 – Claims, Analytics, and Compliance Polish
[ ] insurance_claims, billing_items; manual reconciliation UI
[ ] ReportsHMS (LOS, TAT, bed occupancy, pharmacy fill rate)
[ ] Compliance polish (consents UI, export/delete), accessibility pass

---

## 9) Acceptance Criteria
- No server dependencies; all data via githubDB; PHI encrypted at rest.
- End-to-end eRx workflow works between a Hospital entity and a Pharmacy entity with patient notifications.
- Patient portal shows visit summaries, prescriptions, and released results.
- RBAC enforces least-privilege; audit trail present for PHI access.
- Booking/Payments integrations function within constraints; background reminders operate on dashboard open.
- Directory linking allows selecting preferred pharmacy and referral targets.

---

## 10) File/Module Checklist
Schema
[ ] Update src/lib/database.ts with new collections listed in Section 1
[ ] Add encrypted field helpers in src/lib/encryption.ts (if missing): encryptObjectFields/decryptObjectFields

Services
[ ] Add: patients.ts, encounters.ts, observations.ts, medications.ts, labs.ts, imaging.ts, care-plans.ts, referrals.ts, bed-management.ts, pharmacy.ts, billing.ts, consents.ts, access-grants.ts

Pages
[ ] Add dashboard pages (Hospital*) and patient portal pages
[ ] Wire routes in App.tsx; add role guards in auth.tsx

Components
[ ] Add PatientSearch, EncounterCard, VitalsForm, LabResultViewer, PrescriptionCard, BedMap

Notifications & Scheduler
[ ] Add email templates in email-notifications.ts and register background tasks in background-scheduler.ts

---

## 11) Risks and Mitigations
- Client-only encryption key handling: derive keys from user/org secret; store wrapped keys in encrypted_keys collection.
- Performance with large PHI: paginate and project minimal fields; decrypt only on detail views.
- Offline or concurrency conflicts: use create-or-fail IDs and last-write-wins with audit logs; show conflict prompts.
- Regulatory scope: show medical disclaimers; provide export/delete; clearly mark limitations (no real-time payer/FHIR APIs yet).

---

## 12) Quick Wins (Ship First)
[ ] MedicationRequest → Pharmacy eRx flow with notifications and simple PharmacyDispensePage
[ ] PatientRegistry with encryption + search; EncounterBoard basic OPD
[ ] PatientPortal summary with prescriptions and appointments

---

May Allah grant success and ease in implementation. Ameen.
