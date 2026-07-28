// Bismillah Ar-Rahman Ar-Raheem.
// scheduler.ts (legacy compat shim).
//
// All real scheduling now happens server-side at POST /api/cron (see
// src/lib/consolidated-scheduler.ts for the new client entry point).
//
// This file is preserved as a no-op shim because some legacy imports still
// reference `backgroundScheduler` / `BackgroundScheduler` from this path.
// Method signatures are kept identical so imports continue to compile, but
// start()/stop() are no-ops and getTasks()/getStatistics() return empty.

import { startScheduler, stopScheduler } from './consolidated-scheduler';

export interface ScheduledTask {
  id: string;
  name: string;
  type: 'recurring' | 'one-time';
  frequency?: 'minute' | 'hour' | 'day' | 'week' | 'month';
  interval?: number;
  cron_expression?: string;
  execute_at?: string;
  last_run?: string;
  next_run: string;
  is_active: boolean;
  function_name: string;
  parameters?: any;
  retry_count: number;
  max_retries: number;
  created_at: string;
  updated_at: string;
}

export interface TaskExecution {
  id: string;
  task_id: string;
  started_at: string;
  completed_at?: string;
  status: 'running' | 'completed' | 'failed' | 'timeout';
  result?: any;
  error?: string;
  duration_ms?: number;
}

export class BackgroundScheduler {
  private static instance: BackgroundScheduler;
  private isRunning = false;

  static getInstance(): BackgroundScheduler {
    if (!BackgroundScheduler.instance) {
      BackgroundScheduler.instance = new BackgroundScheduler();
    }
    return BackgroundScheduler.instance;
  }

  /** @deprecated Delegates to the consolidated scheduler. */
  start(): void {
    if (this.isRunning) return;
    try {
      startScheduler();
      this.isRunning = true;
    } catch (err) {
      console.warn('[scheduler] startScheduler failed:', err);
    }
  }

  /** @deprecated Delegates to the consolidated scheduler. */
  stop(): void {
    try {
      stopScheduler();
    } catch (err) {
      console.warn('[scheduler] stopScheduler failed:', err);
    }
    this.isRunning = false;
  }

  /** @deprecated No-op. Tasks live server-side now. */
  async processTasks(): Promise<void> {
    // No-op.
  }

  /** @deprecated No-op. */
  async executeTask(_task: ScheduledTask): Promise<void> {
    // No-op.
  }

  /** @deprecated Returns an empty list. */
  getTasks(): ScheduledTask[] {
    return [];
  }

  /** @deprecated Returns undefined. */
  getTask(_taskId: string): ScheduledTask | undefined {
    return undefined;
  }

  /** @deprecated Returns false. */
  addTask(_taskData: Partial<ScheduledTask>): string {
    return '';
  }

  /** @deprecated Returns false. */
  removeTask(_taskId: string): boolean {
    return false;
  }

  /** @deprecated Returns false. */
  updateTask(_taskId: string, _updates: Partial<ScheduledTask>): boolean {
    return false;
  }

  /** @deprecated Returns a minimal stub. */
  getStatistics(): any {
    return {
      is_running: this.isRunning,
      total_tasks: 0,
      active_tasks: 0,
      failed_tasks: 0,
      task_types: { recurring: 0, one_time: 0 },
      functions: [],
    };
  }

  /** @deprecated No-op. */
  async executeTaskNow(_taskId: string): Promise<void> {
    // No-op.
  }
}

export const backgroundScheduler = BackgroundScheduler.getInstance();
