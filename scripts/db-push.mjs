// Bismillah Ar-Rahman Ar-Raheem.
// db:push — for Lightbase, collections are created lazily on first write, so
// this is a no-op that exits successfully. For SQLite, the adapter auto-creates
// its schema on import. This stub satisfies the sandbox dev.sh pipeline.
const provider = process.env.STORAGE_PROVIDER || 'lightbase';
if (provider === 'lightbase') {
  console.log('[db:push] Lightbase mode — collections are created lazily. Nothing to push.');
} else {
  console.log('[db:push] SQLite mode — schema is auto-created on adapter import. Nothing to push.');
}
process.exit(0);
