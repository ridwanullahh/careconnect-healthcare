// Bismillah Ar-Rahman Ar-Raheem.
// Comprehensive backend seed for CareConnect on Lightbase.
// Populates platform admin, entities, staff, patients, HMS clinical data,
// and operational/content data so every feature can be exercised.
// All seed accounts use the password: CareConnect2025!
import crypto from 'node:crypto';
import type { StorageAdapter } from '@careconnect/db';

const SEED_PASSWORD = 'CareConnect2025!';
const NOW = () => new Date().toISOString();

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512');
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

function perms(userType: string): string[] {
  const map: Record<string, string[]> = {
    super_admin: ['*'],
    health_center: ['create_entity', 'update_entity', 'create_content', 'update_content', 'view_payments'],
    pharmacy: ['create_entity', 'update_entity', 'create_content', 'update_content', 'view_payments'],
    practitioner: ['create_entity', 'update_entity', 'create_content', 'update_content', 'view_payments'],
    hospital_admin: ['manage_patients', 'view_patient_data', 'create_encounters', 'manage_encounters', 'manage_care_plans', 'manage_referrals', 'manage_beds', 'process_billing', 'manage_insurance_claims', 'obtain_consents', 'manage_access_grants', 'view_analytics'],
    physician: ['manage_patients', 'view_patient_data', 'create_encounters', 'manage_encounters', 'record_vitals', 'manage_conditions', 'prescribe_medications', 'order_labs', 'view_lab_results', 'order_imaging', 'view_imaging_results', 'manage_care_plans', 'create_referrals', 'obtain_consents'],
    nurse: ['view_patient_data', 'manage_encounters', 'record_vitals', 'manage_conditions', 'manage_care_plans', 'obtain_consents'],
    pharmacist: ['view_patient_data', 'dispense_medications', 'manage_pharmacy_inventory'],
    lab_tech: ['view_patient_data', 'view_lab_results', 'order_labs'],
    imaging_tech: ['view_patient_data', 'view_imaging_results', 'order_imaging'],
    billing_clerk: ['view_patient_data', 'process_billing', 'manage_insurance_claims', 'view_payments'],
    patient: ['view_patient_data', 'manage_access_grants'],
    public_user: [],
  };
  return map[userType] || [];
}

export async function runSeed(db: StorageAdapter): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  const password_hash = hashPassword(SEED_PASSWORD);

  // Idempotency: if a super admin already exists, skip the full seed.
  const existingAdmin = await db.find('users', { email: 'admin@careconnect.health' });
  if (existingAdmin.length > 0) {
    return { skipped: 1, reason: 'already seeded' };
  }

  // ============================================================
  // SECTION 1: Entities (verified directory)
  // ============================================================
  const entities = [
    {
      name: 'Lagos General Hospital',
      entity_type: 'health_center',
      description: 'A leading tertiary healthcare facility providing comprehensive medical services across Lagos. 24/7 emergency care, specialist clinics, and modern diagnostic facilities.',
      address: { street: '15 Marina Road', city: 'Lagos', state: 'Lagos', country: 'Nigeria', postal_code: '100001', coordinates: { lat: 6.4541, lng: 3.3947 } },
      phone: '+2348012345601', email: 'info@lagosgeneral.health', website: 'https://lagosgeneral.health',
      specialties: ['Cardiology', 'General Medicine', 'Pediatrics', 'Emergency Medicine', 'Obstetrics'],
      services: ['Outpatient Care', 'Inpatient Care', 'Emergency Services', 'Surgery', 'Diagnostics', 'Pharmacy'],
      verification_status: 'verified', is_active: true, is_featured: true, subscription_tier: 'premium',
      hours: { monday: { open: '00:00', close: '23:59', is_closed: false }, tuesday: { open: '00:00', close: '23:59', is_closed: false }, wednesday: { open: '00:00', close: '23:59', is_closed: false }, thursday: { open: '00:00', close: '23:59', is_closed: false }, friday: { open: '00:00', close: '23:59', is_closed: false }, saturday: { open: '00:00', close: '23:59', is_closed: false }, sunday: { open: '00:00', close: '23:59', is_closed: false } },
      features: { online_booking: true, telehealth: true, emergency_services: true, insurance_accepted: true, payment_methods: ['Cash', 'Card', 'Insurance'] },
      rating: 4.7, review_count: 234, badges: ['verified', 'emergency_ready', 'telehealth'], color_theme: '#0d9488', logo_url: '', banner_url: '',
    },
    {
      name: 'Abuja Family Health Center',
      entity_type: 'health_center',
      description: 'Community-focused primary care center offering family medicine, maternal health, and preventive care services in the heart of Abuja.',
      address: { street: '42 Wuse 2 Crescent', city: 'Abuja', state: 'FCT', country: 'Nigeria', postal_code: '900288', coordinates: { lat: 9.0820, lng: 7.4018 } },
      phone: '+2348012345602', email: 'care@abujafamily.health', website: 'https://abujafamily.health',
      specialties: ['Family Medicine', 'Maternal Health', 'Pediatrics', 'Preventive Care'],
      services: ['Outpatient Care', 'Maternal Care', 'Vaccinations', 'Health Screening', 'Counseling'],
      verification_status: 'verified', is_active: true, is_featured: true, subscription_tier: 'standard',
      hours: { monday: { open: '08:00', close: '18:00', is_closed: false }, tuesday: { open: '08:00', close: '18:00', is_closed: false }, wednesday: { open: '08:00', close: '18:00', is_closed: false }, thursday: { open: '08:00', close: '18:00', is_closed: false }, friday: { open: '08:00', close: '18:00', is_closed: false }, saturday: { open: '09:00', close: '14:00', is_closed: false }, sunday: { open: '00:00', close: '00:00', is_closed: true } },
      features: { online_booking: true, telehealth: false, emergency_services: false, insurance_accepted: true, payment_methods: ['Cash', 'Card'] },
      rating: 4.5, review_count: 156, badges: ['verified', 'family_care'], color_theme: '#0891b2', logo_url: '', banner_url: '',
    },
    {
      name: 'MedPlus Pharmacy Lagos',
      entity_type: 'pharmacy',
      description: 'Full-service pharmacy with prescription fulfillment, OTC medications, health products, and pharmacist consultations. Open late, 7 days a week.',
      address: { street: '78 Adeola Odeku Street', city: 'Lagos', state: 'Lagos', country: 'Nigeria', postal_code: '101233', coordinates: { lat: 6.4281, lng: 3.4219 } },
      phone: '+2348012345603', email: 'pharmacy@medplus.health', website: 'https://medplus.health',
      specialties: ['Pharmacy', 'Clinical Pharmacy'],
      services: ['Prescription Fulfillment', 'OTC Medications', 'Pharmacist Consultation', 'Medication Review', 'Health Products'],
      verification_status: 'verified', is_active: true, is_featured: false, subscription_tier: 'standard',
      hours: { monday: { open: '08:00', close: '22:00', is_closed: false }, tuesday: { open: '08:00', close: '22:00', is_closed: false }, wednesday: { open: '08:00', close: '22:00', is_closed: false }, thursday: { open: '08:00', close: '22:00', is_closed: false }, friday: { open: '08:00', close: '22:00', is_closed: false }, saturday: { open: '09:00', close: '22:00', is_closed: false }, sunday: { open: '10:00', close: '20:00', is_closed: false } },
      features: { online_booking: false, telehealth: false, emergency_services: false, insurance_accepted: false, payment_methods: ['Cash', 'Card'] },
      rating: 4.6, review_count: 89, badges: ['verified', 'late_hours'], color_theme: '#7c3aed', logo_url: '', banner_url: '',
    },
  ];

  const entityIds: Record<string, string> = {};
  for (const e of entities) {
    const ent = await db.insert('entities', { ...e, created_at: NOW(), updated_at: NOW(), verified_at: NOW(), verified_by: 'system' });
    entityIds[e.name] = ent.id;
  }
  counts.entities = entities.length;

  // ============================================================
  // SECTION 2: Users + Profiles (all roles)
  // ============================================================
  const users = [
    { email: 'admin@careconnect.health', user_type: 'super_admin', first_name: 'System', last_name: 'Administrator', entity_id: null, phone: '+2348000000000', bio: 'Platform super administrator with full system access.' },
    { email: 'owner@lagosgeneral.health', user_type: 'health_center', first_name: 'Chidi', last_name: 'Okafor', entity_id: entityIds['Lagos General Hospital'], phone: '+2348012345601', bio: 'Hospital administrator and owner of Lagos General Hospital.' },
    { email: 'owner@abujafamily.health', user_type: 'health_center', first_name: 'Aisha', last_name: 'Mohammed', entity_id: entityIds['Abuja Family Health Center'], phone: '+2348012345602', bio: 'Family physician and director of Abuja Family Health Center.' },
    { email: 'owner@medplus.health', user_type: 'pharmacy', first_name: 'Tunde', last_name: 'Adeyemi', entity_id: entityIds['MedPlus Pharmacy Lagos'], phone: '+2348012345603', bio: 'Clinical pharmacist and owner of MedPlus Pharmacy.' },
    { email: 'admin.hms@lagosgeneral.health', user_type: 'hospital_admin', first_name: 'Funke', last_name: 'Adebayo', entity_id: entityIds['Lagos General Hospital'], phone: '+2348012345611', bio: 'Hospital management administrator overseeing daily operations.' },
    { email: 'dr.amina@lagosgeneral.health', user_type: 'physician', first_name: 'Amina', last_name: 'Yusuf', entity_id: entityIds['Lagos General Hospital'], phone: '+2348012345612', bio: 'Attending physician specializing in internal medicine and cardiology.', specialties: ['Cardiology', 'Internal Medicine'], license_number: 'NG-MDC-23145' },
    { email: 'nurse.grace@lagosgeneral.health', user_type: 'nurse', first_name: 'Grace', last_name: 'Eze', entity_id: entityIds['Lagos General Hospital'], phone: '+2348012345613', bio: 'Registered nurse with 8 years experience in emergency and inpatient care.', license_number: 'NG-RN-89012' },
    { email: 'pharm.kunle@medplus.health', user_type: 'pharmacist', first_name: 'Kunle', last_name: 'Bashir', entity_id: entityIds['MedPlus Pharmacy Lagos'], phone: '+2348012345614', bio: 'Pharmacist managing dispensing and inventory at MedPlus.', license_number: 'NG-PSN-45678' },
    { email: 'lab.sade@lagosgeneral.health', user_type: 'lab_tech', first_name: 'Sade', last_name: 'Ibrahim', entity_id: entityIds['Lagos General Hospital'], phone: '+2348012345615', bio: 'Medical laboratory scientist handling hematology and chemistry panels.', license_number: 'NG-MLSCN-12390' },
    { email: 'imaging.james@lagosgeneral.health', user_type: 'imaging_tech', first_name: 'James', last_name: 'Olawale', entity_id: entityIds['Lagos General Hospital'], phone: '+2348012345616', bio: 'Radiologic technologist operating X-ray, CT, and ultrasound equipment.', license_number: 'NG-RRBN-7781' },
    { email: 'billing.hauwa@lagosgeneral.health', user_type: 'billing_clerk', first_name: 'Hauwa', last_name: 'Sani', entity_id: entityIds['Lagos General Hospital'], phone: '+2348012345617', bio: 'Billing specialist processing patient invoices and insurance claims.' },
    { email: 'patient.musa@careconnect.health', user_type: 'patient', first_name: 'Musa', last_name: 'Bello', entity_id: entityIds['Lagos General Hospital'], phone: '+2348012345621', bio: 'Patient registered at Lagos General Hospital.' },
    { email: 'patient.fatima@careconnect.health', user_type: 'patient', first_name: 'Fatima', last_name: 'Lawal', entity_id: entityIds['Lagos General Hospital'], phone: '+2348012345622', bio: 'Patient managing chronic hypertension.' },
    { email: 'patient.emeka@careconnect.health', user_type: 'patient', first_name: 'Emeka', last_name: 'Nwosu', entity_id: entityIds['Abuja Family Health Center'], phone: '+2348012345623', bio: 'Patient at Abuja Family Health Center for routine care.' },
    { email: 'public.zainab@careconnect.health', user_type: 'public_user', first_name: 'Zainab', last_name: 'Ahmed', entity_id: null, phone: '+2348012345631', bio: 'Public user exploring healthcare resources.' },
    { email: 'public.david@careconnect.health', user_type: 'public_user', first_name: 'David', last_name: 'Okafor', entity_id: null, phone: '+2348012345632', bio: 'Public user seeking health information.' },
  ];

  const userIds: Record<string, string> = {};
  for (const u of users) {
    const user = await db.insert('users', {
      email: u.email, phone: u.phone, user_type: u.user_type, password_hash,
      is_verified: true, is_active: true, entity_id: u.entity_id, permissions: perms(u.user_type),
      created_at: NOW(), updated_at: NOW(),
    });
    userIds[u.email] = user.id;
    await db.insert('profiles', {
      user_id: user.id, first_name: u.first_name, last_name: u.last_name, bio: u.bio || '',
      specialties: u.specialties || [], languages: ['English'], license_number: u.license_number || '',
      emergency_contact: { name: '', phone: '', relationship: '' },
      preferences: { notifications: true, marketing_emails: false, data_sharing: false },
      created_at: NOW(), updated_at: NOW(),
    });
  }
  counts.users = users.length;
  counts.profiles = users.length;

  // ============================================================
  // SECTION 3: Patients (HMS registry)
  // ============================================================
  const hmsEntityId = entityIds['Lagos General Hospital'];
  const physicianId = userIds['dr.amina@lagosgeneral.health'];
  const patientDefs = [
    { code: 'PT-2025-0001', name: 'Musa Bello', dob: '1985-03-15', sex: 'male', phone: '+2348012345621', email: 'patient.musa@careconnect.health', address: '12 Allen Avenue, Ikeja, Lagos', user_id: userIds['patient.musa@careconnect.health'] },
    { code: 'PT-2025-0002', name: 'Fatima Lawal', dob: '1978-11-22', sex: 'female', phone: '+2348012345622', email: 'patient.fatima@careconnect.health', address: '5 Bourdillon Road, Ikoyi, Lagos', user_id: userIds['patient.fatima@careconnect.health'] },
    { code: 'PT-2025-0003', name: 'Chinedu Okafor', dob: '1992-07-08', sex: 'male', phone: '+2348012345699', email: 'chinedu.okafor@email.com', address: '30 Ago Palace Way, Festac, Lagos', user_id: null },
    { code: 'PT-2025-0004', name: 'Aisha Bello', dob: '1990-01-30', sex: 'female', phone: '+2348012345698', email: 'aisha.bello@email.com', address: '18 Lekki Phase 1, Lagos', user_id: null },
    { code: 'PT-2025-0005', name: 'Samuel Eze', dob: '1965-09-12', sex: 'male', phone: '+2348012345697', email: 'samuel.eze@email.com', address: '7 Yaba Road, Lagos', user_id: null },
  ];
  const patientIds: string[] = [];
  for (const p of patientDefs) {
    const patient = await db.insert('patients', {
      encrypted_name: p.name, encrypted_dob: p.dob, encrypted_sex: p.sex,
      encrypted_phones: [p.phone], encrypted_emails: [p.email], encrypted_address: p.address,
      encrypted_emergency_contacts: [],
      patient_code: p.code, primary_entity_id: hmsEntityId, user_id: p.user_id,
      preferences: { language: 'English', communication_method: 'sms', privacy_level: 'standard' },
      is_active: true, verification_status: 'verified', created_at: NOW(), updated_at: NOW(),
    });
    patientIds.push(patient.id);
    await db.insert('patient_entity_links', {
      patient_id: patient.id, entity_id: hmsEntityId, relationship_type: 'primary_care', status: 'active', created_at: NOW(),
    });
  }
  counts.patients = patientDefs.length;

  // ============================================================
  // SECTION 4: HMS Clinical Data
  // ============================================================
  const encounters = [
    { patient_id: patientIds[0], entity_id: hmsEntityId, type: 'opd', status: 'completed', priority: 'routine', chief_complaint: 'Routine checkup and blood pressure monitoring', reason_for_visit: 'Follow-up for hypertension management', department: 'General Medicine', attending_physician_id: physicianId, scheduled_start: '2025-07-10T09:00:00Z', actual_start: '2025-07-10T09:05:00Z', actual_end: '2025-07-10T09:35:00Z', discharge_disposition: 'home', estimated_cost: 15000, final_cost: 15000, created_by: physicianId },
    { patient_id: patientIds[1], entity_id: hmsEntityId, type: 'opd', status: 'completed', priority: 'routine', chief_complaint: 'Headache and dizziness', reason_for_visit: 'Symptom evaluation', department: 'Cardiology', attending_physician_id: physicianId, scheduled_start: '2025-07-12T11:00:00Z', actual_start: '2025-07-12T11:10:00Z', actual_end: '2025-07-12T11:50:00Z', discharge_disposition: 'home', estimated_cost: 20000, final_cost: 18500, created_by: physicianId },
    { patient_id: patientIds[2], entity_id: hmsEntityId, type: 'opd', status: 'in_progress', priority: 'urgent', chief_complaint: 'Acute abdominal pain', reason_for_visit: 'Emergency evaluation', department: 'Emergency', attending_physician_id: physicianId, scheduled_start: '2025-07-25T08:00:00Z', actual_start: '2025-07-25T08:15:00Z', discharge_disposition: '', estimated_cost: 35000, created_by: physicianId },
    { patient_id: patientIds[3], entity_id: hmsEntityId, type: 'opd', status: 'scheduled', priority: 'routine', chief_complaint: 'Antenatal visit', reason_for_visit: 'Routine prenatal check', department: 'Obstetrics', attending_physician_id: physicianId, scheduled_start: '2025-07-28T10:00:00Z', estimated_cost: 12000, created_by: physicianId },
    { patient_id: patientIds[4], entity_id: hmsEntityId, type: 'emergency', status: 'completed', priority: 'emergency', chief_complaint: 'Chest pain and shortness of breath', reason_for_visit: 'Cardiac evaluation', department: 'Cardiology', attending_physician_id: physicianId, scheduled_start: '2025-07-18T14:00:00Z', actual_start: '2025-07-18T14:05:00Z', actual_end: '2025-07-18T16:30:00Z', discharge_disposition: 'home', estimated_cost: 55000, final_cost: 52000, created_by: physicianId },
  ];
  const encounterIds: string[] = [];
  for (const e of encounters) {
    const enc = await db.insert('encounters', { ...e, encounter_code: `ENC-${Math.floor(Math.random() * 100000)}`, created_at: NOW(), updated_at: NOW() });
    encounterIds.push(enc.id);
  }
  counts.encounters = encounters.length;

  const vitals = [
    { patient_id: patientIds[0], entity_id: hmsEntityId, encounter_id: encounterIds[0], type: 'blood_pressure', display_name: 'Blood Pressure', value_string: '128/82', systolic: 128, diastolic: 82, unit: 'mmHg', measured_at: '2025-07-10T09:10:00Z', performer_id: physicianId, is_abnormal: false },
    { patient_id: patientIds[0], entity_id: hmsEntityId, encounter_id: encounterIds[0], type: 'heart_rate', display_name: 'Heart Rate', value_quantity: 76, unit: 'bpm', measured_at: '2025-07-10T09:10:00Z', performer_id: physicianId, is_abnormal: false },
    { patient_id: patientIds[1], entity_id: hmsEntityId, encounter_id: encounterIds[1], type: 'blood_pressure', display_name: 'Blood Pressure', value_string: '145/92', systolic: 145, diastolic: 92, unit: 'mmHg', measured_at: '2025-07-12T11:15:00Z', performer_id: physicianId, is_abnormal: true, abnormal_flag: 'high' },
    { patient_id: patientIds[1], entity_id: hmsEntityId, encounter_id: encounterIds[1], type: 'temperature', display_name: 'Temperature', value_quantity: 37.8, unit: 'C', measured_at: '2025-07-12T11:15:00Z', performer_id: physicianId, is_abnormal: false },
    { patient_id: patientIds[4], entity_id: hmsEntityId, encounter_id: encounterIds[4], type: 'blood_pressure', display_name: 'Blood Pressure', value_string: '160/100', systolic: 160, diastolic: 100, unit: 'mmHg', measured_at: '2025-07-18T14:10:00Z', performer_id: physicianId, is_abnormal: true, abnormal_flag: 'critical' },
    { patient_id: patientIds[4], entity_id: hmsEntityId, encounter_id: encounterIds[4], type: 'oxygen_saturation', display_name: 'Oxygen Saturation', value_quantity: 94, unit: '%', measured_at: '2025-07-18T14:10:00Z', performer_id: physicianId, is_abnormal: false },
  ];
  for (const v of vitals) await db.insert('vitals', { ...v, created_at: NOW() });
  counts.vitals = vitals.length;

  const conditions = [
    { patient_id: patientIds[0], entity_id: hmsEntityId, encounter_id: encounterIds[0], condition_name: 'Essential Hypertension', category: 'problem_list', code: 'I10', code_system: 'ICD-10', clinical_status: 'active', verification_status: 'confirmed', severity: 'moderate', onset_date: '2023-05-01', created_by: physicianId },
    { patient_id: patientIds[1], entity_id: hmsEntityId, encounter_id: encounterIds[1], condition_name: 'Hypertensive Crisis', category: 'diagnosis', code: 'I16.9', code_system: 'ICD-10', clinical_status: 'active', verification_status: 'confirmed', severity: 'severe', onset_date: '2025-07-12', created_by: physicianId },
    { patient_id: patientIds[4], entity_id: hmsEntityId, encounter_id: encounterIds[4], condition_name: 'Acute Coronary Syndrome', category: 'diagnosis', code: 'I21.9', code_system: 'ICD-10', clinical_status: 'resolved', verification_status: 'confirmed', severity: 'severe', onset_date: '2025-07-18', resolution_date: '2025-07-20', created_by: physicianId },
  ];
  for (const c of conditions) await db.insert('conditions', { ...c, created_at: NOW() });
  counts.conditions = conditions.length;

  await db.insert('allergies', { patient_id: patientIds[0], entity_id: hmsEntityId, allergen: 'Penicillin', criticality: 'high', status: 'active', reaction: 'Rash', created_at: NOW() });
  await db.insert('allergies', { patient_id: patientIds[2], entity_id: hmsEntityId, allergen: 'Sulfonamides', criticality: 'medium', status: 'active', reaction: 'Hives', created_at: NOW() });
  counts.allergies = 2;

  const medReq = await db.insert('medication_requests', {
    patient_id: patientIds[0], entity_id: hmsEntityId, encounter_id: encounterIds[0], prescriber_id: physicianId,
    prescription_number: 'RX-2025-0001', status: 'active', intent: 'order', priority: 'routine',
    medications: [{ drug_name: 'Amlodipine', generic_name: 'Amlodipine Besylate', strength: '5mg', form: 'tablet', route: 'oral', frequency: 'once daily', duration: '30 days', quantity: 30, refills: 3, instructions: 'Take one tablet by mouth every morning', indication: 'Hypertension' }],
    authored_on: '2025-07-10', validity_period: { start: '2025-07-10', end: '2025-08-10' }, created_at: NOW(),
  });
  await db.insert('medication_requests', {
    patient_id: patientIds[1], entity_id: hmsEntityId, encounter_id: encounterIds[1], prescriber_id: physicianId,
    prescription_number: 'RX-2025-0002', status: 'active', intent: 'order', priority: 'urgent',
    medications: [{ drug_name: 'Lisinopril', generic_name: 'Lisinopril', strength: '10mg', form: 'tablet', route: 'oral', frequency: 'once daily', duration: '30 days', quantity: 30, refills: 2, instructions: 'Take one tablet daily with water', indication: 'Hypertensive Crisis' }],
    authored_on: '2025-07-12', validity_period: { start: '2025-07-12', end: '2025-08-12' }, created_at: NOW(),
  });
  counts.medication_requests = 2;

  await db.insert('medication_dispenses', {
    medication_request_id: medReq.id, pharmacy_entity_id: entityIds['MedPlus Pharmacy Lagos'], patient_id: patientIds[0], status: 'completed', type: 'refill',
    dispensed_medications: [{ batch: 'B2401', lot: 'L001', expiry: '2026-12-31', manufacturer: 'Pfizer', quantity_dispensed: 30, days_supply: 30, unit_price: 250, total_price: 7500 }],
    dispensed_at: '2025-07-10T10:00:00Z', dispenser_id: userIds['pharm.kunle@medplus.health'], counseling_provided: true, patient_acknowledged: true, created_at: NOW(),
  });
  counts.medication_dispenses = 1;

  const labOrder = await db.insert('lab_orders', {
    patient_id: patientIds[1], entity_id: hmsEntityId, encounter_id: encounterIds[1], orderer_id: physicianId, order_number: 'LAB-2025-0001', status: 'completed', priority: 'routine', category: 'chemistry',
    tests: [{ test_code: 'LIPID', test_name: 'Lipid Panel', specimen_type: 'blood', panel: true, fasting_required: true }],
    specimen_collected: true, collection_date: '2025-07-12', collection_time: '11:30', collected_by: userIds['lab.sade@lagosgeneral.health'], collection_method: 'venipuncture', collection_site: 'left_arm', clinical_info: 'Hypertension follow-up', diagnosis_codes: ['I10'], reason_for_test: 'Monitor lipid profile', created_at: NOW(),
  });
  await db.insert('lab_results', {
    lab_order_id: labOrder.id, patient_id: patientIds[1], test_name: 'Lipid Panel', status: 'final',
    analytes: [{ name: 'Total Cholesterol', value: 6.2, unit: 'mmol/L', reference_range: '< 5.0', is_abnormal: true, flag: 'high' }, { name: 'LDL', value: 4.1, unit: 'mmol/L', reference_range: '< 3.0', is_abnormal: true, flag: 'high' }, { name: 'HDL', value: 1.1, unit: 'mmol/L', reference_range: '> 1.0', is_abnormal: false }, { name: 'Triglycerides', value: 2.0, unit: 'mmol/L', reference_range: '< 1.7', is_abnormal: true, flag: 'high' }],
    critical_value: false, released_to_patient: true, created_at: NOW(),
  });
  counts.lab_orders = 1;
  counts.lab_results = 1;

  await db.insert('imaging_orders', {
    patient_id: patientIds[4], entity_id: hmsEntityId, encounter_id: encounterIds[4], orderer_id: physicianId, order_number: 'IMG-2025-0001', status: 'completed', priority: 'urgent', modality: 'ct', study_description: 'CT Chest with Contrast', body_part: 'chest', laterality: 'bilateral', contrast_required: true, contrast_type: 'iodinated', clinical_info: 'Chest pain evaluation', reason_for_study: 'Rule out pulmonary embolism', created_at: NOW(),
  });
  counts.imaging_orders = 1;

  await db.insert('care_plans', {
    patient_id: patientIds[0], entity_id: hmsEntityId, encounter_id: encounterIds[0], title: 'Hypertension Management Plan', description: 'Ongoing management of essential hypertension with lifestyle modifications and medication.', category: 'treatment', status: 'active', intent: 'plan', period: { start: '2025-07-10', end: '2026-07-10' },
    goals: [{ id: 'g1', description: 'Maintain blood pressure below 130/80', category: 'clinical', priority: 'high' }, { id: 'g2', description: 'Adopt DASH diet', category: 'lifestyle', priority: 'medium' }],
    activities: [{ description: 'Daily Amlodipine 5mg', status: 'in-progress' }, { description: 'Monthly BP check', status: 'scheduled' }],
    care_team: [{ role: 'physician', id: physicianId }], created_by: physicianId, created_at: NOW(),
  });
  counts.care_plans = 1;

  await db.insert('referrals', {
    patient_id: patientIds[4], from_entity_id: hmsEntityId, to_entity_id: entityIds['Lagos General Hospital'], referring_provider_id: physicianId, referral_number: 'REF-2025-0001', type: 'consultation', priority: 'urgent', specialty_required: 'Cardiology', reason_for_referral: 'Specialist cardiology consultation post-ACS', clinical_summary: 'Acute coronary syndrome, stabilized', relevant_history: 'Hypertension, smoker', current_medications: ['Aspirin', 'Atorvastatin'], allergies: [], created_at: NOW(),
  });
  counts.referrals = 1;

  const beds = [
    { ward: 'General Ward A', room_number: 'A101', bed_number: 'A101-01', bed_type: 'regular', status: 'available' },
    { ward: 'General Ward A', room_number: 'A101', bed_number: 'A101-02', bed_type: 'regular', status: 'occupied', current_patient_id: patientIds[2] },
    { ward: 'ICU', room_number: 'ICU01', bed_number: 'ICU01-01', bed_type: 'icu', status: 'occupied', current_patient_id: patientIds[4] },
    { ward: 'ICU', room_number: 'ICU01', bed_number: 'ICU01-02', bed_type: 'icu', status: 'available' },
    { ward: 'Private', room_number: 'P201', bed_number: 'P201-01', bed_type: 'private', status: 'available' },
  ];
  for (const b of beds) await db.insert('bed_management', { entity_id: hmsEntityId, ...b, features: [], created_at: NOW() });
  counts.bed_management = beds.length;

  // ============================================================
  // SECTION 5: Consents + Access Grants
  // ============================================================
  await db.insert('consents', { patient_id: patientIds[0], entity_id: hmsEntityId, encounter_id: encounterIds[0], consent_type: 'treatment', scope: 'general', purpose: 'Medical treatment', status: 'granted', granted_at: NOW(), granted_by: userIds['patient.musa@careconnect.health'], obtained_by: physicianId, legal_basis: 'patient_consent', consent_text: 'I consent to medical treatment at Lagos General Hospital.', risks_disclosed: true, alternatives_discussed: true, created_at: NOW() });
  await db.insert('access_grants', { patient_id: patientIds[0], grantee_type: 'healthcare_provider', grantee_id: physicianId, grantee_name: 'Dr. Amina Yusuf', access_level: 'full', scope: ['view_records', 'schedule_appointments'], can_view_records: true, can_schedule_appointments: true, can_receive_notifications: true, granted_at: NOW(), status: 'active', created_at: NOW() });
  counts.consents = 1;
  counts.access_grants = 1;

  // ============================================================
  // SECTION 6: Bookings + Appointment Slots + Services
  // ============================================================
  const services = [
    { entity_id: hmsEntityId, name: 'General Consultation', category: 'consultation', duration: 30, price: 15000, description: 'Standard doctor consultation', is_active: true, created_at: NOW() },
    { entity_id: hmsEntityId, name: 'Cardiology Consultation', category: 'specialist', duration: 45, price: 25000, description: 'Specialist heart consultation', is_active: true, created_at: NOW() },
    { entity_id: entityIds['Abuja Family Health Center'], name: 'Family Checkup', category: 'consultation', duration: 30, price: 10000, description: 'Routine family medicine visit', is_active: true, created_at: NOW() },
  ];
  for (const s of services) await db.insert('services', s);
  counts.services = services.length;

  const bookings = [
    { entity_id: hmsEntityId, practitioner_id: physicianId, patient_id: patientIds[0], booking_number: 'BK-2025-0001', type: 'in_person', status: 'completed', appointment_date: '2025-07-10', appointment_time: '09:00', duration: 30, timezone: 'Africa/Lagos', service_name: 'General Consultation', service_category: 'consultation', notes: 'Hypertension follow-up', created_at: NOW() },
    { entity_id: hmsEntityId, practitioner_id: physicianId, patient_id: patientIds[1], booking_number: 'BK-2025-0002', type: 'in_person', status: 'completed', appointment_date: '2025-07-12', appointment_time: '11:00', duration: 45, timezone: 'Africa/Lagos', service_name: 'Cardiology Consultation', service_category: 'specialist', notes: 'Headache and dizziness', created_at: NOW() },
    { entity_id: hmsEntityId, practitioner_id: physicianId, patient_id: patientIds[3], booking_number: 'BK-2025-0003', type: 'in_person', status: 'confirmed', appointment_date: '2025-07-28', appointment_time: '10:00', duration: 30, timezone: 'Africa/Lagos', service_name: 'General Consultation', service_category: 'consultation', notes: 'Antenatal visit', created_at: NOW() },
  ];
  for (const b of bookings) await db.insert('bookings', b);
  counts.bookings = bookings.length;

  const slotDate = (offset: number) => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().split('T')[0]; };
  for (let day = 1; day <= 5; day++) {
    for (const time of ['09:00', '10:00', '11:00', '14:00', '15:00']) {
      await db.insert('appointment_slots', { entity_id: hmsEntityId, practitioner_id: physicianId, date: slotDate(day), time, duration: 30, is_available: true, timezone: 'Africa/Lagos', created_at: NOW() });
    }
  }
  counts.appointment_slots = 25;

  // ============================================================
  // SECTION 7: Products + Pharmacy Inventory
  // ============================================================
  const products = [
    { entity_id: entityIds['MedPlus Pharmacy Lagos'], name: 'Automatic Blood Pressure Monitor', description: 'Digital upper-arm blood pressure monitor with large LCD display and irregular heartbeat detection.', category: 'medical_devices', brand: 'HealthPro', manufacturer: 'HealthPro Medical', price: 54999, currency: 'NGN', stock_quantity: 24, low_stock_threshold: 5, sku: 'HP-BPM-001', requires_prescription: false, images: [], specifications: { display: 'LCD', memory: '90 readings', power: 'AA batteries x4' }, warnings: ['Not a substitute for professional medical diagnosis'], is_active: true, is_featured: true, rating: 4.5, review_count: 42, tags: ['bp-monitor', 'cardiac'], search_keywords: ['blood pressure', 'hypertension'], created_at: NOW() },
    { entity_id: entityIds['MedPlus Pharmacy Lagos'], name: 'Digital Thermometer', description: 'Quick-read digital thermometer with flexible tip for oral, underarm, or rectal use.', category: 'medical_devices', brand: 'MedTemp', manufacturer: 'MedTemp Inc', price: 3500, currency: 'NGN', stock_quantity: 120, low_stock_threshold: 20, sku: 'MT-TH-001', requires_prescription: false, images: [], is_active: true, rating: 4.3, review_count: 88, tags: ['thermometer'], search_keywords: ['fever', 'temperature'], created_at: NOW() },
    { entity_id: entityIds['MedPlus Pharmacy Lagos'], name: 'Vitamin C 1000mg Tablets', description: 'Immune support supplement, 60 tablets per bottle.', category: 'supplements', brand: 'VitaHealth', manufacturer: 'VitaHealth Labs', price: 4500, currency: 'NGN', stock_quantity: 200, low_stock_threshold: 30, sku: 'VH-VC-1000', requires_prescription: false, images: [], is_active: true, rating: 4.7, review_count: 156, tags: ['vitamin', 'immunity'], search_keywords: ['vitamin c', 'immunity'], created_at: NOW() },
    { entity_id: entityIds['MedPlus Pharmacy Lagos'], name: 'Glucometer Test Strips (50ct)', description: 'Blood glucose test strips compatible with standard glucometers. 50 strips per box.', category: 'medical_devices', brand: 'GlucoCheck', manufacturer: 'GlucoCheck', price: 8500, currency: 'NGN', stock_quantity: 60, low_stock_threshold: 15, sku: 'GC-STR-50', requires_prescription: false, images: [], is_active: true, rating: 4.4, review_count: 34, tags: ['diabetes', 'glucose'], search_keywords: ['test strips', 'glucometer'], created_at: NOW() },
    { entity_id: entityIds['MedPlus Pharmacy Lagos'], name: 'First Aid Kit (Home)', description: 'Comprehensive 100-piece first aid kit for home and family use.', category: 'first_aid', brand: 'SafeGuard', manufacturer: 'SafeGuard Medical', price: 12500, currency: 'NGN', stock_quantity: 40, low_stock_threshold: 10, sku: 'SG-FAK-100', requires_prescription: false, images: [], is_active: true, is_featured: true, rating: 4.8, review_count: 67, tags: ['first-aid', 'emergency'], search_keywords: ['first aid', 'emergency kit'], created_at: NOW() },
    { entity_id: entityIds['MedPlus Pharmacy Lagos'], name: 'Paracetamol 500mg (100 tablets)', description: 'Pain reliever and fever reducer. 100 tablets per pack.', category: 'medications', brand: 'Generix', manufacturer: 'Generix Pharma', price: 1500, currency: 'NGN', stock_quantity: 500, low_stock_threshold: 50, sku: 'GX-PARA-500', requires_prescription: false, controlled_substance: false, images: [], is_active: true, rating: 4.6, review_count: 230, tags: ['pain', 'fever'], search_keywords: ['paracetamol', 'pain relief'], created_at: NOW() },
  ];
  for (const p of products) await db.insert('products', p);
  counts.products = products.length;

  for (const p of products) {
    await db.insert('pharmacy_inventory', { entity_id: entityIds['MedPlus Pharmacy Lagos'], drug_name: p.name, generic_name: p.name, brand_name: p.brand, ndc_number: p.sku, strength: '', dosage_form: p.category, quantity_on_hand: p.stock_quantity, unit_of_measure: 'unit', minimum_stock_level: p.low_stock_threshold, maximum_stock_level: 500, reorder_point: p.low_stock_threshold, unit_cost: Math.round(p.price * 0.6), selling_price: p.price, is_active: true, is_controlled_substance: false, lot_batches: [], created_at: NOW() });
  }
  counts.pharmacy_inventory = products.length;

  // ============================================================
  // SECTION 8: Courses (LMS)
  // ============================================================
  const course = await db.insert('courses', { entity_id: hmsEntityId, instructor_id: physicianId, title: 'Understanding Hypertension: A Patient Guide', description: 'A comprehensive course on managing high blood pressure through lifestyle and medication.', short_description: 'Learn to manage hypertension effectively.', level: 'beginner', type: 'self_paced', price: 0, status: 'published', enrollment_count: 0, is_published: true, thumbnail_url: '', banner_url: '', created_at: NOW() });
  const module1 = await db.insert('course_modules', { course_id: course.id, title: 'Module 1: What is Hypertension?', description: 'Understanding blood pressure and hypertension basics.', order: 1, created_at: NOW() });
  await db.insert('course_lessons', { course_id: course.id, module_id: module1.id, title: 'Blood Pressure Basics', type: 'text', content: 'Blood pressure is the force of blood against your artery walls. It is measured in millimeters of mercury (mmHg) and recorded as two numbers: systolic (when the heart beats) over diastolic (when the heart rests).', order: 1, duration_minutes: 10, created_at: NOW() });
  await db.insert('course_lessons', { course_id: course.id, module_id: module1.id, title: 'Causes and Risk Factors', type: 'text', content: 'Several factors contribute to hypertension including genetics, diet, lack of exercise, stress, and age. Understanding your risk factors is the first step to management.', order: 2, duration_minutes: 12, created_at: NOW() });
  const module2 = await db.insert('course_modules', { course_id: course.id, title: 'Module 2: Lifestyle Management', description: 'Diet, exercise, and stress reduction.', order: 2, created_at: NOW() });
  await db.insert('course_lessons', { course_id: course.id, module_id: module2.id, title: 'The DASH Diet', type: 'text', content: 'The DASH (Dietary Approaches to Stop Hypertension) diet emphasizes fruits, vegetables, whole grains, and low-fat dairy while limiting saturated fat and sodium.', order: 1, duration_minutes: 15, created_at: NOW() });
  counts.courses = 1;
  counts.course_modules = 2;
  counts.course_lessons = 3;

  // ============================================================
  // SECTION 9: Forum (community)
  // ============================================================
  const forumCats = [
    { name: 'General Health', description: 'General health questions and discussions', icon: 'heart', color: '#0d9488', is_active: true, question_count: 2 },
    { name: 'Mental Wellness', description: 'Mental health support and resources', icon: 'brain', color: '#7c3aed', is_active: true, question_count: 1 },
    { name: 'Chronic Conditions', description: 'Living with and managing chronic illnesses', icon: 'activity', color: '#0891b2', is_active: true, question_count: 1 },
  ];
  const catIds: string[] = [];
  for (const c of forumCats) { const cat = await db.insert('forum_categories', { ...c, created_at: NOW() }); catIds.push(cat.id); }
  const forumQuestions = [
    { title: 'How often should I check my blood pressure at home?', content: 'I was recently diagnosed with hypertension. My doctor recommended home monitoring, but I am unsure how often to measure. Any guidance?', category_id: catIds[0], category_name: 'General Health', tags: ['hypertension', 'monitoring'], author_id: userIds['patient.musa@careconnect.health'], author_name: 'Musa Bello', author_type: 'patient', is_anonymous: false, status: 'approved', priority: 'normal', views: 142, likes: 18, answer_count: 1, has_accepted_answer: true, created_at: NOW() },
    { title: 'Tips for managing anxiety without medication?', content: 'I have been dealing with anxiety and want to explore non-medication approaches. What has worked for others?', category_id: catIds[1], category_name: 'Mental Wellness', tags: ['anxiety', 'wellness'], author_id: userIds['public.zainab@careconnect.health'], author_name: 'Zainab Ahmed', author_type: 'public_user', is_anonymous: false, status: 'approved', priority: 'normal', views: 89, likes: 12, answer_count: 1, has_accepted_answer: false, created_at: NOW() },
    { title: 'Best diet for managing Type 2 diabetes?', content: 'Looking for practical dietary advice for Type 2 diabetes management. Especially local Nigerian food options.', category_id: catIds[2], category_name: 'Chronic Conditions', tags: ['diabetes', 'nutrition'], author_id: userIds['patient.fatima@careconnect.health'], author_name: 'Fatima Lawal', author_type: 'patient', is_anonymous: false, status: 'approved', priority: 'normal', views: 203, likes: 27, answer_count: 1, has_accepted_answer: true, created_at: NOW() },
  ];
  const qIds: string[] = [];
  for (const q of forumQuestions) { const question = await db.insert('forum_questions', q); qIds.push(question.id); }
  const forumAnswers = [
    { question_id: qIds[0], content: 'For newly diagnosed hypertension, measuring twice daily (morning and evening) for the first week, then once daily is common. Always measure at the same time, after resting for 5 minutes. Record your readings to share with your doctor.', author_id: physicianId, author_name: 'Dr. Amina Yusuf', author_type: 'physician', is_accepted: true, is_expert: true, likes: 24, status: 'approved', created_at: NOW() },
    { question_id: qIds[1], content: 'Regular exercise, mindfulness meditation, adequate sleep, and reducing caffeine can all help. Cognitive Behavioral Therapy (CBT) is also very effective. Consider speaking with a counselor if anxiety persists.', author_id: physicianId, author_name: 'Dr. Amina Yusuf', author_type: 'physician', is_accepted: false, is_expert: true, likes: 15, status: 'approved', created_at: NOW() },
    { question_id: qIds[2], content: 'Focus on low-glycemic foods: whole grains (ofada rice, oats), vegetables, lean proteins. Limit refined carbs and sugary drinks. Local options like unripe plantain, beans, and leafy greens are excellent. Portion control is key.', author_id: physicianId, author_name: 'Dr. Amina Yusuf', author_type: 'physician', is_accepted: true, is_expert: true, likes: 31, status: 'approved', created_at: NOW() },
  ];
  for (const a of forumAnswers) await db.insert('forum_answers', a);
  counts.forum_categories = forumCats.length;
  counts.forum_questions = forumQuestions.length;
  counts.forum_answers = forumAnswers.length;

  // ============================================================
  // SECTION 10: Content (news, podcasts, tips, facts, blog, jobs, causes)
  // ============================================================
  const news = [
    { title: 'WHO Releases Updated Hypertension Management Guidelines', excerpt: 'The World Health Organization has published new guidelines emphasizing lifestyle interventions alongside medication for blood pressure control.', content: 'The World Health Organization (WHO) has released updated guidelines for the management of hypertension. The new recommendations emphasize a combination of lifestyle modifications and appropriate pharmacological treatment. Key updates include lower target blood pressure thresholds for high-risk patients and expanded access to affordable medications.', source: 'WHO Newsroom', source_url: 'https://who.int', image_url: '', published_at: '2025-07-15T08:00:00Z', category: 'cardiology', tags: ['hypertension', 'guidelines'], ai_summary: 'New WHO guidelines stress lifestyle changes plus medication for hypertension management.', status: 'published', featured: true, views: 1240, likes: 56, admin_approved: true, author_name: 'WHO Newsroom', created_at: NOW() },
    { title: 'Mediterranean Diet Shows Promise for Diabetes Prevention', excerpt: 'A new study confirms the Mediterranean diet significantly reduces Type 2 diabetes risk in diverse populations.', content: 'Recent research published in a leading medical journal confirms that adherence to a Mediterranean diet can significantly reduce the risk of developing Type 2 diabetes. The study followed over 20,000 participants across multiple countries and found a 30% reduction in diabetes incidence among those closely following the diet.', source: 'Medical News Today', source_url: 'https://medicalnewstoday.com', image_url: '', published_at: '2025-07-12T08:00:00Z', category: 'nutrition', tags: ['diabetes', 'diet'], ai_summary: 'Mediterranean diet reduces Type 2 diabetes risk, study confirms.', status: 'published', featured: false, views: 890, likes: 34, admin_approved: true, author_name: 'Medical News Today', created_at: NOW() },
    { title: 'Mental Health Awareness: Breaking the Stigma in African Communities', excerpt: 'Health advocates call for greater mental health literacy and culturally sensitive care across the continent.', content: 'Mental health advocates are working to break the stigma surrounding mental illness in African communities. Initiatives include community education programs, training for traditional healers to recognize mental health conditions, and integrating mental health services into primary care.', source: 'Africa Health', source_url: 'https://africahealth.example', image_url: '', published_at: '2025-07-10T08:00:00Z', category: 'mental_health', tags: ['mental-health', 'awareness'], ai_summary: 'Advocates push for mental health literacy in African communities.', status: 'published', featured: true, views: 1560, likes: 78, admin_approved: true, author_name: 'Africa Health', created_at: NOW() },
  ];
  for (const n of news) await db.insert('news_articles', n);
  counts.news_articles = news.length;

  const podcasts = [
    { title: 'Understanding Blood Pressure in 5 Minutes', description: 'A quick, clear explanation of what blood pressure is and why it matters.', audioUrl: '', duration: 312, publishedAt: '2025-07-01', category: 'cardiology', host: { name: 'Dr. Amina Yusuf', credentials: 'MD, Cardiology' }, transcript: '', tags: ['hypertension', 'cardiology'], playCount: 420, likes: 38, isLive: false, created_at: NOW() },
    { title: 'Mental Wellness During Stressful Times', description: 'Practical strategies for maintaining mental health during difficult periods.', audioUrl: '', duration: 1845, publishedAt: '2025-06-20', category: 'mental_health', host: { name: 'Dr. Grace Eze', credentials: 'RN, Mental Health' }, transcript: '', tags: ['mental-health', 'wellness'], playCount: 680, likes: 52, isLive: false, created_at: NOW() },
  ];
  for (const p of podcasts) await db.insert('podcasts', p);
  counts.podcasts = podcasts.length;

  const tips = [
    { title: 'Hydration Habit: The 2-Liter Rule', content: 'Aim for at least 2 liters of water daily. Proper hydration supports kidney function, regulates body temperature, and improves energy levels. Carry a reusable bottle and sip throughout the day.', category: 'wellness', tags: ['hydration', 'wellness'], image_url: '', status: 'published', featured: true, week_number: 30, year: 2025, created_at: NOW() },
    { title: 'Move More: The 30-Minute Daily Walk', content: 'A brisk 30-minute walk daily reduces cardiovascular risk, improves mood, and aids weight management. Break it into three 10-minute walks if needed.', category: 'fitness', tags: ['exercise', 'fitness'], image_url: '', status: 'published', featured: false, week_number: 29, year: 2025, created_at: NOW() },
  ];
  for (const t of tips) await db.insert('weekly_tips', t);
  counts.weekly_tips = tips.length;

  const facts = [
    { title: 'Your Heart Beats About 100,000 Times a Day', content: 'The human heart pumps roughly 7,500 liters of blood daily through about 100,000 beats. Keeping it healthy with regular exercise and a balanced diet is essential.', category: 'cardiology', tags: ['heart', 'facts'], image_url: '', status: 'published', featured: true, fact_type: 'general', views: 890, likes: 45, created_at: NOW() },
    { title: 'Sleep Deprivation Impairs Immunity', content: 'Less than 6 hours of sleep per night significantly weakens immune function, making you more susceptible to infections. Aim for 7-9 hours of quality sleep.', category: 'wellness', tags: ['sleep', 'immunity'], image_url: '', status: 'published', featured: false, fact_type: 'general', views: 670, likes: 38, created_at: NOW() },
  ];
  for (const f of facts) await db.insert('timeless_facts', f);
  counts.timeless_facts = facts.length;

  const blogs = [
    { title: '7 Proven Ways to Improve Sleep Quality', excerpt: 'Science-backed strategies for better, deeper sleep tonight.', content: 'Quality sleep is foundational to health. Here are seven evidence-based strategies: maintain a consistent schedule, create a dark cool environment, limit screens before bed, avoid caffeine late in the day, exercise regularly, manage stress, and avoid large meals before sleeping.', author: { name: 'Dr. Amina Yusuf', avatar: '', credentials: 'MD, Cardiology', bio: 'Attending physician at Lagos General Hospital.' }, category: 'wellness', tags: ['sleep', 'wellness'], publishedAt: '2025-07-05', featuredImage: '', readTime: 7, views: 1230, likes: 67, commentsCount: 4, isFeatured: true, entityId: hmsEntityId, entityName: 'Lagos General Hospital', created_at: NOW() },
    { title: 'Understanding Your Lab Results: A Patient Guide', excerpt: 'Demystifying common blood test results so you can take charge of your health.', content: 'Lab results can be confusing. This guide explains the most common tests: Complete Blood Count (CBC), Basic Metabolic Panel (BMP), Lipid Panel, and Liver Function Tests. Always discuss your results with your healthcare provider.', author: { name: 'Sade Ibrahim', avatar: '', credentials: 'MLS', bio: 'Medical laboratory scientist.' }, category: 'education', tags: ['labs', 'education'], publishedAt: '2025-06-28', featuredImage: '', readTime: 10, views: 980, likes: 41, commentsCount: 2, isFeatured: false, entityId: hmsEntityId, entityName: 'Lagos General Hospital', created_at: NOW() },
  ];
  for (const b of blogs) await db.insert('blog_posts', b);
  counts.blog_posts = blogs.length;

  const jobs = [
    { title: 'Registered Nurse - Emergency Department', description: 'Join our busy ED team. We seek a compassionate, skilled RN for rotating shifts.', requirements: ['Registered Nurse license', 'BLS/ACLS certification', '2+ years ED experience'], responsibilities: ['Triage and patient assessment', 'Administer medications', 'Assist physicians'], qualifications: ['BSc Nursing'], benefits: ['Health insurance', 'Pension', 'Paid leave'], salary_range: { min: 250000, max: 350000, currency: 'NGN', period: 'monthly' }, job_type: 'full_time', experience_level: 'mid', location: { type: 'on-site', city: 'Lagos', state: 'Lagos', country: 'Nigeria', address: '15 Marina Road' }, category: 'nursing', specialties: ['Emergency Medicine'], health_center_id: hmsEntityId, health_center_name: 'Lagos General Hospital', posted_by: userIds['admin.hms@lagosgeneral.health'], status: 'active', admin_approved: true, featured: false, urgent: false, views: 234, applications_count: 12, tags: ['nursing', 'emergency'], contact_email: 'careers@lagosgeneral.health', created_at: NOW() },
    { title: 'Clinical Dietitian', description: 'Provide nutritional counseling and develop meal plans for patients with chronic conditions.', requirements: ['Degree in Dietetics/Nutrition', 'Clinical experience', 'Registration with relevant body'], responsibilities: ['Nutritional assessment', 'Meal planning', 'Patient education'], qualifications: ['BSc Dietetics'], benefits: ['Flexible hours', 'Professional development'], salary_range: { min: 200000, max: 280000, currency: 'NGN', period: 'monthly' }, job_type: 'full_time', experience_level: 'mid', location: { type: 'on-site', city: 'Abuja', state: 'FCT', country: 'Nigeria', address: '42 Wuse 2 Crescent' }, category: 'allied_health', specialties: ['Nutrition'], health_center_id: entityIds['Abuja Family Health Center'], health_center_name: 'Abuja Family Health Center', posted_by: userIds['owner@abujafamily.health'], status: 'active', admin_approved: true, featured: true, urgent: false, views: 178, applications_count: 8, tags: ['nutrition', 'dietitian'], contact_email: 'careers@abujafamily.health', created_at: NOW() },
  ];
  for (const j of jobs) await db.insert('job_postings', j);
  counts.job_postings = jobs.length;

  const causes = [
    { title: 'Free Blood Pressure Screening in Rural Lagos', description: 'Help us bring free BP screening to underserved communities in rural Lagos State. Our mobile clinic will visit 10 villages over 3 months.', category: 'medical_treatment', targetAmount: 5000000, currentAmount: 1850000, currency: 'NGN', beneficiaryName: 'Rural Lagos Communities', beneficiaryAge: '', beneficiaryLocation: 'Rural Lagos', organizer: { userId: userIds['admin.hms@lagosgeneral.health'], name: 'Funke Adebayo', email: 'admin.hms@lagosgeneral.health', phone: '+2348012345611', relationship: 'Organizer' }, medicalCondition: 'Hypertension screening', urgencyLevel: 'high', images: [], documents: [], status: 'active', isVerified: true, verificationDocuments: [], verifiedAt: NOW(), verifiedBy: 'system', startDate: '2025-07-01', endDate: '2025-10-01', donorCount: 47, shareCount: 12, withdrawnAmount: 0, availableForWithdrawal: 1850000, created_at: NOW() },
  ];
  for (const c of causes) await db.insert('causes', c);
  counts.causes = causes.length;

  // ============================================================
  // SECTION 11: Health Tools
  // ============================================================
  const healthTools = [
    { name: 'General Health Triage', description: 'AI-powered symptom assessment to help you understand possible causes and recommended next steps.', category: 'general_triage', type: 'ai_chat', difficulty_level: 'beginner', estimated_duration: '5 min', usage_count: 0, rating: 4.5, is_active: true, requires_login: false, featured: true, emergency_tool: false, ai_chat_config: { model: 'gemini-1.5-flash', system_prompt: 'You are a health triage assistant. Help users understand their symptoms and recommend appropriate care levels. Always recommend emergency care for serious symptoms.', conversation_starters: ['I have a headache', 'I feel chest pain'], safety_guidelines: ['Always recommend professional care for emergencies'], medical_disclaimers: ['This is not a substitute for professional medical advice.'], max_conversation_length: 20, context_retention: true, personalization_enabled: false }, tags: ['triage', 'ai'], created_at: NOW() },
    { name: 'BMI Calculator', description: 'Calculate your Body Mass Index and understand what it means for your health.', category: 'general_triage', type: 'calculator', difficulty_level: 'beginner', estimated_duration: '2 min', usage_count: 0, rating: 4.7, is_active: true, requires_login: false, featured: true, emergency_tool: false, config: { input_fields: [{ name: 'height', label: 'Height (cm)', type: 'number' }, { name: 'weight', label: 'Weight (kg)', type: 'number' }], output_format: 'bmi_value', medical_disclaimer: 'BMI is a screening tool and does not diagnose body fatness or health.' }, tags: ['bmi', 'calculator'], created_at: NOW() },
    { name: 'Blood Pressure Log', description: 'Track your blood pressure readings over time and identify trends.', category: 'chronic_conditions', type: 'tracker', difficulty_level: 'beginner', estimated_duration: '3 min', usage_count: 0, rating: 4.4, is_active: true, requires_login: true, featured: false, emergency_tool: false, config: { input_fields: [{ name: 'systolic', label: 'Systolic', type: 'number' }, { name: 'diastolic', label: 'Diastolic', type: 'number' }, { name: 'date', label: 'Date', type: 'date' }], output_format: 'chart', medical_disclaimer: 'Regular monitoring helps manage hypertension. Consult your doctor for interpretation.' }, tags: ['bp', 'tracker', 'hypertension'], created_at: NOW() },
    { name: 'Mental Wellness Check-in', description: 'A quick check-in to assess your mental wellbeing with supportive resources.', category: 'mental_wellness', type: 'assessment', difficulty_level: 'beginner', estimated_duration: '5 min', usage_count: 0, rating: 4.6, is_active: true, requires_login: false, featured: true, emergency_tool: false, config: { input_fields: [], output_format: 'score', medical_disclaimer: 'This is a screening tool, not a diagnosis. If you are in crisis, seek immediate help.' }, tags: ['mental-health', 'wellness'], created_at: NOW() },
  ];
  for (const t of healthTools) await db.insert('health_tools', t);
  counts.health_tools = healthTools.length;

  // ============================================================
  // SECTION 12: System settings, feature flags, audit logs, specialties
  // ============================================================
  await db.insert('system_settings', { key: 'platform_name', value: 'CareConnect', category: 'general', created_at: NOW() });
  await db.insert('system_settings', { key: 'support_email', value: 'support@careconnect.health', category: 'general', created_at: NOW() });
  await db.insert('feature_flags', { key: 'telehealth', enabled: true, description: 'Enable telehealth booking', created_at: NOW() });
  await db.insert('feature_flags', { key: 'ai_health_tools', enabled: true, description: 'Enable AI-powered health tools', created_at: NOW() });
  await db.insert('audit_logs', { action: 'system_seeded', entity_type: 'system', entity_id: 'seed', user_email: 'system', details: 'Database seeded with comprehensive demo data', created_at: NOW() });
  counts.system_settings = 2;
  counts.feature_flags = 2;

  const specs = ['Cardiology', 'General Medicine', 'Pediatrics', 'Emergency Medicine', 'Obstetrics', 'Family Medicine', 'Pharmacy', 'Mental Health'];
  for (const s of specs) await db.insert('specialties', { name: s, is_active: true, created_at: NOW() });
  await db.insert('insurance_providers', { name: 'NHIS', is_active: true, created_at: NOW() });
  await db.insert('insurance_providers', { name: 'Hygeia HMO', is_active: true, created_at: NOW() });
  counts.specialties = specs.length;

  console.log('[seed] complete:', counts);
  return counts;
}
