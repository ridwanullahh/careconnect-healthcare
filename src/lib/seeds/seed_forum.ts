import { githubDB, collections } from '../database';

async function isEmpty(collection: string): Promise<boolean> {
  try {
    const items = await githubDB.find(collection as any, {} as any);
    return !items || items.length === 0;
  } catch {
    return true;
  }
}

export async function seedForum() {
  // Ensure at least core categories exist
  const existing = await githubDB.find(collections.forum_categories, { is_active: true } as any);
  const ensure = async (name: string, description: string) => {
    const found = existing.find((c: any) => c.name === name);
    if (found) return found.id;
    const created = await githubDB.insert(collections.forum_categories, {
      id: `category_${Date.now()}_${Math.random().toString(36).slice(2,9)}`,
      name,
      description,
      icon: 'Tag',
      color: '#3B82F6',
      is_active: true,
      question_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as any);
    return created.id;
  };

  const catGeneral = await ensure('General Health', 'General health questions and concerns');
  const catNutrition = await ensure('Nutrition', 'Diet, nutrition, and healthy eating');
  const catMental = await ensure('Mental Health', 'Mental health and wellness');

  if (!(await isEmpty(collections.forum_questions))) return;

  const nowStr = new Date().toISOString();
  const q1 = await githubDB.insert(collections.forum_questions, {
    id: `question_${Date.now()}_${Math.random().toString(36).slice(2,9)}`,
    title: 'How can I lower my blood pressure naturally?',
    content: 'Which lifestyle changes (diet, exercise, sleep) have strong evidence for lowering BP? Any practical tips?',
    category_id: catGeneral,
    category_name: 'General Health',
    tags: ['hypertension', 'exercise', 'nutrition'],
    is_anonymous: false,
    author_name: 'Abdullah',
    author_type: 'public_user',
    status: 'approved',
    priority: 'high',
    views: 132,
    likes: 14,
    answer_count: 1,
    has_accepted_answer: false,
    featured: true,
    created_at: nowStr,
    updated_at: nowStr
  } as any);

  const q2 = await githubDB.insert(collections.forum_questions, {
    id: `question_${Date.now()}_${Math.random().toString(36).slice(2,9)}`,
    title: 'Affordable Mediterranean diet staples?',
    content: 'I want to try the Mediterranean diet on a budget. Which affordable foods should I focus on weekly?',
    category_id: catNutrition,
    category_name: 'Nutrition',
    tags: ['diet', 'budget', 'meal planning'],
    is_anonymous: true,
    author_name: 'Anonymous',
    author_type: 'anonymous',
    status: 'approved',
    priority: 'medium',
    views: 89,
    likes: 9,
    answer_count: 1,
    has_accepted_answer: false,
    featured: false,
    created_at: nowStr,
    updated_at: nowStr
  } as any);

  const q3 = await githubDB.insert(collections.forum_questions, {
    id: `question_${Date.now()}_${Math.random().toString(36).slice(2,9)}`,
    title: 'Quick strategies for work‑related stress?',
    content: 'What fast, evidence‑based habits help with afternoon focus when the day gets intense?',
    category_id: catMental,
    category_name: 'Mental Health',
    tags: ['stress', 'productivity', 'sleep'],
    is_anonymous: false,
    author_name: 'Maryam',
    author_type: 'public_user',
    status: 'approved',
    priority: 'urgent',
    views: 205,
    likes: 21,
    answer_count: 2,
    has_accepted_answer: false,
    featured: true,
    created_at: nowStr,
    updated_at: nowStr
  } as any);

  // Answers
  await githubDB.insert(collections.forum_answers, {
    id: `answer_${Date.now()}_${Math.random().toString(36).slice(2,9)}`,
    question_id: q1.id,
    content: 'Start with 150 min/week brisk walking, reduce sodium to <2g/day, add potassium‑rich foods if safe, maintain healthy weight, and limit alcohol.',
    author_id: 'admin',
    author_name: 'Dr. Nasir',
    author_type: 'practitioner',
    author_credentials: 'MD, Internal Medicine',
    status: 'approved',
    is_accepted: false,
    likes: 7,
    created_at: nowStr,
    updated_at: nowStr
  } as any);

  await githubDB.insert(collections.forum_answers, {
    id: `answer_${Date.now()}_${Math.random().toString(36).slice(2,9)}`,
    question_id: q2.id,
    content: 'Beans, lentils, canned tuna/sardines, oats, brown rice, frozen veg, seasonal fruit, and olive oil. Batch‑cook simple meals.',
    author_id: 'admin',
    author_name: 'Rahma Sule',
    author_type: 'practitioner',
    author_credentials: 'RD, Clinical Dietitian',
    status: 'approved',
    is_accepted: false,
    likes: 5,
    created_at: nowStr,
    updated_at: nowStr
  } as any);

  await githubDB.insert(collections.forum_answers, {
    id: `answer_${Date.now()}_${Math.random().toString(36).slice(2,9)}`,
    question_id: q3.id,
    content: 'Add 5–10 minute brisk walks, 2 minutes box‑breathing (4‑4‑4‑4) before meetings, and brief cold water face splash to reset.',
    author_id: 'admin',
    author_name: 'Sam Okoye',
    author_type: 'practitioner',
    author_credentials: 'MSc, Exercise Physiology',
    status: 'approved',
    is_accepted: false,
    likes: 6,
    created_at: nowStr,
    updated_at: nowStr
  } as any);
}
