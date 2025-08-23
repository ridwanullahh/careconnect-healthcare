// Client-Side Background Scheduler for Production Tasks
import { logger } from './observability';
import { EnhancedBookingService } from './booking-enhanced';
import { NewsAggregatorService } from './news-aggregator';
import { EnhancedPaymentService } from './payments-enhanced';
import { DataDeletionService } from './data-deletion';

export class BackgroundScheduler {
  private static instance: BackgroundScheduler;
  private intervalIds: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;

  static getInstance(): BackgroundScheduler {
    if (!this.instance) {
      this.instance = new BackgroundScheduler();
    }
    return this.instance;
  }

  // Start all background tasks
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // Process reminders every 5 minutes
    this.scheduleTask('booking_reminders', () => {
      EnhancedBookingService.processDueReminders();
    }, 5 * 60 * 1000);

    // Aggregate news every 2 hours
    this.scheduleTask('news_aggregation', () => {
      NewsAggregatorService.aggregateNews();
    }, 2 * 60 * 60 * 1000);

    // Cleanup expired payments every hour
    this.scheduleTask('payment_cleanup', () => {
      EnhancedPaymentService.cleanupExpiredIntents();
    }, 60 * 60 * 1000);

    // Process data deletion requests daily
    this.scheduleTask('data_deletion', () => {
      DataDeletionService.processPendingDeletions();
    }, 24 * 60 * 60 * 1000);

    // Clean old news articles weekly
    this.scheduleTask('news_cleanup', () => {
      NewsAggregatorService.cleanupOldArticles();
    }, 7 * 24 * 60 * 60 * 1000);

    logger.info('background_scheduler_started', 'Background scheduler started', {
      task_count: this.intervalIds.size
    });
  }

  // Stop all background tasks
  stop(): void {
    this.intervalIds.forEach((intervalId, taskName) => {
      clearInterval(intervalId);
      logger.info('background_task_stopped', `Background task stopped: ${taskName}`);
    });
    
    this.intervalIds.clear();
    this.isRunning = false;
    
    logger.info('background_scheduler_stopped', 'Background scheduler stopped');
  }

  private scheduleTask(name: string, task: () => void, intervalMs: number): void {
    // Run immediately
    this.runTaskSafely(name, task);
    
    // Schedule recurring execution
    const intervalId = setInterval(() => {
      this.runTaskSafely(name, task);
    }, intervalMs);
    
    this.intervalIds.set(name, intervalId);
    
    logger.info('background_task_scheduled', `Background task scheduled: ${name}`, {
      interval_ms: intervalMs
    });
  }

  private async runTaskSafely(name: string, task: () => void): Promise<void> {
    try {
      await task();
      logger.debug('background_task_completed', `Background task completed: ${name}`);
    } catch (error) {
      logger.error('background_task_failed', `Background task failed: ${name}`, {
        error: error.message
      });
    }
  }

  // Check if scheduler is running
  isActive(): boolean {
    return this.isRunning;
  }

  // Get active task count
  getActiveTaskCount(): number {
    return this.intervalIds.size;
  }
}

// Global instance management
export const backgroundScheduler = BackgroundScheduler.getInstance();

// Auto-start when user is authenticated and on dashboard
export function initializeBackgroundTasks(): void {
  if (typeof window !== 'undefined' && !backgroundScheduler.isActive()) {
    // Only start on dashboard pages to avoid running on public pages
    const isDashboardPage = window.location.pathname.includes('/dashboard') || 
                           window.location.pathname.includes('/admin');
    
    if (isDashboardPage) {
      backgroundScheduler.start();
      
      // Stop when leaving the page
      window.addEventListener('beforeunload', () => {
        backgroundScheduler.stop();
      });
      
      // Stop when page becomes hidden (tab switch, minimize)
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          backgroundScheduler.stop();
        } else if (isDashboardPage) {
          backgroundScheduler.start();
        }
      });
    }
  }
}