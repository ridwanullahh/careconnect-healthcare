# TODO3_SNAP.md - Complete Implementation Tracking

Bismillah Ar-Rahman Ar-Raheem. Real-time tracking of Hospital Management System implementation progress.

## 1) Database Collections and Schema
[ ] Update src/lib/database.ts with new HMS collections
  [ ] patients collection
  [ ] patient_identifiers collection
  [ ] patient_entity_links collection
  [ ] encounters collection
  [ ] vitals collection
  [ ] conditions collection
  [ ] allergies collection
  [ ] medications collection
  [ ] medication_requests collection
  [ ] medication_dispenses collection
  [ ] lab_orders collection
  [ ] lab_results collection
  [ ] imaging_orders collection
  [ ] documents collection
  [ ] care_plans collection
  [ ] referrals collection
  [ ] bed_management collection
  [ ] staff_schedules collection
  [ ] triage_notes collection
  [ ] pharmacy_inventory collection
  [ ] pharmacy_orders collection
  [ ] insurance_claims collection
  [ ] billing_items collection
  [ ] consents collection
  [ ] access_grants collection

## 2) Services Implementation
[ ] src/lib/patients.ts - PatientService
  [ ] Create patient with encrypted PHI
  [ ] Update patient data
  [ ] Search patients with safe projections
  [ ] Link/unlink to entities
  [ ] Consent management
  [ ] Emergency contacts management
  [ ] Insurance management

[ ] src/lib/encounters.ts - EncounterService
  [ ] Create encounters (OPD/ER/IPD/Telehealth)
  [ ] Status transitions
  [ ] Auto-generate admission numbers
  [ ] Bed allocation integration
  [ ] Encounter completion workflows

[ ] src/lib/observations.ts - ObservationService
  [ ] Record vitals with validation
  [ ] Support LOINC-like codes
  [ ] Compute derived metrics (BMI)
  [ ] Flag abnormal values
  [ ] Link to encounters

[ ] src/lib/conditions.ts - ConditionService
  [ ] Manage problem list
  [ ] Active/resolved status
  [ ] ICD-10 coding support
  [ ] Link to encounters

[ ] src/lib/medications.ts - MedicationService
  [ ] Manage medication list
  [ ] Basic interaction checking
  [ ] MedicationRequest (eRx) creation
  [ ] MedicationDispense tracking
  [ ] Integration with pharmacy workflow

[ ] src/lib/labs.ts - LabService
  [ ] Create lab orders
  [ ] Attach results with reference ranges
  [ ] Critical value flagging
  [ ] Notification integration

[ ] src/lib/imaging.ts - ImagingService
  [ ] Create imaging orders
  [ ] Attach reports/images
  [ ] Document management
  [ ] Notification integration

[ ] src/lib/care-plans.ts - CarePlanService
  [ ] Goals and tasks management
  [ ] Staff assignments
  [ ] Reminder integration
  [ ] Progress tracking

[ ] src/lib/referrals.ts - ReferralService
  [ ] Create referrals between entities
  [ ] Track acceptance/decline
  [ ] Record transfers
  [ ] Status management

[ ] src/lib/bed-management.ts - BedService
  [ ] Ward and bed management
  [ ] Occupancy tracking
  [ ] Transfer handling
  [ ] Conflict resolution

[ ] src/lib/pharmacy.ts - PharmacyService
  [ ] Inventory CRUD operations
  [ ] Stock adjustments
  [ ] Expiry alerts
  [ ] eRx processing
  [ ] Dispense workflow

[ ] src/lib/billing.ts - BillingService
  [ ] Billing items per encounter
  [ ] Invoice generation
  [ ] Payment integration
  [ ] Insurance claims shell

[ ] src/lib/consents.ts - ConsentService
  [ ] Consent record management
  [ ] Scope handling
  [ ] Validation and enforcement

[ ] src/lib/access-grants.ts - AccessGrantService
  [ ] Caregiver access management
  [ ] Time-bound grants
  [ ] Revocation handling

## 3) Hospital Dashboard Pages
[ ] src/pages/dashboard/HospitalDashboard.tsx
  [ ] Clinical overview
  [ ] Today's appointments
  [ ] Current admissions
  [ ] Key metrics display

[ ] src/pages/dashboard/PatientRegistry.tsx
  [ ] Patient CRUD operations
  [ ] Search functionality
  [ ] Link to encounters
  [ ] Encrypted data handling

[ ] src/pages/dashboard/EncounterBoard.tsx
  [ ] OPD/ER/IPD boards
  [ ] Status lane management
  [ ] Real-time updates
  [ ] Quick actions

[ ] src/pages/dashboard/LabOrdersPage.tsx
  [ ] Lab order management
  [ ] Results display
  [ ] Critical flags
  [ ] Workflow integration

[ ] src/pages/dashboard/ImagingOrdersPage.tsx
  [ ] Imaging order management
  [ ] Report attachments
  [ ] Status tracking
  [ ] Document viewer

[ ] src/pages/dashboard/PharmacyDispensePage.tsx
  [ ] eRx queue management
  [ ] Inventory integration
  [ ] Dispense workflow
  [ ] Status updates

[ ] src/pages/dashboard/CarePlansPage.tsx
  [ ] Care plan management
  [ ] Goal tracking
  [ ] Task assignments
  [ ] Reminder system

[ ] src/pages/dashboard/ReferralsPage.tsx
  [ ] Incoming/outgoing referrals
  [ ] Acceptance workflow
  [ ] Status tracking
  [ ] Communication tools

[ ] src/pages/dashboard/BedManagementPage.tsx
  [ ] Ward visualization
  [ ] Bed status management
  [ ] Transfer workflows
  [ ] Occupancy reports

[ ] src/pages/dashboard/BillingPage.tsx
  [ ] Charge management
  [ ] Invoice generation
  [ ] Payment tracking
  [ ] Claims processing

[ ] src/pages/dashboard/ReportsHMS.tsx
  [ ] Length of stay metrics
  [ ] Volume reports
  [ ] Turnaround times
  [ ] Performance indicators

## 4) Patient Portal Pages
[ ] src/pages/patient/PatientPortal.tsx
  [ ] Patient summary dashboard
  [ ] Upcoming appointments
  [ ] Tasks and reminders
  [ ] Quick actions

[ ] src/pages/patient/Records.tsx
  [ ] Visit summaries
  [ ] Lab results
  [ ] Imaging reports
  [ ] Prescription history

[ ] src/pages/patient/Medications.tsx
  [ ] Active medications
  [ ] Refill requests
  [ ] Pharmacy information
  [ ] Interaction warnings

[ ] src/pages/patient/Consents.tsx
  [ ] Consent management
  [ ] Sharing preferences
  [ ] Privacy controls
  [ ] Access grants

[ ] src/pages/patient/Providers.tsx
  [ ] Linked entities
  [ ] Provider information
  [ ] Referral status
  [ ] Communication tools

[ ] src/pages/patient/Billing.tsx
  [ ] Invoice viewing
  [ ] Payment history
  [ ] Insurance information
  [ ] Claims status

## 5) Shared UI Components
[ ] src/components/ui/PatientSearch.tsx
  [ ] Encrypted-aware search
  [ ] Safe result summaries
  [ ] Quick selection
  [ ] Auto-complete

[ ] src/components/ui/EncounterCard.tsx
  [ ] Compact encounter display
  [ ] Status indicators
  [ ] Quick actions
  [ ] Date/time formatting

[ ] src/components/ui/VitalsForm.tsx
  [ ] Structured vital signs input
  [ ] Validation rules
  [ ] Abnormal value alerts
  [ ] BMI calculation

[ ] src/components/ui/LabResultViewer.tsx
  [ ] Results with reference ranges
  [ ] Critical value highlighting
  [ ] Trend analysis
  [ ] Print/export options

[ ] src/components/ui/PrescriptionCard.tsx
  [ ] eRx summary display
  [ ] Status tracking
  [ ] Pharmacy information
  [ ] Refill status

[ ] src/components/ui/BedMap.tsx
  [ ] Ward visualization
  [ ] Bed status colors
  [ ] Interactive selection
  [ ] Transfer controls

## 6) Authentication & Security Updates
[ ] Update src/lib/auth.tsx with new roles
  [ ] hospital_admin role
  [ ] physician role
  [ ] nurse role
  [ ] pharmacist role
  [ ] lab_tech role
  [ ] imaging_tech role
  [ ] billing_clerk role
  [ ] patient role
  [ ] caregiver role

[ ] Encryption integration
  [ ] Extend src/lib/encryption.ts for PHI fields
  [ ] Field-level access controls
  [ ] Decrypt-on-read implementation
  [ ] Safe projection utilities

## 7) Integration Updates
[ ] Update src/lib/booking-enhanced.ts
  [ ] Hospital slot types
  [ ] Pre-visit questionnaires
  [ ] HMS encounter integration

[ ] Update src/lib/email-notifications.ts
  [ ] Lab ready notifications
  [ ] eRx ready notifications
  [ ] Discharge summary emails
  [ ] Referral acceptance emails

[ ] Update src/lib/background-scheduler.ts
  [ ] Medication refill reminders
  [ ] Follow-up task alerts
  [ ] Inventory expiry alerts
  [ ] Care plan reminders

[ ] Update src/lib/directory-enhanced.ts and entities.ts
  [ ] Hospital/pharmacy features
  [ ] ER capability badge
  [ ] 24/7 service badge
  [ ] Pediatric friendly badge
  [ ] eRx capability badge

[ ] Update src/lib/payments-enhanced.ts
  [ ] HMS billing integration
  [ ] Encounter-based invoicing
  [ ] Insurance claim hooks

## 8) Routing Updates
[ ] Update App.tsx with HMS routes
  [ ] Hospital dashboard routes
  [ ] Patient portal routes
  [ ] Role-based route guards
  [ ] Breadcrumb integration

## 9) Data Models and Types
[ ] Create comprehensive TypeScript interfaces
  [ ] Patient interface
  [ ] Encounter interface
  [ ] MedicationRequest interface
  [ ] MedicationDispense interface
  [ ] LabOrder interface
  [ ] LabResult interface
  [ ] ImagingOrder interface
  [ ] CarePlan interface
  [ ] Referral interface
  [ ] Bed interface
  [ ] BillingItem interface
  [ ] Consent interface
  [ ] AccessGrant interface

## 10) Testing and Validation
[ ] Form validation schemas
[ ] Data integrity checks
[ ] Error handling
[ ] Edge case coverage
[ ] Security validation

---

**STATUS**: Starting implementation - all tasks will be completed systematically
**NEXT**: Begin with database collections and core services