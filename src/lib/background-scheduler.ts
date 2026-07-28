// Bismillah Ar-Rahman Ar-Raheem.
// background-scheduler.ts (legacy compat shim).
//
// All real scheduling now happens server-side at POST /api/cron (see
// src/lib/consolidated-scheduler.ts for the new client entry point).
//
// This file is preserved as a no-op shim because SystemInitializer (and
// possibly other older call sites) still import BackgroundScheduler. The
// method signatures are kept identical so imports continue to compile, but
// start/stop/initializeDefaultTasks are no-ops and executeTask refuses to
// run any of the legacy client-side task functions.

import { startScheduler, stopScheduler } from './consolidated-scheduler';

export interface ScheduledTask {
  id: string;
  name: string;
  type: 'recurring' | 'one_time';
  action: string;
  parameters: Record<string, any>;
  schedule: { interval?: number; cron?: string; nextRun: string };
  status: 'active' | 'paused' | 'completed' | 'failed';
  lastRun?: string;
  lastRunStatus?: 'success' | 'failed';
  failureCount: number;
  maxFailures: number;
  createdAt: string;
  updatedAt: string;
}

export class BackgroundScheduler {
  /**
   * @deprecated Real scheduling runs server-side. This now delegates to the
   * consolidated scheduler (which polls /api/cron every 5 minutes for
   * admin users).
   */
  static start(): void {
    try {
      startScheduler();
    } catch (err) {
      console.warn('[background-scheduler] startScheduler failed:', err);
    }
  }

  static stop(): void {
    try {
      stopScheduler();
    } catch (err) {
      console.warn('[background-scheduler] stopScheduler failed:', err);
    }
  }

  /** @deprecated No-op. Tasks live server-side now. */
  static async initializeDefaultTasks(): Promise<void> {
    // No-op. Server-side /api/cron is the single source of truth.
  }

  /** @deprecated No-op. */
  static async processTasks(): Promise<void> {
    // No-op.
  }

  /** @deprecated No-op. */
  static async executeTask(_task: ScheduledTask): Promise<void> {
    // No-op.
  }

  /** @deprecated No-op. Returns an empty array. */
  static async getAllTasks(): Promise<ScheduledTask[]> {
    return [];
  }

  /** @deprecated No-op. Returns a stub task object. */
  static async createTask(
    name: string,
    _action: string,
    _type: 'recurring' | 'one_time',
    schedule: ScheduledTask['schedule'],
    _parameters: Record<string, any> = {},
    _maxFailures: number = 3,
  ): Promise<ScheduledTask> {
    const now = new Date().toISOString();
    return {
      id: `task_legacy_${Date.now()}`,
      name,
      type: 'recurring',
      action: 'noop',
      parameters: {},
      schedule,
      status: 'completed',
      failureCount: 0,
      maxFailures: _maxFailures,
      createdAt: now,
      updatedAt: now,
    };
  }
}

export default BackgroundScheduler;
