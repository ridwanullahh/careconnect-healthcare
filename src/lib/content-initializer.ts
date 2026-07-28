// Content initializer: seeds demo content for multiple sections if empty.
// In backend mode (api/sqlite/lightbase), seeding is handled server-side via
// /api/seed, so the client-side seeders are skipped to avoid auth failures.
import { seedNews, seedPodcasts, seedForum, seedCauses, seedBlogs, seedJobs, seedProducts, seedWeeklyTips, seedTimelessFacts } from './seeds';
import { ensureExpertAnswers } from './seeds/seed_forum_expert_answers';

let seededOnce = false;

const DB_MODE =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_DB_MODE) || 'github';
const USE_BACKEND = DB_MODE === 'api' || DB_MODE === 'sqlite' || DB_MODE === 'lightbase';

export async function initializeContentSeeds() {
  if (seededOnce) return; // guard in single runtime
  seededOnce = true;
  if (USE_BACKEND) {
    // Backend handles seeding; nothing to do client-side.
    return;
  }
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
