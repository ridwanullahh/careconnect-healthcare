import { githubDB, collections } from '../database';

async function isEmpty(collection: string): Promise<boolean> {
  try {
    const items = await githubDB.find(collection as any, {} as any);
    return !items || items.length === 0;
  } catch {
    return true;
  }
}

export async function seedWeeklyTips() {
  if (!(await isEmpty(collections.weekly_tips))) return;
  const now = new Date();
  const week = Math.ceil(((+now - +new Date(now.getFullYear(),0,1)) / 86400000 + new Date(now.getFullYear(),0,1).getDay() + 1) / 7);
  const year = now.getFullYear();

  const tips = [
    {
      title: 'Hydration Habit: The 2‑Liter Rule (Flexible)',
      content: 'Keep a water bottle at your desk and drink regularly throughout the day. Aim for pale yellow urine as a practical hydration target.',
      category: 'wellness',
      tags: ['hydration','wellness','habits'],
      image_url: 'https://images.unsplash.com/photo-1544145945-f90425340c01?q=80&w=1600&auto=format&fit=crop',
      status: 'published',
      featured: true,
      week_number: week,
      year,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      author_id: 'admin',
      views: 210,
      likes: 24
    },
    {
      title: '10‑Minute Evening Stretch Routine',
      content: 'Loosen tight hips, back, and neck with a short guided routine before bed. Helps transition into sleep and reduces aches.',
      category: 'exercise',
      tags: ['mobility','sleep','recovery'],
      image_url: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=1600&auto=format&fit=crop',
      status: 'published',
      featured: false,
      week_number: week - 1 > 0 ? week - 1 : week,
      year,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      author_id: 'admin',
      views: 178,
      likes: 19
    },
    {
      title: 'Fiber First: Add a Fruit or Veggie to Every Meal',
      content: 'Increase fiber intake to support gut health, lower cholesterol, and improve satiety by adding a fruit or vegetable to each meal.',
      category: 'nutrition',
      tags: ['fiber','nutrition','prevention'],
      image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=1600&auto=format&fit=crop',
      status: 'published',
      featured: false,
      week_number: week - 2 > 0 ? week - 2 : week,
      year,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      author_id: 'admin',
      views: 195,
      likes: 22
    }
  ];

  for (const t of tips) await githubDB.insert(collections.weekly_tips, t as any);
}
