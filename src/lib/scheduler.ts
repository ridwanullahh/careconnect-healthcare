// Background Task Scheduler for CareConnect Platform
import { logger } from './observability';
import { CompleteBookingService } from './booking-complete';
import { EnhancedNewsService } from './news-enhanced';
import { EnhancedCausesService } from './causes-enhanced';
import { VerificationService } from './verification';
import { EnhancedPaymentService } from './payments-enhanced';

export interface ScheduledTask {
  id: string;
  name: string;
  type: 'recurring' | 'one-time';
  frequency?: 'minute' | 'hour' | 'day' | 'week' | 'month';
  interval?: number; // For recurring tasks
  cron_expression?: string; // Alternative to frequency/interval
  execute_at?: string; // For one-time tasks
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
  private intervalId?: number;
  private tasks: Map<string, ScheduledTask> = new Map();

  private constructor() {
    this.initializeDefaultTasks();
  }

  public static getInstance(): BackgroundScheduler {
    if (!BackgroundScheduler.instance) {
      BackgroundScheduler.instance = new BackgroundScheduler();
    }
    return BackgroundScheduler.instance;
  }

  // Initialize default system tasks
  private initializeDefaultTasks(): void {
    const defaultTasks: Partial<ScheduledTask>[] = [
      {
        name: 'Process Booking Reminders',
        type: 'recurring',
        frequency: 'hour',
        interval: 1,
        function_name: 'processBookingReminders',
        max_retries: 3
      },
      {
        name: 'Fetch Latest News',
        type: 'recurring',
        frequency: 'hour',
        interval: 6,
        function_name: 'fetchLatestNews',
        max_retries: 2
      },
      {
        name: 'Send Daily Newsletter',
        type: 'recurring',
        frequency: 'day',
        interval: 1,
        function_name: 'sendDailyNewsletter',
        parameters: { frequency: 'daily' },
        max_retries: 3
      },
      {
        name: 'Send Weekly Newsletter',
        type: 'recurring',
        frequency: 'week',
        interval: 1,
        function_name: 'sendWeeklyNewsletter',
        parameters: { frequency: 'weekly' },
        max_retries: 3
      },
      {
        name: 'Send Monthly Newsletter',
        type: 'recurring',
        frequency: 'month',
        interval: 1,
        function_name: 'sendMonthlyNewsletter',
        parameters: { frequency: 'monthly' },
        max_retries: 3
      },
      {
        name: 'Send Cause Updates',
        type: 'recurring',
        frequency: 'day',
        interval: 1,
        function_name: 'sendCauseUpdates',
        max_retries: 2
      },
      {
        name: 'Send Re-verification Reminders',
        type: 'recurring',
        frequency: 'day',
        interval: 1,
        function_name: 'sendReVerificationReminders',
        max_retries: 2
      },
      {
        name: 'Cleanup Expired Payment Intents',
        type: 'recurring',
        frequency: 'hour',
        interval: 6,
        function_name: 'cleanupExpiredPayments',
        max_retries: 1
      },
      {
        name: 'System Health Check',
        type: 'recurring',
        frequency: 'minute',
        interval: 5,
        function_name: 'systemHealthCheck',
        max_retries: 1
      }
    ];

    defaultTasks.forEach(taskData => {
      const task: ScheduledTask = {
        id: crypto.randomUUID(),
        name: taskData.name!,
        type: taskData.type!,
        frequency: taskData.frequency,
        interval: taskData.interval,
        next_run: this.calculateNextRun(taskData as ScheduledTask),
        is_active: true,
        function_name: taskData.function_name!,
        parameters: taskData.parameters,
        retry_count: 0,
        max_retries: taskData.max_retries || 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      this.tasks.set(task.id, task);
    });
  }

  // Start the scheduler
  public start(): void {
    if (this.isRunning) {
      console.log('Scheduler is already running');
      return;
    }

    this.isRunning = true;
    console.log('Background scheduler started');

    // Run scheduler every minute
    this.intervalId = window.setInterval(() => {
      this.processTasks();
    }, 60000); // 1 minute

    // Initial run
    this.processTasks();
  }

  // Stop the scheduler
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.isRunning = false;
    console.log('Background scheduler stopped');
  }

  // Process due tasks
  private async processTasks(): Promise<void> {
    const now = new Date();

    for (const [taskId, task] of this.tasks) {
      if (!task.is_active) continue;

      const nextRunTime = new Date(task.next_run);
      if (now >= nextRunTime) {
        await this.executeTask(task);
      }
    }
  }

  // Execute a single task
  private async executeTask(task: ScheduledTask): Promise<void> {
    const execution: TaskExecution = {
      id: crypto.randomUUID(),
      task_id: task.id,
      started_at: new Date().toISOString(),
      status: 'running'
    };

    try {
      await logger.info('task_execution_started', 'Task execution started', {
        task_id: task.id,
        task_name: task.name,
        function_name: task.function_name
      });

      const startTime = Date.now();

      // Execute the task function
      const result = await this.callTaskFunction(task.function_name, task.parameters);

      const endTime = Date.now();
      execution.completed_at = new Date().toISOString();
      execution.status = 'completed';
      execution.result = result;
      execution.duration_ms = endTime - startTime;

      // Update task for next run
      task.last_run = new Date().toISOString();
      task.next_run = this.calculateNextRun(task);
      task.retry_count = 0; // Reset retry count on success

      await logger.info('task_execution_completed', 'Task execution completed', {
        task_id: task.id,
        task_name: task.name,
        duration_ms: execution.duration_ms,
        result: result
      });

    } catch (error) {
      execution.completed_at = new Date().toISOString();
      execution.status = 'failed';
      execution.error = error.message;

      // Handle retries
      task.retry_count++;
      if (task.retry_count >= task.max_retries) {
        // Max retries reached, schedule for next regular interval
        task.next_run = this.calculateNextRun(task);
        task.retry_count = 0;
      } else {
        // Retry in 5 minutes
        task.next_run = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      }

      await logger.error('task_execution_failed', 'Task execution failed', {
        task_id: task.id,
        task_name: task.name,
        error: error.message,
        retry_count: task.retry_count,
        max_retries: task.max_retries
      });
    }

    // Update task in memory (in production, persist to database)
    this.tasks.set(task.id, task);
  }

  // Call the appropriate task function
  private async callTaskFunction(functionName: string, parameters?: any): Promise<any> {
    switch (functionName) {
      case 'processBookingReminders':
        return await CompleteBookingService.processScheduledReminders();

      case 'fetchLatestNews':
        return await EnhancedNewsService.fetchLatestNews();

      case 'sendDailyNewsletter':
        return await EnhancedNewsService.sendNewsletterDigest('daily');

      case 'sendWeeklyNewsletter':
        return await EnhancedNewsService.sendNewsletterDigest('weekly');

      case 'sendMonthlyNewsletter':
        return await EnhancedNewsService.sendNewsletterDigest('monthly');

      case 'sendCauseUpdates':
        return await EnhancedCausesService.sendMonthlyUpdates();

      case 'sendReVerificationReminders':
        return await VerificationService.sendReVerificationReminders();

      case 'cleanupExpiredPayments':
        return await EnhancedPaymentService.cleanupExpiredIntents();

      case 'systemHealthCheck':
        return await this.performSystemHealthCheck();

      default:
        throw new Error(`Unknown task function: ${functionName}`);
    }
  }

  // Calculate next run time for a task
  private calculateNextRun(task: ScheduledTask): string {
    const now = new Date();
    let nextRun = new Date(now);

    if (task.type === 'one-time') {
      return task.execute_at || now.toISOString();
    }

    // For recurring tasks
    switch (task.frequency) {
      case 'minute':
        nextRun.setMinutes(nextRun.getMinutes() + (task.interval || 1));
        break;
      case 'hour':
        nextRun.setHours(nextRun.getHours() + (task.interval || 1));
        break;
      case 'day':
        nextRun.setDate(nextRun.getDate() + (task.interval || 1));
        // Set to specific time if needed (e.g., 8 AM for newsletters)
        if (task.function_name.includes('Newsletter')) {
          nextRun.setHours(8, 0, 0, 0);
        }
        break;
      case 'week':
        nextRun.setDate(nextRun.getDate() + (7 * (task.interval || 1)));
        // Set to Monday morning for weekly tasks
        const dayOfWeek = nextRun.getDay();
        const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
        nextRun.setDate(nextRun.getDate() + daysUntilMonday);
        nextRun.setHours(8, 0, 0, 0);
        break;
      case 'month':
        nextRun.setMonth(nextRun.getMonth() + (task.interval || 1));
        // Set to first day of month for monthly tasks
        nextRun.setDate(1);
        nextRun.setHours(8, 0, 0, 0);
        break;
    }

    return nextRun.toISOString();
  }

  // Add a new task
  public addTask(taskData: Partial<ScheduledTask>): string {
    const task: ScheduledTask = {
      id: crypto.randomUUID(),
      name: taskData.name || 'Unnamed Task',
      type: taskData.type || 'one-time',
      frequency: taskData.frequency,
      interval: taskData.interval,
      cron_expression: taskData.cron_expression,
      execute_at: taskData.execute_at,
      next_run: taskData.next_run || this.calculateNextRun(taskData as ScheduledTask),
      is_active: taskData.is_active ?? true,
      function_name: taskData.function_name || '',
      parameters: taskData.parameters,
      retry_count: 0,
      max_retries: taskData.max_retries || 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.tasks.set(task.id, task);
    return task.id;
  }

  // Remove a task
  public removeTask(taskId: string): boolean {
    return this.tasks.delete(taskId);
  }

  // Get all tasks
  public getTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  // Get task by ID
  public getTask(taskId: string): ScheduledTask | undefined {
    return this.tasks.get(taskId);
  }

  // Update task
  public updateTask(taskId: string, updates: Partial<ScheduledTask>): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    const updatedTask = {
      ...task,
      ...updates,
      updated_at: new Date().toISOString()
    };

    // Recalculate next run if schedule changed
    if (updates.frequency || updates.interval || updates.type) {
      updatedTask.next_run = this.calculateNextRun(updatedTask);
    }

    this.tasks.set(taskId, updatedTask);
    return true;
  }

  // Perform system health check
  private async performSystemHealthCheck(): Promise<any> {
    const healthStatus = {
      timestamp: new Date().toISOString(),
      scheduler_active: this.isRunning,
      active_tasks: Array.from(this.tasks.values()).filter(task => task.is_active).length,
      total_tasks: this.tasks.size,
      memory_usage: this.getMemoryUsage(),
      uptime: this.getUptime()
    };

    // Log health status
    await logger.info('system_health_check', 'System health check completed', healthStatus);

    return healthStatus;
  }

  // Get memory usage (simplified)
  private getMemoryUsage(): any {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      return {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
      };
    }
    return { used: 0, total: 0, limit: 0 };
  }

  // Get uptime (simplified)
  private getUptime(): number {
    return typeof performance !== 'undefined' ? Math.round(performance.now() / 1000) : 0;
  }

  // Manual task execution (for testing/debugging)
  public async executeTaskNow(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    await this.executeTask(task);
  }

  // Get scheduler statistics
  public getStatistics(): any {
    const tasks = Array.from(this.tasks.values());
    const activeTasks = tasks.filter(task => task.is_active);
    const failedTasks = tasks.filter(task => task.retry_count > 0);

    return {
      is_running: this.isRunning,
      total_tasks: tasks.length,
      active_tasks: activeTasks.length,
      failed_tasks: failedTasks.length,
      next_task_run: Math.min(...activeTasks.map(task => new Date(task.next_run).getTime())),
      task_types: {
        recurring: tasks.filter(task => task.type === 'recurring').length,
        one_time: tasks.filter(task => task.type === 'one-time').length
      },
      functions: [...new Set(tasks.map(task => task.function_name))]
    };
  }
}

// Export singleton instance
export const backgroundScheduler = BackgroundScheduler.getInstance();