import { githubDB, collections } from '../database';

async function isEmpty(collection: string): Promise<boolean> {
  try {
    const items = await githubDB.find(collection as any, {} as any);
    return !items || items.length === 0;
  } catch {
    return true;
  }
}

export async function seedNews() {
  if (!(await isEmpty(collections.news_articles))) return;
  const now = new Date();
  const articles = [
    {
      title: 'WHO Updates Hypertension Guidelines',
      excerpt: 'New guidance emphasizes home monitoring, lifestyle change, and simplified treatment pathways.',
      content: 'The World Health Organization released updated recommendations for the detection and management of hypertension. The guidance encourages home blood pressure monitoring, increased physical activity, reduced sodium intake, and early pharmacologic therapy for high‑risk patients. Health systems are urged to standardize tracking and enable affordable access to medications.',
      source: 'WHO',
      source_url: 'https://www.who.int/',
      image_url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1600&auto=format&fit=crop',
      published_at: new Date(now.getTime() - 1*86400000).toISOString(),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      category: 'medical_research',
      tags: ['hypertension','cardiology','primary care'],
      ai_summary: 'WHO hypertension update: promote home BP checks, lifestyle changes, and simplified treatment—especially in low‑resource settings.',
      status: 'published',
      featured: true,
      views: 1200,
      likes: 90,
      is_ai_generated: false,
      admin_approved: true,
      author_name: 'CareConnect Editorial'
    },
    {
      title: 'Mediterranean Diet Lowers Diabetes Risk',
      excerpt: 'Prospective cohort shows significantly lower incidence of type 2 diabetes with better adherence.',
      content: 'A large multi‑center cohort found that participants following a Mediterranean diet—olive oil, legumes, whole grains, fruits, vegetables, and fish—had reduced risk of type 2 diabetes after 10 years. Proposed mechanisms include improved insulin sensitivity and anti‑inflammatory effects.',
      source: 'Journal of Nutrition & Metabolism',
      source_url: 'https://example.org/jnm',
      image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=1600&auto=format&fit=crop',
      published_at: new Date(now.getTime() - 3*86400000).toISOString(),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      category: 'nutrition',
      tags: ['nutrition','diabetes','prevention'],
      ai_summary: 'Mediterranean diet may reduce diabetes risk via insulin sensitivity and anti‑inflammatory pathways.',
      status: 'published',
      featured: false,
      views: 980,
      likes: 75,
      is_ai_generated: false,
      admin_approved: true,
      author_name: 'CareConnect Nutrition Team'
    },
    {
      title: 'Short Brisk Walks Improve Focus and Mood',
      excerpt: 'Multiple 5–10 minute walks during the workday improve attention and reduce stress.',
      content: 'A randomized crossover trial showed that brief walking breaks improved mood and sustained attention for up to two hours. Employers can schedule 2–3 micro‑activity breaks to support mental wellness without gym time.',
      source: 'American College of Sports Medicine',
      source_url: 'https://www.acsm.org/',
      image_url: 'https://images.unsplash.com/photo-1549576490-b0b4831ef60a?q=80&w=1600&auto=format&fit=crop',
      published_at: new Date(now.getTime() - 7*86400000).toISOString(),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      category: 'wellness',
      tags: ['exercise','mental health','workplace'],
      ai_summary: '5–10 minute brisk walks boost mood and attention—simple, accessible workplace strategy.',
      status: 'published',
      featured: false,
      views: 1320,
      likes: 102,
      is_ai_generated: false,
      admin_approved: true,
      author_name: 'CareConnect Wellness'
    }
  ];
  for (const a of articles) await githubDB.insert(collections.news_articles, a as any);
}
