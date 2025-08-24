// System Initialization Module
import { initializeDatabase } from './database';
import BackgroundScheduler from './background-scheduler';
import NotificationService from './notifications-enhanced';

export class SystemInitializer {
  // Initialize the entire system
  static async initialize(): Promise<void> {
    try {
      console.log('Starting CareConnect system initialization...');

      // 1. Initialize database and collections
      console.log('Initializing database...');
      await initializeDatabase();

      // 2. Initialize background scheduler
      console.log('Setting up background tasks...');
      await BackgroundScheduler.initializeDefaultTasks();
      BackgroundScheduler.start();

      // 3. Initialize email service
      console.log('Initializing email service...');
      NotificationService.initializeEmailJS();

      console.log('✅ CareConnect system initialization completed successfully!');

    } catch (error) {
      console.error('❌ System initialization failed:', error);
      throw error;
    }
  }

  // Shutdown system gracefully
  static shutdown(): void {
    console.log('Shutting down CareConnect system...');
    BackgroundScheduler.stop();
    console.log('✅ System shutdown completed');
  }
}

export default SystemInitializer;