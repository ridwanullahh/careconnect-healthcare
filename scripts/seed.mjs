// Bismillah Ar-Rahman Ar-Raheem.
// db:seed — triggers the backend /api/seed endpoint to populate Lightbase with
// comprehensive seed data (admin, users, entities, HMS, content, etc.).
// Usage: bun run db:seed   (backend must be running on :4321)
const BACKEND = process.env.SEED_BACKEND || 'http://localhost:4321';
const SEED_KEY = process.env.SEED_KEY || 'cc_seed_dev_key_change_in_production';

async function main() {
  console.log(`[db:seed] triggering seed at ${BACKEND}/api/seed ...`);
  const res = await fetch(`${BACKEND}/api/seed`, {
    method: 'POST',
    headers: { 'x-seed-key': SEED_KEY, 'Content-Type': 'application/json' },
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  if (!res.ok) {
    console.error('[db:seed] FAILED:', res.status, data);
    process.exit(1);
  }
  console.log('[db:seed] success:', JSON.stringify(data, null, 2));
}

main().catch((err) => {
  console.error('[db:seed] error:', err.message);
  process.exit(1);
});
