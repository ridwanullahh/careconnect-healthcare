// Content initializer: seeds demo content for multiple sections if empty
import { seedNews, seedPodcasts, seedForum, seedCauses, seedBlogs, seedJobs, seedProducts, seedWeeklyTips, seedTimelessFacts } from './seeds';
import { ensureExpertAnswers } from './seeds/seed_forum_expert_answers';

let seededOnce = false;

export async function initializeContentSeeds() {
  if (seededOnce) return; // guard in single runtime
  seededOnce = true;
  try {
    await Promise.all([
      seedNews(),
      seedPodcasts(),
      seedForum(),
      seedCauses(),
      seedBlogs(),
      seedJobs(),
      seedProducts(),
      seedWeeklyTips(),
      seedTimelessFacts()
    ]);

    // Ensure each question has at least one expert answer (approved and accepted)
    await ensureExpertAnswers();
    // Done
  } catch (e) {
    console.warn('Content seeding encountered issues:', e);
  }
}
