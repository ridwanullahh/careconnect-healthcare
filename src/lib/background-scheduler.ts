// Background Scheduler for Client-Side Tasks
import { githubDB, collections } from './database';
import NotificationService from './notifications-enhanced';
import VerificationService from './verification';
import EnhancedBookingService from './booking-enhanced';
import NewsService from './news-enhanced';
import CrowdfundingService from './crowdfunding-enhanced';

export interface ScheduledTask {
  id: string;
  name: string;
  type: 'recurring' | 'one_time';
  action: string;
  parameters: Record<string, any>;
  schedule: {
    interval?: number; // minutes for recurring tasks
    cron?: string; // cron expression
    nextRun: string;
  };
  status: 'active' | 'paused' | 'completed' | 'failed';
  lastRun?: string;
  lastRunStatus?: 'success' | 'failed';
  failureCount: number;
  maxFailures: number;
  createdAt: string;
  updatedAt: string;
}

export class BackgroundScheduler {
  private static isRunning = false;
  private static intervalId: NodeJS.Timeout | null = null;

  // Start the background scheduler
  static start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log('Background scheduler started');

    // Run every minute
    this.intervalId = setInterval(() => {
      this.processTasks().catch(error => {
        console.error('Error processing scheduled tasks:', error);
      });
    }, 60000); // 60 seconds

    // Run immediately on start
    this.processTasks().catch(error => {
      console.error('Error processing initial scheduled tasks:', error);
    });
  }

  // Stop the background scheduler
  static stop(): void {
    if (!this.isRunning) return;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    console.log('Background scheduler stopped');
  }

  // Process all due tasks
  static async processTasks(): Promise<void> {
    try {
      const now = new Date().toISOString();
      
      // Get all active tasks that are due
      const dueTasks = await githubDB.findMany(collections.analytics_events, {
        action: 'scheduled_task',
        'data.status': 'active',
        'data.schedule.nextRun': { $lte: now }
      });

      for (const taskEvent of dueTasks) {
        const task = taskEvent.data as ScheduledTask;
        await this.executeTask(task);
      }

    } catch (error) {
      console.error('Error processing scheduled tasks:', error);
    }
  }

  // Execute a specific task
  static async executeTask(task: ScheduledTask): Promise<void> {
    try {
      console.log(`Executing task: ${task.name} (${task.action})`);

      let success = false;

      switch (task.action) {
        case 'process_reminders':
          await EnhancedBookingService.processDueReminders();
          success = true;
          break;

        case 'cleanup_expired_locks':
          await EnhancedBookingService.cleanupExpiredLocks();
          success = true;
          break;

        case 'process_scheduled_notifications':
          await NotificationService.processScheduledNotifications();
          success = true;
          break;

        case 'verification_reminders':
          await VerificationService.scheduleReVerificationReminders();
          success = true;
          break;

        case 'fetch_news':
          await NewsService.fetchAllNews();
          success = true;
          break;

        case 'generate_daily_digest':
          const dailyDigest = await NewsService.generateNewsletterDigest('daily');
          await NewsService.sendNewsletterDigest(dailyDigest, 'daily');
          success = true;
          break;

        case 'generate_weekly_digest':
          const weeklyDigest = await NewsService.generateNewsletterDigest('weekly');
          await NewsService.sendNewsletterDigest(weeklyDigest, 'weekly');
          success = true;
          break;

        case 'generate_monthly_digest':
          const monthlyDigest = await NewsService.generateNewsletterDigest('monthly');
          await NewsService.sendNewsletterDigest(monthlyDigest, 'monthly');
          success = true;
          break;

        case 'crowdfunding_reminders':
          await CrowdfundingService.scheduleMonthlyUpdateReminders();
          success = true;
          break;

        case 'cleanup_old_notifications':
          await this.cleanupOldNotifications();
          success = true;
          break;

        case 'backup_database':
          await this.performDatabaseBackup();
          success = true;
          break;

        default:
          console.warn(`Unknown task action: ${task.action}`);
          success = false;
      }

      // Update task status
      await this.updateTaskAfterExecution(task, success);

    } catch (error) {
      console.error(`Error executing task ${task.name}:`, error);
      await this.updateTaskAfterExecution(task, false, error.message);
    }
  }

  // Update task after execution
  static async updateTaskAfterExecution(
    task: ScheduledTask,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    const now = new Date();
    
    const updates: Partial<ScheduledTask> = {
      lastRun: now.toISOString(),
      lastRunStatus: success ? 'success' : 'failed',
      updatedAt: now.toISOString()
    };

    if (success) {
      updates.failureCount = 0;
      
      // Calculate next run time
      if (task.type === 'recurring') {
        if (task.schedule.interval) {
          const nextRun = new Date(now.getTime() + task.schedule.interval * 60 * 1000);
          updates.schedule = {
            ...task.schedule,
            nextRun: nextRun.toISOString()
          };
        } else if (task.schedule.cron) {
          // For cron expressions, we'd need a cron parser library
          // For now, we'll use interval-based scheduling
          const nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Default 24 hours
          updates.schedule = {
            ...task.schedule,
            nextRun: nextRun.toISOString()
          };
        }
      } else {
        // One-time task completed
        updates.status = 'completed';
      }
    } else {
      updates.failureCount = (task.failureCount || 0) + 1;
      
      // If max failures reached, pause the task
      if (updates.failureCount >= task.maxFailures) {
        updates.status = 'failed';
        
        // Create alert notification
        await NotificationService.createNotification(
          'admin',
          'task_failed',
          'Scheduled Task Failed',
          `Task "${task.name}" has failed ${task.maxFailures} times and has been disabled.`,
          { taskId: task.id, errorMessage },
          'high'
        );
      } else {
        // Retry with exponential backoff
        const retryDelay = Math.min(60 * Math.pow(2, updates.failureCount), 24 * 60); // Max 24 hours
        const nextRun = new Date(now.getTime() + retryDelay * 60 * 1000);
        updates.schedule = {
          ...task.schedule,
          nextRun: nextRun.toISOString()
        };
      }
    }

    // Update the task in database
    const taskEvents = await githubDB.findMany(collections.analytics_events, {
      action: 'scheduled_task',
      'data.id': task.id
    });

    if (taskEvents.length > 0) {
      await githubDB.update(collections.analytics_events, taskEvents[0].id, {
        data: { ...task, ...updates },
        timestamp: now.toISOString()
      });
    }
  }

  // Create a new scheduled task
  static async createTask(
    name: string,
    action: string,
    type: 'recurring' | 'one_time',
    schedule: ScheduledTask['schedule'],
    parameters: Record<string, any> = {},
    maxFailures: number = 3
  ): Promise<ScheduledTask> {
    const task: ScheduledTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      type,
      action,
      parameters,
      schedule,
      status: 'active',
      failureCount: 0,
      maxFailures,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await githubDB.create(collections.analytics_events, {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action: 'scheduled_task',
      entityType: 'task',
      entityId: task.id,
      data: task,
      timestamp: new Date().toISOString()
    });

    return task;
  }

  // Initialize default scheduled tasks
  static async initializeDefaultTasks(): Promise<void> {
    const defaultTasks = [
      {
        name: 'Process Booking Reminders',
        action: 'process_reminders',
        interval: 5 // Every 5 minutes
      },
      {
        name: 'Cleanup Expired Slot Locks',
        action: 'cleanup_expired_locks',
        interval: 15 // Every 15 minutes
      },
      {
        name: 'Process Scheduled Notifications',
        action: 'process_scheduled_notifications',
        interval: 10 // Every 10 minutes
      },
      {
        name: 'Verification Reminders',
        action: 'verification_reminders',
        interval: 1440 // Once daily (24 hours)
      },
      {
        name: 'Fetch Health News',
        action: 'fetch_news',
        interval: 60 // Every hour
      },
      {
        name: 'Generate Daily News Digest',
        action: 'generate_daily_digest',
        interval: 1440 // Once daily
      },
      {
        name: 'Generate Weekly News Digest',
        action: 'generate_weekly_digest',
        interval: 10080 // Once weekly (7 days)
      },
      {
        name: 'Generate Monthly News Digest',
        action: 'generate_monthly_digest',
        interval: 43200 // Once monthly (30 days)
      },
      {
        name: 'Crowdfunding Update Reminders',
        action: 'crowdfunding_reminders',
        interval: 1440 // Once daily
      },
      {
        name: 'Cleanup Old Notifications',
        action: 'cleanup_old_notifications',
        interval: 1440 // Once daily
      }
    ];

    for (const taskConfig of defaultTasks) {
      // Check if task already exists
      const existing = await githubDB.findOne(collections.analytics_events, {
        action: 'scheduled_task',
        'data.action': taskConfig.action
      });

      if (!existing) {
        const nextRun = new Date(Date.now() + taskConfig.interval * 60 * 1000);
        
        await this.createTask(
          taskConfig.name,
          taskConfig.action,
          'recurring',
          {
            interval: taskConfig.interval,
            nextRun: nextRun.toISOString()
          }
        );
      }
    }
  }

  // Cleanup old notifications (older than 30 days)
  static async cleanupOldNotifications(): Promise<void> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const oldNotifications = await githubDB.findMany(collections.notifications, {
      createdAt: { $lt: thirtyDaysAgo },
      read: true
    });

    for (const notification of oldNotifications) {
      await githubDB.delete(collections.notifications, notification.id);
    }

    console.log(`Cleaned up ${oldNotifications.length} old notifications`);
  }

  // Perform database backup (simplified version)
  static async performDatabaseBackup(): Promise<void> {
    try {
      // This is a simplified backup that logs current state
      // In a real implementation, you might export to external storage
      
      const collections_to_backup = [
        'users', 'entities', 'bookings', 'orders', 'courses', 
        'donations', 'news_articles', 'podcast_episodes'
      ];

      const backupData: Record<string, any[]> = {};
      
      for (const collectionName of collections_to_backup) {
        const data = await githubDB.findMany(collectionName, {});
        backupData[collectionName] = data;
      }

      // Store backup metadata
      await githubDB.create(collections.analytics_events, {
        id: `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        action: 'database_backup',
        entityType: 'backup',
        entityId: `backup_${Date.now()}`,
        data: {
          timestamp: new Date().toISOString(),
          collections: Object.keys(backupData),
          totalRecords: Object.values(backupData).reduce((sum, arr) => sum + arr.length, 0)
        },
        timestamp: new Date().toISOString()
      });

      console.log('Database backup completed');
      
    } catch (error) {
      console.error('Database backup failed:', error);
      throw error;
    }
  }

  // Get all scheduled tasks
  static async getAllTasks(): Promise<ScheduledTask[]> {
    const taskEvents = await githubDB.findMany(collections.analytics_events, {
      action: 'scheduled_task'
    });

    return taskEvents.map(event => event.data as ScheduledTask);
  }
}

export default BackgroundScheduler;