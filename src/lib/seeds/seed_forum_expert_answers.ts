import { githubDB, collections } from '../database';
import { ForumService } from '../forum';

// Ensure each existing forum question has at least one approved expert (practitioner) answer
export async function ensureExpertAnswers() {
  try {
    const questions = await githubDB.find(collections.forum_questions, {} as any);
    for (const q of questions) {
      try {
        const existingAnswers = await githubDB.find(collections.forum_answers, { question_id: q.id } as any);
        const hasExpert = existingAnswers.some((a: any) => a.author_type === 'practitioner' || a.author_type === 'super_admin');
        if (hasExpert) {
          // Optionally ensure one accepted answer exists
          const hasAccepted = existingAnswers.some((a: any) => a.is_accepted);
          if (!hasAccepted && existingAnswers.length > 0) {
            // Accept the most liked answer
            const best = [...existingAnswers].sort((a, b) => (b.likes || 0) - (a.likes || 0))[0];
            await ForumService.acceptAnswer(best.id, q.id);
          }
          continue;
        }

        // Create an expert answer tailored loosely by category/tags
        let content = '';
        if ((q.tags || []).includes('hypertension') || q.category_name?.toLowerCase().includes('general')) {
          content = [
            'Evidence-based steps to lower blood pressure include:',
            '• 150+ minutes/week of moderate exercise (e.g., brisk walking).',
            '• Reduce sodium to <2g/day; increase potassium-rich foods if safe.',
            '• Reach/maintain a healthy weight; limit alcohol; stop smoking.',
            '• Home BP monitoring (proper cuff/positioning) to track trends.',
            'Discuss medication options with your clinician if lifestyle isn’t enough.'
          ].join('\n');
        } else if ((q.tags || []).includes('diet') || (q.tags || []).includes('nutrition') || q.category_name?.toLowerCase().includes('nutrition')) {
          content = [
            'Budget-friendly Mediterranean staples:',
            '• Beans/lentils, chickpeas; oats and brown rice.',
            '• Canned tuna/sardines; seasonal fruits/vegetables (fresh or frozen).',
            '• Olive oil (use modestly); yogurt; herbs/spices.',
            'Batch-cook beans and grains, plan simple meals, and shop store brands.'
          ].join('\n');
        } else if ((q.tags || []).includes('stress') || q.category_name?.toLowerCase().includes('mental')) {
          content = [
            'Quick, effective strategies for work-related stress:',
            '• Micro-breaks: 5–10 minute brisk walk 2–3x/day.',
            '• 2 minutes of box-breathing (4-4-4-4) before meetings.',
            '• Short exposure to cool water on face to reset; hydrate and avoid excess caffeine.',
            '• Aim for regular sleep schedule; limit late-night screens.'
          ].join('\n');
        } else {
          content = [
            'Here are general, practical steps you can apply:',
            '• Start with small, sustainable changes (habit stacking).',
            '• Track progress weekly to stay motivated.',
            '• Consult your clinician for personalized guidance.'
          ].join('\n');
        }

        const answer = await githubDB.insert(collections.forum_answers, {
          id: `answer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          question_id: q.id,
          content,
          author_id: 'expert_auto',
          author_name: 'Dr. Expert',
          author_type: 'practitioner',
          author_credentials: 'MD, Community Health',
          status: 'approved',
          is_accepted: true,
          likes: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as any);

        // Update question counts and accepted flag
        const updatedAnswers = await githubDB.find(collections.forum_answers, { question_id: q.id } as any);
        await githubDB.update(collections.forum_questions, q.id, {
          answer_count: updatedAnswers.length,
          has_accepted_answer: true,
          updated_at: new Date().toISOString()
        });
      } catch (e) {
        console.warn('Failed ensuring expert answer for question', q?.id, e);
      }
    }
  } catch (e) {
    console.warn('ensureExpertAnswers: failed to list questions', e);
  }
}
