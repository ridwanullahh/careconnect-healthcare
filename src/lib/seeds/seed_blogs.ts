import { githubDB, collections } from '../database';

async function isEmpty(collection: string): Promise<boolean> {
  try {
    const items = await githubDB.find(collection as any, {} as any);
    return !items || items.length === 0;
  } catch {
    return true;
  }
}

export async function seedBlogs() {
  if (!(await isEmpty(collections.blog_posts))) return;
  const now = new Date();
  const posts = [
    {
      title: '7 Proven Ways to Improve Sleep Quality',
      excerpt: 'Simple, evidence‑based steps to fall asleep faster and wake up refreshed.',
      content: 'Getting better sleep starts with consistent routines. Keep a fixed schedule, get morning sunlight, avoid late caffeine, exercise regularly, and use a relaxing wind‑down routine. If insomnia persists, consult a clinician to rule out sleep apnea or other conditions.',
      author: { name: 'Dr. Layla Hassan', credentials: 'MD, Sleep Medicine' },
      category: 'wellness',
      tags: ['sleep','mental health','habits'],
      featuredImage: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?q=80&w=1600&auto=format&fit=crop',
      readTime: 6,
      views: 980,
      likes: 120,
      commentsCount: 8,
      isFeatured: true,
      publishedAt: new Date(now.getTime() - 1*86400000).toISOString()
    },
    {
      title: 'Beginner’s Guide to Home Blood Pressure Monitoring',
      excerpt: 'Accurate readings depend on proper technique—learn how to choose a cuff and position your arm.',
      content: 'Use an upper‑arm cuff that fits. Sit with back supported, feet on the floor, arm at heart level. Rest quietly 5 minutes before measuring. Take two readings 1 minute apart and log the average.',
      author: { name: 'CareConnect Editorial' },
      category: 'prevention',
      tags: ['hypertension','home monitoring'],
      featuredImage: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?q=80&w=1600&auto=format&fit=crop',
      readTime: 5,
      views: 730,
      likes: 85,
      commentsCount: 3,
      isFeatured: false,
      publishedAt: new Date(now.getTime() - 2*86400000).toISOString()
    },
    {
      title: '5 Affordable Mediterranean Meals for Busy Weeks',
      excerpt: 'Nutritious, budget‑friendly recipes built around beans, grains, and seasonal produce.',
      content: 'Try chickpea tomato stew, tuna‑white bean salad, lentil soup, brown rice with roasted vegetables, and yogurt parfait with fruit and nuts. Batch‑cook beans and grains for easy assembly.',
      author: { name: 'Rahma Sule', credentials: 'RD, Clinical Dietitian' },
      category: 'nutrition',
      tags: ['meal planning','budget','recipes'],
      featuredImage: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1600&auto=format&fit=crop',
      readTime: 7,
      views: 1040,
      likes: 134,
      commentsCount: 12,
      isFeatured: false,
      publishedAt: new Date(now.getTime() - 5*86400000).toISOString()
    }
  ];
  for (const p of posts) await githubDB.insert(collections.blog_posts, p as any);
}
