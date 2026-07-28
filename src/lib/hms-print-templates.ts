// HMS Print Templates - Generates printable HTML for clinical documents
// Each function returns a standalone HTML string styled for A4 printing.
// Color palette: teal/slate (NO indigo/blue, NO emojis).

/**
 * Escape HTML special characters in a string to prevent injection in print HTML.
 */
function esc(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'string' ? value : String(value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Format an ISO date string for display in printed documents.
 */
function fmtDate(value: unknown): string {
  if (!value || typeof value !== 'string') return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return esc(value);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
}

/**
 * Format an ISO datetime string for display in printed documents.
 */
function fmtDateTime(value: unknown): string {
  if (!value || typeof value !== 'string') return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return esc(value);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Safely read a property from a loosely-typed record (patient/encounter/etc.).
 */
function pick<T = string>(obj: any, key: string, fallback: T = '' as unknown as T): T {
  if (!obj || typeof obj !== 'object') return fallback;
  const v = obj[key];
  if (v === null || v === undefined || v === '') return fallback;
  return v as T;
}

interface FacilityInfo {
  name: string;
  type?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  license?: string;
}

/**
 * Build the standard HTML head + body wrapper with print-optimized styles.
 * All documents share this shell so they look like a consistent hospital stationery.
 */
function buildDocumentShell(title: string, facility: FacilityInfo, bodyHtml: string): string {
  const facilityLine2 = [
    facility.address,
    facility.phone ? `Tel: ${facility.phone}` : '',
    facility.email ? `Email: ${facility.email}` : '',
    facility.website ? facility.website : ''
  ].filter(Boolean).join(' • ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(title)}</title>
<style>
  @page { size: A4; margin: 16mm 14mm 18mm 14mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b; /* slate-800 */
    font-size: 12px;
    line-height: 1.55;
    background: #ffffff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .doc { max-width: 210mm; margin: 0 auto; padding: 0; }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #0f766e; /* teal-700 */
    padding-bottom: 12px;
    margin-bottom: 18px;
  }
  .facility-block { flex: 1; }
  .facility-name {
    font-size: 19px;
    font-weight: 700;
    color: #0f766e; /* teal-700 */
    letter-spacing: 0.3px;
    margin: 0 0 4px 0;
  }
  .facility-sub {
    font-size: 11px;
    color: #475569; /* slate-600 */
    margin: 0 0 2px 0;
  }
  .facility-line {
    font-size: 10.5px;
    color: #64748b; /* slate-500 */
    margin: 0;
  }
  .facility-license {
    font-size: 10px;
    color: #94a3b8; /* slate-400 */
    margin-top: 4px;
    font-style: italic;
  }
  .doc-meta { text-align: right; min-width: 180px; }
  .doc-meta .doc-title {
    font-size: 15px;
    font-weight: 700;
    color: #134e4a; /* teal-900 */
    margin: 0 0 4px 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .doc-meta .doc-id {
    font-size: 11px;
    color: #334155; /* slate-700 */
    margin: 0;
  }
  .doc-meta .doc-date {
    font-size: 10.5px;
    color: #64748b; /* slate-500 */
    margin: 2px 0 0 0;
  }
  .patient-banner {
    background: #f0fdfa; /* teal-50 */
    border: 1px solid #99f6e4; /* teal-200 */
    border-left: 4px solid #0f766e; /* teal-700 */
    border-radius: 6px;
    padding: 10px 14px;
    margin-bottom: 16px;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px 16px;
  }
  .patient-banner .field-label {
    font-size: 9.5px;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: #64748b; /* slate-500 */
    margin: 0 0 1px 0;
  }
  .patient-banner .field-value {
    font-size: 12px;
    font-weight: 600;
    color: #0f172a; /* slate-900 */
    margin: 0;
    word-break: break-word;
  }
  .section {
    margin-bottom: 14px;
    page-break-inside: avoid;
  }
  .section-title {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.7px;
    color: #ffffff;
    background: #0f766e; /* teal-700 */
    padding: 4px 10px;
    border-radius: 3px;
    margin: 0 0 8px 0;
  }
  .section-body {
    padding: 0 2px;
  }
  table.data {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
  }
  table.data th {
    text-align: left;
    background: #f1f5f9; /* slate-100 */
    color: #334155; /* slate-700 */
    font-weight: 600;
    padding: 6px 8px;
    border: 1px solid #e2e8f0; /* slate-200 */
    text-transform: uppercase;
    font-size: 9.5px;
    letter-spacing: 0.5px;
  }
  table.data td {
    padding: 6px 8px;
    border: 1px solid #e2e8f0; /* slate-200 */
    color: #1e293b; /* slate-800 */
    vertical-align: top;
    word-break: break-word;
  }
  table.data tr:nth-child(even) td { background: #f8fafc; /* slate-50 */ }
  .kv-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px 18px;
    font-size: 11.5px;
  }
  .kv-grid .kv-label {
    color: #64748b; /* slate-500 */
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .kv-grid .kv-value { color: #1e293b; font-weight: 600; }
  .notes {
    background: #f8fafc;
    border-left: 3px solid #94a3b8;
    padding: 8px 12px;
    font-size: 11px;
    color: #334155;
    border-radius: 0 4px 4px 0;
    white-space: pre-wrap;
  }
  .rx-item {
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 10px 12px;
    margin-bottom: 8px;
  }
  .rx-item .rx-no {
    font-size: 10px;
    color: #0f766e;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
  }
  .rx-item .rx-drug {
    font-size: 13px;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 4px;
  }
  .rx-item .rx-meta {
    font-size: 11px;
    color: #475569;
    margin: 1px 0;
  }
  .rx-item .rx-sig {
    margin-top: 6px;
    padding: 6px 8px;
    background: #f0fdfa;
    border-left: 3px solid #0f766e;
    font-size: 11px;
    color: #134e4a;
    border-radius: 0 3px 3px 0;
  }
  .abnormal { color: #b91c1c; font-weight: 700; }
  .critical { color: #ffffff; background: #b91c1c; padding: 1px 6px; border-radius: 3px; font-weight: 700; }
  .footer {
    margin-top: 28px;
    padding-top: 14px;
    border-top: 1px dashed #94a3b8;
    page-break-inside: avoid;
  }
  .signatures {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 32px;
    margin-bottom: 14px;
  }
  .signature-block .sig-line {
    border-top: 1px solid #334155;
    margin-top: 36px;
    padding-top: 4px;
    font-size: 10.5px;
    color: #475569;
  }
  .signature-block .sig-name {
    font-size: 11.5px;
    font-weight: 600;
    color: #0f172a;
    margin-top: 2px;
  }
  .signature-block .sig-role {
    font-size: 10px;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .doc-footer-meta {
    display: flex;
    justify-content: space-between;
    font-size: 9.5px;
    color: #94a3b8;
    border-top: 1px solid #e2e8f0;
    padding-top: 6px;
  }
  .stamp {
    display: inline-block;
    border: 1.5px solid #0f766e;
    color: #0f766e;
    padding: 2px 8px;
    border-radius: 3px;
    font-size: 9.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    margin-left: 6px;
  }
  @media print {
    .no-print { display: none !important; }
    body { font-size: 11px; }
  }
</style>
</head>
<body>
  <div class="doc">
    <div class="header">
      <div class="facility-block">
        <p class="facility-name">${esc(facility.name || 'CareConnect Health Facility')}</p>
        ${facility.type ? `<p class="facility-sub">${esc(facility.type)}</p>` : ''}
        ${facilityLine2 ? `<p class="facility-line">${esc(facilityLine2)}</p>` : ''}
        ${facility.license ? `<p class="facility-license">License: ${esc(facility.license)}</p>` : ''}
      </div>
      <div class="doc-meta">
        <p class="doc-title">${esc(title)}</p>
        <p class="doc-id">Generated: ${fmtDateTime(new Date().toISOString())}</p>
      </div>
    </div>
    ${bodyHtml}
    <div class="footer">
      <div class="signatures">
        <div class="signature-block">
          <div class="sig-line"></div>
          <div class="sig-name">${esc(pick(facility, 'signatureName', 'Authorized Signatory'))}</div>
          <div class="sig-role">${esc(pick(facility, 'signatureRole', 'Administration'))}</div>
        </div>
        <div class="signature-block">
          <div class="sig-line"></div>
          <div class="sig-name">${esc(pick(facility, 'signature2Name', '____________________'))}</div>
          <div class="sig-role">${esc(pick(facility, 'signature2Role', 'Attending Clinician'))}</div>
        </div>
      </div>
      <div class="doc-footer-meta">
        <span>Document generated by CareConnect HMS — confidential patient record</span>
        <span>Printed: ${fmtDate(new Date().toISOString())}</span>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Build the standard patient info banner used at the top of clinical documents.
 */
function patientBanner(patient: any, extraFields: Array<{ label: string; value: string }> = []): string {
  const name =
    pick(patient, 'name') ||
    pick(patient, 'patient_name') ||
    pick(patient, 'encrypted_name') ||
    'Patient';
  const mrn = pick(patient, 'patient_code') || pick(patient, 'mrn') || pick(patient, 'medical_record_number') || '—';
  const dob = pick(patient, 'dob') || pick(patient, 'date_of_birth') || '—';
  const sex = pick(patient, 'sex') || pick(patient, 'gender') || '—';
  const phone = pick(patient, 'phone') || pick(patient, 'primary_phone') || '—';

  const baseFields = [
    { label: 'Patient Name', value: name },
    { label: 'Patient ID / MRN', value: mrn },
    { label: 'Date of Birth', value: fmtDate(dob) },
    { label: 'Sex / Gender', value: sex }
  ];
  const contactFields = [
    { label: 'Contact', value: phone },
    ...extraFields
  ];
  const fields = [...baseFields, ...contactFields];
  return `<div class="patient-banner">
    ${fields
      .map(
        (f) =>
          `<div><p class="field-label">${esc(f.label)}</p><p class="field-value">${esc(f.value)}</p></div>`
      )
      .join('')}
  </div>`;
}

/**
 * Resolve facility info from a loosely-typed entity record (or build a default).
 */
function resolveFacility(entity: any, overrides: Partial<FacilityInfo> = {}): FacilityInfo {
  if (!entity) {
    return {
      name: overrides.name || 'CareConnect Health Facility',
      type: overrides.type,
      address: overrides.address,
      phone: overrides.phone,
      email: overrides.email,
      website: overrides.website,
      license: overrides.license
    };
  }
  const addressParts: string[] = [];
  const addr = entity.address;
  if (addr && typeof addr === 'object') {
    if (addr.street) addressParts.push(addr.street);
    if (addr.city) addressParts.push(addr.city);
    if (addr.state) addressParts.push(addr.state);
    if (addr.country) addressParts.push(addr.country);
    if (addr.postal_code) addressParts.push(addr.postal_code);
  } else if (typeof entity.address === 'string') {
    addressParts.push(entity.address);
  }
  return {
    name: overrides.name || entity.name || 'CareConnect Health Facility',
    type: overrides.type || (entity.entity_type ? String(entity.entity_type).replace(/_/g, ' ') : undefined),
    address: overrides.address || addressParts.join(', '),
    phone: overrides.phone || entity.phone,
    email: overrides.email || entity.email,
    website: overrides.website || entity.website,
    license: overrides.license
  };
}

// ============================================================================
// Public API: Document Generators
// ============================================================================

export interface PrintEncounter {
  id?: string;
  encounter_code?: string;
  type?: string;
  status?: string;
  priority?: string;
  scheduled_start?: string;
  actual_start?: string;
  actual_end?: string;
  reason_for_visit?: string;
  chief_complaint?: string;
  department?: string;
  ward?: string;
  bed_id?: string;
  attending_physician_id?: string;
  discharge_disposition?: string;
  notes?: string;
  entity_id?: string;
}

export interface PrintPatient {
  name?: string;
  patient_name?: string;
  patient_code?: string;
  mrn?: string;
  medical_record_number?: string;
  dob?: string;
  date_of_birth?: string;
  sex?: string;
  gender?: string;
  phone?: string;
  primary_phone?: string;
  address?: any;
}

export interface PrintVital {
  type?: string;
  display_name?: string;
  value_quantity?: number | string;
  value_string?: string;
  unit?: string;
  systolic?: number;
  diastolic?: number;
  is_abnormal?: boolean;
  abnormal_flag?: string;
  measured_at?: string;
}

export interface PrintCondition {
  condition_name?: string;
  code?: string;
  code_system?: string;
  code_display?: string;
  category?: string;
  clinical_status?: string;
  verification_status?: string;
  severity?: string;
  onset_date?: string;
  notes?: string;
}

export interface PrintMedicationRequest {
  id?: string;
  prescription_number?: string;
  status?: string;
  priority?: string;
  authored_on?: string;
  patient_id?: string;
  prescriber_id?: string;
  entity_id?: string;
  pharmacy_entity_id?: string;
  medications?: Array<{
    drug_name: string;
    generic_name?: string;
    strength: string;
    form: string;
    route: string;
    frequency: string;
    duration?: string;
    quantity: string;
    refills?: number;
    instructions: string;
    indication?: string;
  }>;
  notes?: string;
  reason_code?: string;
}

export interface PrintPrescriber {
  name?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  license_number?: string;
  specialty?: string;
  credentials?: string;
  email?: string;
  phone?: string;
}

export interface PrintLabOrder {
  id?: string;
  order_number?: string;
  status?: string;
  priority?: string;
  category?: string;
  tests?: Array<{
    test_code?: string;
    test_name: string;
    specimen_type?: string;
    panel?: string;
  }>;
  ordered_at?: string;
  reason_for_test?: string;
  clinical_info?: string;
  diagnosis_codes?: string[];
  specimen_collected?: boolean;
  collection_date?: string;
}

export interface PrintLabResult {
  id?: string;
  test_name?: string;
  test_code?: string;
  status?: string;
  resulted_at?: string;
  resulted_by?: string;
  verified_at?: string;
  verified_by?: string;
  method?: string;
  analytes?: Array<{
    analyte_name: string;
    value: string;
    unit?: string;
    reference_range?: string;
    abnormal_flag?: string;
    status?: string;
  }>;
  notes?: string;
}

export interface PrintMedication {
  drug_name?: string;
  generic_name?: string;
  strength?: string;
  form?: string;
  route?: string;
  frequency?: string;
  start_date?: string;
  end_date?: string;
  instructions?: string;
  status?: string;
}

export interface PrintFacilityOverride {
  name?: string;
  type?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  license?: string;
  signatureName?: string;
  signatureRole?: string;
  signature2Name?: string;
  signature2Role?: string;
}

/**
 * Generate a printable clinical encounter summary.
 */
export function generateEncounterSummary(
  encounter: PrintEncounter,
  patient: PrintPatient,
  vitals: PrintVital[] = [],
  conditions: PrintCondition[] = [],
  facility: PrintFacilityOverride & { entity?: any } = {}
): string {
  const facilityInfo = resolveFacility(facility.entity, facility);

  const encounterFields = [
    { label: 'Encounter Code', value: pick(encounter, 'encounter_code', '—') },
    { label: 'Type', value: pick(encounter, 'type', '—').replace(/_/g, ' ') },
    { label: 'Status', value: pick(encounter, 'status', '—').replace(/_/g, ' ') },
    { label: 'Priority', value: pick(encounter, 'priority', '—') },
    { label: 'Department', value: pick(encounter, 'department', '—') },
    { label: 'Scheduled', value: fmtDateTime(pick(encounter, 'scheduled_start')) },
    { label: 'Actual Start', value: fmtDateTime(pick(encounter, 'actual_start')) },
    { label: 'Actual End', value: fmtDateTime(pick(encounter, 'actual_end')) }
  ];

  const location =
    pick(encounter, 'ward') || pick(encounter, 'bed_id')
      ? `${pick(encounter, 'ward', '—')} / Bed ${pick(encounter, 'bed_id', '—')}`
      : '—';

  const vitalsRows = (vitals && vitals.length
    ? vitals
        .map((v) => {
          let val = v.value_string || (v.value_quantity !== undefined && v.value_quantity !== null ? String(v.value_quantity) : '');
          if (v.type === 'blood_pressure' && (v.systolic || v.diastolic)) {
            val = `${v.systolic ?? '?'}/${v.diastolic ?? '?'}`;
          }
          if (v.unit && val) val = `${val} ${v.unit}`;
          const flag = v.is_abnormal
            ? v.abnormal_flag
              ? `<span class="abnormal">(${esc(v.abnormal_flag)})</span>`
              : `<span class="abnormal">(abnormal)</span>`
            : '';
          return `<tr>
            <td>${esc(v.display_name || v.type || '—')}</td>
            <td>${esc(val) || '—'}</td>
            <td>${fmtDateTime(v.measured_at)}</td>
            <td>${flag || '—'}</td>
          </tr>`;
        })
        .join('')
    : `<tr><td colspan="4" style="text-align:center;color:#94a3b8;">No vitals recorded for this encounter.</td></tr>`);

  const conditionRows = (conditions && conditions.length
    ? conditions
        .map((c) => {
          const code = c.code ? `${esc(c.code_system || 'ICD-10')}: ${esc(c.code)}` : '—';
          return `<tr>
            <td>${esc(c.condition_name || '—')}</td>
            <td>${code}</td>
            <td>${esc(c.category || '—')}</td>
            <td>${esc(c.clinical_status || '—')}</td>
            <td>${esc(c.verification_status || '—')}</td>
            <td>${esc(c.severity || '—')}</td>
          </tr>`;
        })
        .join('')
    : `<tr><td colspan="6" style="text-align:center;color:#94a3b8;">No conditions recorded for this encounter.</td></tr>`);

  const body = `
    ${patientBanner(patient, [
      { label: 'Encounter Date', value: fmtDate(pick(encounter, 'scheduled_start')) }
    ])}
    <div class="section">
      <div class="section-title">Encounter Information</div>
      <div class="section-body">
        <div class="kv-grid">
          ${encounterFields
            .map(
              (f) =>
                `<div><div class="kv-label">${esc(f.label)}</div><div class="kv-value">${esc(f.value)}</div></div>`
            )
            .join('')}
          <div><div class="kv-label">Ward / Bed</div><div class="kv-value">${esc(location)}</div></div>
        </div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">Chief Complaint & Reason for Visit</div>
      <div class="section-body">
        <p style="margin:0 0 6px 0;"><strong>Reason for Visit:</strong> ${esc(pick(encounter, 'reason_for_visit', '—'))}</p>
        <p style="margin:0;"><strong>Chief Complaint:</strong> ${esc(pick(encounter, 'chief_complaint', '—'))}</p>
      </div>
    </div>
    <div class="section">
      <div class="section-title">Vital Signs</div>
      <div class="section-body">
        <table class="data">
          <thead>
            <tr><th>Vital</th><th>Value</th><th>Measured At</th><th>Flag</th></tr>
          </thead>
          <tbody>${vitalsRows}</tbody>
        </table>
      </div>
    </div>
    <div class="section">
      <div class="section-title">Conditions & Diagnoses</div>
      <div class="section-body">
        <table class="data">
          <thead>
            <tr><th>Condition</th><th>Code</th><th>Category</th><th>Clinical Status</th><th>Verification</th><th>Severity</th></tr>
          </thead>
          <tbody>${conditionRows}</tbody>
        </table>
      </div>
    </div>
    ${encounter.notes ? `<div class="section"><div class="section-title">Clinical Notes</div><div class="section-body"><div class="notes">${esc(encounter.notes)}</div></div></div>` : ''}
  `;

  return buildDocumentShell('Encounter Summary', facilityInfo, body);
}

/**
 * Generate a printable prescription sheet (Rx).
 */
export function generatePrescription(
  medicationRequest: PrintMedicationRequest,
  patient: PrintPatient,
  prescriber: PrintPrescriber,
  facility: PrintFacilityOverride & { entity?: any } = {}
): string {
  const facilityInfo = resolveFacility(facility.entity, facility);
  const prescriberName =
    prescriber.name ||
    prescriber.full_name ||
    [prescriber.first_name, prescriber.last_name].filter(Boolean).join(' ') ||
    'Prescriber';

  const rxItems = (medicationRequest.medications && medicationRequest.medications.length
    ? medicationRequest.medications
        .map((m, idx) => {
          const meta = [
            m.strength ? `Strength: ${m.strength}` : '',
            m.form ? `Form: ${m.form}` : '',
            m.route ? `Route: ${m.route}` : '',
            m.frequency ? `Frequency: ${m.frequency}` : '',
            m.duration ? `Duration: ${m.duration}` : '',
            m.quantity ? `Quantity: ${m.quantity}` : '',
            m.refills ? `Refills: ${m.refills}` : ''
          ]
            .filter(Boolean)
            .map((line) => `<div class="rx-meta">${esc(line)}</div>`)
            .join('');
          return `<div class="rx-item">
            <div class="rx-no">Rx #${idx + 1}${m.indication ? ` • Indication: ${esc(m.indication)}` : ''}</div>
            <div class="rx-drug">${esc(m.drug_name)}${m.generic_name ? ` <span style="font-weight:400;color:#64748b;">(${esc(m.generic_name)})</span>` : ''}</div>
            ${meta}
            ${m.instructions ? `<div class="rx-sig"><strong>SIG:</strong> ${esc(m.instructions)}</div>` : ''}
          </div>`;
        })
        .join('')
    : `<div class="notes">No medications on this prescription.</div>`);

  const rxHeader = `
    <div class="kv-grid" style="grid-template-columns: repeat(3, minmax(0,1fr)); margin-bottom:12px;">
      <div><div class="kv-label">Prescription #</div><div class="kv-value">${esc(pick(medicationRequest, 'prescription_number', '—'))}</div></div>
      <div><div class="kv-label">Date Prescribed</div><div class="kv-value">${fmtDate(pick(medicationRequest, 'authored_on'))}</div></div>
      <div><div class="kv-label">Status</div><div class="kv-value">${esc(pick(medicationRequest, 'status', '—').replace(/_/g, ' '))}</div></div>
      <div><div class="kv-label">Priority</div><div class="kv-value">${esc(pick(medicationRequest, 'priority', '—'))}</div></div>
      <div><div class="kv-label">Refills Authorized</div><div class="kv-value">${medicationRequest.medications?.reduce((n, m) => n + (m.refills || 0), 0) ?? 0}</div></div>
      <div><div class="kv-label">Total Items</div><div class="kv-value">${medicationRequest.medications?.length ?? 0}</div></div>
    </div>
  `;

  const prescriberBlock = `
    <div class="section">
      <div class="section-title">Prescriber</div>
      <div class="section-body">
        <div class="kv-grid">
          <div><div class="kv-label">Name</div><div class="kv-value">${esc(prescriberName)}</div></div>
          <div><div class="kv-label">Specialty</div><div class="kv-value">${esc(prescriber.specialty || '—')}</div></div>
          <div><div class="kv-label">License #</div><div class="kv-value">${esc(prescriber.license_number || '—')}</div></div>
          <div><div class="kv-label">Credentials</div><div class="kv-value">${esc(prescriber.credentials || '—')}</div></div>
          ${prescriber.phone ? `<div><div class="kv-label">Phone</div><div class="kv-value">${esc(prescriber.phone)}</div></div>` : ''}
          ${prescriber.email ? `<div><div class="kv-label">Email</div><div class="kv-value">${esc(prescriber.email)}</div></div>` : ''}
        </div>
      </div>
    </div>
  `;

  const body = `
    ${patientBanner(patient, [
      { label: 'Date Prescribed', value: fmtDate(pick(medicationRequest, 'authored_on')) }
    ])}
    ${rxHeader}
    ${prescriberBlock}
    <div class="section">
      <div class="section-title">Prescribed Medications</div>
      <div class="section-body">${rxItems}</div>
    </div>
    ${medicationRequest.notes ? `<div class="section"><div class="section-title">Pharmacist Notes</div><div class="section-body"><div class="notes">${esc(medicationRequest.notes)}</div></div></div>` : ''}
    <div class="section">
      <div class="section-title">Dispensing & Patient Counseling</div>
      <div class="section-body">
        <div class="notes">Take all medications exactly as prescribed. Complete the full course unless otherwise directed. Contact the prescriber or pharmacy if you experience adverse reactions. Store medications at room temperature away from moisture and direct sunlight. Keep out of reach of children.</div>
      </div>
    </div>
  `;

  return buildDocumentShell('Prescription', facilityInfo, body);
}

/**
 * Generate a printable laboratory results report.
 */
export function generateLabReport(
  labOrder: PrintLabOrder,
  labResult: PrintLabResult,
  patient: PrintPatient,
  facility: PrintFacilityOverride & { entity?: any } = {}
): string {
  const facilityInfo = resolveFacility(facility.entity, facility);

  const testsList = (labOrder.tests && labOrder.tests.length
    ? labOrder.tests.map((t) => `${esc(t.test_name)}${t.test_code ? ` (${esc(t.test_code)})` : ''}`).join(', ')
    : labResult.test_name
      ? esc(labResult.test_name)
      : '—');

  const analyteRows = (labResult.analytes && labResult.analytes.length
    ? labResult.analytes
        .map((a) => {
          let flagCell = '—';
          if (a.abnormal_flag) {
            const f = a.abnormal_flag.toLowerCase();
            if (f.includes('critical')) {
              flagCell = `<span class="critical">${esc(a.abnormal_flag)}</span>`;
            } else if (f === 'high' || f === 'low' || f === 'abnormal') {
              flagCell = `<span class="abnormal">${esc(a.abnormal_flag.toUpperCase())}</span>`;
            } else {
              flagCell = `<span class="abnormal">${esc(a.abnormal_flag)}</span>`;
            }
          }
          return `<tr>
            <td>${esc(a.analyte_name)}</td>
            <td>${esc(a.value)}</td>
            <td>${esc(a.unit || '—')}</td>
            <td>${esc(a.reference_range || '—')}</td>
            <td>${flagCell}</td>
          </tr>`;
        })
        .join('')
    : `<tr><td colspan="5" style="text-align:center;color:#94a3b8;">No analyte values recorded for this result.</td></tr>`);

  const orderInfo = `
    <div class="kv-grid" style="grid-template-columns: repeat(3, minmax(0,1fr)); margin-bottom:12px;">
      <div><div class="kv-label">Order #</div><div class="kv-value">${esc(pick(labOrder, 'order_number', '—'))}</div></div>
      <div><div class="kv-label">Order Status</div><div class="kv-value">${esc(pick(labOrder, 'status', '—').replace(/_/g, ' '))}</div></div>
      <div><div class="kv-label">Priority</div><div class="kv-value">${esc(pick(labOrder, 'priority', '—'))}</div></div>
      <div><div class="kv-label">Category</div><div class="kv-value">${esc(pick(labOrder, 'category', '—'))}</div></div>
      <div><div class="kv-label">Ordered</div><div class="kv-value">${fmtDateTime(pick(labOrder, 'ordered_at'))}</div></div>
      <div><div class="kv-label">Specimen Collected</div><div class="kv-value">${labOrder.specimen_collected ? 'Yes' : 'No'}</div></div>
    </div>
  `;

  const resultInfo = `
    <div class="kv-grid" style="grid-template-columns: repeat(3, minmax(0,1fr)); margin-bottom:12px;">
      <div><div class="kv-label">Result Status</div><div class="kv-value">${esc(pick(labResult, 'status', '—').replace(/_/g, ' '))}</div></div>
      <div><div class="kv-label">Resulted At</div><div class="kv-value">${fmtDateTime(pick(labResult, 'resulted_at'))}</div></div>
      <div><div class="kv-label">Verified At</div><div class="kv-value">${fmtDateTime(pick(labResult, 'verified_at'))}</div></div>
      <div><div class="kv-label">Resulted By</div><div class="kv-value">${esc(pick(labResult, 'resulted_by', '—'))}</div></div>
      <div><div class="kv-label">Verified By</div><div class="kv-value">${esc(pick(labResult, 'verified_by', '—'))}</div></div>
      <div><div class="kv-label">Method</div><div class="kv-value">${esc(pick(labResult, 'method', '—'))}</div></div>
    </div>
  `;

  const body = `
    ${patientBanner(patient, [
      { label: 'Order Date', value: fmtDate(pick(labOrder, 'ordered_at')) },
      { label: 'Result Date', value: fmtDate(pick(labResult, 'resulted_at')) }
    ])}
    <div class="section">
      <div class="section-title">Lab Order Information</div>
      <div class="section-body">
        ${orderInfo}
        <p style="margin:6px 0 0 0;"><strong>Tests Ordered:</strong> ${testsList}</p>
        ${labOrder.reason_for_test ? `<p style="margin:4px 0 0 0;"><strong>Reason for Test:</strong> ${esc(labOrder.reason_for_test)}</p>` : ''}
        ${labOrder.clinical_info ? `<p style="margin:4px 0 0 0;"><strong>Clinical Info:</strong> ${esc(labOrder.clinical_info)}</p>` : ''}
      </div>
    </div>
    <div class="section">
      <div class="section-title">Result Information</div>
      <div class="section-body">${resultInfo}</div>
    </div>
    <div class="section">
      <div class="section-title">Analyte Results</div>
      <div class="section-body">
        <table class="data">
          <thead>
            <tr><th>Analyte</th><th>Value</th><th>Unit</th><th>Reference Range</th><th>Flag</th></tr>
          </thead>
          <tbody>${analyteRows}</tbody>
        </table>
      </div>
    </div>
    ${labResult.notes ? `<div class="section"><div class="section-title">Lab Notes</div><div class="section-body"><div class="notes">${esc(labResult.notes)}</div></div></div>` : ''}
    <div class="section">
      <div class="section-title">Interpretation Notes</div>
      <div class="section-body">
        <div class="notes">Reference ranges are guidelines only; interpretation should be done in the context of the patient's clinical presentation. Abnormal flags (H/L) indicate values outside the reference range. Critical values require immediate clinical attention. Please consult the ordering physician for any concerns.</div>
      </div>
    </div>
  `;

  return buildDocumentShell('Laboratory Report', facilityInfo, body);
}

/**
 * Generate a printable discharge summary document.
 */
export function generateDischargeSummary(
  encounter: PrintEncounter,
  patient: PrintPatient,
  conditions: PrintCondition[] = [],
  medications: PrintMedication[] = [],
  facility: PrintFacilityOverride & { entity?: any } = {}
): string {
  const facilityInfo = resolveFacility(facility.entity, facility);

  const encounterFields = [
    { label: 'Encounter Code', value: pick(encounter, 'encounter_code', '—') },
    { label: 'Type', value: pick(encounter, 'type', '—').replace(/_/g, ' ') },
    { label: 'Admission Date', value: fmtDateTime(pick(encounter, 'actual_start')) },
    { label: 'Discharge Date', value: fmtDateTime(pick(encounter, 'actual_end')) },
    { label: 'Discharge Disposition', value: pick(encounter, 'discharge_disposition', '—').replace(/_/g, ' ') },
    { label: 'Department', value: pick(encounter, 'department', '—') },
    { label: 'Ward', value: pick(encounter, 'ward', '—') },
    { label: 'Bed', value: pick(encounter, 'bed_id', '—') }
  ];

  const conditionRows = (conditions && conditions.length
    ? conditions
        .map((c) => {
          const code = c.code ? `${esc(c.code_system || 'ICD-10')}: ${esc(c.code)}` : '—';
          return `<tr>
            <td>${esc(c.condition_name || '—')}</td>
            <td>${code}</td>
            <td>${esc(c.clinical_status || '—')}</td>
            <td>${esc(c.verification_status || '—')}</td>
          </tr>`;
        })
        .join('')
    : `<tr><td colspan="4" style="text-align:center;color:#94a3b8;">No active conditions documented at discharge.</td></tr>`);

  const medRows = (medications && medications.length
    ? medications
        .map((m) => {
          const dose = [m.strength, m.form, m.route, m.frequency].filter(Boolean).join(' • ');
          const dates = [m.start_date ? `Start: ${fmtDate(m.start_date)}` : '', m.end_date ? `End: ${fmtDate(m.end_date)}` : '']
            .filter(Boolean)
            .join(' / ');
          return `<tr>
            <td>${esc(m.drug_name || '—')}${m.generic_name ? ` <span style="color:#64748b;">(${esc(m.generic_name)})</span>` : ''}</td>
            <td>${esc(dose || '—')}</td>
            <td>${esc(m.instructions || '—')}</td>
            <td>${esc(dates || '—')}</td>
          </tr>`;
        })
        .join('')
    : `<tr><td colspan="4" style="text-align:center;color:#94a3b8;">No medications prescribed at discharge.</td></tr>`);

  const body = `
    ${patientBanner(patient, [
      { label: 'Admission Date', value: fmtDate(pick(encounter, 'actual_start')) },
      { label: 'Discharge Date', value: fmtDate(pick(encounter, 'actual_end')) }
    ])}
    <div class="section">
      <div class="section-title">Admission & Discharge Details</div>
      <div class="section-body">
        <div class="kv-grid">
          ${encounterFields
            .map(
              (f) =>
                `<div><div class="kv-label">${esc(f.label)}</div><div class="kv-value">${esc(f.value)}</div></div>`
            )
            .join('')}
        </div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">Reason for Admission</div>
      <div class="section-body">
        <p style="margin:0 0 6px 0;"><strong>Reason for Visit:</strong> ${esc(pick(encounter, 'reason_for_visit', '—'))}</p>
        <p style="margin:0;"><strong>Chief Complaint:</strong> ${esc(pick(encounter, 'chief_complaint', '—'))}</p>
      </div>
    </div>
    <div class="section">
      <div class="section-title">Discharge Diagnoses</div>
      <div class="section-body">
        <table class="data">
          <thead>
            <tr><th>Condition</th><th>Code</th><th>Clinical Status</th><th>Verification</th></tr>
          </thead>
          <tbody>${conditionRows}</tbody>
        </table>
      </div>
    </div>
    <div class="section">
      <div class="section-title">Discharge Medications</div>
      <div class="section-body">
        <table class="data">
          <thead>
            <tr><th>Medication</th><th>Dose / Form / Route / Frequency</th><th>Instructions</th><th>Duration</th></tr>
          </thead>
          <tbody>${medRows}</tbody>
        </table>
      </div>
    </div>
    ${encounter.notes ? `<div class="section"><div class="section-title">Discharge Notes & Follow-Up</div><div class="section-body"><div class="notes">${esc(encounter.notes)}</div></div></div>` : ''}
    <div class="section">
      <div class="section-title">Patient Instructions</div>
      <div class="section-body">
        <div class="notes">Follow up with your primary care provider as directed. Take all prescribed medications as instructed. Seek immediate medical attention if you experience worsening symptoms, fever, severe pain, breathing difficulties, or other concerning signs. Keep all follow-up appointments.</div>
      </div>
    </div>
  `;

  return buildDocumentShell('Discharge Summary', facilityInfo, body);
}

/**
 * Generate a printable bed occupancy report (used by BedManagementPage reports tab).
 */
export interface PrintBedReportInput {
  facilityName: string;
  generatedAt: string;
  dateRangeStart?: string;
  dateRangeEnd?: string;
  totalBeds: number;
  occupied: number;
  available: number;
  maintenance: number;
  cleaning: number;
  reserved: number;
  occupancyRate: number;
  byWard: Array<{
    ward: string;
    total: number;
    occupied: number;
    available: number;
    maintenance: number;
    occupancyRate: number;
  }>;
  byBedType: Array<{
    bedType: string;
    total: number;
    occupied: number;
    available: number;
  }>;
}

export function generateBedOccupancyReport(input: PrintBedReportInput, facility: PrintFacilityOverride & { entity?: any } = {}): string {
  const facilityInfo = resolveFacility(facility.entity, facility);

  const wardRows = (input.byWard.length
    ? input.byWard
        .map((w) => {
          return `<tr>
            <td>${esc(w.ward)}</td>
            <td style="text-align:center;">${w.total}</td>
            <td style="text-align:center;">${w.occupied}</td>
            <td style="text-align:center;">${w.available}</td>
            <td style="text-align:center;">${w.maintenance}</td>
            <td style="text-align:center; font-weight:700; color:${w.occupancyRate >= 90 ? '#b91c1c' : w.occupancyRate >= 70 ? '#b45309' : '#0f766e'};">${w.occupancyRate}%</td>
          </tr>`;
        })
        .join('')
    : `<tr><td colspan="6" style="text-align:center;color:#94a3b8;">No ward data available.</td></tr>`);

  const bedTypeRows = (input.byBedType.length
    ? input.byBedType
        .map((t) => {
          return `<tr>
            <td>${esc(t.bedType.replace(/_/g, ' '))}</td>
            <td style="text-align:center;">${t.total}</td>
            <td style="text-align:center;">${t.occupied}</td>
            <td style="text-align:center;">${t.available}</td>
          </tr>`;
        })
        .join('')
    : `<tr><td colspan="4" style="text-align:center;color:#94a3b8;">No bed type breakdown available.</td></tr>`);

  const rangeLabel =
    input.dateRangeStart && input.dateRangeEnd
      ? `${fmtDate(input.dateRangeStart)} to ${fmtDate(input.dateRangeEnd)}`
      : fmtDate(input.generatedAt);

  const summaryCards = `
    <div style="display:grid; grid-template-columns: repeat(6, minmax(0,1fr)); gap:10px; margin-bottom:14px;">
      ${[
        { label: 'Total Beds', value: input.totalBeds, color: '#0f172a' },
        { label: 'Occupied', value: input.occupied, color: '#b45309' },
        { label: 'Available', value: input.available, color: '#0f766e' },
        { label: 'Cleaning', value: input.cleaning, color: '#a16207' },
        { label: 'Maintenance', value: input.maintenance, color: '#b91c1c' },
        { label: 'Occupancy %', value: `${input.occupancyRate}%`, color: input.occupancyRate >= 90 ? '#b91c1c' : '#0f766e' }
      ]
        .map(
          (c) =>
            `<div style="border:1px solid #e2e8f0; border-radius:6px; padding:10px; text-align:center;">
              <div style="font-size:22px; font-weight:700; color:${c.color};">${esc(String(c.value))}</div>
              <div style="font-size:9.5px; text-transform:uppercase; letter-spacing:0.5px; color:#64748b; margin-top:2px;">${esc(c.label)}</div>
            </div>`
        )
        .join('')}
    </div>
  `;

  const body = `
    <div class="patient-banner" style="grid-template-columns: repeat(3, minmax(0,1fr));">
      <div><p class="field-label">Facility</p><p class="field-value">${esc(facilityInfo.name)}</p></div>
      <div><p class="field-label">Reporting Period</p><p class="field-value">${esc(rangeLabel)}</p></div>
      <div><p class="field-label">Generated</p><p class="field-value">${fmtDateTime(input.generatedAt)}</p></div>
    </div>
    <div class="section">
      <div class="section-title">Occupancy Summary</div>
      <div class="section-body">${summaryCards}</div>
    </div>
    <div class="section">
      <div class="section-title">Breakdown by Ward</div>
      <div class="section-body">
        <table class="data">
          <thead>
            <tr><th>Ward</th><th style="text-align:center;">Total</th><th style="text-align:center;">Occupied</th><th style="text-align:center;">Available</th><th style="text-align:center;">Maintenance</th><th style="text-align:center;">Occupancy</th></tr>
          </thead>
          <tbody>${wardRows}</tbody>
        </table>
      </div>
    </div>
    <div class="section">
      <div class="section-title">Breakdown by Bed Type</div>
      <div class="section-body">
        <table class="data">
          <thead>
            <tr><th>Bed Type</th><th style="text-align:center;">Total</th><th style="text-align:center;">Occupied</th><th style="text-align:center;">Available</th></tr>
          </thead>
          <tbody>${bedTypeRows}</tbody>
        </table>
      </div>
    </div>
    <div class="section">
      <div class="section-title">Notes</div>
      <div class="section-body">
        <div class="notes">This report reflects the current bed status as of the reporting period. Occupancy rate is calculated as (Occupied / Total) × 100. Beds under maintenance and cleaning are excluded from available capacity. Please coordinate with the ward supervisor for any discrepancies.</div>
      </div>
    </div>
  `;

  return buildDocumentShell('Bed Occupancy Report', facilityInfo, body);
}
