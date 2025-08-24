import { githubDB, collections } from '../database';

async function isEmpty(collection: string): Promise<boolean> {
  try {
    const items = await githubDB.find(collection as any, {} as any);
    return !items || items.length === 0;
  } catch {
    return true;
  }
}

export async function seedTimelessFacts() {
  if (!(await isEmpty(collections.timeless_facts))) return;
  const now = new Date().toISOString();

  const facts = [
    {
      title: 'Your Heart Beats ~100,000 Times a Day',
      content: 'On average, the human heart beats around 100,000 times daily—pumping about 7,500 liters of blood through ~60,000 miles of vessels.',
      category: 'anatomy',
      tags: ['cardiology','circulation','vital organs'],
      image_url: 'https://images.unsplash.com/photo-1559757175-08e7aaa2f4b6?q=80&w=1600&auto=format&fit=crop',
      status: 'published',
      featured: true,
      created_at: now,
      updated_at: now,
      author_id: 'admin',
      views: 420,
      likes: 58,
      fact_type: 'medical'
    },
    {
      title: 'The Gut Microbiome Weighs as Much as the Brain',
      content: 'Trillions of microbes in your digestive tract can weigh up to 1–2 kg total—about the same as the human brain—and influence metabolism and immunity.',
      category: 'physiology',
      tags: ['microbiome','digestion','immunity'],
      image_url: 'https://images.unsplash.com/photo-1559980195-6f22dd1b4f60?q=80&w=1600&auto=format&fit=crop',
      status: 'published',
      featured: false,
      created_at: now,
      updated_at: now,
      author_id: 'admin',
      views: 310,
      likes: 41,
      fact_type: 'wellness'
    },
    {
      title: 'Vitamin C Was Identified in 1932',
      content: 'Ascorbic acid (vitamin C) was isolated in 1928 and identified in 1932, leading to prevention of scurvy and advances in nutrition science.',
      category: 'medical-history',
      tags: ['vitamin C','history','nutrition'],
      image_url: 'https://images.unsplash.com/photo-1540148426945-6cf28a0b2c8c?q=80&w=1600&auto=format&fit=crop',
      status: 'published',
      featured: false,
      created_at: now,
      updated_at: now,
      author_id: 'admin',
      views: 265,
      likes: 33,
      fact_type: 'prevention'
    }
  ];

  for (const f of facts) await githubDB.insert(collections.timeless_facts, f as any);
}
