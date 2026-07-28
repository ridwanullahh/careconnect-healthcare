// Bismillah Ar-Rahman Ar-Raheem.
// Consolidated client-side scheduler for CareConnect.
//
// Replaces the three legacy schedulers (src/lib/scheduler.ts,
// src/lib/schedulers.ts daemon, src/lib/background-scheduler.ts).
//
// All real work happens server-side at POST /api/cron (protected by
// SEED_KEY). This module:
//   - Polls /api/cron every 5 minutes, but ONLY when the current user is
//     a super_admin (so patient/public sessions don't burn cycles or
//     expose the seed key unnecessarily).
//   - Falls back gracefully when no SEED_KEY is configured in the client
//     bundle (VITE_SEED_KEY). In that case cron is expected to be triggered
//     externally — see the `cron:run` script in package.json.
//   - Also exposes `runCronOnce()` for ad-hoc / button-triggered runs.
//
// The frontend never sends emails itself; it just kicks the backend.
import { useAuth } from './auth';

const API_BASE =
  (typeof import.meta !== 'undefined' &&
    (import.meta as any).env?.VITE_API_BASE_URL) ||
  'http://localhost:4321/api';

// Optional client-side seed key for admin-driven polling. If unset, polling
// is a no-op (cron must be triggered externally).
const CLIENT_SEED_KEY =
  (typeof import.meta !== 'undefined' &&
    (import.meta as any).env?.VITE_SEED_KEY) ||
  '';

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export interface CronSummary {
  emails: { sent: number; failed: number };
  reminders: { booking: number; verification: number; newsletter: number };
  errors?: string[];
  ran_at?: string;
}

let intervalId: ReturnType<typeof setInterval> | null = null;
let running = false;
let lastResult: CronSummary | null = null;
let lastError: string | null = null;
let lastRunAt: number | null = null;

const listeners = new Set<(summary: CronSummary | null) => void>();

function notify(): void {
  for (const fn of listeners) {
    try {
      fn(lastResult);
    } catch {
      /* ignore listener errors */
    }
  }
}

function isAdminUser(): boolean {
  const { user } = useAuth.getState();
  if (!user) return false;
  return (
    user.user_type === 'super_admin' ||
    (Array.isArray(user.permissions) &&
      (user.permissions as string[]).includes('*'))
  );
}

/**
 * Call the backend /api/cron endpoint once. Returns the summary or throws.
 * Safe to call from anywhere (button, scheduler tick, dev console).
 */
export async function runCronOnce(): Promise<CronSummary> {
  if (!CLIENT_SEED_KEY) {
    throw new Error(
      'VITE_SEED_KEY is not configured on the client. Trigger cron externally (see package.json cron:run).',
    );
  }
  if (running) {
    if (lastResult) return lastResult;
    throw new Error('Cron already running');
  }
  running = true;
  try {
    const res = await fetch(`${API_BASE}/cron`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-seed-key': CLIENT_SEED_KEY,
      },
    });
    const body = await res.json();
    if (!res.ok) {
      throw new Error(body?.error || `Cron failed: HTTP ${res.status}`);
    }
    lastResult = (body?.data || body) as CronSummary;
    lastError = null;
    lastRunAt = Date.now();
    notify();
    return lastResult;
  } catch (err: any) {
    lastError = err?.message || String(err);
    // Don't clear lastResult; keep the previous summary.
    throw err;
  } finally {
    running = false;
  }
}

/**
 * Start the 5-minute polling loop. Only runs cron ticks when the current
 * user is an admin. If the user logs out or becomes a non-admin, ticks are
 * skipped automatically (no need to stop/restart on role change).
 *
 * Safe to call multiple times — only the first call starts the interval.
 */
export function startScheduler(): void {
  if (intervalId !== null) return;
  if (typeof window === 'undefined') return;

  // Initial tick (deferred so it doesn't block app init).
  setTimeout(() => {
    if (!isAdminUser()) return;
    runCronOnce().catch((err) => {
      console.warn('[consolidated-scheduler] initial cron tick failed:', err?.message || err);
    });
  }, 10_000);

  intervalId = setInterval(() => {
    if (!isAdminUser()) return;
    runCronOnce().catch((err) => {
      console.warn('[consolidated-scheduler] cron tick failed:', err?.message || err);
    });
  }, POLL_INTERVAL_MS);

  console.log(
    `[consolidated-scheduler] started (polling every ${POLL_INTERVAL_MS / 1000}s for admin users)`,
  );
}

/** Stop the polling loop (called on logout / teardown). */
export function stopScheduler(): void {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[consolidated-scheduler] stopped');
  }
}

/** Subscribe to cron result updates. Returns an unsubscribe fn. */
export function subscribe(fn: (summary: CronSummary | null) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getLastResult(): CronSummary | null {
  return lastResult;
}

export function getLastError(): string | null {
  return lastError;
}

export function getLastRunAt(): number | null {
  return lastRunAt;
}

export function isRunning(): boolean {
  return running;
}

/** Whether the client bundle has a seed key configured (i.e. can poll). */
export function isClientCronEnabled(): boolean {
  return !!CLIENT_SEED_KEY;
}

export default {
  startScheduler,
  stopScheduler,
  runCronOnce,
  subscribe,
  getLastResult,
  getLastError,
  getLastRunAt,
  isRunning,
  isClientCronEnabled,
};
