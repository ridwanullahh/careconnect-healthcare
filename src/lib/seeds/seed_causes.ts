import { githubDB, collections } from '../database';

async function isEmpty(collection: string): Promise<boolean> {
  try {
    const items = await githubDB.find(collection as any, {} as any);
    return !items || items.length === 0;
  } catch {
    return true;
  }
}

export async function seedCauses() {
  if (!(await isEmpty(collections.causes))) return;
  const now = new Date();
  const addDays = (d: number) => new Date(now.getTime() + d*86400000).toISOString();
  const causes = [
    {
      title: 'Free Blood Pressure Screening in Rural Clinics',
      description: 'Month‑long community program providing free BP checks, education, and referrals in underserved villages.',
      category: 'public_health',
      entity_id: 'entity_clinic_01',
      goal_amount: 5000,
      raised_amount: 1850,
      current_amount: 1850,
      supporters_count: 42,
      status: 'active',
      days_left: 18,
      end_date: addDays(18),
      is_active: true
    },
    {
      title: 'Diabetes Nutrition Starter Kits for Families',
      description: 'Provide 100 families with glucose meters, test strips, and culturally relevant meal planning guides for 3 months.',
      category: 'nutrition',
      entity_id: 'entity_ngo_02',
      goal_amount: 8000,
      raised_amount: 3200,
      current_amount: 3200,
      supporters_count: 58,
      status: 'active',
      days_left: 27,
      end_date: addDays(27),
      is_active: true
    },
    {
      title: 'Mental Health First Aid Training for Teachers',
      description: 'Train 150 teachers to identify early signs of anxiety/depression and provide safe referrals for students.',
      category: 'mental_health',
      entity_id: 'entity_school_03',
      goal_amount: 12000,
      raised_amount: 5400,
      current_amount: 5400,
      supporters_count: 91,
      status: 'active',
      days_left: 35,
      end_date: addDays(35),
      is_active: true
    }
  ];
  for (const c of causes) await githubDB.insert(collections.causes, c as any);
}
