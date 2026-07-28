import { githubDB, collections } from '../database';

async function isEmpty(collection: string): Promise<boolean> {
  try {
    const items = await githubDB.find(collection as any, {} as any);
    return !items || items.length === 0;
  } catch {
    return true;
  }
}

export async function seedPodcasts() {
  if (!(await isEmpty(collections.podcasts))) return;
  const now = new Date();
  const episodes = [
    {
      title: 'Understanding Blood Pressure in 5 Minutes',
      description: 'What the numbers mean, how to measure at home, and quick habits to keep it healthy.',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      duration: 300,
      publishedAt: new Date(now.getTime() - 1*86400000).toISOString(),
      category: 'general',
      host: { name: 'Dr. Amina Karim', credentials: 'MD, Family Medicine' },
      transcript: 'We cover systolic vs diastolic, proper cuff sizing, and lifestyle basics...',
      tags: ['hypertension','vitals','prevention'],
      playCount: 520,
      likes: 48,
      isLive: false
    },
    {
      title: 'Mediterranean Diet Basics',
      description: 'Core foods, how to start, and budget‑friendly swaps that work anywhere.',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      duration: 305,
      publishedAt: new Date(now.getTime() - 2*86400000).toISOString(),
      category: 'nutrition',
      host: { name: 'Rahma Sule', credentials: 'RD, Clinical Dietitian' },
      transcript: 'More plants, olive oil, weekly fish, and simple shopping tips...',
      tags: ['nutrition','diabetes','meal planning'],
      playCount: 610,
      likes: 67,
      isLive: false
    },
    {
      title: 'Desk to Destress: Micro‑Walks',
      description: 'How 5–10 minute brisk walks boost mood and concentration during busy days.',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
      duration: 298,
      publishedAt: new Date(now.getTime() - 5*86400000).toISOString(),
      category: 'wellness',
      host: { name: 'Sam Okoye', credentials: 'MSc, Exercise Physiology' },
      tags: ['mental health','exercise','productivity'],
      playCount: 432,
      likes: 39,
      isLive: false
    }
  ];
  for (const ep of episodes) await githubDB.insert(collections.podcasts, ep as any);
}
