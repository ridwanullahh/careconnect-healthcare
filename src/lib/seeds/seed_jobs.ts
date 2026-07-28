import { githubDB, collections } from '../database';

async function isEmpty(collection: string): Promise<boolean> {
  try {
    const items = await githubDB.find(collection as any, {} as any);
    return !items || items.length === 0;
  } catch {
    return true;
  }
}

export async function seedJobs() {
  if (!(await isEmpty(collections.job_postings))) return;
  const nowStr = new Date().toISOString();
  const jobs = [
    {
      title: 'Registered Nurse (Primary Care Clinic)',
      description: 'Join a patient‑centered primary care team. Provide triage, education, immunizations, and care coordination.',
      requirements: ['RN license','1+ years clinical experience','BLS certification'],
      responsibilities: ['Room patients and document vitals','Administer vaccines per protocol','Educate on chronic disease self‑management'],
      qualifications: ['RN, ADN or BSN','Strong communication'],
      benefits: ['Health insurance','Paid time off','Professional development stipend'],
      salary_range: { min: 28, max: 36, currency: 'USD', period: 'hourly' },
      job_type: 'full_time',
      experience_level: 'mid',
      location: { type: 'on_site', city: 'Lagos', state: 'LA', country: 'Nigeria' },
      category: 'Nursing',
      specialties: ['Primary Care','Chronic Disease'],
      health_center_id: 'entity_clinic_01',
      health_center_name: 'Al‑Shifa Community Clinic',
      posted_by: 'admin_hc_01',
      status: 'published',
      admin_approved: true,
      featured: true,
      urgent: false,
      views: 214,
      applications_count: 6,
      created_at: nowStr,
      updated_at: nowStr,
      tags: ['RN','primary care','clinic'],
      contact_email: 'hr@alshifa.org'
    },
    {
      title: 'Clinical Dietitian (Outpatient)',
      description: 'Provide individualized nutrition counseling for diabetes, hypertension, and weight management.',
      requirements: ['RD credential','Experience with diabetes education'],
      responsibilities: ['1:1 consults','Group classes','Care plan documentation'],
      qualifications: ['RD, BSc Nutrition','Effective educator'],
      benefits: ['Flexible schedule','CME allowance'],
      salary_range: { min: 1800, max: 2400, currency: 'USD', period: 'monthly' },
      job_type: 'part_time',
      experience_level: 'mid',
      location: { type: 'hybrid', city: 'Nairobi', country: 'Kenya' },
      category: 'Allied Health',
      specialties: ['Nutrition','Diabetes'],
      health_center_id: 'entity_hospital_02',
      health_center_name: 'Rahma Care Hospital',
      posted_by: 'admin_hc_02',
      status: 'published',
      admin_approved: true,
      featured: false,
      urgent: true,
      views: 167,
      applications_count: 4,
      created_at: nowStr,
      updated_at: nowStr,
      tags: ['dietitian','diabetes','outpatient'],
      contact_email: 'careers@rahmacare.org'
    },
    {
      title: 'Health Informatics Analyst',
      description: 'Support data pipelines, quality dashboards, and clinical decision support tools across our care network.',
      requirements: ['SQL and dashboards','Basic HL7/FHIR knowledge'],
      responsibilities: ['ETL monitoring','KPI reporting','User support and training'],
      qualifications: ['BSc in CS/Health Informatics or equivalent'],
      benefits: ['Remote work option','Learning budget'],
      salary_range: { min: 3000, max: 4500, currency: 'USD', period: 'monthly' },
      job_type: 'full_time',
      experience_level: 'mid',
      location: { type: 'remote', country: 'Remote' },
      category: 'Technology',
      specialties: ['Data','Analytics'],
      health_center_id: 'entity_network_03',
      health_center_name: 'CareConnect Network',
      posted_by: 'admin_hc_03',
      status: 'published',
      admin_approved: true,
      featured: false,
      urgent: false,
      views: 143,
      applications_count: 3,
      created_at: nowStr,
      updated_at: nowStr,
      tags: ['informatics','data','FHIR'],
      contact_email: 'jobs@careconnect.health'
    }
  ];
  for (const j of jobs) await githubDB.insert(collections.job_postings, j as any);
}
